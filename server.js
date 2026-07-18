// Serveur mon-carrossier.fr — statique + API lead client (Drive + Notion + Make)
const express = require('express');
const multer  = require('multer');
const { Readable } = require('stream');
const { google } = require('googleapis');
const { Client: NotionClient } = require('@notionhq/client');

const app  = express();
const PORT = process.env.PORT || 3000;

const MAKE_WEBHOOK_URL    = process.env.MAKE_WEBHOOK_URL            || 'https://hook.eu2.make.com/1d3qw2cqvdm7avawr4v6zzg34zjhwot2';
const DRIVE_FOLDER_ID     = process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || '1itzjldepIUgj6D3hr9gokyPi8j6ZFTjs';
const NOTION_DATABASE_ID  = process.env.NOTION_DATABASE_ID           || '0a715324-edae-49ab-af21-9f20046d775b';

const ALLOWED_ORIGINS = [
  'https://mon-carrossier.fr',
  'https://www.mon-carrossier.fr',
];

const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_PHOTOS      = 6;

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use('/api', function (req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_PHOTOS, fileSize: 8 * 1024 * 1024 },
  fileFilter: function (req, file, cb) { cb(null, file.mimetype.startsWith('image/')); },
});

function todayParis() {
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}
function sanitizeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|#%]/g, '').trim() || 'inconnu';
}

// ── Google Drive ──────────────────────────────────────────────────────────────
async function uploadToDrive(files, lead) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth  = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });

  const folderName = sanitizeName(lead.ville) + '-' + sanitizeName(lead.nom) + '-' + todayParis().replace(/-/g, '');
  const folder = await drive.files.create({
    requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_FOLDER_ID] },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });
  const folderId = folder.data.id;

  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });

  for (const f of files) {
    const created = await drive.files.create({
      requestBody: { name: f.originalname, parents: [folderId] },
      media: { mimeType: f.mimetype, body: Readable.from(f.buffer) },
      fields: 'id',
      supportsAllDrives: true,
    });
    await drive.permissions.create({
      fileId: created.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  }
  return folder.data.webViewLink || 'https://drive.google.com/drive/folders/' + folderId;
}

// ── Notion : helpers ──────────────────────────────────────────────────────────
function buildNotionProperties(lead, folderUrl, isPartial) {
  const respMap = { oui: 'Responsable', non: 'Non responsable', nsp: 'À déterminer' };

  const props = {
    'Nom':       { title: [{ text: { content: ((lead.prenom || '') + ' ' + (lead.nom || '')).trim() || 'Sans nom' } }] },
    'Téléphone': { phone_number: lead.telephone || lead.tel || null },
    'Email':     { email: lead.email || null },
    'Ville':     { rich_text: [{ text: { content: [lead.ville, lead.cp].filter(Boolean).join(' ') } }] },
    'Statut':    { select: { name: isPartial ? 'Incomplet' : 'Nouveau' } },
    'Source':    { select: { name: 'Formulaire web' } },
    'Date':      { date: { start: todayParis() } },
  };

  // Champs étape 2 — seulement si présents
  if (lead.marque_modele || lead.marque) {
    props['Véhicule'] = { rich_text: [{ text: { content: lead.marque_modele || lead.marque || '' } }] };
  }
  if (lead.resp || lead.responsable) {
    const val = lead.resp || lead.responsable;
    props['Responsabilité'] = { select: { name: respMap[val] || 'À déterminer' } };
  }
  if (lead.description || lead.degats) {
    props['Notes'] = { rich_text: [{ text: { content: lead.description || lead.degats || '' } }] };
  }
  if (lead.adresse) {
    props['Adresse'] = { rich_text: [{ text: { content: lead.adresse } }] };
  }
  if (lead.franchise !== undefined && lead.franchise !== null && String(lead.franchise).trim() !== '') {
    const fr = parseFloat(String(lead.franchise).replace(',', '.'));
    if (!isNaN(fr)) props['Franchise'] = { number: fr };
  }
  if (folderUrl) {
    props['Photos'] = { url: folderUrl };
  }

  return props;
}

// Création page Notion — retourne l'ID de la page créée
async function createNotionPage(lead, folderUrl, isPartial) {
  const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
  const page = await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: buildNotionProperties(lead, folderUrl, isPartial),
  });
  return page.id; // On renvoie l'ID pour le patch étape 2
}

// Mise à jour page Notion existante (étape 2)
async function updateNotionPage(pageId, lead, folderUrl) {
  const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
  await notion.pages.update({
    page_id: pageId,
    properties: buildNotionProperties(lead, folderUrl, false),
  });
}

// ── Pont vers la plateforme V2 (admin mon-carrossier-app) ─────────────────────
// Chaque lead est aussi poussé vers la V2 pour apparaître dans le kanban admin.
// Ne bloque jamais le flux existant : erreurs logguées, jamais levées.
const V2_API_URL = process.env.V2_API_URL || 'https://mon-carrossier-app-production.up.railway.app';
async function sendToV2(etape, lead, folderUrl) {
  if (!process.env.LEAD_BRIDGE_SECRET) return; // pont désactivé sans secret
  const r = await fetch(V2_API_URL + '/api/lead-externe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bridge-secret': process.env.LEAD_BRIDGE_SECRET,
    },
    body: JSON.stringify({
      etape:         etape,
      prenom:        lead.prenom || '',
      nom:           lead.nom || '',
      tel:           lead.telephone || lead.tel || '',
      email:         lead.email || '',
      cp:            lead.cp || '',
      ville:         lead.ville || '',
      marque_modele: lead.marque_modele || lead.marque || '',
      responsable:   lead.resp || lead.responsable || '',
      franchise:     lead.franchise || '',
      degats:        lead.description || lead.degats || '',
      photosUrl:     folderUrl || '',
    }),
  });
  if (!r.ok) throw new Error('V2 HTTP ' + r.status);
}

// ── Make webhook ──────────────────────────────────────────────────────────────
async function sendToMake(lead, folderUrl) {
  const r = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      form_type:   'client',
      prenom:      lead.prenom      || '',
      nom:         lead.nom         || '',
      email:       lead.email       || '',
      telephone:   lead.telephone || lead.tel || '',
      cp:          lead.cp          || '',
      ville:       lead.ville       || '',
      adresse:     lead.adresse     || '',
      marque:      lead.marque_modele || lead.marque || '',
      resp:        lead.resp || lead.responsable || '',
      franchise:   lead.franchise   || '',
      description: lead.description || lead.degats || '',
      photos_url:  folderUrl        || '',
    }),
  });
  if (!r.ok) throw new Error('Make HTTP ' + r.status);
}

// ── Diagnostic ────────────────────────────────────────────────────────────────
var lastErrors = { drive: null, notion: null, make: null, v2: null };
app.get('/api/health', function (req, res) {
  res.json({
    env: {
      google_sa:    !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      notion_key:   !!process.env.NOTION_API_KEY,
      drive_folder: !!process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID,
      notion_db:    !!process.env.NOTION_DATABASE_ID,
      make_url:     !!process.env.MAKE_WEBHOOK_URL,
      v2_bridge:    !!process.env.LEAD_BRIDGE_SECRET,
    },
    lastErrors,
  });
});

// ── ÉTAPE 1 : coordonnées uniquement → Notion statut "Incomplet" ──────────────
app.post('/api/lead-step1', express.json(), async function (req, res) {
  try {
    const lead = req.body || {};
    if (lead.website) return res.status(200).json({ ok: true }); // honeypot

    // Notion + pont V2 en parallèle — l'échec de l'un n'empêche pas l'autre
    const results = await Promise.allSettled([
      createNotionPage(lead, null, true),
      sendToV2(1, lead, null),
    ]);
    lastErrors.notion = results[0].status === 'rejected' ? results[0].reason.message : null;
    lastErrors.v2     = results[1].status === 'rejected' ? results[1].reason.message : null;
    if (lastErrors.notion) console.error('[lead-step1][notion]', lastErrors.notion);
    if (lastErrors.v2) console.error('[lead-step1][v2]', lastErrors.v2);
    const pageId = results[0].status === 'fulfilled' ? results[0].value : null;
    res.status(200).json({ ok: true, pageId });
  } catch (e) {
    console.error('[lead-step1]', e.message);
    // On renvoie ok:true quand même — le frontend passe à l'étape 2 dans tous les cas
    res.status(200).json({ ok: true, pageId: null, warning: e.message });
  }
});

// ── ÉTAPE 2 : dossier complet → update Notion + Drive + Make ─────────────────
app.post('/api/lead-client', function (req, res) {
  upload.array('photos', MAX_PHOTOS)(req, res, async function (err) {
    if (err) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(code).json({ ok: false, error: err.message });
    }
    try {
      const lead = req.body || {};
      if (lead.website) return res.status(200).json({ ok: true }); // honeypot

      const files      = req.files || [];
      const totalBytes = files.reduce(function (s, f) { return s + f.size; }, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        return res.status(413).json({ ok: false, error: 'Photos trop volumineuses (20 Mo max)' });
      }

      // 1. Drive (si photos)
      let folderUrl = '';
      if (files.length) {
        try {
          folderUrl = await uploadToDrive(files, lead);
          lastErrors.drive = null;
        } catch (e) {
          lastErrors.drive = e.message;
          console.error('[Drive]', e.message);
        }
      }

      // 2. Notion : update si pageId transmis, sinon création complète
      const notionPromise = lead.notionPageId
        ? updateNotionPage(lead.notionPageId, lead, folderUrl)
        : createNotionPage(lead, folderUrl, false);

      // 3. Notion + Make + pont V2 en parallèle
      const results = await Promise.allSettled([
        notionPromise,
        sendToMake(lead, folderUrl),
        sendToV2(2, lead, folderUrl),
      ]);
      results.forEach(function (r, i) {
        const key = i === 0 ? 'notion' : i === 1 ? 'make' : 'v2';
        if (r.status === 'rejected') {
          lastErrors[key] = r.reason && r.reason.message;
          console.error('[' + key + ']', r.reason && r.reason.message);
        } else {
          lastErrors[key] = null;
        }
      });

      const anyOk = results.some(function (r) { return r.status === 'fulfilled'; });
      res.status(anyOk ? 200 : 502).json({ ok: anyOk, photos: files.length, drive: !!folderUrl });
    } catch (e) {
      console.error('[lead-client]', e);
      res.status(500).json({ ok: false });
    }
  });
});

// ── Statique ──────────────────────────────────────────────────────────────────
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: function (res, filePath) {
    if (/\.(html|css|svg|png|jpe?g)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  },
}));

app.listen(PORT, function () {
  console.log('mon-carrossier.fr en écoute sur le port ' + PORT);
});

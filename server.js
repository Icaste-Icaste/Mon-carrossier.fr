// Serveur mon-carrossier.fr — statique + API lead client (Drive + Notion + Make)
const express = require('express');
const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
const { google } = require('googleapis');
const { Client: NotionClient } = require('@notionhq/client');

const app = express();
const PORT = process.env.PORT || 3000;

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu2.make.com/1d3qw2cqvdm7avawr4v6zzg34zjhwot2';
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || '1itzjldepIUgj6D3hr9gokyPi8j6ZFTjs';
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '0a715324-edae-49ab-af21-9f20046d775b';

const ALLOWED_ORIGINS = [
  'https://mon-carrossier.fr',
  'https://www.mon-carrossier.fr',
];

const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20 Mo total
const MAX_PHOTOS = 6;

// ── CORS restreint sur /api ──────────────────────────────────────────────────
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
  fileFilter: function (req, file, cb) {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

function todayParis() {
  // YYYY-MM-DD en fuseau Europe/Paris
  return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function sanitizeName(s) {
  return String(s || '').replace(/[\\/:*?"<>|#%]/g, '').trim() || 'inconnu';
}

// ── Google Drive : sous-dossier + upload + lecture publique ─────────────────
async function uploadToDrive(files, lead) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const folderName = sanitizeName(lead.ville) + '-' + sanitizeName(lead.nom) + '-' + todayParis().replace(/-/g, '');

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [DRIVE_FOLDER_ID],
    },
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

// ── Notion : création de la fiche lead ───────────────────────────────────────
async function createNotionPage(lead, folderUrl) {
  const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
  const respMap = { oui: 'Responsable', non: 'Non responsable' };

  const properties = {
    'Nom': { title: [{ text: { content: ((lead.prenom || '') + ' ' + (lead.nom || '')).trim() || 'Sans nom' } }] },
    'Téléphone': { phone_number: lead.telephone || null },
    'Ville': { rich_text: [{ text: { content: [lead.ville, lead.cp].filter(Boolean).join(' ') } }] },
    'Véhicule': { rich_text: [{ text: { content: lead.marque || '' } }] },
    'Assurance': { rich_text: [{ text: { content: lead.assurance || '' } }] },
    'Responsabilité': { select: { name: respMap[lead.resp] || 'À déterminer' } },
    'Statut': { select: { name: 'Nouveau' } },
    'Source': { select: { name: 'Formulaire web' } },
    'Date': { date: { start: todayParis() } },
    'Notes': { rich_text: [{ text: { content: lead.description || '' } }] },
  };
  if (folderUrl) properties['Photos'] = { url: folderUrl };

  await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: properties,
  });
}

// ── Make : webhook texte (sans photos) ───────────────────────────────────────
async function sendToMake(lead, folderUrl) {
  const r = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      form_type:   'client',
      prenom:      lead.prenom      || '',
      nom:         lead.nom         || '',
      email:       lead.email       || '',
      telephone:   lead.telephone   || '',
      cp:          lead.cp          || '',
      ville:       lead.ville       || '',
      adresse:     lead.adresse     || '',
      marque:      lead.marque      || '',
      resp:        lead.resp        || '',
      description: lead.description || '',
      photos_url:  folderUrl        || '',
    }),
  });
  if (!r.ok) throw new Error('Make HTTP ' + r.status);
}

// ── Diagnostic : présence des variables + dernières erreurs ─────────────────
var lastErrors = { drive: null, notion: null, make: null };
app.get('/api/health', function (req, res) {
  res.json({
    env: {
      google_sa: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      notion_key: !!process.env.NOTION_API_KEY,
      drive_folder: !!process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID,
      notion_db: !!process.env.NOTION_DATABASE_ID,
      make_url: !!process.env.MAKE_WEBHOOK_URL,
    },
    lastErrors: lastErrors,
  });
});

// ── Endpoint lead client ─────────────────────────────────────────────────────
app.post('/api/lead-client', function (req, res) {
  upload.array('photos', MAX_PHOTOS)(req, res, async function (err) {
    if (err) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(code).json({ ok: false, error: err.message });
    }
    try {
      const lead = req.body || {};

      // Honeypot : bot détecté → 200 sans rien faire
      if (lead.website) return res.status(200).json({ ok: true });

      const files = req.files || [];
      const totalBytes = files.reduce(function (s, f) { return s + f.size; }, 0);
      if (totalBytes > MAX_TOTAL_BYTES) {
        return res.status(413).json({ ok: false, error: 'Photos trop volumineuses (20 Mo max)' });
      }

      // 1. Drive d'abord (l'URL du dossier alimente Notion et Make)
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

      // 2. Notion + Make en parallèle
      const results = await Promise.allSettled([
        createNotionPage(lead, folderUrl),
        sendToMake(lead, folderUrl),
      ]);
      results.forEach(function (r, i) {
        const key = i === 0 ? 'notion' : 'make';
        if (r.status === 'rejected') {
          lastErrors[key] = r.reason && r.reason.message;
          console.error('[' + key + ']', r.reason && r.reason.message);
        } else {
          lastErrors[key] = null;
        }
      });

      // OK si au moins un canal a fonctionné (sinon le frontend a un fallback)
      const anyOk = results.some(function (r) { return r.status === 'fulfilled'; });
      res.status(anyOk ? 200 : 502).json({ ok: anyOk, photos: files.length, drive: !!folderUrl });
    } catch (e) {
      console.error('[lead-client]', e);
      res.status(500).json({ ok: false });
    }
  });
});

// ── Statique : équivalent serve.json (cleanUrls + cache) ────────────────────
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

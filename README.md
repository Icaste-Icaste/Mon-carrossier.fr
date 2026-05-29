# 🚀 mon-carrossier.fr — Site V5 final pour déploiement Railway

## 📁 Structure des fichiers

Tous les fichiers sont prêts à être placés dans `public/` de ton projet Railway.

```
public/
├── favicon.svg                  ← Favicon SVG (lettres mc combinées)
├── styles.css                   ← CSS partagé entre toutes les pages
├── index.html                   ← Page client (B2C, sinistrés)
├── partenaires.html             ← Page carrossiers (B2B, recrutement)
├── mentions-legales.html        ← Page obligation LCEN
├── cgu.html                     ← Conditions Générales d'Utilisation
├── rgpd.html                    ← Politique de confidentialité RGPD
├── cookies.html                 ← Politique cookies
├── contact.html                 ← Formulaire de contact général
└── images/
    └── pierre-bertin.png        ← Photo du cofondateur
```

## ⚙️ Caractéristiques techniques

### Cohérence graphique
- **Charte unifiée bleu Meta `#0866FF`** + accent ambre `#F59E0B` sur toutes les pages
- **CSS partagé** dans `/styles.css` → charge unique, performance optimale
- **Favicon SVG** vectoriel (s'affiche net sur tous écrans Retina)
- **Responsive mobile complet** (breakpoints 560px et 760px)

### Formulaires
Les 3 formulaires (page client, page partenaires, page contact) utilisent un système **mailto:** qui :
1. Tracke les événements analytics (GA4 + Meta Pixel si activés)
2. Ouvre le client email de l'utilisateur avec un message pré-rempli
3. L'utilisateur clique sur "Envoyer" pour finaliser
4. Toutes les soumissions arrivent à : **contact@mon-carrossier.fr**

> ⚠️ **Limite du mailto :** demande que l'utilisateur ait un client email configuré. Pour upgrade ultérieur, recommandation : remplacer par appel API Brevo / Resend / Formspree (5-10€/mois).

### Pages légales
- ✅ **Mentions légales** (obligation LCEN 2004) — *certains champs marqués `[À COMPLÉTER]` à remplir avec les vraies infos société*
- ✅ **CGU** template MVP — *recommandation : validation par avocat avant lancement campagnes payantes*
- ✅ **RGPD** complet (droits utilisateurs, durées conservation, CNIL)
- ✅ **Cookies** anticipé pour future activation GA4 et Meta Pixel

## 🎯 Instructions de déploiement Claude Code

Dans ton terminal, depuis le dossier de ton projet Railway :

```
J'ai des fichiers à déployer depuis ~/Downloads/site-deploy/public/ (ou le chemin où tu as téléchargé le dossier).

ÉTAPE 1 — Vérifier la structure
- pwd (confirmer projet Railway)
- ls -la public/ (état actuel)
- ls -la ~/Downloads/site-deploy/public/ (source)

ÉTAPE 2 — Backup de sécurité
- Avant écrasement, copier le contenu actuel de public/ vers public-backup-[date]/
- Ainsi on peut revenir en arrière si problème

ÉTAPE 3 — Copier tous les fichiers
- cp -r ~/Downloads/site-deploy/public/* public/
- Vérifier ls -la public/ et ls -la public/images/

ÉTAPE 4 — Vérifier que la charte bleu Meta est bien partout
- grep -c "0866FF" public/*.html public/*.css
- Doit retourner des résultats > 0 sur chaque fichier

ÉTAPE 5 — Git diff
- git status
- git diff --stat

ÉTAPE 6 — Commit + Push
- git add public/
- git commit -m "feat: site v5 complet - bleu Meta + 4 pages légales + favicon + contact + CSS unifié"
- git push origin main

ÉTAPE 7 — Confirmer
- git log -1 --oneline
- Rappeler de vérifier Railway deployment (1-2 min) et tester les 7 URLs
```

## ✅ Tests à faire après déploiement

| URL | Vérifier |
|---|---|
| `/` | Page client bleu Meta, badge "Service Var", droits L.211-5-1 |
| `/partenaires.html` | Page bleu Meta, commission 20%, photo Pierre, barre 3 segments |
| `/mentions-legales.html` | SIRET, adresse Caluire, champs [À COMPLÉTER] visibles |
| `/cgu.html` | Toutes les sections, références aux autres pages légales |
| `/rgpd.html` | Tableaux des données, droits utilisateurs, CNIL |
| `/cookies.html` | Information cookies actuels et futurs (GA4, Meta Pixel) |
| `/contact.html` | Formulaire avec sélecteur sujet, ouverture mailto correcte |

### Tests mobile (iPhone)
- Hero lisible sans débordement
- CTA assez gros pour le doigt (54px min)
- Photo Pierre bien cadrée (visage visible)
- Footer links accessibles
- Modals ouvrent en bottom sheet

### Test formulaires
- Cliquer "Trouver mon carrossier" → modal s'ouvre
- Remplir → cliquer envoyer → ouverture client mail avec contenu pré-rempli

## ⚠️ À FAIRE après le déploiement (par toi)

### Critique avant lancement campagnes
1. **Compléter mentions-legales.html** :
   - Forme juridique exacte (SAS, SARL, etc.)
   - Capital social
   - RCS (probablement Lyon)
   - Numéro TVA intracommunautaire
   
   → Va sur https://annuaire-entreprises.data.gouv.fr/entreprise/887943751

2. **Supprimer le watermark Gemini** sur `pierre-bertin.png` :
   - Outils gratuits : Photopea, Canva Magic Eraser, remove.bg

3. **Validation juridique des CGU + RGPD** :
   - Avocat spécialisé droit numérique
   - Particulièrement important pour la cession de créance et la prise en charge de franchise
   - Coût indicatif : 500-1500€

### Important sous 2 semaines
4. **Brancher le nom de domaine OVH** sur Railway (Settings → Custom Domain)
5. **Configurer email contact@mon-carrossier.fr** chez OVH ou Google Workspace
6. **Activer Google Analytics 4** (mettre l'ID dans le code, gtag déjà câblé)
7. **Activer Meta Pixel** (mettre l'ID, fbq déjà câblé)
8. **Bandeau cookies CNIL-compliant** (à ajouter quand GA4/Meta Pixel activés)

### Important sous 1 mois
9. **Upgrade formulaires mailto → Brevo/Resend** pour fiabilité MVP+
10. **Page médiation consommation** (article L.612-1 Code conso)
11. **Politique mention médiateur** dans les CGU

---

## 📞 Adresses configurées dans les fichiers

- **Email contact :** contact@mon-carrossier.fr
- **Adresse postale :** 146 rue Jean Monnet, 69300 Caluire-et-Cuire
- **SIRET :** 887 943 751 00024
- **SIREN :** 887 943 751

# Configuration GTM — Conversions Google Ads (mon-carrossier.fr)

Compte Google Ads : **AW-18255900873**
Objectif : 3 conversions Google Ads déclenchées via **Google Tag Manager**, à partir
d'événements `dataLayer` poussés par le site.

---

## ⚠️ Prérequis : installer le conteneur GTM (actuellement ABSENT)

> À ce jour, le site **n'a PAS de conteneur GTM**. Seul le tag Google Ads `gtag.js`
> (`AW-18255900873`) est présent dans `index.html`.
> **Tant que le conteneur GTM n'est pas installé, les `dataLayer.push()` ne déclenchent rien.**

### Étapes
1. Crée (ou récupère) un conteneur **Web** dans https://tagmanager.google.com → tu obtiens un ID `GTM-XXXXXXX`.
2. Colle le snippet ci-dessous dans `index.html` (remplace `GTM-XXXXXXX` par ton ID).
   - Bloc 1 : juste après l'ouverture de `<head>`.
   - Bloc 2 : juste après l'ouverture de `<body>`.

```html
<!-- Google Tag Manager (dans <head>) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->

<!-- Google Tag Manager (noscript) (juste après <body>) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

> 💡 Donne-moi l'ID `GTM-XXXXXXX` et je l'installe dans `index.html` (sinon Stéphane le colle).
> Note : le conteneur GTM peut cohabiter avec le `gtag.js` Google Ads déjà présent.

---

## 1. Événements `dataLayer` déjà poussés par le site

Ces `dataLayer.push()` sont **déjà en place dans `index.html`** (fonction JS du formulaire) :

| Événement (dataLayer) | Quand | Valeur métier |
|---|---|---|
| `lead_step1`   | Soumission **étape 1** du formulaire (coordonnées) — fonction `goStep2()` | 10 € |
| `lead_complete`| Soumission **étape 2** du formulaire (dossier sinistre) — fonction `submitForm()` | 50 € |
| `clic_tel`     | Clic sur un lien `tel:` (numéro 07 62 33 72 65) — fonction `trackCall()` | 30 € |

Aucune autre modification du code n'est nécessaire côté site.

---

## 2. Déclencheurs à créer dans GTM

Type pour les trois : **Déclencheur personnalisé → Événement personnalisé** (*Custom Event*).

| Nom du déclencheur | Type | Nom de l'événement (exact) | Se déclenche sur |
|---|---|---|---|
| `Trigger - Lead Step 1` | Custom Event | `lead_step1`   | Tous les événements personnalisés |
| `Trigger - Lead Step 2` | Custom Event | `lead_complete`| Tous les événements personnalisés |
| `Trigger - Clic telephone` | Custom Event | `clic_tel`  | Tous les événements personnalisés |

> Champ « Nom de l'événement » = exactement la valeur de `event` (sensible à la casse).

---

## 3. Balises à créer dans GTM

### 3.0 (Recommandé) Liaison de conversion — à créer en premier
| Paramètre | Valeur |
|---|---|
| Nom | `Google Ads - Conversion Linker` |
| Type | **Liaison de conversion** (*Conversion Linker*) |
| Déclencheur | **All Pages** (Initialisation / toutes les pages) |

### 3.1 Balise — Lead Step 1
| Paramètre | Valeur |
|---|---|
| Nom | `Lead Step 1` |
| Type | **Suivi des conversions Google Ads** (*Google Ads Conversion Tracking*) |
| ID de conversion | `18255900873` |
| Libellé de conversion | `CONVERSION_LABEL_1` |
| Valeur | `10` |
| Devise | `EUR` |
| Déclencheur | `Trigger - Lead Step 1` |

### 3.2 Balise — Lead Step 2
| Paramètre | Valeur |
|---|---|
| Nom | `Lead Step 2` |
| Type | **Suivi des conversions Google Ads** |
| ID de conversion | `18255900873` |
| Libellé de conversion | `CONVERSION_LABEL_2` |
| Valeur | `50` |
| Devise | `EUR` |
| Déclencheur | `Trigger - Lead Step 2` |

### 3.3 Balise — Clic telephone
| Paramètre | Valeur |
|---|---|
| Nom | `Clic telephone` |
| Type | **Suivi des conversions Google Ads** |
| ID de conversion | `18255900873` |
| Libellé de conversion | `CONVERSION_LABEL_3` |
| Valeur | `30` |
| Devise | `EUR` |
| Déclencheur | `Trigger - Clic telephone` |

---

## 4. Récupérer les libellés de conversion (Google Ads)

Pour chaque action de conversion, dans **Google Ads → Objectifs → Conversions → (détail de l'action)** :
- Section « Configuration de la balise » → **Utiliser Google Tag Manager**.
- On y lit : **ID de conversion** (`18255900873`) et **Libellé de conversion** (chaîne type `AbC-D_efGhIj…`).

Crée d'abord les 3 actions de conversion dans Google Ads (si pas déjà fait) :
| Action Google Ads | Catégorie suggérée | Remplace |
|---|---|---|
| Lead Step 1 (formulaire incomplet) | Prospect / Soumission de formulaire | `CONVERSION_LABEL_1` |
| Lead Step 2 (formulaire complet) | Prospect / Soumission de formulaire | `CONVERSION_LABEL_2` |
| Clic téléphone | Contact / Clic sur numéro | `CONVERSION_LABEL_3` |

Reporte ensuite chaque libellé dans la balise GTM correspondante (§3), puis **Publier** le conteneur.

---

## 5. Tester (GTM Preview)
1. GTM → **Aperçu** (Preview) → saisis l'URL du site.
2. Remplis l'étape 1 → l'événement `lead_step1` apparaît + la balise « Lead Step 1 » se déclenche.
3. Remplis l'étape 2 → `lead_complete` + balise « Lead Step 2 ».
4. Clique le numéro de téléphone → `clic_tel` + balise « Clic telephone ».
5. Vérifie ensuite dans **Google Ads → Conversions** (statut « Mesure active » sous 24-48h).

---

## Récapitulatif des placeholders à remplacer
| Placeholder | À remplacer par |
|---|---|
| `GTM-XXXXXXX` | l'ID de ton conteneur GTM (snippet §Prérequis) |
| `CONVERSION_LABEL_1` | libellé Google Ads de « Lead Step 1 » |
| `CONVERSION_LABEL_2` | libellé Google Ads de « Lead Step 2 » |
| `CONVERSION_LABEL_3` | libellé Google Ads de « Clic téléphone » |

# Configuration GTM — Conversions Google Ads (mon-carrossier.fr)

Compte Google Ads : **AW-18255900873**

> ✅ **Mise en œuvre actuelle = conversions « en dur » dans le code** (`index.html`, via `gtag`),
> avec les libellés réels ci-dessous et les valeurs 10/50/30 €. **Rien à configurer dans GTM.**
> ⚠️ Si tu décides plus tard de gérer ces conversions **dans GTM** (balises ci-dessous), **retire d'abord
> les appels `gtag('event','conversion', …)` du code** pour éviter le **double comptage**.
>
> **Libellés de conversion (récupérés dans Google Ads) :**
> - Lead Step 1 : `AW-18255900873/ZDyZCM78usUcEMnhi4FE` — 10 €
> - Lead Step 2 : `AW-18255900873/2lrhCMn9usUcEMnhi4FE` — 50 €
> - Clic téléphone : `AW-18255900873/lwVHCMz9usUcEMnhi4FE` — 30 €

Objectif (doc de référence) : 3 conversions Google Ads à partir d'événements `dataLayer`
poussés par le site — utile si tu veux basculer la gestion dans **Google Tag Manager**.

---

## ✅ Conteneur GTM installé — `GTM-PFJWVQF8`

> Le conteneur **`GTM-PFJWVQF8`** est désormais installé dans `index.html`
> (bloc `<script>` dans `<head>` + bloc `<noscript>` après `<body>`).
> Les `dataLayer.push()` du site sont donc bien captés par GTM.
> Il reste à créer les déclencheurs/balises ci-dessous **dans l'interface GTM** puis à publier.

<details><summary>Snippet installé (pour référence)</summary>

```html
<!-- Google Tag Manager (dans <head>) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PFJWVQF8');</script>
<!-- End Google Tag Manager -->

<!-- Google Tag Manager (noscript) (juste après <body>) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PFJWVQF8"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

</details>

> Note : le conteneur GTM cohabite avec le `gtag.js` Google Ads déjà présent (`AW-18255900873`).

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
| Libellé de conversion | `ZDyZCM78usUcEMnhi4FE` |
| Valeur | `10` |
| Devise | `EUR` |
| Déclencheur | `Trigger - Lead Step 1` |

### 3.2 Balise — Lead Step 2
| Paramètre | Valeur |
|---|---|
| Nom | `Lead Step 2` |
| Type | **Suivi des conversions Google Ads** |
| ID de conversion | `18255900873` |
| Libellé de conversion | `2lrhCMn9usUcEMnhi4FE` |
| Valeur | `50` |
| Devise | `EUR` |
| Déclencheur | `Trigger - Lead Step 2` |

### 3.3 Balise — Clic telephone
| Paramètre | Valeur |
|---|---|
| Nom | `Clic telephone` |
| Type | **Suivi des conversions Google Ads** |
| ID de conversion | `18255900873` |
| Libellé de conversion | `lwVHCMz9usUcEMnhi4FE` |
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
| Lead Step 1 (formulaire incomplet) | Prospect / Soumission de formulaire | `ZDyZCM78usUcEMnhi4FE` |
| Lead Step 2 (formulaire complet) | Prospect / Soumission de formulaire | `2lrhCMn9usUcEMnhi4FE` |
| Clic téléphone | Contact / Clic sur numéro | `lwVHCMz9usUcEMnhi4FE` |

Reporte ensuite chaque libellé dans la balise GTM correspondante (§3), puis **Publier** le conteneur.

---

## 5. Tester (GTM Preview)
1. GTM → **Aperçu** (Preview) → saisis l'URL du site.
2. Remplis l'étape 1 → l'événement `lead_step1` apparaît + la balise « Lead Step 1 » se déclenche.
3. Remplis l'étape 2 → `lead_complete` + balise « Lead Step 2 ».
4. Clique le numéro de téléphone → `clic_tel` + balise « Clic telephone ».
5. Vérifie ensuite dans **Google Ads → Conversions** (statut « Mesure active » sous 24-48h).

---

## Récapitulatif — libellés de conversion (renseignés ✅)
| Conversion | Libellé | Valeur |
|---|---|---|
| Lead Step 1 | `AW-18255900873/ZDyZCM78usUcEMnhi4FE` | 10 € |
| Lead Step 2 | `AW-18255900873/2lrhCMn9usUcEMnhi4FE` | 50 € |
| Clic téléphone | `AW-18255900873/lwVHCMz9usUcEMnhi4FE` | 30 € |

> Ces libellés sont **déjà câblés dans `index.html`** (appels `gtag` sur `lead_step1` / `lead_complete` / `clic_tel`). Conteneur GTM `GTM-PFJWVQF8` installé mais non requis pour ces conversions.

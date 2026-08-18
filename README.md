# Agent avis Google

Agent IA qui aide une entreprise à répondre à ses avis Google (fiche **Google Business Profile**) :

1. **`fetch`** — récupère les nouveaux avis via l'API Google Business Profile et génère un brouillon de réponse avec **Claude** (Anthropic) pour chacun.
2. **`review`** — te fait relire chaque brouillon dans le terminal : tu peux l'approuver tel quel, le modifier, ou le rejeter.
3. **`publish`** — publie sur Google uniquement les réponses que tu as approuvées.

La publication n'est **jamais automatique sans validation humaine** : c'est un choix volontaire pour éviter qu'une réponse mal calibrée parte publiquement sur ta fiche, notamment sur les avis négatifs. Les avis déjà répondus manuellement sur Google sont ignorés.

## Prérequis

- Node.js 18.17 ou plus récent
- Une fiche **Google Business Profile** dont tu es propriétaire/gestionnaire
- Une clé API **Anthropic** (Claude) — https://console.anthropic.com
- Un projet **Google Cloud** avec les API suivantes activées :
  - **My Business API** (`mybusiness.googleapis.com`) — gestion des avis. ⚠️ Cette API nécessite historiquement une **demande d'accès auprès de Google** (formulaire officiel) au-delà d'un usage de test ; sans validation, les appels peuvent être limités ou refusés en production.
  - **My Business Account Management API** (`mybusinessaccountmanagement.googleapis.com`)
  - **My Business Business Information API** (`mybusinessbusinessinformation.googleapis.com`)

## Installation

```bash
npm install
cp .env.example .env
```

## Configuration pas à pas

### 1. Créer les identifiants OAuth Google

1. Dans [Google Cloud Console](https://console.cloud.google.com/), crée un projet (ou réutilise-en un existant) et active les 3 API listées ci-dessus.
2. Configure l'écran de consentement OAuth (type **Externe**, mode test suffit pour commencer).
3. Crée un identifiant OAuth de type **Application de bureau** (Desktop app).
4. Renseigne `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env` avec les valeurs obtenues.

### 2. Obtenir un refresh token

```bash
npm run get-token
```

La commande ouvre une URL Google à visiter dans le navigateur du compte qui gère ta fiche, démarre un petit serveur local pour récupérer le code d'autorisation automatiquement, puis affiche la ligne à ajouter dans `.env` :

```
GOOGLE_REFRESH_TOKEN=...
```

### 3. Trouver ton Account ID et Location ID

```bash
npm run accounts
```

Liste tes comptes Business Profile et les établissements associés, avec les valeurs `GOOGLE_ACCOUNT_ID` / `GOOGLE_LOCATION_ID` à copier dans `.env`.

### 4. Configurer Claude et le profil de l'entreprise

Dans `.env` :

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5

BUSINESS_NAME="Nom de mon entreprise"
BUSINESS_TONE="professionnel, chaleureux et concis"
BUSINESS_LANGUAGE="français"
BUSINESS_SIGNATURE="L'équipe de Nom de mon entreprise"
```

`BUSINESS_TONE` et `BUSINESS_SIGNATURE` influencent directement le style des réponses générées.

## Utilisation quotidienne

```bash
npm run fetch    # récupère les nouveaux avis + génère les brouillons
npm run review   # relit/édite/valide chaque brouillon dans le terminal
npm run publish  # publie sur Google les réponses approuvées
```

Les avis et brouillons sont stockés localement dans `data/reviews.json` (ignoré par git — il contient des données clients).

### Automatiser la récupération et la génération de brouillons

Comme la publication reste manuelle, seule l'étape `fetch` peut être planifiée sans risque, par exemple via une tâche cron qui tourne chaque matin :

```cron
0 8 * * * cd /chemin/vers/agent-avis-google && npm run fetch >> fetch.log 2>&1
```

Tu n'as ensuite plus qu'à lancer `npm run review` puis `npm run publish` quand tu veux traiter les brouillons en attente.

## Structure du projet

```
src/
  googleClient.ts     # OAuth2 + appels à l'API Business Profile (lister/répondre aux avis)
  claudeClient.ts      # génération des brouillons de réponse avec Claude
  store.ts              # stockage local des avis/brouillons (data/reviews.json)
  commands/
    getToken.ts        # flux OAuth pour obtenir le refresh token
    listAccounts.ts     # découverte des Account ID / Location ID
    fetch.ts            # récupération des avis + génération des brouillons
    review.ts           # validation interactive des brouillons
    publish.ts          # publication des réponses approuvées
  index.ts               # CLI (commander)
```

## Sécurité

- Ne commit jamais ton fichier `.env` (déjà exclu via `.gitignore`).
- `data/reviews.json` contient des noms de clients et le contenu de leurs avis : garde-le hors du dépôt git si tu déploies ce projet ailleurs que localement.

# Assistant de réponse aux avis — Asteburua

Outil local qui vous aide à répondre aux avis Google du restaurant Asteburua
(Ossès, Pays Basque) : il récupère les avis sans réponse, propose un
brouillon de réponse rédigé par Claude (IA d'Anthropic), et **ne publie
jamais rien sans que vous l'ayez validé, modifié ou refusé vous-même**.

## Ce dont vous avez besoin avant de commencer

1. **Node.js** version 18 ou supérieure installée (vous avez déjà Node.js v24, c'est parfait).
2. Le fichier **`credentials.json`** placé à la racine du projet (identifiants OAuth "Ordinateur de bureau" de votre projet Google Cloud). Vous l'avez déjà.
3. Une **clé API Anthropic** (récupérable sur https://console.anthropic.com/settings/keys).
4. L'accès à l'API Google Business Profile déjà approuvé pour votre compte (c'est votre cas).

## Installation (à faire une seule fois)

Ouvrez un terminal dans le dossier du projet, puis :

```bash
npm install
```

Cela installe les quelques librairies nécessaires (dans `node_modules/`, qui n'est jamais envoyé sur GitHub).

Ensuite, créez votre fichier de configuration secret :

```bash
cp .env.example .env
```

Ouvrez le fichier `.env` créé et remplacez la valeur par votre vraie clé API Anthropic :

```
ANTHROPIC_API_KEY=sk-ant-votre-vraie-cle
```

Vérifiez que `credentials.json` est bien présent à la racine du projet (à côté de `package.json`).

## Lancer l'outil

```bash
npm start
```

### Premier lancement : connexion à Google

Une page va s'ouvrir dans votre navigateur pour vous demander de vous
connecter à votre compte Google et d'autoriser l'application à gérer votre
fiche établissement. Une fois autorisé, vous pouvez fermer l'onglet et
revenir au terminal : ce n'est à refaire **qu'une seule fois**, le jeton de
connexion est sauvegardé localement dans `data/token.json`.

### Premier lancement : choix de l'établissement

L'outil va chercher les fiches établissement liées à votre compte Google et
vous demander laquelle traiter. Ce choix est aussi mémorisé (dans
`data/config.json`) pour les prochains lancements.

Si un jour vous gérez plusieurs restaurants avec ce même compte Google,
relancez simplement `npm start` : le menu vous proposera vos établissements
déjà enregistrés, avec une option **"+ Ajouter une nouvelle fiche"** pour en
enregistrer un supplémentaire, sans toucher au code.

### À chaque avis sans réponse

Pour chaque avis trouvé, l'outil affiche :

```
⭐⭐⭐⭐☆  (4/5) — Marie D.
"Super repas, le burger était excellent mais un peu d'attente..."

Réponse proposée :
Merci beaucoup Marie pour ce retour, ravis que le burger vous ait plu !
On note votre remarque sur l'attente, on va faire attention. À bientôt,
l'équipe Asteburua.
```

Puis un menu vous demande quoi faire :

- **Publier tel quel** → la réponse part immédiatement sur votre fiche Google.
- **Modifier avant publication** → votre éditeur de texte habituel s'ouvre avec
  le brouillon déjà rempli ; corrigez, enregistrez, fermez : l'outil vous
  redemande confirmation avec le texte modifié.
- **Passer cet avis** → rien n'est publié, on passe au suivant.
- **Quitter le programme** → arrête l'outil immédiatement (les avis déjà
  traités restent publiés, les autres seront proposés au prochain lancement).

**Rien n'est jamais publié automatiquement** : chaque réponse passe par ce
menu.

### Astuce : choisir un éditeur simple pour l'option "Modifier"

Par défaut, l'ordinateur peut ouvrir un éditeur en ligne de commande (comme
`vi`/`vim`) qui peut sembler déroutant si vous n'êtes pas familier avec.
Vous pouvez définir un éditeur plus simple avant de lancer l'outil :

```bash
# Mac / Linux : utiliser nano (Ctrl+O pour enregistrer, Ctrl+X pour quitter)
export EDITOR=nano
npm start
```

Sur Windows (PowerShell), vous pouvez utiliser le Bloc-notes :

```powershell
$env:EDITOR="notepad"
npm start
```

## Les règles suivies par l'IA pour rédiger les réponses

Ces règles sont codées dans `src/systemPrompt.js` (à modifier vous-même si
vos préférences évoluent) :

- Réponse toujours dans la langue de l'avis.
- Ton chaleureux, jamais corporate, 2 à 4 phrases maximum.
- Signature "l'équipe Asteburua" (adaptée à la langue), sans répéter ce nom
  dans le corps du texte (on préfère "chez nous", "notre équipe"...).
- Reprise d'un détail concret de l'avis (plat, ambiance, serveur...).
- Ton adapté à la note : enthousiaste sur 5 étoiles, nuancé sur 3-4 étoiles,
  très court et sans justification sur 1-2 étoiles (jamais de contradiction
  publique du client).
- Un ou deux emojis discrets sur les avis 3 à 5 étoiles (😊 🙏 🍽️...), aucun
  sur les avis 1-2 étoiles.
- Un seul mot-clé SEO maximum par réponse (Ossès, Pays Basque, produits
  locaux, producteurs de la région, tapas, pizzeria, burgers, soirées à
  thème), jamais forcé, jamais utilisé sur un avis 1-2 étoiles. L'outil garde
  en mémoire (`data/keyword-history.json`) les derniers mots-clés utilisés
  par établissement pour inciter l'IA à varier.

Si un mot-clé apparaît quand même sur un avis mal noté (ce que les règles
interdisent), l'outil l'affiche en warning avant que vous validiez, pour que
vous puissiez le retirer manuellement.

## Sécurité : ce qui ne part jamais sur GitHub

Le fichier `.gitignore` exclut déjà :

- `credentials.json` (vos identifiants Google Cloud)
- `.env` (votre clé API Anthropic)
- `data/` (jeton de connexion Google, établissements enregistrés, historique
  des mots-clés — toutes des données locales à vous)
- `node_modules/`

Ne modifiez pas ce fichier `.gitignore` sans vérifier que ces éléments
restent bien exclus.

## Structure du projet

```
├── .env                # votre clé API Anthropic (jamais commité)
├── credentials.json    # vos identifiants OAuth Google (jamais commité)
├── data/                # généré automatiquement, jamais commité
│   ├── token.json           # connexion Google sauvegardée
│   ├── config.json          # établissement(s) enregistré(s)
│   └── keyword-history.json # derniers mots-clés SEO utilisés
└── src/
    ├── index.js         # orchestre tout le déroulé (le fichier à lire en premier)
    ├── auth.js          # connexion OAuth à Google
    ├── googleBusiness.js# appels aux API Google (comptes, fiches, avis)
    ├── locations.js     # gestion des établissements enregistrés
    ├── claude.js         # appel à l'API Anthropic pour générer une réponse
    ├── systemPrompt.js   # toutes les règles de rédaction à respecter
    ├── keywordMemory.js  # mémoire des mots-clés SEO déjà utilisés
    └── cli.js             # affichage et validation humaine dans le terminal
```

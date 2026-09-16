// Gestion de l'authentification OAuth 2.0 auprès de Google.
//
// Au tout premier lancement : on ouvre le navigateur pour que vous vous
// connectiez et autorisiez l'application, puis on récupère le jeton d'accès
// et on le sauvegarde dans data/token.json pour ne plus jamais avoir à
// refaire cette étape (le jeton est automatiquement rafraîchi ensuite).

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const CREDENTIALS_PATH = path.join(ROOT_DIR, 'credentials.json');
const TOKEN_PATH = path.join(ROOT_DIR, 'data', 'token.json');

// Cette autorisation couvre à la fois la lecture des fiches établissement
// et la lecture/écriture des avis clients.
const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

export async function getAuthenticatedClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      "Fichier credentials.json introuvable à la racine du projet. " +
        'Téléchargez-le depuis Google Cloud Console (identifiants OAuth "Ordinateur de bureau").'
    );
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_id, client_secret } = credentials.installed || credentials.web;

  // Port local temporaire choisi automatiquement, utilisé uniquement le
  // temps de récupérer le code d'autorisation renvoyé par Google.
  const port = await findFreePort();
  const redirectUri = `http://127.0.0.1:${port}`;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const existingToken = fs.existsSync(TOKEN_PATH)
    ? JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
    : null;

  if (existingToken) {
    oAuth2Client.setCredentials(existingToken);
    // Si Google renvoie un nouveau jeton d'accès (rafraîchissement
    // automatique), on met à jour le fichier local sans rien vous demander.
    oAuth2Client.on('tokens', (tokens) => {
      saveToken({ ...existingToken, ...tokens });
    });
    return oAuth2Client;
  }

  // Aucun jeton local : on lance le parcours de connexion Google.
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // nécessaire pour obtenir un refresh_token
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Connexion à votre compte Google requise.');
  console.log("Ouverture du navigateur... Si rien ne s'ouvre, copiez ce lien :\n");
  console.log(authUrl + '\n');

  const codePromise = waitForAuthCode(port);
  await open(authUrl);
  const code = await codePromise;

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  saveToken(tokens);

  oAuth2Client.on('tokens', (newTokens) => {
    saveToken({ ...tokens, ...newTokens });
  });

  console.log('✅ Authentification réussie, jeton sauvegardé localement.\n');
  return oAuth2Client;
}

// Démarre un mini serveur web local le temps de récupérer le "code"
// renvoyé par Google dans l'URL de redirection, puis se ferme.
function waitForAuthCode(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      if (error) {
        res.end('<h1>Échec de l\'authentification</h1><p>Vous pouvez fermer cette fenêtre.</p>');
        server.close();
        reject(new Error(`Autorisation refusée par Google : ${error}`));
        return;
      }

      if (code) {
        res.end(
          '<h1>✅ Authentification réussie</h1><p>Vous pouvez fermer cette fenêtre et revenir au terminal.</p>'
        );
        server.close();
        resolve(code);
      }
    });

    server.listen(port, '127.0.0.1');
    server.on('error', reject);
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function saveToken(token) {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

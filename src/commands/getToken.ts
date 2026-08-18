import http from 'node:http';
import { google } from 'googleapis';
import { OAUTH_SCOPE } from '../googleClient.js';

const PORT = 53682;

export async function getTokenCommand(): Promise<void> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Renseigne GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env avant de lancer cette commande.');
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `http://127.0.0.1:${PORT}/oauth2callback`;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [OAUTH_SCOPE],
  });

  console.log('Ouvre cette URL dans le navigateur du compte Google qui gère ta fiche Business Profile :\n');
  console.log(authUrl);
  console.log(`\nEn attente de l'autorisation sur ${redirectUri} ...`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', redirectUri);
      const authCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.end('Autorisation refusée. Tu peux fermer cet onglet.');
        server.close();
        reject(new Error(`Autorisation refusée par Google : ${error}`));
        return;
      }
      if (authCode) {
        res.end('Autorisation reçue, tu peux fermer cet onglet et revenir au terminal.');
        server.close();
        resolve(authCode);
        return;
      }
      res.end('Requête inattendue.');
    });
    server.listen(PORT);
    server.on('error', reject);
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.log(
      "\nAucun refresh_token retourné par Google (probablement déjà délivré précédemment). " +
        'Révoque l\'accès existant sur https://myaccount.google.com/permissions puis relance cette commande.',
    );
    return;
  }

  console.log('\nAjoute cette ligne à ton fichier .env :\n');
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
}

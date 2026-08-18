#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { fetchCommand } from './commands/fetch.js';
import { reviewCommand } from './commands/review.js';
import { publishCommand } from './commands/publish.js';
import { getTokenCommand } from './commands/getToken.js';
import { listAccountsCommand } from './commands/listAccounts.js';

const program = new Command();

program.name('agent-avis').description('Agent IA qui aide à répondre aux avis Google Business Profile');

program
  .command('get-token')
  .description('Obtenir un GOOGLE_REFRESH_TOKEN via le flux OAuth (à faire une seule fois)')
  .action(getTokenCommand);

program
  .command('accounts')
  .description('Lister les comptes et établissements Business Profile accessibles (pour trouver les IDs)')
  .action(listAccountsCommand);

program
  .command('fetch')
  .description('Récupérer les nouveaux avis Google et générer des brouillons de réponse avec Claude')
  .action(fetchCommand);

program
  .command('review')
  .description('Relire, éditer, approuver ou rejeter les brouillons en attente')
  .action(reviewCommand);

program
  .command('publish')
  .description('Publier sur Google les réponses approuvées')
  .action(publishCommand);

program
  .command('sync')
  .description('Alias de `fetch` (la publication reste toujours manuelle après validation)')
  .action(fetchCommand);

program.parseAsync(process.argv).catch((error) => {
  console.error('\nErreur :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

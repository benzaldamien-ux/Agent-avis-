// Gestion des établissements suivis par l'outil (config locale, multi-fiches).
//
// data/config.json garde en mémoire les établissements déjà découverts pour
// ne pas avoir à refaire l'appel Google à chaque lancement. Vous pourrez en
// ajouter d'autres plus tard sans toucher au code : il suffit de choisir
// "+ Ajouter une nouvelle fiche" dans le menu.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import { listAccounts, listLocations, extractId } from './googleBusiness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { locations: [] };
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Interroge Google pour lister tous les comptes puis toutes les fiches de
// chaque compte, vous laisse choisir laquelle ajouter, et l'enregistre.
async function discoverAndAddLocation(auth, config) {
  console.log('\nRecherche des établissements liés à votre compte Google...');
  const accounts = await listAccounts(auth);

  if (accounts.length === 0) {
    throw new Error('Aucun compte Google Business Profile trouvé pour cet utilisateur.');
  }

  const candidates = [];
  for (const account of accounts) {
    const locations = await listLocations(auth, account.name);
    for (const location of locations) {
      candidates.push({ account, location });
    }
  }

  if (candidates.length === 0) {
    throw new Error("Aucune fiche d'établissement trouvée pour ce compte Google.");
  }

  const { chosenIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosenIndex',
      message: 'Quelle fiche établissement voulez-vous ajouter ?',
      choices: candidates.map((candidate, index) => ({
        name: candidate.location.title,
        value: index,
      })),
    },
  ]);

  const { account, location } = candidates[chosenIndex];
  const accountId = extractId(account.name);
  const locationId = extractId(location.name);

  const newEntry = {
    key: `${accountId}_${locationId}`,
    label: location.title,
    accountId,
    locationId,
  };

  config.locations.push(newEntry);
  saveConfig(config);

  console.log(`✅ Fiche "${location.title}" enregistrée pour les prochains lancements.\n`);
  return newEntry;
}

// Point d'entrée : renvoie l'établissement à traiter pour cette session.
// - Aucune fiche connue -> lance la découverte.
// - Une seule fiche -> la sélectionne automatiquement.
// - Plusieurs fiches -> vous laisse choisir (ou en ajouter une nouvelle).
export async function chooseLocation(auth) {
  const config = loadConfig();

  if (config.locations.length === 0) {
    return discoverAndAddLocation(auth, config);
  }

  if (config.locations.length === 1) {
    return config.locations[0];
  }

  const { chosenKey } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosenKey',
      message: 'Quel établissement voulez-vous traiter ?',
      choices: [
        ...config.locations.map((location) => ({ name: location.label, value: location.key })),
        { name: '+ Ajouter une nouvelle fiche', value: '__add__' },
      ],
    },
  ]);

  if (chosenKey === '__add__') {
    return discoverAndAddLocation(auth, config);
  }

  return config.locations.find((location) => location.key === chosenKey);
}

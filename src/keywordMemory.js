// Mémorise les mots-clés SEO déjà utilisés récemment, par établissement,
// pour éviter que l'IA répète toujours le même mot d'une réponse à l'autre.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'keyword-history.json');

const HISTORY_LIMIT_PER_LOCATION = 20; // évite un fichier qui grossit indéfiniment
const RECENT_COUNT = 3; // nombre de mots-clés récents à faire éviter à l'IA

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
}

function saveHistory(history) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

// Renvoie les derniers mots-clés utilisés pour cet établissement (les plus
// récents en premier), à donner à l'IA pour qu'elle en choisisse un autre.
export function getRecentKeywords(locationKey) {
  const history = loadHistory();
  const entries = history[locationKey] || [];
  const recent = entries
    .slice(-RECENT_COUNT)
    .reverse()
    .map((entry) => entry.keyword);
  return [...new Set(recent)];
}

export function recordKeyword(locationKey, keyword) {
  if (!keyword) return;
  const history = loadHistory();
  const entries = history[locationKey] || [];
  entries.push({ keyword, date: new Date().toISOString() });
  history[locationKey] = entries.slice(-HISTORY_LIMIT_PER_LOCATION);
  saveHistory(history);
}

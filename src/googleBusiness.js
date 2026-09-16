// Appels aux API Google Business Profile :
// - Account Management : lister les comptes
// - Business Information : lister les fiches établissement d'un compte
// - Reviews v4 (API historique, toujours utilisée pour les avis) :
//   lister les avis et publier une réponse.

import { authorizedFetch } from './httpClient.js';

const ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4';

async function parseJsonOrThrow(res, contextLabel) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${contextLabel} a échoué (HTTP ${res.status}) : ${body}`);
  }
  return res.json();
}

export async function listAccounts(auth) {
  const res = await authorizedFetch(auth, `${ACCOUNT_MGMT_BASE}/accounts`);
  const data = await parseJsonOrThrow(res, 'La récupération des comptes Google');
  return data.accounts || [];
}

// `accountName` est le nom de ressource complet, ex: "accounts/1234567890".
export async function listLocations(auth, accountName) {
  const url = `${BUSINESS_INFO_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress`;
  const res = await authorizedFetch(auth, url);
  const data = await parseJsonOrThrow(res, 'La récupération des fiches établissement');
  return data.locations || [];
}

// Renvoie uniquement les avis qui n'ont pas encore de réponse publiée.
export async function listUnansweredReviews(auth, accountId, locationId) {
  const baseUrl = `${REVIEWS_BASE}/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`;
  let reviews = [];
  let pageToken;

  do {
    const url = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
    const res = await authorizedFetch(auth, url);
    const data = await parseJsonOrThrow(res, 'La récupération des avis');
    reviews = reviews.concat(data.reviews || []);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return reviews.filter((review) => !review.reviewReply);
}

export async function publishReply(auth, accountId, locationId, reviewId, comment) {
  const url = `${REVIEWS_BASE}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
  const res = await authorizedFetch(auth, url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  return parseJsonOrThrow(res, 'La publication de la réponse');
}

// Les noms de ressource Google ("accounts/123", "locations/456") doivent
// être réduits à leur seul identifiant numérique pour l'API v4 des avis.
export function extractId(resourceName) {
  return resourceName.split('/').pop();
}

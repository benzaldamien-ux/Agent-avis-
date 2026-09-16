// Petit utilitaire pour appeler les API Google avec le jeton OAuth courant.
// On utilise `fetch`, disponible nativement depuis Node 18+, plutôt qu'une
// dépendance supplémentaire.

export async function authorizedFetch(auth, url, options = {}) {
  // getAccessToken() rafraîchit automatiquement le jeton s'il a expiré.
  const { token } = await auth.getAccessToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

import { createOAuthClient, ACCOUNT_MANAGEMENT_BASE, BUSINESS_INFORMATION_BASE } from '../googleClient.js';

interface Account {
  name: string;
  accountName: string;
}

interface Location {
  name: string;
  title: string;
}

export async function listAccountsCommand(): Promise<void> {
  const auth = createOAuthClient();

  const accountsRes = await auth.request<{ accounts?: Account[] }>({
    url: `${ACCOUNT_MANAGEMENT_BASE}/accounts`,
    method: 'GET',
  });

  const accounts = accountsRes.data.accounts ?? [];
  if (accounts.length === 0) {
    console.log('Aucun compte Business Profile trouvé pour cet utilisateur.');
    return;
  }

  for (const account of accounts) {
    const accountId = account.name.split('/')[1];
    console.log(`\nCompte : ${account.accountName}`);
    console.log(`  GOOGLE_ACCOUNT_ID=${accountId}`);

    const locationsRes = await auth.request<{ locations?: Location[] }>({
      url: `${BUSINESS_INFORMATION_BASE}/${account.name}/locations`,
      method: 'GET',
      params: { readMask: 'name,title' },
    });

    const locations = locationsRes.data.locations ?? [];
    if (locations.length === 0) {
      console.log('  (aucun établissement rattaché à ce compte)');
      continue;
    }
    for (const location of locations) {
      const locationId = location.name.split('/')[1];
      console.log(`  - ${location.title} → GOOGLE_LOCATION_ID=${locationId}`);
    }
  }
}

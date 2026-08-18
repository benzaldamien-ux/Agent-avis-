import { google } from 'googleapis';

const MYBUSINESS_REVIEWS_BASE = 'https://mybusiness.googleapis.com/v4';
export const ACCOUNT_MANAGEMENT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
export const BUSINESS_INFORMATION_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
export const OAUTH_SCOPE = 'https://www.googleapis.com/auth/business.manage';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export function createOAuthClient() {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://127.0.0.1:53682/oauth2callback';
  const refreshToken = requireEnv('GOOGLE_REFRESH_TOKEN');

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export type StarRating = 'STAR_RATING_UNSPECIFIED' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';

export interface GoogleReview {
  reviewId: string;
  reviewer?: { displayName?: string };
  starRating: StarRating;
  comment?: string;
  createTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

const STAR_MAP: Record<StarRating, number> = {
  STAR_RATING_UNSPECIFIED: 0,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export function starRatingToNumber(rating: StarRating): number {
  return STAR_MAP[rating];
}

export async function listReviews(): Promise<GoogleReview[]> {
  const accountId = requireEnv('GOOGLE_ACCOUNT_ID');
  const locationId = requireEnv('GOOGLE_LOCATION_ID');
  const auth = createOAuthClient();

  const reviews: GoogleReview[] = [];
  let pageToken: string | undefined;

  do {
    const res = await auth.request<{ reviews?: GoogleReview[]; nextPageToken?: string }>({
      url: `${MYBUSINESS_REVIEWS_BASE}/accounts/${accountId}/locations/${locationId}/reviews`,
      method: 'GET',
      params: pageToken ? { pageToken, pageSize: 50 } : { pageSize: 50 },
    });
    reviews.push(...(res.data.reviews ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return reviews;
}

export async function replyToReview(reviewId: string, comment: string): Promise<void> {
  const accountId = requireEnv('GOOGLE_ACCOUNT_ID');
  const locationId = requireEnv('GOOGLE_LOCATION_ID');
  const auth = createOAuthClient();

  await auth.request({
    url: `${MYBUSINESS_REVIEWS_BASE}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
    method: 'PUT',
    data: { comment },
  });
}

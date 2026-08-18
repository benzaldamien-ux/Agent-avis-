import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'published';

export interface StoredReview {
  reviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string;
  createTime: string;
  draftReply: string;
  status: ReviewStatus;
  publishedReply?: string;
  updatedAt: string;
}

function dataFile(): string {
  return process.env.DATA_FILE ?? 'data/reviews.json';
}

async function ensureFile(): Promise<void> {
  const file = dataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, '[]\n', 'utf-8');
  }
}

export async function loadReviews(): Promise<StoredReview[]> {
  await ensureFile();
  const raw = await fs.readFile(dataFile(), 'utf-8');
  return JSON.parse(raw) as StoredReview[];
}

export async function saveReviews(reviews: StoredReview[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(dataFile(), JSON.stringify(reviews, null, 2) + '\n', 'utf-8');
}

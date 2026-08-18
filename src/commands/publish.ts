import { replyToReview } from '../googleClient.js';
import { loadReviews, saveReviews } from '../store.js';

export async function publishCommand(): Promise<void> {
  const reviews = await loadReviews();
  const approved = reviews.filter((r) => r.status === 'approved');

  if (approved.length === 0) {
    console.log('Aucune réponse approuvée à publier. Lance `npm run review` pour en valider.');
    return;
  }

  for (const review of approved) {
    console.log(`Publication de la réponse à l'avis de ${review.reviewerName}...`);
    await replyToReview(review.reviewId, review.draftReply);
    review.status = 'published';
    review.publishedReply = review.draftReply;
    review.updatedAt = new Date().toISOString();
  }

  await saveReviews(reviews);
  console.log(`${approved.length} réponse(s) publiée(s) sur Google.`);
}

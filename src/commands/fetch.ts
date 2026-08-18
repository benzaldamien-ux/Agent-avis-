import { listReviews, starRatingToNumber } from '../googleClient.js';
import { generateReply, loadBusinessProfile } from '../claudeClient.js';
import { loadReviews, saveReviews, type StoredReview } from '../store.js';

export async function fetchCommand(): Promise<void> {
  const [googleReviews, stored] = await Promise.all([listReviews(), loadReviews()]);
  const known = new Set(stored.map((r) => r.reviewId));
  const profile = loadBusinessProfile();

  let created = 0;
  let skippedAlreadyReplied = 0;

  for (const review of googleReviews) {
    if (review.reviewReply) {
      skippedAlreadyReplied++;
      continue;
    }
    if (known.has(review.reviewId)) {
      continue;
    }

    console.log(`Génération d'un brouillon pour l'avis de ${review.reviewer?.displayName ?? 'client anonyme'}...`);
    const draftReply = await generateReply(review, profile);

    const entry: StoredReview = {
      reviewId: review.reviewId,
      reviewerName: review.reviewer?.displayName ?? 'Client',
      starRating: starRatingToNumber(review.starRating),
      comment: review.comment ?? '',
      createTime: review.createTime,
      draftReply,
      status: 'pending_review',
      updatedAt: new Date().toISOString(),
    };
    stored.push(entry);
    created++;
  }

  await saveReviews(stored);
  console.log(
    `Terminé. ${created} nouveau(x) brouillon(s) créé(s). ${skippedAlreadyReplied} avis déjà répondu(s) directement sur Google ignoré(s).`,
  );
  if (created > 0) {
    console.log('Lance `npm run review` pour les relire et les valider.');
  }
}

import { select, editor } from '@inquirer/prompts';
import { loadReviews, saveReviews } from '../store.js';

const STARS: Record<number, string> = {
  1: '★☆☆☆☆',
  2: '★★☆☆☆',
  3: '★★★☆☆',
  4: '★★★★☆',
  5: '★★★★★',
};

export async function reviewCommand(): Promise<void> {
  const reviews = await loadReviews();
  const pending = reviews.filter((r) => r.status === 'pending_review');

  if (pending.length === 0) {
    console.log("Aucun brouillon en attente de validation. Lance d'abord `npm run fetch`.");
    return;
  }

  for (const review of pending) {
    console.log('\n' + '─'.repeat(60));
    console.log(`${STARS[review.starRating] ?? review.starRating} — ${review.reviewerName} (${review.createTime})`);
    console.log(review.comment || '(pas de commentaire écrit)');
    console.log('\nBrouillon de réponse :\n' + review.draftReply);

    const action = await select({
      message: 'Que veux-tu faire ?',
      choices: [
        { name: 'Approuver tel quel', value: 'approve' as const },
        { name: 'Modifier puis approuver', value: 'edit' as const },
        { name: 'Rejeter (ne pas répondre à cet avis)', value: 'reject' as const },
        { name: 'Passer pour plus tard', value: 'skip' as const },
      ],
    });

    if (action === 'skip') {
      continue;
    }

    if (action === 'edit') {
      review.draftReply = await editor({ message: 'Édite la réponse', default: review.draftReply });
    }

    review.status = action === 'reject' ? 'rejected' : 'approved';
    review.updatedAt = new Date().toISOString();
  }

  await saveReviews(reviews);
  console.log('\nValidation terminée. Lance `npm run publish` pour envoyer les réponses approuvées sur Google.');
}

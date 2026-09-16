// Point d'entrée : orchestre tout le workflow décrit dans le README.
//   1. Authentification Google (OAuth)
//   2. Sélection de l'établissement
//   3. Récupération des avis sans réponse
//   4. Génération d'une proposition de réponse via Claude
//   5. Validation humaine obligatoire (publier / modifier / passer / quitter)
//   6. Publication de la réponse validée sur Google

import 'dotenv/config';
import { getAuthenticatedClient } from './auth.js';
import { chooseLocation } from './locations.js';
import { listUnansweredReviews, publishReply } from './googleBusiness.js';
import { buildSystemPrompt, ratingToNumber, detectKeyword } from './systemPrompt.js';
import { generateReply } from './claude.js';
import { getRecentKeywords, recordKeyword } from './keywordMemory.js';
import { displayReview, askValidation, askEditedReply } from './cli.js';

function keywordWarning(rating, keyword) {
  if (rating > 2 || !keyword) return null;
  return `Mot-clé SEO "${keyword}" détecté sur un avis ${rating} étoile(s) — interdit sur ces notes, à retirer manuellement si besoin.`;
}

async function main() {
  console.log('🍽️  Assistant de réponse aux avis — Asteburua\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante. Créez un fichier .env à partir de .env.example et renseignez votre clé."
    );
  }

  const auth = await getAuthenticatedClient();
  const location = await chooseLocation(auth);

  console.log(`\n📍 Établissement sélectionné : ${location.label}`);
  console.log('Récupération des avis en attente de réponse...');

  const reviews = await listUnansweredReviews(auth, location.accountId, location.locationId);

  if (reviews.length === 0) {
    console.log('\n✅ Aucun avis en attente de réponse. Rien à faire.');
    return;
  }

  console.log(`${reviews.length} avis sans réponse trouvé(s).\n`);

  let published = 0;
  let skipped = 0;

  for (const review of reviews) {
    const rating = ratingToNumber(review.starRating);
    const reviewText = review.comment || '';
    const recentKeywords = getRecentKeywords(location.key);
    const systemPrompt = buildSystemPrompt(rating, recentKeywords);

    let proposedReply = await generateReply({
      systemPrompt,
      reviewText: reviewText || '(Avis sans commentaire écrit, juste une note)',
      reviewerName: review.reviewer?.displayName,
      rating,
    });
    let keyword = detectKeyword(proposedReply);

    let action;
    // On réaffiche l'avis à chaque modification pour valider le nouveau texte.
    for (;;) {
      displayReview(review, rating, proposedReply, keywordWarning(rating, keyword));
      action = await askValidation();

      if (action !== 'edit') break;

      proposedReply = await askEditedReply(proposedReply);
      keyword = detectKeyword(proposedReply);
    }

    if (action === 'quit') {
      console.log('\n👋 Arrêt demandé. À bientôt !');
      break;
    }

    if (action === 'skip') {
      skipped++;
      continue;
    }

    // action === 'publish'
    await publishReply(auth, location.accountId, location.locationId, review.reviewId, proposedReply);
    if (keyword && rating > 2) {
      recordKeyword(location.key, keyword);
    }
    published++;
    console.log('✅ Réponse publiée sur Google.\n');
  }

  console.log(`\nRésumé : ${published} réponse(s) publiée(s), ${skipped} avis passé(s).`);
}

main().catch((err) => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});

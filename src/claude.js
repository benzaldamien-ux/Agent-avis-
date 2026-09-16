// Appel à l'API Anthropic pour générer une proposition de réponse.
// La clé ANTHROPIC_API_KEY est lue automatiquement depuis process.env
// (chargée par dotenv dans index.js via le fichier .env).

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 300;

const anthropic = new Anthropic();

export async function generateReply({ systemPrompt, reviewText, reviewerName, rating }) {
  const reviewerLabel = reviewerName ? ` de ${reviewerName}` : '';
  const userMessage = `Avis client (note : ${rating}/5)${reviewerLabel} :\n"""${reviewText}"""\n\nRédige la réponse à publier.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content[0].text.trim();
}

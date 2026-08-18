import Anthropic from '@anthropic-ai/sdk';
import { starRatingToNumber, type GoogleReview } from './googleClient.js';

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Variable d'environnement manquante: ANTHROPIC_API_KEY");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface BusinessProfile {
  name: string;
  tone: string;
  language: string;
  signature: string;
}

export function loadBusinessProfile(): BusinessProfile {
  return {
    name: process.env.BUSINESS_NAME ?? 'notre entreprise',
    tone: process.env.BUSINESS_TONE ?? 'professionnel, chaleureux et concis',
    language: process.env.BUSINESS_LANGUAGE ?? 'français',
    signature: process.env.BUSINESS_SIGNATURE ?? '',
  };
}

function buildSystemPrompt(profile: BusinessProfile): string {
  return [
    `Tu rédiges, au nom de l'entreprise "${profile.name}", des réponses publiques aux avis clients laissés sur sa fiche Google Business Profile.`,
    `Ton à adopter : ${profile.tone}.`,
    `Langue de réponse : ${profile.language}.`,
    'Règles impératives :',
    "- Reste factuel : ne promets rien (remboursement, geste commercial, délai) et n'invente aucun détail sur la commande ou la visite du client.",
    '- Pour les avis positifs (4-5 étoiles) : remercie sincèrement, sans formule excessive ni répétitive.',
    "- Pour les avis négatifs (1-3 étoiles) : reconnais le problème avec empathie, présente des excuses si pertinent, et invite le client à échanger en privé pour résoudre la situation.",
    '- Reste concis : 2 à 4 phrases maximum.',
    "- Adapte chaque réponse au contenu réel de l'avis plutôt que d'utiliser un modèle générique.",
    profile.signature
      ? `- Termine la réponse par exactement cette signature : "${profile.signature}".`
      : '- Ne signe pas la réponse avec un nom individuel.',
    '- Réponds uniquement avec le texte final de la réponse, sans guillemets ni préambule.',
  ].join('\n');
}

export async function generateReply(review: GoogleReview, profile: BusinessProfile): Promise<string> {
  const anthropic = getClient();
  const rating = starRatingToNumber(review.starRating);
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

  const userPrompt = [
    `Avis client (${rating}/5 étoiles) de ${review.reviewer?.displayName ?? 'un client'} :`,
    review.comment?.trim() ? `"${review.comment.trim()}"` : '(aucun commentaire écrit, seulement une note)',
  ].join('\n');

  const message = await anthropic.messages.create({
    model,
    max_tokens: 400,
    system: buildSystemPrompt(profile),
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Réponse inattendue de Claude : aucun contenu texte.');
  }
  return textBlock.text.trim();
}

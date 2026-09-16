// Interface console pour la validation humaine : c'est ici que rien ne part
// en publication sans votre accord explicite.

import inquirer from 'inquirer';

function stars(rating) {
  return '⭐'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
}

export function displayReview(review, rating, proposedReply, warning) {
  const author = review.reviewer?.displayName || 'Client anonyme';
  const text = review.comment || '(avis sans commentaire écrit, juste une note)';

  console.log('\n' + '─'.repeat(70));
  console.log(`${stars(rating)}  (${rating}/5) — ${author}`);
  console.log(`"${text}"`);
  console.log('\nRéponse proposée :');
  console.log(proposedReply);
  if (warning) {
    console.log(`\n⚠️  ${warning}`);
  }
  console.log('─'.repeat(70));
}

export async function askValidation() {
  const { action } = await inquirer.prompt([
    {
      type: 'select',
      name: 'action',
      message: 'Que faire pour cet avis ?',
      choices: [
        { name: 'Publier tel quel', value: 'publish' },
        { name: 'Modifier avant publication', value: 'edit' },
        { name: 'Passer cet avis (ne rien publier)', value: 'skip' },
        { name: 'Quitter le programme', value: 'quit' },
      ],
    },
  ]);
  return action;
}

// Ouvre votre éditeur de texte habituel (celui défini par la variable
// d'environnement EDITOR, nano/vim par défaut sur Mac/Linux) avec la
// réponse proposée pré-remplie, pour que vous puissiez la corriger.
export async function askEditedReply(currentText) {
  const { edited } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'edited',
      message: 'Modifiez la réponse puis enregistrez et fermez l\'éditeur :',
      default: currentText,
    },
  ]);
  return edited.trim();
}

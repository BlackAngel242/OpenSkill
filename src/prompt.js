const readline = require('readline');

/**
 * L'interactivité n'est possible que si l'entrée et la sortie sont un
 * terminal. En CI ou dans un pipe, l'appelant doit retomber sur un défaut.
 */
function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Sélection multiple parmi une liste.
 * Entrée vide = sélection par défaut ; "0" ou "tous" = tout sélectionner.
 *
 * @param {Array<{label: string, hint?: string, selected?: boolean}>} choices
 * @returns {Promise<number[]>} indices retenus
 */
async function multiSelect(question, choices) {
  console.log(`\n${question}`);
  choices.forEach((choice, index) => {
    const mark = choice.selected ? '●' : '○';
    const hint = choice.hint ? `  ${choice.hint}` : '';
    console.log(`  ${index + 1}) ${mark} ${choice.label}${hint}`);
  });

  const defaults = choices.map((c, i) => (c.selected ? i : -1)).filter(i => i !== -1);
  const defaultLabel = defaults.length ? defaults.map(i => i + 1).join(',') : 'aucune';

  const answer = await ask(
    `\nNuméros séparés par des virgules (0 = toutes, Entrée = ${defaultLabel}) : `
  );

  if (answer === '') return defaults;
  if (answer === '0' || answer.toLowerCase() === 'tous' || answer.toLowerCase() === 'toutes') {
    return choices.map((_, i) => i);
  }

  const picked = new Set();
  for (const token of answer.split(',')) {
    const index = Number.parseInt(token.trim(), 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < choices.length) {
      picked.add(index);
    }
  }
  return [...picked].sort((a, b) => a - b);
}

async function confirm(question, defaultYes = true) {
  const suffix = defaultYes ? '[O/n]' : '[o/N]';
  const answer = (await ask(`${question} ${suffix} `)).toLowerCase();
  if (answer === '') return defaultYes;
  return answer === 'o' || answer === 'oui' || answer === 'y' || answer === 'yes';
}

module.exports = { isInteractive, ask, multiSelect, confirm };

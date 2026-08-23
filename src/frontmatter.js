/**
 * Minimal YAML frontmatter parser.
 *
 * Volontairement sans dépendance externe : le CLI doit rester installable
 * via `npx` sans arbre de dépendances. Ne gère que le sous-ensemble utilisé
 * par les fichiers SKILL.md : `clé: valeur` et listes `- item`.
 */

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

function stripQuotes(value) {
  const match = value.match(/^(['"])([\s\S]*)\1$/);
  return match ? match[2] : value;
}

/**
 * Extrait le bloc frontmatter d'un contenu Markdown.
 * @returns {object|null} Les clés du frontmatter, ou null s'il est absent.
 */
function parseFrontmatter(content) {
  if (typeof content !== 'string') return null;

  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return null;

  const result = {};
  let currentListKey = null;

  for (const rawLine of match[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

    const listItem = rawLine.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      result[currentListKey].push(stripQuotes(listItem[1].trim()));
      continue;
    }

    const keyValue = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;

    const [, key, rawValue] = keyValue;
    const value = rawValue.trim();

    if (value === '') {
      // Une clé sans valeur inline introduit une liste.
      currentListKey = key;
      result[key] = [];
    } else {
      currentListKey = null;
      result[key] = stripQuotes(value);
    }
  }

  return result;
}

module.exports = { parseFrontmatter };

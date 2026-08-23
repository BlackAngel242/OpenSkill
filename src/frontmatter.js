/**
 * Minimal YAML frontmatter parser.
 *
 * Volontairement sans dépendance externe : le CLI doit rester installable
 * via `npx` sans arbre de dépendances. Gère le sous-ensemble utilisé par les
 * fichiers SKILL.md : `clé: valeur`, listes `- item`, et scalaires de bloc
 * multi-lignes (`>` replié et `|` littéral, avec indicateurs de chomping).
 */

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

function stripQuotes(value) {
  const match = value.match(/^(['"])([\s\S]*)\1$/);
  return match ? match[2] : value;
}

function indentOf(line) {
  const match = line.match(/^(\s*)/);
  return match[1].length;
}

/**
 * Assemble un scalaire de bloc YAML.
 *
 * @param {string[]} lines Lignes du bloc, indentation comprise.
 * @param {string} style '>' (replié) ou '|' (littéral).
 * @param {string} chomp '' (clip), '-' (strip) ou '+' (keep).
 */
function joinBlockScalar(lines, style, chomp) {
  if (lines.length === 0) return '';

  const indents = lines.filter(l => l.trim()).map(indentOf);
  const baseIndent = indents.length ? Math.min(...indents) : 0;
  const stripped = lines.map(l => l.slice(baseIndent).trimEnd());

  let value;
  if (style === '|') {
    value = stripped.join('\n');
  } else {
    // Repli : les lignes d'un même paragraphe sont jointes par une espace,
    // une ligne vide reste une séparation de paragraphe.
    const paragraphs = [];
    let current = [];
    for (const line of stripped) {
      if (line.trim() === '') {
        paragraphs.push(current.join(' '));
        current = [];
      } else {
        current.push(line.trim());
      }
    }
    paragraphs.push(current.join(' '));
    value = paragraphs.join('\n').trim();
  }

  if (chomp === '-') return value.replace(/\n+$/, '');
  if (chomp === '+') return value;
  return value.replace(/\n+$/, '\n').replace(/\n$/, '');
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
  const lines = match[1].split(/\r?\n/);
  let currentListKey = null;
  let currentMapKey = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

    const listItem = rawLine.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      result[currentListKey].push(stripQuotes(listItem[1].trim()));
      continue;
    }

    // Map imbriquée sur un niveau : le standard Agent Skills range les
    // métadonnées libres (author, version...) sous la clé `metadata`.
    const nested = rawLine.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nested && currentMapKey) {
      result[currentMapKey][nested[1]] = stripQuotes(nested[2].trim());
      continue;
    }

    const keyValue = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) continue;

    const [, key, rawValue] = keyValue;
    const value = rawValue.trim();

    const blockScalar = value.match(/^([>|])([-+]?)$/);
    if (blockScalar) {
      // Le bloc s'étend tant que les lignes sont plus indentées que la clé.
      const keyIndent = indentOf(rawLine);
      const block = [];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === '' || indentOf(lines[j]) > keyIndent)) {
        block.push(lines[j]);
        j += 1;
      }
      result[key] = joinBlockScalar(block, blockScalar[1], blockScalar[2]);
      currentListKey = null;
      currentMapKey = null;
      i = j - 1;
      continue;
    }

    if (value === '') {
      // Une clé sans valeur inline introduit une liste ou une map : le type
      // se décide sur la première ligne indentée qui suit.
      const next = lines.slice(i + 1).find(l => l.trim() !== '');
      if (next && /^\s+-\s+/.test(next)) {
        currentListKey = key;
        currentMapKey = null;
        result[key] = [];
      } else if (next && /^\s+[A-Za-z0-9_-]+:/.test(next)) {
        currentMapKey = key;
        currentListKey = null;
        result[key] = {};
      } else {
        currentListKey = key;
        currentMapKey = null;
        result[key] = [];
      }
    } else {
      currentListKey = null;
      currentMapKey = null;
      result[key] = stripQuotes(value);
    }
  }

  return result;
}

/**
 * Sépare le frontmatter du corps Markdown.
 * @returns {{meta: object|null, body: string}}
 */
function splitFrontmatter(content) {
  if (typeof content !== 'string') return { meta: null, body: '' };

  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return { meta: null, body: content.trim() };

  return {
    meta: parseFrontmatter(content),
    body: content.slice(match[0].length).replace(/^\s*\n/, '').trimEnd()
  };
}

/**
 * Sérialise un objet en frontmatter YAML (chaînes et listes de chaînes).
 */
function stringifyFrontmatter(fields) {
  const lines = ['---'];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${item}`);
    } else if (typeof value === 'string' && (value.includes('\n') || value.includes(':') || value.includes('#'))) {
      lines.push(`${key}: "${value.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

module.exports = { parseFrontmatter, splitFrontmatter, stringifyFrontmatter };

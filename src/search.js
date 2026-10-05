const { collectSkills, readSkillMetadata } = require('./catalog');

/**
 * Charge toutes les compétences d'un dépôt avec leurs métadonnées.
 */
function listSkills(sourceDir, onWarn = () => {}) {
  const { skills, source } = collectSkills(sourceDir, onWarn);
  return {
    source,
    skills: skills.map(readSkillMetadata).sort((a, b) => a.name.localeCompare(b.name))
  };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filtre des compétences sur leur nom, description, catégorie et tags.
 * La recherche est insensible à la casse et aux accents ; tous les termes
 * de la requête doivent correspondre.
 */
function searchSkills(skills, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return skills;

  return skills.filter(skill => {
    const haystack = normalize(
      [skill.name, skill.description, skill.category, skill.author, (skill.tags || []).join(' ')].join(' ')
    );
    return terms.every(term => haystack.includes(term));
  });
}

module.exports = { listSkills, searchSkills };

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

const SKILL_NAME_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

// Convention publique documentée dans le README : minuscules, chiffres, tirets.
const SKILL_NAME_CONVENTION_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidSkillName(name) {
  return typeof name === 'string' && SKILL_NAME_REGEX.test(name);
}

function followsNamingConvention(name) {
  return typeof name === 'string' && SKILL_NAME_CONVENTION_REGEX.test(name);
}

/**
 * Parcourt récursivement un répertoire à la recherche de dossiers SKILL.md.
 */
function scanDirectoryForSkills(dir, results = []) {
  if (!fs.existsSync(dir)) return results;

  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return results;
  }

  const skillMdFile = items.find(item => item.isFile() && item.name.toLowerCase() === 'skill.md');
  if (skillMdFile) {
    const skillMdPath = path.join(dir, skillMdFile.name);

    let skillName = null;
    try {
      const meta = parseFrontmatter(fs.readFileSync(skillMdPath, 'utf8'));
      if (meta && typeof meta.name === 'string') {
        skillName = meta.name.trim();
      }
    } catch (e) {
      // Lecture impossible : on retombe sur le nom du dossier.
    }

    if (!skillName || !isValidSkillName(skillName)) {
      const baseName = path.basename(dir);
      skillName = isValidSkillName(baseName) ? baseName : null;
    }

    if (skillName && isValidSkillName(skillName)) {
      results.push({ name: skillName, path: dir, skillMdPath });
    }

    return results;
  }

  for (const item of items) {
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      scanDirectoryForSkills(path.join(dir, item.name), results);
    }
  }

  return results;
}

/**
 * Charge les compétences d'un dépôt : registry.json en priorité, scan sinon.
 *
 * @param {string} sourceDir Racine du dépôt.
 * @param {(message: string) => void} [onWarn] Rapporte les entrées ignorées.
 * @returns {{skills: Array, source: 'registry'|'scan'}}
 */
function collectSkills(sourceDir, onWarn = () => {}) {
  const skills = [];
  const registryPath = path.join(sourceDir, 'registry.json');

  if (fs.existsSync(registryPath)) {
    try {
      const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      if (registryData && Array.isArray(registryData.skills)) {
        const resolvedSourceDir = path.resolve(sourceDir);
        for (const item of registryData.skills) {
          if (!item || !item.name || !item.path || !isValidSkillName(item.name)) continue;

          const fullSkillMdPath = path.resolve(sourceDir, item.path);
          // Confinement : une entrée du registre ne doit jamais sortir du dépôt.
          if (
            !fullSkillMdPath.startsWith(resolvedSourceDir + path.sep) &&
            fullSkillMdPath !== resolvedSourceDir
          ) {
            onWarn(`Chemin de compétence hors périmètre ignoré : ${item.path}`);
            continue;
          }

          if (!fs.existsSync(fullSkillMdPath)) {
            onWarn(
              `Compétence "${item.name}" listée dans le registre mais introuvable à la destination : ${item.path}`
            );
            continue;
          }

          skills.push({
            name: item.name,
            category: item.category || null,
            path: path.dirname(fullSkillMdPath),
            skillMdPath: fullSkillMdPath
          });
        }
      }
    } catch (err) {
      onWarn(`Impossible de charger registry.json : ${err.message}. Passage en mode scan automatique.`);
    }
  }

  if (skills.length > 0) {
    return { skills, source: 'registry' };
  }

  return { skills: scanDirectoryForSkills(sourceDir), source: 'scan' };
}

/**
 * Enrichit une compétence avec les métadonnées de son frontmatter.
 */
function readSkillMetadata(skill) {
  let meta = null;
  try {
    meta = parseFrontmatter(fs.readFileSync(skill.skillMdPath, 'utf8'));
  } catch (err) {
    meta = null;
  }

  const tags = Array.isArray(meta && meta.tags) ? meta.tags : [];

  // Le standard Agent Skills range les champs libres sous `metadata`.
  // La forme à plat reste acceptée : les deux coexistent dans la nature.
  const extra = (meta && typeof meta.metadata === 'object' && !Array.isArray(meta.metadata)) ? meta.metadata : {};

  return {
    ...skill,
    category: skill.category || (meta && meta.category) || extra.category || null,
    description: (meta && meta.description) || '',
    version: (meta && meta.version) || extra.version || '',
    author: (meta && meta.author) || extra.author || '',
    license: (meta && meta.license) || '',
    tags,
    frontmatter: meta
  };
}

module.exports = {
  SKILL_NAME_REGEX,
  SKILL_NAME_CONVENTION_REGEX,
  isValidSkillName,
  followsNamingConvention,
  scanDirectoryForSkills,
  collectSkills,
  readSkillMetadata
};

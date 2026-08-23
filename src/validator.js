const fs = require('fs');
const path = require('path');

const {
  followsNamingConvention,
  scanDirectoryForSkills,
  readSkillMetadata
} = require('./catalog');

// Le standard Agent Skills (agentskills.io) n'exige que `name` et
// `description`. Le dépôt OpenSkill demande en plus auteur, version et tags
// pour alimenter le registre et la recherche.
const SPEC_REQUIRED_FIELDS = ['name', 'description'];
const LIBRARY_REQUIRED_FIELDS = ['version', 'author', 'tags'];
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

function relative(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}

/**
 * Valide une compétence : frontmatter, cohérence nom/dossier, conventions.
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateSkill(skill, root) {
  const errors = [];
  const warnings = [];
  const location = relative(root, skill.skillMdPath);
  const meta = readSkillMetadata(skill);

  if (!meta.frontmatter) {
    errors.push(`${location} : frontmatter YAML manquant ou mal formé.`);
    return { errors, warnings };
  }

  const isMissing = value =>
    value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

  for (const field of SPEC_REQUIRED_FIELDS) {
    if (isMissing(meta.frontmatter[field])) {
      errors.push(`${location} : champ obligatoire "${field}" manquant ou vide (standard Agent Skills).`);
    }
  }

  // Ces champs sont acceptés à plat ou sous `metadata`, comme le prévoit
  // le standard pour les métadonnées libres.
  for (const field of LIBRARY_REQUIRED_FIELDS) {
    if (isMissing(meta.frontmatter[field]) && isMissing(meta[field])) {
      errors.push(`${location} : champ obligatoire "${field}" manquant ou vide.`);
    }
  }

  const folderName = path.basename(skill.path);
  if (meta.frontmatter.name && meta.frontmatter.name !== folderName) {
    errors.push(
      `${location} : le nom "${meta.frontmatter.name}" ne correspond pas au dossier "${folderName}".`
    );
  }

  if (meta.frontmatter.name && !followsNamingConvention(meta.frontmatter.name)) {
    errors.push(
      `${location} : le nom "${meta.frontmatter.name}" ne respecte pas la convention (minuscules, chiffres et tirets, sans tiret initial, final ou doublé).`
    );
  }

  if (meta.frontmatter.name && String(meta.frontmatter.name).length > MAX_NAME_LENGTH) {
    errors.push(
      `${location} : le nom dépasse ${MAX_NAME_LENGTH} caractères (limite du standard Agent Skills).`
    );
  }

  if (meta.version && !SEMVER_REGEX.test(String(meta.version))) {
    errors.push(`${location} : la version "${meta.version}" doit suivre le format MAJEUR.MINEUR.CORRECTIF.`);
  }

  if (meta.frontmatter.tags !== undefined && !Array.isArray(meta.frontmatter.tags)) {
    errors.push(`${location} : "tags" doit être une liste YAML.`);
  }

  // La description sert de condition de déclenchement : elle est
  // légitimement longue, mais le standard la plafonne à 1024 caractères.
  if (meta.description && meta.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `${location} : description de ${meta.description.length} caractères, au-delà de la limite de ${MAX_DESCRIPTION_LENGTH} du standard Agent Skills.`
    );
  }

  return { errors, warnings };
}

/**
 * Construit le contenu attendu de registry.json à partir des compétences du disque.
 */
function buildRegistry(root, skills) {
  const entries = skills
    .map(skill => {
      const meta = readSkillMetadata(skill);
      const skillPath = relative(root, skill.skillMdPath);
      // La catégorie est le dossier parent de la compétence (skills/<catégorie>/<nom>).
      const category = meta.frontmatter && meta.frontmatter.category
        ? meta.frontmatter.category
        : path.basename(path.dirname(skill.path));

      return {
        name: meta.name,
        category,
        path: skillPath,
        author: meta.author || 'OpenSkill Community',
        version: meta.version || '0.0.0',
        description: meta.description || '',
        tags: meta.tags
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { skills: entries };
}

/**
 * Vérifie l'ensemble d'un dépôt de compétences.
 *
 * @param {string} root Racine du dépôt.
 * @returns {{errors: string[], warnings: string[], skills: Array, expectedRegistry: object}}
 */
function validateRepository(root) {
  const resolvedRoot = path.resolve(root);
  const skillsDir = path.join(resolvedRoot, 'skills');
  const searchRoot = fs.existsSync(skillsDir) ? skillsDir : resolvedRoot;

  const skills = scanDirectoryForSkills(searchRoot);
  const errors = [];
  const warnings = [];

  if (skills.length === 0) {
    errors.push('Aucune compétence trouvée : aucun fichier SKILL.md détecté.');
  }

  const seen = new Map();
  for (const skill of skills) {
    const result = validateSkill(skill, resolvedRoot);
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (seen.has(skill.name)) {
      errors.push(
        `Nom en double : "${skill.name}" est défini dans ${relative(resolvedRoot, seen.get(skill.name))} et ${relative(resolvedRoot, skill.path)}.`
      );
    } else {
      seen.set(skill.name, skill.path);
    }
  }

  const expectedRegistry = buildRegistry(resolvedRoot, skills);
  const registryPath = path.join(resolvedRoot, 'registry.json');

  if (!fs.existsSync(registryPath)) {
    errors.push('registry.json est absent à la racine du dépôt.');
  } else {
    let actual = null;
    try {
      actual = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (err) {
      errors.push(`registry.json est illisible : ${err.message}`);
    }

    if (actual) {
      const actualEntries = Array.isArray(actual.skills) ? actual.skills : [];
      const actualByName = new Map(actualEntries.map(entry => [entry && entry.name, entry]));

      for (const expected of expectedRegistry.skills) {
        const entry = actualByName.get(expected.name);
        if (!entry) {
          errors.push(`registry.json : la compétence "${expected.name}" n'est pas référencée.`);
          continue;
        }
        for (const field of ['category', 'path', 'author', 'version', 'description']) {
          if (String(entry[field] || '') !== String(expected[field] || '')) {
            errors.push(
              `registry.json : "${expected.name}" a un champ "${field}" désynchronisé (registre: "${entry[field] || ''}", SKILL.md: "${expected[field] || ''}").`
            );
          }
        }
      }

      for (const entry of actualEntries) {
        if (!entry || !entry.name) {
          errors.push('registry.json : une entrée est invalide (champ "name" manquant).');
          continue;
        }
        if (!expectedRegistry.skills.some(s => s.name === entry.name)) {
          errors.push(`registry.json : "${entry.name}" est référencée mais introuvable sur le disque.`);
        }
      }
    }
  }

  return { errors, warnings, skills, expectedRegistry };
}

function writeRegistry(root, registry) {
  const registryPath = path.join(path.resolve(root), 'registry.json');
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  return registryPath;
}

module.exports = { validateSkill, validateRepository, buildRegistry, writeRegistry };

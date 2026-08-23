const fs = require('fs');
const path = require('path');

const {
  followsNamingConvention,
  scanDirectoryForSkills,
  readSkillMetadata
} = require('./catalog');

const REQUIRED_FIELDS = ['name', 'version', 'author', 'description', 'tags'];
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

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

  for (const field of REQUIRED_FIELDS) {
    const value = meta.frontmatter[field];
    const missing = value === undefined || value === null || value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (missing) {
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
      `${location} : le nom "${meta.frontmatter.name}" ne respecte pas la convention (minuscules, chiffres et tirets).`
    );
  }

  if (meta.frontmatter.version && !SEMVER_REGEX.test(String(meta.frontmatter.version))) {
    errors.push(
      `${location} : la version "${meta.frontmatter.version}" doit suivre le format MAJEUR.MINEUR.CORRECTIF.`
    );
  }

  if (meta.frontmatter.tags !== undefined && !Array.isArray(meta.frontmatter.tags)) {
    errors.push(`${location} : "tags" doit être une liste YAML.`);
  }

  // La description sert aussi de condition de déclenchement pour les agents :
  // elle est légitimement longue. Le seuil marque l'excès, pas le détail.
  if (meta.description && meta.description.length > 1024) {
    warnings.push(`${location} : description très longue (${meta.description.length} caractères).`);
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

const fs = require('fs');
const os = require('os');
const path = require('path');

const colors = require('./colors');
const { getRepoDetails, resolveSource } = require('./source');
const { isValidSkillName, scanDirectoryForSkills, collectSkills, readSkillMetadata } = require('./catalog');
const {
  detectTargets,
  resolveInstallTargets,
  getTarget,
  destinationFor,
  listCompanions,
  renderSkillFile,
  writeManagedBlock
} = require('./targets');
const { recordInstall } = require('./manifest');
const { isInteractive, multiSelect } = require('./prompt');

/**
 * Vérifie qu'une destination reste sous la racine autorisée.
 * Le nom de Skill est déjà validé en amont ; ce contrôle est la dernière
 * barrière contre un path traversal.
 */
function assertContained(destination, baseRoot, skillName) {
  const resolvedBase = path.resolve(baseRoot);
  if (!destination.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Tentative de path traversal détectée pour la compétence : "${skillName}"`);
  }
}

/**
 * Installe une Skill dans une cible, selon la disposition de celle-ci.
 * @returns {string} chemin écrit
 */
function installSkillTo(skill, detection, { cwd, home, user }) {
  const target = detection.target;
  const meta = readSkillMetadata(skill);
  const baseRoot = user ? home : cwd;
  const destination = destinationFor(target, skill.name, { cwd, home, user });

  if (!destination) {
    throw new Error(`La cible "${target.id}" n'a pas de destination pour la portée demandée.`);
  }
  assertContained(destination, baseRoot, skill.name);

  if (target.layout === 'file') {
    // Une cible « fichier » ne peut contenir qu'un document. Si la Skill
    // embarque des références ou des gabarits, ils sont conservés dans
    // .agents/skills/ et cités dans le rendu, sinon la Skill installée
    // pointerait vers des fichiers absents.
    const companions = listCompanions(skill.path);
    let companionDir = null;

    if (companions.length > 0) {
      const companionPath = path.resolve(baseRoot, '.agents', 'skills', skill.name);
      assertContained(companionPath, baseRoot, skill.name);

      if (fs.existsSync(companionPath)) {
        fs.rmSync(companionPath, { recursive: true, force: true });
      }
      fs.mkdirSync(companionPath, { recursive: true });
      fs.cpSync(skill.path, companionPath, { recursive: true });
      companionDir = path.join('.agents', 'skills', skill.name).split(path.sep).join('/');
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, renderSkillFile(target, skill.skillMdPath, meta, { companionDir }), 'utf8');
    return destination;
  }

  // `directory` et `managed-block` copient le dossier complet de la Skill,
  // ce qui préserve les fichiers annexes (scripts, gabarits, références).
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(skill.path, destination, { recursive: true });
  return destination;
}

/**
 * Choisit les cibles d'installation : option explicite, sélection
 * interactive, ou repli automatique sur les cibles détectées.
 */
async function chooseTargets(options, { cwd, home }) {
  const detections = detectTargets({ cwd, home, checkPath: options.checkPath !== false });

  if (options.targets && options.targets.length > 0) {
    return options.targets.map(id => {
      const found = detections.find(d => d.target.id === id);
      if (!found) {
        const available = detections.map(d => d.target.id).join(', ');
        throw new Error(`Cible inconnue : "${id}". Cibles disponibles : ${available}.`);
      }
      return found;
    });
  }

  if (options.all) {
    const detected = detections.filter(d => d.detected);
    return detected.length > 0 ? detected : resolveInstallTargets(detections);
  }

  const candidates = resolveInstallTargets(detections);

  // Sans terminal (CI, pipe) ou avec --yes : on applique le défaut détecté.
  if (options.yes || !isInteractive() || candidates.length <= 1) {
    return candidates;
  }

  console.log(`${colors.cyan}🤖 Assistants IA détectés :${colors.reset}`);
  const choices = candidates.map(d => ({
    label: `${d.target.name} ${colors.dim}→ ${d.target.describe}${colors.reset}`,
    hint: d.detected ? `${colors.dim}(${d.reasons.join(', ')})${colors.reset}` : '',
    selected: true
  }));

  const picked = await multiSelect('Où installer les compétences ?', choices);
  return picked.map(i => candidates[i]);
}

/**
 * Installe les Skills d'un dépôt dans les assistants IA choisis.
 *
 * @param {string} repo Dépôt GitHub, URL Git ou chemin local.
 * @param {object} [options]
 * @param {string} [options.skill]    Installer une seule Skill.
 * @param {string[]} [options.targets] Identifiants de cibles explicites.
 * @param {boolean} [options.all]     Toutes les cibles détectées.
 * @param {boolean} [options.user]    Installation utilisateur au lieu du projet.
 * @param {boolean} [options.yes]     Aucune question interactive.
 * @param {boolean} [options.quiet]   Réduire la sortie (utilisé par `update`).
 */
async function install(repo, options = {}) {
  const targetSkillName = options.skill;
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();

  if (targetSkillName && !isValidSkillName(targetSkillName)) {
    throw new Error(
      `Nom de compétence non valide : "${targetSkillName}". Seuls les caractères alphanumériques, '-' et '_' sont autorisés.`
    );
  }

  const log = options.quiet ? () => {} : (...args) => console.log(...args);

  const source = resolveSource(repo, {
    onProgress: event => {
      const separator = event.indexOf(':');
      const kind = event.slice(0, separator);
      const url = event.slice(separator + 1);
      if (kind === 'local') {
        log(`${colors.cyan}🔍 Recherche de compétences locales dans : ${colors.bright}${url}${colors.reset}`);
      } else {
        log(`${colors.cyan}📥 Téléchargement du dépôt : ${colors.bright}${url}${colors.reset}...`);
      }
    }
  });

  try {
    const { skills: allSkills } = collectSkills(source.sourceDir, message =>
      log(`${colors.yellow}⚠️ ${message}${colors.reset}`)
    );

    if (allSkills.length === 0) {
      log(
        `\n${colors.yellow}⚠️ Aucune compétence valide (contenant un fichier SKILL.md) n'a été trouvée dans le dépôt.${colors.reset}`
      );
      return { installed: [], targets: [] };
    }

    let skillsToInstall;
    if (targetSkillName) {
      const match = allSkills.find(s => s.name.toLowerCase() === targetSkillName.toLowerCase());
      if (!match) {
        throw new Error(`La compétence "${targetSkillName}" n'a pas été trouvée dans le dépôt.`);
      }
      skillsToInstall = [match];
    } else {
      skillsToInstall = allSkills;
    }

    const chosen = await chooseTargets(options, { cwd, home });
    if (chosen.length === 0) {
      log(`\n${colors.yellow}⚠️ Aucune cible sélectionnée : rien n'a été installé.${colors.reset}`);
      return { installed: [], targets: [] };
    }

    log(`\n${colors.cyan}⚙️ Installation des compétences...${colors.reset}`);

    const installed = [];
    const scopeRoot = options.user ? home : cwd;

    for (const detection of chosen) {
      const target = detection.target;
      log(`\n${colors.bright}${target.name}${colors.reset} ${colors.dim}(${target.describe})${colors.reset}`);

      const namesForBlock = [];
      for (const skill of skillsToInstall) {
        if (!isValidSkillName(skill.name)) {
          log(`  ${colors.yellow}⚠️ Compétence avec nom non valide ignorée : ${skill.name}${colors.reset}`);
          continue;
        }

        const written = installSkillTo(skill, detection, { cwd, home, user: options.user });
        namesForBlock.push(skill.name);
        const meta = readSkillMetadata(skill);
        installed.push({ name: skill.name, version: meta.version || '', target: target.id });

        log(
          `  ${colors.green}✓${colors.reset} ${colors.bright}${skill.name}${colors.reset} -> ${colors.dim}${path.relative(scopeRoot, written) || written}${colors.reset}`
        );
      }

      if (target.layout === 'managed-block' && namesForBlock.length > 0) {
        // Le bloc doit lister toutes les Skills présentes, pas seulement
        // celles de cette exécution.
        const skillsRoot = path.resolve(scopeRoot, '.agents', 'skills');
        const present = fs.existsSync(skillsRoot)
          ? fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
          : namesForBlock;

        const contextFile = writeManagedBlock(path.resolve(scopeRoot, target.contextFile), present);
        log(`  ${colors.green}✓${colors.reset} bloc géré mis à jour dans ${colors.dim}${path.basename(contextFile)}${colors.reset}`);
      }
    }

    const uniqueSkills = [...new Map(installed.map(s => [s.name, { name: s.name, version: s.version }])).values()];

    if (uniqueSkills.length > 0 && options.record !== false) {
      recordInstall(
        {
          repo,
          targets: chosen.map(d => d.target.id),
          user: Boolean(options.user),
          skills: uniqueSkills
        },
        scopeRoot
      );
    }

    log(
      `\n${colors.green}${colors.bright}🎉 ${uniqueSkills.length} compétence(s) installée(s) dans ${chosen.length} cible(s) !${colors.reset}`
    );

    return { installed, targets: chosen.map(d => d.target.id), skills: uniqueSkills };
  } finally {
    source.cleanup();
  }
}

module.exports = {
  install,
  installSkillTo,
  chooseTargets,
  getRepoDetails,
  scanDirectoryForSkills,
  isValidSkillName,
  getTarget
};

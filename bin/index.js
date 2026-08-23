#!/usr/bin/env node

const path = require('path');

const colors = require('../src/colors');
const pkg = require('../package.json');
const { install } = require('../src/installer');
const { resolveSource } = require('../src/source');
const { listSkills, searchSkills } = require('../src/search');
const { validateRepository, writeRegistry } = require('../src/validator');
const { detectTargets, resolveInstallTargets, TARGETS } = require('../src/targets');
const { updateSkills, updateSelf } = require('../src/updater');
const { readManifest, MANIFEST_NAME } = require('../src/manifest');
const { isInteractive, confirm } = require('../src/prompt');

const DEFAULT_REPO = 'BlackAngel242/OpenSkill';

const VALUE_OPTIONS = ['--skill', '-s', '--repo', '-r', '--target', '-t'];

function printHelp() {
  console.log(`
${colors.bright}${colors.cyan}🚀 OpenSkill CLI${colors.reset} - Installez des compétences pour vos agents IA

${colors.bright}USAGE:${colors.reset}
  npx @kxlsys/openskill <commande> [options]

${colors.bright}COMMANDES:${colors.reset}
  add <repository>        Installe les compétences dans vos assistants IA
  detect                  Liste les assistants IA détectés sur ce projet
  update                  Met à jour toutes les compétences installées
  list [repository]       Liste les compétences disponibles dans un dépôt
  search <requête>        Recherche une compétence par nom, description ou tag
  validate [chemin]       Vérifie les compétences et la cohérence de registry.json

${colors.bright}ARGUMENTS:${colors.reset}
  <repository>            Dépôt GitHub (ex: ${DEFAULT_REPO}), URL Git ou chemin local

${colors.bright}OPTIONS:${colors.reset}
  -s, --skill <name>      (add) Installe une compétence spécifique
  -t, --target <ids>      (add) Cibles séparées par des virgules (ex: claude-code,cursor)
      --all               (add) Installe dans tous les assistants détectés
      --user              (add/update) Installation globale dans votre dossier personnel
  -y, --yes               (add/update) Aucune question : applique les valeurs par défaut
      --self              (update) Met aussi à jour le CLI via NPM
      --self-only         (update) Met à jour uniquement le CLI
  -r, --repo <repository> (search) Dépôt à interroger (défaut: ${DEFAULT_REPO})
      --fix               (validate) Régénère registry.json à partir des SKILL.md
  -h, --help              Affiche l'aide
  -v, --version           Affiche la version du CLI

${colors.bright}CIBLES SUPPORTÉES:${colors.reset}
${TARGETS.map(t => `  ${t.id.padEnd(14)} ${t.name.padEnd(24)} ${colors.dim}${t.describe}${colors.reset}`).join('\n')}

${colors.bright}EXEMPLES:${colors.reset}
  npx @kxlsys/openskill detect
  npx @kxlsys/openskill add ${DEFAULT_REPO}
  npx @kxlsys/openskill add ${DEFAULT_REPO} --all --yes
  npx @kxlsys/openskill add ${DEFAULT_REPO} --target claude-code,cursor
  npx @kxlsys/openskill update --self
  npx @kxlsys/openskill search kubernetes
  npx @kxlsys/openskill validate . --fix
`);
}

/**
 * Récupère la valeur d'une option, en refusant qu'un autre drapeau
 * soit consommé comme valeur.
 */
function getOptionValue(args, aliases) {
  const index = args.findIndex(arg => aliases.includes(arg));
  if (index === -1) return null;

  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`L'option "${args[index]}" attend une valeur.`);
  }
  return value;
}

function positionalArgs(args) {
  const result = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (VALUE_OPTIONS.includes(arg)) {
      i += 1; // saute la valeur de l'option
      continue;
    }
    if (arg.startsWith('-')) continue;
    result.push(arg);
  }
  return result;
}

function formatSkillLine(skill) {
  const tags = (skill.tags || []).length ? ` ${colors.dim}[${skill.tags.join(', ')}]${colors.reset}` : '';
  const category = skill.category ? `${colors.magenta}${skill.category}/${colors.reset}` : '';
  const version = skill.version ? ` ${colors.dim}v${skill.version}${colors.reset}` : '';
  return `  ${category}${colors.bright}${skill.name}${colors.reset}${version}\n    ${skill.description || colors.dim + 'Pas de description.' + colors.reset}${tags}`;
}

function printSkills(skills) {
  if (skills.length === 0) {
    console.log(`${colors.yellow}Aucune compétence ne correspond.${colors.reset}`);
    return;
  }
  for (const skill of skills) {
    console.log(formatSkillLine(skill));
  }
  console.log(`\n${colors.green}${skills.length} compétence(s).${colors.reset}`);
}

function withSource(repo, fn) {
  const source = resolveSource(repo, {
    onProgress: event => {
      if (event.startsWith('clone:')) {
        console.log(`${colors.cyan}📥 Lecture du dépôt : ${colors.bright}${event.slice(6)}${colors.reset}...\n`);
      }
    }
  });
  try {
    return fn(source.sourceDir);
  } finally {
    source.cleanup();
  }
}

function commandDetect() {
  const detections = detectTargets();
  const detected = detections.filter(d => d.detected);

  console.log(`${colors.cyan}🤖 Détection des assistants IA${colors.reset}\n`);

  for (const detection of detections) {
    const mark = detection.detected ? `${colors.green}✓${colors.reset}` : `${colors.dim}·${colors.reset}`;
    const name = detection.detected
      ? `${colors.bright}${detection.target.name}${colors.reset}`
      : `${colors.dim}${detection.target.name}${colors.reset}`;
    const reasons = detection.detected ? ` ${colors.dim}— ${detection.reasons.join(', ')}${colors.reset}` : '';
    console.log(`  ${mark} ${name} ${colors.dim}(${detection.target.id})${colors.reset}${reasons}`);
  }

  if (detected.length === 0) {
    const fallback = resolveInstallTargets(detections).map(d => d.target.id).join(', ');
    console.log(
      `\n${colors.yellow}Aucun assistant détecté.${colors.reset} L'installation utilisera la cible de repli : ${colors.bright}${fallback}${colors.reset}`
    );
    return;
  }

  console.log(
    `\n${colors.green}${detected.length} assistant(s) détecté(s).${colors.reset} ${colors.dim}Installez avec : openskill add ${DEFAULT_REPO} --all${colors.reset}`
  );
}

async function commandAdd(args) {
  const skill = getOptionValue(args, ['--skill', '-s']);
  const targetOption = getOptionValue(args, ['--target', '-t']);
  const repo = positionalArgs(args)[0];

  if (!repo) {
    throw new Error('Veuillez spécifier un dépôt à installer.');
  }

  await install(repo, {
    skill,
    targets: targetOption ? targetOption.split(',').map(s => s.trim()).filter(Boolean) : null,
    all: args.includes('--all'),
    user: args.includes('--user'),
    yes: args.includes('--yes') || args.includes('-y')
  });
}

async function commandUpdate(args) {
  const yes = args.includes('--yes') || args.includes('-y');
  const selfOnly = args.includes('--self-only');
  const withSelf = selfOnly || args.includes('--self');

  if (!selfOnly) {
    const manifest = readManifest(process.cwd());
    if (manifest.sources.length === 0) {
      console.log(
        `${colors.yellow}Aucune installation enregistrée dans ${MANIFEST_NAME}.${colors.reset}\n` +
          `${colors.dim}Installez d'abord des compétences : openskill add ${DEFAULT_REPO}${colors.reset}`
      );
    } else {
      const result = await updateSkills();

      console.log(
        `\n${colors.green}${colors.bright}✓ ${result.sources.length} source(s) mise(s) à jour, ${result.changes.length} changement(s).${colors.reset}`
      );

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.log(`${colors.red}✗ ${error.repo} : ${error.message}${colors.reset}`);
        }
        process.exitCode = 1;
      }
    }
  }

  if (!withSelf) {
    console.log(`${colors.dim}Astuce : ajoutez --self pour mettre aussi à jour le CLI.${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}🔄 Vérification de la version du CLI...${colors.reset}`);
  let report = await updateSelf({ apply: false });

  if (report.error) {
    console.log(`${colors.yellow}⚠️ ${report.error}${colors.reset}`);
    return;
  }

  if (report.upToDate) {
    console.log(`${colors.green}✓${colors.reset} CLI déjà à jour ${colors.dim}(v${report.current})${colors.reset}`);
    return;
  }

  console.log(
    `${colors.yellow}↑${colors.reset} Nouvelle version disponible : ${colors.dim}v${report.current}${colors.reset} → ${colors.bright}v${report.latest}${colors.reset}`
  );

  const shouldApply =
    yes || (isInteractive() && (await confirm(`Installer ${pkg.name}@${report.latest} globalement ?`)));

  if (!shouldApply) {
    console.log(`${colors.dim}Pour l'installer : npm install -g ${pkg.name}@${report.latest}${colors.reset}`);
    return;
  }

  report = await updateSelf({ apply: true });
  if (report.applied) {
    console.log(`${colors.green}${colors.bright}✓ CLI mis à jour en v${report.latest}.${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ ${report.error}${colors.reset}`);
    process.exitCode = 1;
  }
}

function commandList(args) {
  const repo = positionalArgs(args)[0] || DEFAULT_REPO;
  withSource(repo, sourceDir => {
    const { skills } = listSkills(sourceDir, message =>
      console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`)
    );
    printSkills(skills);
  });
}

function commandSearch(args) {
  const repo = getOptionValue(args, ['--repo', '-r']) || DEFAULT_REPO;
  const query = positionalArgs(args).join(' ');

  if (!query) {
    throw new Error('Veuillez préciser une requête de recherche. Exemple : openskill search kubernetes');
  }

  withSource(repo, sourceDir => {
    const { skills } = listSkills(sourceDir);
    const matches = searchSkills(skills, query);
    console.log(`${colors.cyan}🔎 Résultats pour "${colors.bright}${query}${colors.reset}${colors.cyan}" :${colors.reset}\n`);
    printSkills(matches);
  });
}

function commandValidate(args) {
  const root = path.resolve(positionalArgs(args)[0] || '.');
  const shouldFix = args.includes('--fix');

  console.log(`${colors.cyan}🔍 Vérification de ${colors.bright}${root}${colors.reset}\n`);

  let report = validateRepository(root);

  if (shouldFix) {
    const registryPath = writeRegistry(root, report.expectedRegistry);
    console.log(`${colors.green}✓${colors.reset} registry.json régénéré : ${colors.dim}${registryPath}${colors.reset}\n`);
    report = validateRepository(root);
  }

  for (const warning of report.warnings) {
    console.log(`  ${colors.yellow}⚠️ ${warning}${colors.reset}`);
  }
  for (const error of report.errors) {
    console.log(`  ${colors.red}✗ ${error}${colors.reset}`);
  }

  if (report.errors.length > 0) {
    console.log(
      `\n${colors.red}${colors.bright}✗ ${report.errors.length} erreur(s) détectée(s).${colors.reset}` +
        `${shouldFix ? '' : `\n${colors.dim}Astuce : relancez avec --fix pour resynchroniser registry.json.${colors.reset}`}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `\n${colors.green}${colors.bright}✓ ${report.skills.length} compétence(s) valide(s), registry.json synchronisé.${colors.reset}`
  );
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.includes('-v') || argv.includes('--version')) {
    console.log(pkg.version);
    return;
  }

  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    return;
  }

  console.log(`${colors.bright}${colors.cyan}┌──────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}│           🚀 OPENSKILL CLI           │${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}└──────────────────────────────────────┘${colors.reset}\n`);

  const [command, ...args] = argv;

  switch (command) {
    case 'add':
      await commandAdd(args);
      break;
    case 'detect':
      commandDetect();
      break;
    case 'update':
      await commandUpdate(args);
      break;
    case 'list':
      commandList(args);
      break;
    case 'search':
      commandSearch(args);
      break;
    case 'validate':
      commandValidate(args);
      break;
    default:
      throw new Error(
        `Commande inconnue : "${command}". Commandes disponibles : add, detect, update, list, search, validate.`
      );
  }
}

main().catch(error => {
  console.error(`\n${colors.red}❌ Une erreur est survenue : ${error.message}${colors.reset}`);
  process.exit(1);
});

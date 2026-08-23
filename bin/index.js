#!/usr/bin/env node

const path = require('path');

const colors = require('../src/colors');
const pkg = require('../package.json');
const { install } = require('../src/installer');
const { resolveSource } = require('../src/source');
const { listSkills, searchSkills } = require('../src/search');
const { validateRepository, writeRegistry } = require('../src/validator');

const DEFAULT_REPO = 'BlackAngel242/OpenSkill';

function printHelp() {
  console.log(`
${colors.bright}${colors.cyan}🚀 OpenSkill CLI${colors.reset} - Installez des compétences pour vos agents IA

${colors.bright}USAGE:${colors.reset}
  npx openskill <commande> [options]

${colors.bright}COMMANDES:${colors.reset}
  add <repository>        Installe les compétences d'un dépôt dans .agents/skills/
  list [repository]       Liste les compétences disponibles dans un dépôt
  search <requête>        Recherche une compétence par nom, description ou tag
  validate [chemin]       Vérifie les compétences et la cohérence de registry.json

${colors.bright}ARGUMENTS:${colors.reset}
  <repository>            Dépôt GitHub (ex: ${DEFAULT_REPO}), URL Git ou chemin local

${colors.bright}OPTIONS:${colors.reset}
  -s, --skill <name>      (add) Installe une compétence spécifique
  -r, --repo <repository> (search) Dépôt à interroger (défaut: ${DEFAULT_REPO})
      --fix               (validate) Régénère registry.json à partir des SKILL.md
  -h, --help              Affiche l'aide
  -v, --version           Affiche la version du CLI

${colors.bright}EXEMPLES:${colors.reset}
  npx openskill add ${DEFAULT_REPO}
  npx openskill add ${DEFAULT_REPO} --skill phishing-analysis
  npx openskill add ./mon-depot-local
  npx openskill list
  npx openskill search kubernetes
  npx openskill validate . --fix
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

function positionalArgs(args, aliasesWithValue) {
  const result = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (aliasesWithValue.includes(arg)) {
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

function commandList(args) {
  const repo = positionalArgs(args, [])[0] || DEFAULT_REPO;
  withSource(repo, sourceDir => {
    const { skills } = listSkills(sourceDir, message =>
      console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`)
    );
    printSkills(skills);
  });
}

function commandSearch(args) {
  const repo = getOptionValue(args, ['--repo', '-r']) || DEFAULT_REPO;
  const query = positionalArgs(args, ['--repo', '-r']).join(' ');

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
  const root = path.resolve(positionalArgs(args, [])[0] || '.');
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

async function commandAdd(args) {
  const skill = getOptionValue(args, ['--skill', '-s']);
  const repo = positionalArgs(args, ['--skill', '-s'])[0];

  if (!repo) {
    throw new Error('Veuillez spécifier un dépôt à installer.');
  }

  await install(repo, { skill });
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
        `Commande inconnue : "${command}". Commandes disponibles : add, list, search, validate.`
      );
  }
}

main().catch(error => {
  console.error(`\n${colors.red}❌ Une erreur est survenue : ${error.message}${colors.reset}`);
  process.exit(1);
});

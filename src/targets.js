const fs = require('fs');
const os = require('os');
const path = require('path');

const { splitFrontmatter, stringifyFrontmatter } = require('./frontmatter');

const MANAGED_BEGIN = '<!-- BEGIN OPENSKILL -->';
const MANAGED_END = '<!-- END OPENSKILL -->';

function header(meta) {
  const parts = [];
  if (meta.version) parts.push(`v${meta.version}`);
  if (meta.author) parts.push(`par ${meta.author}`);
  const suffix = parts.length ? ` (${parts.join(', ')})` : '';
  return `> Skill OpenSkill : \`${meta.name}\`${suffix}`;
}

/**
 * Rend une Skill dans le format d'un fichier de règles générique.
 */
function renderPlain(meta, body) {
  return `${header(meta)}\n\n${body}\n`;
}

/**
 * Catalogue des assistants IA supportés.
 *
 * Chaque cible décrit :
 *  - `markers` : indices de détection (dossiers/fichiers projet, dossiers
 *    utilisateur, binaires dans le PATH) ;
 *  - `layout`  : `directory` (le dossier de la Skill est copié tel quel),
 *    `file` (un fichier de règles par Skill) ou `managed-block` (un bloc
 *    délimité inséré dans un fichier de contexte racine) ;
 *  - `render`  : conversion du SKILL.md vers le format attendu.
 */
const TARGETS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    layout: 'directory',
    projectDir: path.join('.claude', 'skills'),
    userDir: path.join('.claude', 'skills'),
    markers: { project: ['.claude'], user: ['.claude'], bin: ['claude'] },
    describe: '.claude/skills/<nom>/SKILL.md'
  },
  {
    id: 'cursor',
    name: 'Cursor',
    layout: 'file',
    projectDir: path.join('.cursor', 'rules'),
    userDir: path.join('.cursor', 'rules'),
    extension: '.mdc',
    markers: { project: ['.cursor', '.cursorrules'], user: ['.cursor'], bin: ['cursor'] },
    describe: '.cursor/rules/<nom>.mdc',
    render: (meta, body) =>
      `${stringifyFrontmatter({
        description: meta.description || `Skill ${meta.name}`,
        globs: '',
        alwaysApply: false
      })}\n\n${renderPlain(meta, body)}`
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    layout: 'file',
    projectDir: path.join('.windsurf', 'rules'),
    userDir: path.join('.codeium', 'windsurf'),
    extension: '.md',
    markers: { project: ['.windsurf'], user: ['.windsurf', '.codeium'], bin: ['windsurf'] },
    describe: '.windsurf/rules/<nom>.md',
    render: (meta, body) =>
      `${stringifyFrontmatter({
        description: meta.description || `Skill ${meta.name}`,
        trigger: 'model_decision'
      })}\n\n${renderPlain(meta, body)}`
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    layout: 'file',
    projectDir: path.join('.github', 'instructions'),
    extension: '.instructions.md',
    markers: {
      project: [
        path.join('.github', 'copilot-instructions.md'),
        path.join('.github', 'instructions')
      ]
    },
    describe: '.github/instructions/<nom>.instructions.md',
    render: (meta, body) =>
      `${stringifyFrontmatter({
        description: meta.description || `Skill ${meta.name}`,
        applyTo: '**'
      })}\n\n${renderPlain(meta, body)}`
  },
  {
    id: 'cline',
    name: 'Cline',
    layout: 'file',
    projectDir: '.clinerules',
    extension: '.md',
    markers: { project: ['.clinerules'] },
    describe: '.clinerules/<nom>.md',
    render: renderPlain
  },
  {
    id: 'continue',
    name: 'Continue',
    layout: 'file',
    projectDir: path.join('.continue', 'rules'),
    userDir: path.join('.continue', 'rules'),
    extension: '.md',
    markers: { project: ['.continue'], user: ['.continue'] },
    describe: '.continue/rules/<nom>.md',
    render: renderPlain
  },
  {
    id: 'agents',
    name: 'Générique (.agents)',
    layout: 'directory',
    projectDir: path.join('.agents', 'skills'),
    userDir: path.join('.agents', 'skills'),
    markers: { project: ['.agents'] },
    describe: '.agents/skills/<nom>/SKILL.md',
    // Cible de repli : toujours proposée, même sans indice de détection.
    fallback: true
  },
  {
    id: 'codex',
    name: 'Codex (AGENTS.md)',
    layout: 'managed-block',
    contextFile: 'AGENTS.md',
    markers: { project: ['AGENTS.md', '.codex'], user: ['.codex'], bin: ['codex'] },
    describe: 'AGENTS.md (bloc géré) + .agents/skills/'
  },
  {
    id: 'gemini',
    name: 'Gemini CLI (GEMINI.md)',
    layout: 'managed-block',
    contextFile: 'GEMINI.md',
    markers: { project: ['GEMINI.md', '.gemini'], user: ['.gemini'], bin: ['gemini'] },
    describe: 'GEMINI.md (bloc géré) + .agents/skills/'
  },
  {
    id: 'aider',
    name: 'Aider (CONVENTIONS.md)',
    layout: 'managed-block',
    contextFile: 'CONVENTIONS.md',
    markers: { project: ['CONVENTIONS.md', '.aider.conf.yml'], user: ['.aider.conf.yml'], bin: ['aider'] },
    describe: 'CONVENTIONS.md (bloc géré) + .agents/skills/'
  }
];

function getTarget(id) {
  return TARGETS.find(t => t.id === id) || null;
}

function existsAny(base, entries = []) {
  return entries.filter(entry => fs.existsSync(path.join(base, entry)));
}

/**
 * Cherche un exécutable dans le PATH, sans lancer de processus.
 */
function findOnPath(binary) {
  const pathValue = process.env.PATH || '';
  const separator = process.platform === 'win32' ? ';' : ':';
  const extensions = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];

  for (const dir of pathValue.split(separator).filter(Boolean)) {
    for (const ext of extensions) {
      const candidate = path.join(dir, binary + ext);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      } catch (err) {
        // Entrée du PATH illisible : on continue.
      }
    }
  }
  return null;
}

/**
 * Détecte les assistants IA présents.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd]  Racine du projet analysé.
 * @param {string} [opts.home] Répertoire utilisateur.
 * @param {boolean} [opts.checkPath] Inspecter le PATH (désactivable pour les tests).
 * @returns {Array<{target: object, detected: boolean, reasons: string[]}>}
 */
function detectTargets({ cwd = process.cwd(), home = os.homedir(), checkPath = true } = {}) {
  return TARGETS.map(target => {
    const reasons = [];
    const markers = target.markers || {};

    for (const marker of existsAny(cwd, markers.project)) {
      reasons.push(`projet: ${marker}`);
    }
    for (const marker of existsAny(home, markers.user)) {
      reasons.push(`utilisateur: ~/${marker}`);
    }
    if (checkPath) {
      for (const binary of markers.bin || []) {
        if (findOnPath(binary)) reasons.push(`PATH: ${binary}`);
      }
    }

    return { target, detected: reasons.length > 0, reasons };
  });
}

/**
 * Cibles réellement utilisables pour une installation.
 * `agents` sert de repli quand aucun assistant n'est détecté.
 */
function resolveInstallTargets(detections) {
  const detected = detections.filter(d => d.detected);
  if (detected.length > 0) return detected;
  return detections.filter(d => d.target.fallback);
}

/**
 * Chemin de destination d'une Skill pour une cible donnée.
 */
function destinationFor(target, skillName, { cwd = process.cwd(), home = os.homedir(), user = false } = {}) {
  const base = user ? home : cwd;

  if (target.layout === 'managed-block') {
    return path.resolve(base, path.join('.agents', 'skills'), skillName);
  }

  const dir = user ? target.userDir || target.projectDir : target.projectDir;
  if (!dir) return null;

  if (target.layout === 'directory') {
    return path.resolve(base, dir, skillName);
  }
  return path.resolve(base, dir, `${skillName}${target.extension || '.md'}`);
}

/**
 * Liste les fichiers annexes d'une Skill (tout sauf le SKILL.md).
 * Une cible « fichier » ne peut pas les représenter : l'appelant doit les
 * conserver ailleurs plutôt que de les perdre silencieusement.
 */
function listCompanions(skillDir) {
  const companions = [];

  const walk = (dir, prefix = '') => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relative);
      } else if (entry.name.toLowerCase() !== 'skill.md') {
        companions.push(relative);
      }
    }
  };

  try {
    walk(skillDir);
  } catch (err) {
    return [];
  }
  return companions.sort();
}

/**
 * Convertit un SKILL.md vers le format d'une cible fichier.
 *
 * @param {object} [options]
 * @param {string} [options.companionDir] Chemin où les fichiers annexes ont
 *   été conservés ; mentionné dans le rendu pour rester atteignable.
 */
function renderSkillFile(target, skillMdPath, meta, { companionDir = null } = {}) {
  const { body } = splitFrontmatter(fs.readFileSync(skillMdPath, 'utf8'));
  const render = target.render || renderPlain;

  let content = body || `# ${meta.name}`;
  if (companionDir) {
    content =
      `> Ressources complémentaires de cette Skill : \`${companionDir}/\`\n` +
      `> (les chemins relatifs cités ci-dessous y sont résolus.)\n\n${content}`;
  }

  return render(meta, content);
}

/**
 * Insère ou met à jour le bloc géré d'un fichier de contexte racine.
 * Le bloc est délimité : le reste du fichier n'est jamais modifié.
 */
function writeManagedBlock(contextFilePath, skillNames) {
  const lines = [
    MANAGED_BEGIN,
    '## Skills OpenSkill',
    '',
    'Les compétences suivantes sont installées dans `.agents/skills/`.',
    'Consulte le `SKILL.md` correspondant avant de traiter une tâche du domaine.',
    ''
  ];
  for (const name of [...skillNames].sort()) {
    lines.push(`- \`${name}\` — \`.agents/skills/${name}/SKILL.md\``);
  }
  lines.push('', MANAGED_END);
  const block = lines.join('\n');

  let content = fs.existsSync(contextFilePath) ? fs.readFileSync(contextFilePath, 'utf8') : '';

  const begin = content.indexOf(MANAGED_BEGIN);
  const end = content.indexOf(MANAGED_END);

  if (begin !== -1 && end !== -1 && end > begin) {
    content = content.slice(0, begin) + block + content.slice(end + MANAGED_END.length);
  } else {
    content = content.trimEnd();
    content = content ? `${content}\n\n${block}\n` : `${block}\n`;
  }

  fs.mkdirSync(path.dirname(contextFilePath), { recursive: true });
  fs.writeFileSync(contextFilePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  return contextFilePath;
}

module.exports = {
  TARGETS,
  MANAGED_BEGIN,
  MANAGED_END,
  getTarget,
  findOnPath,
  detectTargets,
  resolveInstallTargets,
  destinationFor,
  listCompanions,
  renderSkillFile,
  writeManagedBlock
};

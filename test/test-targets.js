const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { detectTargets, resolveInstallTargets, destinationFor, getTarget, writeManagedBlock, MANAGED_BEGIN, MANAGED_END } = require('../src/targets');
const { install } = require('../src/installer');
const { readManifest, recordInstall } = require('../src/manifest');
const { compareVersions, updateSkills } = require('../src/updater');

const ROOT = path.resolve(__dirname, '..');

console.log('🧪 Running OpenSkill multi-agent tests...\n');

function tempDir(prefix = 'openskill-targets-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const suite = [];

function run(fn, label) {
  suite.push(() => {
    return fn();
  });
  suite.push(label);
}

function runAsync(fn, label) {
  run(fn, label);
}

/**
 * Les cas touchent tous au système de fichiers : ils doivent s'enchaîner
 * pour que la sortie reste lisible et l'échec attribuable.
 */
async function runSuite() {
  for (let i = 0; i < suite.length; i += 2) {
    const [fn, label] = [suite[i], suite[i + 1]];
    try {
      await fn();
      console.log(`✅ ${label} passed!`);
    } catch (err) {
      console.error(`❌ ${label} failed!`, err);
      process.exit(1);
    }
  }
  console.log('\n🎉 All multi-agent tests passed successfully!');
}

// Test 1: détection par marqueurs projet et utilisateur
run(() => {
  const project = tempDir();
  const home = tempDir();
  try {
    fs.mkdirSync(path.join(project, '.cursor'));
    fs.mkdirSync(path.join(project, '.clinerules'));
    fs.mkdirSync(path.join(home, '.claude'));

    const detections = detectTargets({ cwd: project, home, checkPath: false });
    const detected = detections.filter(d => d.detected).map(d => d.target.id).sort();
    assert.deepStrictEqual(detected, ['claude-code', 'cline', 'cursor']);

    // Les harnais conformes au standard Agent Skills sont reconnus.
    const hermesProject = tempDir();
    fs.mkdirSync(path.join(hermesProject, '.hermes'));
    fs.mkdirSync(path.join(hermesProject, '.opencode'));
    fs.mkdirSync(path.join(hermesProject, '.mimocode'));
    const standard = detectTargets({ cwd: hermesProject, home: tempDir(), checkPath: false })
      .filter(d => d.detected)
      .map(d => d.target.id)
      .sort();
    assert.deepStrictEqual(standard, ['hermes', 'mimo', 'opencode']);
    fs.rmSync(hermesProject, { recursive: true, force: true });

    const cursor = detections.find(d => d.target.id === 'cursor');
    assert.ok(cursor.reasons.some(r => r.startsWith('projet:')));

    const claude = detections.find(d => d.target.id === 'claude-code');
    assert.ok(claude.reasons.some(r => r.startsWith('utilisateur:')));

    // Aucun marqueur : repli sur la cible générique.
    const empty = detectTargets({ cwd: tempDir(), home: tempDir(), checkPath: false });
    assert.deepStrictEqual(resolveInstallTargets(empty).map(d => d.target.id), ['agents']);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}, 'Test 1: target detection');

// Test 2: chemins de destination selon la disposition
run(() => {
  const cwd = '/projet';
  const home = '/maison';

  assert.strictEqual(
    destinationFor(getTarget('claude-code'), 'ma-skill', { cwd, home }),
    path.resolve('/projet/.claude/skills/ma-skill')
  );
  assert.strictEqual(
    destinationFor(getTarget('cursor'), 'ma-skill', { cwd, home }),
    path.resolve('/projet/.cursor/rules/ma-skill.mdc')
  );
  assert.strictEqual(
    destinationFor(getTarget('copilot'), 'ma-skill', { cwd, home }),
    path.resolve('/projet/.github/instructions/ma-skill.instructions.md')
  );
  // Les cibles à bloc géré stockent le contenu dans .agents/skills.
  assert.strictEqual(
    destinationFor(getTarget('codex'), 'ma-skill', { cwd, home }),
    path.resolve('/projet/.agents/skills/ma-skill')
  );
  // Portée utilisateur.
  assert.strictEqual(
    destinationFor(getTarget('claude-code'), 'ma-skill', { cwd, home, user: true }),
    path.resolve('/maison/.claude/skills/ma-skill')
  );
}, 'Test 2: destination paths');

// Test 3: installation multi-cibles avec conversion de format
runAsync(async () => {
  const project = tempDir();
  const home = tempDir();
  try {
    const result = await install(ROOT, {
      skill: 'phishing-analysis',
      targets: ['claude-code', 'cursor', 'copilot'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });

    assert.deepStrictEqual(result.targets, ['claude-code', 'cursor', 'copilot']);

    // Claude Code : dossier complet.
    assert.ok(fs.existsSync(path.join(project, '.claude', 'skills', 'phishing-analysis', 'SKILL.md')));

    // Cursor : fichier .mdc avec son propre frontmatter.
    const mdc = fs.readFileSync(path.join(project, '.cursor', 'rules', 'phishing-analysis.mdc'), 'utf8');
    assert.ok(mdc.startsWith('---\n'));
    assert.ok(mdc.includes('alwaysApply: false'));
    assert.ok(mdc.includes('# Phishing Analysis'));
    // Le frontmatter d'origine ne doit pas être recopié tel quel.
    assert.ok(!mdc.includes('name: phishing-analysis'));

    // Copilot : extension et frontmatter spécifiques.
    const copilot = fs.readFileSync(
      path.join(project, '.github', 'instructions', 'phishing-analysis.instructions.md'),
      'utf8'
    );
    assert.ok(copilot.includes('applyTo:'));

    // Une cible inconnue est refusée explicitement.
    await assert.rejects(
      () => install(ROOT, { targets: ['inexistante'], cwd: project, home, yes: true, quiet: true }),
      /Cible inconnue/
    );
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}, 'Test 3: multi-target install');

// Test 4: bloc géré idempotent, contenu utilisateur préservé
run(() => {
  const project = tempDir();
  try {
    const file = path.join(project, 'AGENTS.md');
    fs.writeFileSync(file, '# Mon projet\n\nRègles maison à conserver.\n', 'utf8');

    writeManagedBlock(file, ['b-skill', 'a-skill']);
    let content = fs.readFileSync(file, 'utf8');
    assert.ok(content.includes('Règles maison à conserver.'));
    assert.ok(content.indexOf('a-skill') < content.indexOf('b-skill'), 'les Skills doivent être triées');

    // Une seconde écriture remplace le bloc au lieu de l'empiler.
    writeManagedBlock(file, ['c-skill']);
    content = fs.readFileSync(file, 'utf8');
    assert.strictEqual(content.split(MANAGED_BEGIN).length - 1, 1);
    assert.strictEqual(content.split(MANAGED_END).length - 1, 1);
    assert.ok(content.includes('c-skill'));
    assert.ok(!content.includes('a-skill'));
    assert.ok(content.includes('Règles maison à conserver.'));
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
}, 'Test 4: managed block idempotence');

// Test 5: le manifeste enregistre et fusionne les installations
runAsync(async () => {
  const project = tempDir();
  const home = tempDir();
  try {
    await install(ROOT, {
      skill: 'openpua',
      targets: ['agents'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });

    let manifest = readManifest(project);
    assert.strictEqual(manifest.sources.length, 1);
    assert.strictEqual(manifest.sources[0].repo, ROOT);
    assert.deepStrictEqual(manifest.sources[0].skills.map(s => s.name), ['openpua']);
    assert.deepStrictEqual(manifest.sources[0].targets, ['agents']);

    // Une seconde installation fusionne Skills et cibles sur la même source.
    await install(ROOT, {
      skill: 'ad-audit',
      targets: ['claude-code'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });

    manifest = readManifest(project);
    assert.strictEqual(manifest.sources.length, 1);
    assert.deepStrictEqual(manifest.sources[0].skills.map(s => s.name).sort(), ['ad-audit', 'openpua']);
    assert.deepStrictEqual(manifest.sources[0].targets, ['agents', 'claude-code']);

    // Un manifeste corrompu ne doit pas faire échouer la lecture.
    fs.writeFileSync(path.join(project, '.openskill.json'), '{ pas du json', 'utf8');
    assert.deepStrictEqual(readManifest(project).sources, []);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}, 'Test 5: manifest recording');

// Test 6: update réinstalle et rapporte les changements de version
runAsync(async () => {
  const project = tempDir();
  const home = tempDir();
  const sourceRepo = tempDir('openskill-source-');
  try {
    // Dépôt source minimal.
    const skillDir = path.join(sourceRepo, 'skills', 'ai', 'demo-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    const writeSkill = version =>
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        ['---', 'name: demo-skill', 'author: Tester', `version: ${version}`, 'tags:', '  - ai', 'description: Démo.', '---', '', '# Demo', ''].join('\n'),
        'utf8'
      );
    writeSkill('1.0.0');

    await install(sourceRepo, {
      targets: ['agents'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });
    assert.ok(fs.existsSync(path.join(project, '.agents', 'skills', 'demo-skill', 'SKILL.md')));

    // Sans changement : aucune modification rapportée.
    let result = await updateSkills({ cwd: project, home, quiet: true, checkPath: false });
    assert.strictEqual(result.changes.length, 0);
    assert.strictEqual(result.errors.length, 0);

    // Après montée de version : le changement est détecté et appliqué.
    writeSkill('2.1.0');
    result = await updateSkills({ cwd: project, home, quiet: true, checkPath: false });
    assert.strictEqual(result.changes.length, 1);
    assert.deepStrictEqual(result.changes[0], {
      repo: sourceRepo,
      name: 'demo-skill',
      from: '1.0.0',
      to: '2.1.0'
    });

    const installed = fs.readFileSync(path.join(project, '.agents', 'skills', 'demo-skill', 'SKILL.md'), 'utf8');
    assert.ok(installed.includes('version: 2.1.0'));

    // Une source injoignable est rapportée sans interrompre la mise à jour.
    recordInstall({ repo: '/chemin/inexistant', targets: ['agents'], skills: [] }, project);
    result = await updateSkills({ cwd: project, home, quiet: true, checkPath: false });
    assert.ok(result.errors.length >= 1);
  } finally {
    for (const dir of [project, home, sourceRepo]) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}, 'Test 6: update reinstalls and reports changes');

// Test 7: une Skill multi-fichiers ne perd rien sur une cible « fichier »
runAsync(async () => {
  const project = tempDir();
  const home = tempDir();
  try {
    await install(ROOT, {
      skill: 'prd-table-ronde',
      targets: ['cursor'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });

    const rule = path.join(project, '.cursor', 'rules', 'prd-table-ronde.mdc');
    assert.ok(fs.existsSync(rule));

    // Les références et assets sont conservés et cités dans le rendu.
    const companions = path.join(project, '.agents', 'skills', 'prd-table-ronde');
    assert.ok(fs.existsSync(path.join(companions, 'references', 'personas.md')));
    assert.ok(fs.existsSync(path.join(companions, 'assets', 'design-system.css')));
    assert.ok(fs.readFileSync(rule, 'utf8').includes('.agents/skills/prd-table-ronde/'));

    // Une Skill à fichier unique ne crée pas de dossier annexe.
    const solo = tempDir();
    await install(ROOT, {
      skill: 'phishing-analysis',
      targets: ['cursor'],
      cwd: solo,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });
    assert.ok(!fs.existsSync(path.join(solo, '.agents')));
    fs.rmSync(solo, { recursive: true, force: true });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}, 'Test 7: multi-file skill on file target');

// Test 8: conformité au standard Agent Skills
runAsync(async () => {
  const project = tempDir();
  const home = tempDir();
  try {
    // Destinations des harnais conformes.
    assert.strictEqual(
      destinationFor(getTarget('hermes'), 'ma-skill', { cwd: '/p', home: '/h', user: true }),
      path.resolve('/h/.hermes/skills/ma-skill')
    );
    assert.strictEqual(
      destinationFor(getTarget('opencode'), 'ma-skill', { cwd: '/p', home: '/h', user: true }),
      path.resolve('/h/.config/opencode/skills/ma-skill')
    );
    assert.strictEqual(
      destinationFor(getTarget('mimo'), 'ma-skill', { cwd: '/p', home: '/h' }),
      path.resolve('/p/.mimocode/skills/ma-skill')
    );

    // L'ancien identifiant `codex` reste résolu après le renommage en
    // `agents-md` : un manifeste déjà écrit doit continuer à fonctionner.
    assert.strictEqual(getTarget('codex').id, 'agents-md');

    await install(ROOT, {
      skill: 'openpua',
      targets: ['codex'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });
    assert.ok(fs.readFileSync(path.join(project, 'AGENTS.md'), 'utf8').includes('openpua'));

    // Une Skill au format canonique du standard (metadata.*) est installable.
    const specRepo = tempDir('openskill-spec-');
    const specDir = path.join(specRepo, 'skills', 'demo', 'spec-skill');
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(
      path.join(specDir, 'SKILL.md'),
      ['---', 'name: spec-skill', 'description: Fait X. À utiliser quand Y.', 'license: MIT', 'metadata:', '  author: Tester', '  version: 1.2.3', '---', '', '# Spec', ''].join('\n'),
      'utf8'
    );

    const result = await install(specRepo, {
      targets: ['hermes'],
      cwd: project,
      home,
      yes: true,
      quiet: true,
      checkPath: false
    });
    assert.deepStrictEqual(result.skills, [{ name: 'spec-skill', version: '1.2.3' }]);
    assert.ok(fs.existsSync(path.join(project, '.hermes', 'skills', 'spec-skill', 'SKILL.md')));
    fs.rmSync(specRepo, { recursive: true, force: true });
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}, 'Test 8: Agent Skills standard compliance');

// Test 9: comparaison de versions
run(() => {
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0, '1.10.0 > 1.9.0');
  assert.ok(compareVersions('2.0.0', '10.0.0') < 0);
  assert.strictEqual(compareVersions('1.1.0', '1.1.0'), 0);
  assert.ok(compareVersions('1.1', '1.1.0') === 0);
}, 'Test 9: version comparison');

runSuite();

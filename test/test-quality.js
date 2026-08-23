const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { parseFrontmatter } = require('../src/frontmatter');
const { followsNamingConvention } = require('../src/catalog');
const { validateRepository, buildRegistry } = require('../src/validator');
const { listSkills, searchSkills } = require('../src/search');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'index.js');

console.log('🧪 Running OpenSkill catalog & validation tests...\n');

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openskill-quality-'));
  fs.mkdirSync(path.join(dir, 'skills', 'ai', 'demo-skill'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'skills', 'ai', 'demo-skill', 'SKILL.md'),
    [
      '---',
      'name: demo-skill',
      'author: Tester',
      'version: 1.0.0',
      'tags:',
      '  - ai',
      '  - démo',
      'description: Une compétence de démonstration.',
      '---',
      '',
      '# Demo Skill',
      ''
    ].join('\n'),
    'utf8'
  );
  return dir;
}

function run(fn, label) {
  try {
    fn();
    console.log(`✅ ${label} passed!`);
  } catch (err) {
    console.error(`❌ ${label} failed!`, err);
    process.exit(1);
  }
}

// Test 1: parseFrontmatter
run(() => {
  const parsed = parseFrontmatter(
    ['---', 'name: my-skill', "author: 'Quoted Author'", 'tags:', '  - one', '  - two', '---', '', '# Body'].join('\n')
  );
  assert.strictEqual(parsed.name, 'my-skill');
  assert.strictEqual(parsed.author, 'Quoted Author');
  assert.deepStrictEqual(parsed.tags, ['one', 'two']);

  assert.strictEqual(parseFrontmatter('# Pas de frontmatter'), null);
  assert.strictEqual(parseFrontmatter(null), null);
}, 'Test 1: parseFrontmatter');

// Test 2: naming convention (README: a-z, 0-9, -)
run(() => {
  assert.strictEqual(followsNamingConvention('linux-hardening'), true);
  assert.strictEqual(followsNamingConvention('openpua'), true);

  assert.strictEqual(followsNamingConvention('Linux-Hardening'), false);
  assert.strictEqual(followsNamingConvention('my_skill'), false);
  assert.strictEqual(followsNamingConvention('-leading'), false);
  assert.strictEqual(followsNamingConvention('trailing-'), false);
  assert.strictEqual(followsNamingConvention('double--dash'), false);
}, 'Test 2: naming convention');

// Test 3: le dépôt courant est valide et registry.json est synchronisé
run(() => {
  const report = validateRepository(ROOT);
  assert.deepStrictEqual(report.errors, []);
  assert.ok(report.skills.length >= 7);
}, 'Test 3: repository validation');

// Test 4: le validateur détecte frontmatter incomplet, nom incohérent et registre désynchronisé
run(() => {
  const dir = makeTempRepo();
  try {
    // Sans registry.json : erreur attendue.
    let report = validateRepository(dir);
    assert.ok(report.errors.some(e => e.includes('registry.json est absent')));

    fs.writeFileSync(
      path.join(dir, 'registry.json'),
      `${JSON.stringify(buildRegistry(dir, report.skills), null, 2)}\n`,
      'utf8'
    );
    report = validateRepository(dir);
    assert.deepStrictEqual(report.errors, []);

    // Nom du frontmatter différent du dossier.
    const skillMd = path.join(dir, 'skills', 'ai', 'demo-skill', 'SKILL.md');
    fs.writeFileSync(skillMd, fs.readFileSync(skillMd, 'utf8').replace('name: demo-skill', 'name: other-name'), 'utf8');
    report = validateRepository(dir);
    assert.ok(report.errors.some(e => e.includes('ne correspond pas au dossier')));

    // Champ obligatoire manquant.
    fs.writeFileSync(
      skillMd,
      ['---', 'name: demo-skill', '---', '', '# Demo'].join('\n'),
      'utf8'
    );
    report = validateRepository(dir);
    assert.ok(report.errors.some(e => e.includes('champ obligatoire "description"')));
    assert.ok(report.errors.some(e => e.includes('champ obligatoire "version"')));

    // Entrée fantôme dans le registre.
    fs.writeFileSync(
      path.join(dir, 'registry.json'),
      JSON.stringify({ skills: [{ name: 'ghost-skill', path: 'skills/ai/ghost/SKILL.md' }] }, null, 2),
      'utf8'
    );
    report = validateRepository(dir);
    assert.ok(report.errors.some(e => e.includes('introuvable sur le disque')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}, 'Test 4: validator detects defects');

// Test 5: --fix régénère un registre valide
run(() => {
  const dir = makeTempRepo();
  try {
    execFileSync('node', [CLI, 'validate', dir, '--fix'], { stdio: 'ignore' });
    const registry = JSON.parse(fs.readFileSync(path.join(dir, 'registry.json'), 'utf8'));
    assert.strictEqual(registry.skills.length, 1);
    assert.strictEqual(registry.skills[0].name, 'demo-skill');
    assert.strictEqual(registry.skills[0].category, 'ai');
    assert.strictEqual(registry.skills[0].version, '1.0.0');
    assert.deepStrictEqual(validateRepository(dir).errors, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}, 'Test 5: validate --fix');

// Test 6: listSkills expose les métadonnées du frontmatter
run(() => {
  const { skills, source } = listSkills(ROOT);
  assert.strictEqual(source, 'registry');

  const k8s = skills.find(s => s.name === 'kubernetes-review');
  assert.ok(k8s);
  assert.strictEqual(k8s.category, 'devops');
  assert.ok(k8s.description.length > 0);
  assert.ok(k8s.tags.includes('kubernetes'));

  // Tri alphabétique stable.
  const names = skills.map(s => s.name);
  assert.deepStrictEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
}, 'Test 6: listSkills metadata');

// Test 7: recherche insensible à la casse et aux accents, multi-termes
run(() => {
  const { skills } = listSkills(ROOT);

  assert.deepStrictEqual(searchSkills(skills, 'kubernetes').map(s => s.name), ['kubernetes-review']);
  assert.deepStrictEqual(searchSkills(skills, 'KUBERNETES').map(s => s.name), ['kubernetes-review']);

  // "securite" doit retrouver "sécurité".
  assert.ok(searchSkills(skills, 'securite').length >= 2);

  // Tous les termes doivent correspondre.
  assert.deepStrictEqual(searchSkills(skills, 'audit active-directory').map(s => s.name), ['ad-audit']);
  assert.deepStrictEqual(searchSkills(skills, 'terme-inexistant').length, 0);
  assert.strictEqual(searchSkills(skills, '   ').length, skills.length);
}, 'Test 7: searchSkills');

// Test 8: le CLI signale une commande inconnue et une option sans valeur
run(() => {
  assert.throws(() => execFileSync('node', [CLI, 'frobnicate'], { stdio: 'pipe' }));
  assert.throws(() => execFileSync('node', [CLI, 'add'], { stdio: 'pipe' }));
  assert.throws(() => execFileSync('node', [CLI, 'add', '.', '--skill'], { stdio: 'pipe' }));
  assert.throws(() => execFileSync('node', [CLI, 'search'], { stdio: 'pipe' }));

  // --help et --version sortent en succès.
  const version = execFileSync('node', [CLI, '--version'], { encoding: 'utf8' }).trim();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(execFileSync('node', [CLI, '--help'], { encoding: 'utf8' }).includes('validate'));
}, 'Test 8: CLI argument handling');

console.log('\n🎉 All catalog & validation tests passed successfully!');

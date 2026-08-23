const fs = require('fs');
const path = require('path');

const MANIFEST_NAME = '.openskill.json';
const MANIFEST_VERSION = 1;

function manifestPath(root = process.cwd()) {
  return path.resolve(root, MANIFEST_NAME);
}

function emptyManifest() {
  return { manifestVersion: MANIFEST_VERSION, sources: [] };
}

/**
 * Lit le manifeste d'installation. Un fichier absent ou corrompu est traité
 * comme un manifeste vide : la mise à jour ne doit jamais échouer sur lui.
 */
function readManifest(root = process.cwd()) {
  const file = manifestPath(root);
  if (!fs.existsSync(file)) return emptyManifest();

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || !Array.isArray(data.sources)) return emptyManifest();
    return { manifestVersion: data.manifestVersion || MANIFEST_VERSION, sources: data.sources };
  } catch (err) {
    return emptyManifest();
  }
}

function writeManifest(manifest, root = process.cwd()) {
  const file = manifestPath(root);
  const sorted = {
    manifestVersion: MANIFEST_VERSION,
    sources: [...manifest.sources].sort((a, b) => a.repo.localeCompare(b.repo))
  };
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  return file;
}

/**
 * Enregistre une installation pour permettre `openskill update`.
 *
 * @param {object} entry {repo, targets, user, skills:[{name, version}]}
 */
function recordInstall(entry, root = process.cwd()) {
  const manifest = readManifest(root);
  const scope = entry.user ? 'user' : 'project';
  const existing = manifest.sources.find(s => s.repo === entry.repo && (s.scope || 'project') === scope);

  const record = {
    repo: entry.repo,
    scope,
    targets: [...new Set(entry.targets)].sort(),
    skills: [...entry.skills].sort((a, b) => a.name.localeCompare(b.name)),
    installedAt: new Date().toISOString()
  };

  if (existing) {
    // Une installation partielle ne doit pas faire oublier les Skills déjà
    // suivies : on fusionne par nom et on additionne les cibles.
    const byName = new Map(existing.skills.map(s => [s.name, s]));
    for (const skill of record.skills) byName.set(skill.name, skill);

    existing.skills = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    existing.targets = [...new Set([...(existing.targets || []), ...record.targets])].sort();
    existing.installedAt = record.installedAt;
  } else {
    manifest.sources.push(record);
  }

  return writeManifest(manifest, root);
}

module.exports = {
  MANIFEST_NAME,
  manifestPath,
  emptyManifest,
  readManifest,
  writeManifest,
  recordInstall
};

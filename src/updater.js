const https = require('https');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const colors = require('./colors');
const pkg = require('../package.json');
const { readManifest } = require('./manifest');
const { install } = require('./installer');

const REGISTRY_BASE = 'https://registry.npmjs.org';

/**
 * Dépôt attendu pour le paquet publié. Sert à vérifier que le nom NPM
 * n'est pas occupé par un paquet tiers avant de proposer une installation
 * globale : `npm install -g` sur un homonyme exécuterait du code étranger.
 */
function expectedRepository() {
  const url = (pkg.repository && pkg.repository.url) || '';
  const match = url.match(/github\.com[/:]([^/]+\/[^/.]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function registryRepository(metadata) {
  const url = (metadata.repository && metadata.repository.url) || '';
  const match = url.match(/github\.com[/:]([^/]+\/[^/.]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Compare deux versions sémantiques.
 * @returns {number} >0 si a > b, <0 si a < b, 0 si égales.
 */
function compareVersions(a, b) {
  const parse = v => String(v || '0').split('.').map(n => Number.parseInt(n, 10) || 0);
  const [aParts, bParts] = [parse(a), parse(b)];

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Interroge le registre NPM pour la dernière version publiée du CLI.
 * Toute erreur réseau est remontée telle quelle : la mise à jour des
 * Skills ne doit pas dépendre de cette requête.
 *
 * @returns {Promise<object>} métadonnées du paquet (version, repository, bin)
 */
function fetchLatestRelease({ timeout = 5000, name = pkg.name } = {}) {
  return new Promise((resolve, reject) => {
    const url = `${REGISTRY_BASE}/${encodeURIComponent(name)}/latest`;
    const request = https.get(url, { timeout }, response => {
      if (response.statusCode === 404) {
        response.resume();
        reject(new Error(`Le paquet "${name}" n'est pas encore publié sur NPM.`));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Le registre NPM a répondu ${response.statusCode}.`));
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 1_000_000) {
          request.destroy();
          reject(new Error('Réponse du registre NPM trop volumineuse.'));
        }
      });
      response.on('end', () => {
        try {
          const metadata = JSON.parse(body);
          if (typeof metadata.version !== 'string') throw new Error('champ "version" absent');
          resolve(metadata);
        } catch (err) {
          reject(new Error(`Réponse du registre NPM illisible : ${err.message}`));
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Délai dépassé en interrogeant le registre NPM.'));
    });
    request.on('error', err => reject(new Error(`Registre NPM injoignable : ${err.message}`)));
  });
}

/**
 * Met à jour le CLI lui-même via NPM.
 *
 * L'installation globale n'est proposée que si le paquet publié sous ce nom
 * est bien le nôtre : un nom occupé par un tiers doit produire un
 * avertissement, jamais une commande d'installation.
 *
 * @param {object} [options]
 * @param {boolean} [options.apply] Lancer réellement `npm install -g`.
 * @returns {{current, latest, upToDate, applied, mismatch?, error?}}
 */
async function updateSelf({ apply = false } = {}) {
  const current = pkg.version;

  let metadata = null;
  try {
    metadata = await fetchLatestRelease();
  } catch (err) {
    return { current, latest: null, upToDate: false, applied: false, error: err.message };
  }

  const expected = expectedRepository();
  const published = registryRepository(metadata);
  const hasOurBin = Boolean(metadata.bin && Object.prototype.hasOwnProperty.call(metadata.bin, 'openskill'));

  if (expected && published !== expected && !hasOurBin) {
    return {
      current,
      latest: metadata.version,
      upToDate: false,
      applied: false,
      mismatch: true,
      error:
        `Le nom NPM "${pkg.name}" est occupé par un paquet tiers ` +
        `(${published || 'dépôt inconnu'}, v${metadata.version}). ` +
        `Aucune installation globale n'est proposée : publiez le CLI sous un nom disponible.`
    };
  }

  if (compareVersions(metadata.version, current) <= 0) {
    return { current, latest: metadata.version, upToDate: true, applied: false };
  }

  if (!apply) {
    return { current, latest: metadata.version, upToDate: false, applied: false };
  }

  try {
    execFileSync('npm', ['install', '-g', `${pkg.name}@${metadata.version}`], { stdio: 'inherit' });
    return { current, latest: metadata.version, upToDate: false, applied: true };
  } catch (err) {
    return {
      current,
      latest: metadata.version,
      upToDate: false,
      applied: false,
      error: `Échec de "npm install -g ${pkg.name}@${metadata.version}" : ${err.message}`
    };
  }
}

/**
 * Réinstalle toutes les sources enregistrées dans le manifeste, dans toutes
 * les cibles déjà utilisées, et rapporte les changements de version.
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {string} [options.home]
 * @param {boolean} [options.quiet]
 * @returns {{sources: Array, changes: Array, errors: Array}}
 */
async function updateSkills(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();
  const log = options.quiet ? () => {} : (...args) => console.log(...args);

  const results = { sources: [], changes: [], errors: [] };

  for (const root of [cwd, home]) {
    const scope = root === cwd ? 'project' : 'user';
    // Une installation utilisateur et une installation projet peuvent
    // coexister ; on évite de traiter deux fois la même racine.
    if (scope === 'user' && path.resolve(root) === path.resolve(cwd)) continue;

    const manifest = readManifest(root);

    for (const entry of manifest.sources) {
      if ((entry.scope || 'project') !== scope) continue;

      const previous = new Map((entry.skills || []).map(s => [s.name, s.version]));
      log(
        `\n${colors.cyan}🔄 Mise à jour de ${colors.bright}${entry.repo}${colors.reset}${colors.cyan} (${scope}, cibles : ${(entry.targets || []).join(', ') || 'aucune'})${colors.reset}`
      );

      try {
        const result = await install(entry.repo, {
          targets: entry.targets,
          user: scope === 'user',
          yes: true,
          quiet: true,
          cwd,
          home,
          checkPath: options.checkPath
        });

        for (const skill of result.skills || []) {
          const before = previous.get(skill.name);
          if (before === undefined) {
            results.changes.push({ repo: entry.repo, name: skill.name, from: null, to: skill.version });
            log(`  ${colors.green}+${colors.reset} ${skill.name} ${colors.dim}(nouvelle, v${skill.version || '?'})${colors.reset}`);
          } else if (before !== skill.version) {
            results.changes.push({ repo: entry.repo, name: skill.name, from: before, to: skill.version });
            log(`  ${colors.green}↑${colors.reset} ${skill.name} ${colors.dim}v${before || '?'} → v${skill.version || '?'}${colors.reset}`);
          } else {
            log(`  ${colors.dim}=${colors.reset} ${skill.name} ${colors.dim}v${skill.version || '?'}${colors.reset}`);
          }
        }

        for (const name of previous.keys()) {
          if (!(result.skills || []).some(s => s.name === name)) {
            log(`  ${colors.yellow}!${colors.reset} ${name} ${colors.dim}n'existe plus dans la source${colors.reset}`);
          }
        }

        results.sources.push({ repo: entry.repo, scope, skills: result.skills || [] });
      } catch (err) {
        results.errors.push({ repo: entry.repo, scope, message: err.message });
        log(`  ${colors.red}✗ ${err.message}${colors.reset}`);
      }
    }
  }

  return results;
}

module.exports = { compareVersions, fetchLatestRelease, updateSelf, updateSkills };

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Confinement strict des entrées : tout ce qui n'est pas explicitement
// reconnu est rejeté avant d'atteindre `git`.
const GH_SHORTHAND_REGEX = /^[a-zA-Z0-9-]{1,39}\/[a-zA-Z0-9_.-]+$/;
const GIT_HTTP_REGEX = /^https?:\/\/[a-zA-Z0-9_.-]+(?:\.[a-zA-Z0-9_.-]+)+(?::\d+)?\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;
const GIT_SSH_REGEX = /^git@[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;

function getRepoDetails(repo) {
  if (typeof repo !== 'string') {
    throw new Error('Le dépôt doit être une chaîne de caractères.');
  }

  if (repo.startsWith('--') || repo.startsWith(';') || repo.startsWith('|') || repo.startsWith('&')) {
    throw new Error(`Format de dépôt non valide ou non reconnu : "${repo}"`);
  }

  if (repo.startsWith('.') || repo.startsWith('/') || repo.startsWith('\\') || path.isAbsolute(repo)) {
    return { type: 'local', url: path.resolve(repo) };
  }

  if (GH_SHORTHAND_REGEX.test(repo)) {
    return { type: 'git', url: `https://github.com/${repo}.git` };
  }

  if (GIT_HTTP_REGEX.test(repo) || GIT_SSH_REGEX.test(repo)) {
    return { type: 'git', url: repo };
  }

  throw new Error(`Format de dépôt non valide ou non reconnu : "${repo}"`);
}

/**
 * Rend un dépôt (local ou distant) disponible sur le disque.
 *
 * @returns {{sourceDir: string, type: string, url: string, cleanup: () => void}}
 */
function resolveSource(repo, { onProgress = () => {} } = {}) {
  const details = getRepoDetails(repo);

  if (details.type === 'local') {
    onProgress(`local:${details.url}`);
    return { ...details, sourceDir: details.url, cleanup: () => {} };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openskill-'));
  const cleanup = () => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  };

  onProgress(`clone:${details.url}`);
  try {
    execFileSync('git', ['clone', '--depth', '1', '--', details.url, tempDir], { stdio: 'ignore' });
  } catch (err) {
    cleanup();
    throw new Error(
      `Échec du clonage du dépôt Git "${details.url}". Veuillez vérifier l'URL et votre connexion Internet.`
    );
  }

  return { ...details, sourceDir: tempDir, cleanup };
}

module.exports = { getRepoDetails, resolveSource };

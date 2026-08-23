const fs = require('fs');
const path = require('path');

const colors = require('./colors');
const { getRepoDetails, resolveSource } = require('./source');
const {
  isValidSkillName,
  scanDirectoryForSkills,
  collectSkills
} = require('./catalog');

async function install(repo, options = {}) {
  const targetSkillName = options.skill;

  if (targetSkillName && !isValidSkillName(targetSkillName)) {
    throw new Error(
      `Nom de compétence non valide : "${targetSkillName}". Seuls les caractères alphanumériques, '-' et '_' sont autorisés.`
    );
  }

  const source = resolveSource(repo, {
    onProgress: event => {
      const [kind, url] = [event.slice(0, event.indexOf(':')), event.slice(event.indexOf(':') + 1)];
      if (kind === 'local') {
        console.log(`${colors.cyan}🔍 Recherche de compétences locales dans : ${colors.bright}${url}${colors.reset}`);
      } else {
        console.log(`${colors.cyan}📥 Téléchargement du dépôt : ${colors.bright}${url}${colors.reset}...`);
      }
    }
  });

  try {
    const { skills: allSkills } = collectSkills(source.sourceDir, message =>
      console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`)
    );

    if (allSkills.length === 0) {
      console.log(
        `\n${colors.yellow}⚠️ Aucune compétence valide (contenant un fichier SKILL.md) n'a été trouvée dans le dépôt.${colors.reset}`
      );
      return;
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

    console.log(`${colors.cyan}⚙️ Installation des compétences...${colors.reset}\n`);

    const destBaseDir = path.resolve(process.cwd(), '.agents', 'skills');
    if (!fs.existsSync(destBaseDir)) {
      fs.mkdirSync(destBaseDir, { recursive: true });
    }

    for (const skill of skillsToInstall) {
      if (!isValidSkillName(skill.name)) {
        console.log(`${colors.yellow}⚠️ Compétence avec nom non valide ignorée : ${skill.name}${colors.reset}`);
        continue;
      }

      const destDir = path.resolve(destBaseDir, skill.name);

      // Confinement strict : le nom est déjà validé, ce contrôle reste
      // la dernière barrière contre un path traversal.
      if (!destDir.startsWith(destBaseDir + path.sep)) {
        throw new Error(`Tentative de path traversal détectée pour la compétence : "${skill.name}"`);
      }

      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }
      fs.mkdirSync(destDir, { recursive: true });
      fs.cpSync(skill.path, destDir, { recursive: true });

      console.log(
        `  ${colors.green}✓${colors.reset} ${colors.bright}${skill.name}${colors.reset} -> ${colors.dim}.agents/skills/${skill.name}/${colors.reset}`
      );
    }

    console.log(
      `\n${colors.green}${colors.bright}🎉 Installation réussie de ${skillsToInstall.length} compétence(s) !${colors.reset}`
    );
  } finally {
    source.cleanup();
  }
}

module.exports = {
  install,
  getRepoDetails,
  scanDirectoryForSkills,
  isValidSkillName
};

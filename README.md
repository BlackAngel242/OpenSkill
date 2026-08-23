# 🚀 OpenSkill

Une bibliothèque open source de compétences ("Skills") réutilisables pour les agents IA.

L'objectif est simple : permettre à chacun de partager ses meilleures méthodes, workflows, prompts et expertises sous forme de Skills installables via `npx`.

---

## 🌍 Vision

Aujourd'hui, chacun recrée les mêmes prompts, procédures et workflows dans son coin.

OpenSkills vise à devenir un dépôt communautaire où les développeurs, administrateurs systèmes, experts cybersécurité, designers, marketeurs et passionnés d'IA peuvent partager leurs compétences avec le monde.

Une Skill peut représenter :

- Une méthodologie d'audit
- Un workflow DevOps
- Une procédure de réponse à incident
- Une méthode d'analyse OSINT
- Un assistant métier
- Un framework de réflexion
- Un processus de rédaction

---

## 📂 Structure du dépôt

```text
OpenSkill/
│
├── bin/
│   └── index.js                # CLI (add, list, search, validate)
│
├── src/
│   ├── catalog.js              # Découverte des Skills (registre puis scan)
│   ├── colors.js
│   ├── frontmatter.js          # Analyse du frontmatter YAML
│   ├── installer.js            # Installation multi-assistants
│   ├── manifest.js             # .openskill.json (suivi des installations)
│   ├── prompt.js               # Sélection interactive des cibles
│   ├── search.js               # Listing et recherche
│   ├── source.js               # Résolution et clonage des dépôts
│   ├── targets.js              # Assistants IA : détection et formats
│   ├── updater.js              # Mise à jour des Skills et du CLI
│   └── validator.js            # Vérification des Skills et du registre
│
├── skills/
│   ├── cybersecurity/
│   │   ├── phishing-analysis/SKILL.md
│   │   ├── ad-audit/SKILL.md
│   │   └── devsecops-complete-audit/SKILL.md
│   │
│   ├── sysadmin/
│   │   └── linux-hardening/SKILL.md
│   │
│   ├── devops/
│   │   └── kubernetes-review/SKILL.md
│   │
│   ├── business/
│   │   └── prd-table-ronde/    # Skill multi-fichiers (references/, assets/)
│   │       ├── SKILL.md
│   │       ├── references/
│   │       └── assets/
│   │
│   └── ai/
│       ├── prompt-engineering/SKILL.md
│       └── openpua/SKILL.md
│
├── test/
├── registry.json               # Index généré (npx @kxlsys/openskill validate . --fix)
├── package.json
├── CONTRIBUTING.md
└── README.md
```

---

## 📖 Exemple de Skill

Tous les champs ci-dessous sont obligatoires et vérifiés par `openskill validate` :

```yaml
---
name: phishing-analysis
author: KxlSys
version: 1.0.0
tags:
  - cybersecurity
  - phishing
description: Analyse complète d'un email suspect.
---
```

```md
# Phishing Analysis

Lorsque l'utilisateur fournit un email :

1. Analyser l'expéditeur
2. Vérifier les URLs
3. Identifier les indicateurs de phishing
4. Evaluer le risque
5. Produire un rapport détaillé

## Rapport

### Résumé

### Indicateurs

### Risque

### Recommandations
```

---

## 🧩 Standard Agent Skills

OpenSkill suit le [standard ouvert Agent Skills](https://agentskills.io/specification) : une Skill est un dossier contenant un `SKILL.md` à frontmatter YAML, avec des sous-dossiers optionnels `references/`, `scripts/` et `assets/`.

Les contraintes du standard sont vérifiées par `openskill validate` :

| Champ | Statut | Contrainte |
| --- | --- | --- |
| `name` | requis (standard) | 64 caractères max, minuscules, chiffres et tirets, sans tiret initial, final ou doublé ; identique au nom du dossier |
| `description` | requis (standard) | 1024 caractères max ; dit ce que fait la Skill **et** quand l'utiliser |
| `license` | optionnel (standard) | — |
| `version`, `author`, `tags` | requis dans ce dépôt | acceptés à plat ou sous `metadata:` |

Les deux écritures sont donc valides :

```yaml
# Forme à plat
name: ma-skill
author: VotrePseudo
version: 1.0.0
```

```yaml
# Forme canonique du standard
name: ma-skill
metadata:
  author: VotrePseudo
  version: "1.0.0"
```

---

## 📦 Utilisation du CLI

### Détecter vos assistants IA

OpenSkill repère les assistants installés (marqueurs projet, dossiers personnels, binaires du PATH) :

```bash
npx @kxlsys/openskill detect
```

### Installer

L'installation détecte vos assistants et vous propose les cibles. Les Skills sont converties au format de chacun :

```bash
npx @kxlsys/openskill add BlackAngel242/OpenSkill              # propose les cibles détectées
npx @kxlsys/openskill add BlackAngel242/OpenSkill --all --yes  # toutes les cibles, sans question
npx @kxlsys/openskill add BlackAngel242/OpenSkill --target claude-code,cursor
npx @kxlsys/openskill add BlackAngel242/OpenSkill --skill phishing-analysis
npx @kxlsys/openskill add BlackAngel242/OpenSkill --user       # installation globale
npx @kxlsys/openskill add ./mon-depot-local
```

> **Nom du paquet** — le CLI est publié sous `@kxlsys/openskill`. Le nom court `openskill` appartient sur NPM à une librairie sans rapport (algorithme de classement bayésien) : `npx openskill` ne lance donc **pas** cet outil.

### Assistants supportés

| Cible | Destination | Harnais servis |
| --- | --- | --- |
| `claude-code` | `.claude/skills/<nom>/SKILL.md` | Claude Code, OpenCode, MiMo Code |
| `agents` | `.agents/skills/<nom>/SKILL.md` | OpenCode, Hermes Agent, OpenClaw, MiMo Code |
| `agents-md` | `AGENTS.md` (bloc géré) + `.agents/skills/` | Codex, OpenCode, Jules, Factory, goose, Zed, Warp, Devin, Junie, Amp, RooCode, Kilo Code |
| `hermes` | `.hermes/skills/<nom>/SKILL.md` | Hermes Agent (Nous Research) |
| `opencode` | `.opencode/skills/<nom>/SKILL.md` | OpenCode |
| `mimo` | `.mimocode/skills/<nom>/SKILL.md` | MiMo Code (Xiaomi) |
| `cursor` | `.cursor/rules/<nom>.mdc` | Cursor |
| `windsurf` | `.windsurf/rules/<nom>.md` | Windsurf |
| `copilot` | `.github/instructions/<nom>.instructions.md` | GitHub Copilot |
| `cline` | `.clinerules/<nom>.md` | Cline |
| `continue` | `.continue/rules/<nom>.md` | Continue |
| `gemini` | `GEMINI.md` (bloc géré) + `.agents/skills/` | Gemini CLI |
| `aider` | `CONVENTIONS.md` (bloc géré) + `.agents/skills/` | Aider |

Une destination sert souvent plusieurs harnais : `.agents/skills/` est la convention inter-outils, et `AGENTS.md` est lu par une trentaine d'agents. Installer dans ces deux cibles couvre donc l'essentiel de l'écosystème sans multiplier les copies. `openskill detect` indique pour chaque cible détectée qui la lit.

Trois modes de pose :

- **Dossier** — le dossier de la Skill est copié tel quel, fichiers annexes compris.
- **Fichier** — un fichier de règles est généré au format de l'assistant. Si la Skill embarque des références ou des gabarits, ils sont conservés dans `.agents/skills/<nom>/` et cités dans le fichier généré.
- **Bloc géré** — un bloc délimité `<!-- BEGIN OPENSKILL -->` … `<!-- END OPENSKILL -->` est inséré dans le fichier de contexte racine. Le reste du fichier n'est jamais modifié, et une réinstallation remplace le bloc au lieu de l'empiler.

### Mettre à jour

Chaque installation est enregistrée dans `.openskill.json`. Une seule commande met tout à jour, dans toutes les cibles :

```bash
npx @kxlsys/openskill update          # toutes les Skills installées
npx @kxlsys/openskill update --self   # + le CLI lui-même via NPM
npx @kxlsys/openskill update --self-only
```

La sortie indique ce qui a changé :

```text
🔄 Mise à jour de BlackAngel242/OpenSkill (project, cibles : claude-code, cursor)
  = ad-audit v1.0.0
  ↑ kubernetes-review v1.0.0 → v1.4.0
  + prd-table-ronde (nouvelle, v2.1.1)
```

### Explorer

Lister les Skills disponibles :

```bash
npx @kxlsys/openskill list                      # dépôt officiel
npx @kxlsys/openskill list ./mon-depot-local
```

Rechercher une Skill par nom, description, catégorie, auteur ou tag (insensible à la casse et aux accents, tous les termes doivent correspondre) :

```bash
npx @kxlsys/openskill search kubernetes
npx @kxlsys/openskill search "audit active-directory"
npx @kxlsys/openskill search hardening --repo ./mon-depot-local
```

### Vérifier

Valider les Skills d'un dépôt (frontmatter, convention de nommage, cohérence de `registry.json`) :

```bash
npx @kxlsys/openskill validate .
npx @kxlsys/openskill validate . --fix          # régénère registry.json depuis les SKILL.md
```

`validate` retourne un code de sortie non nul en cas d'erreur : il est utilisable tel quel en CI.

### Référence des commandes

| Commande | Description |
| --- | --- |
| `add <repository>` | Installe les Skills dans les assistants détectés |
| `detect` | Liste les assistants IA détectés |
| `update` | Met à jour toutes les Skills installées |
| `list [repository]` | Liste les Skills d'un dépôt |
| `search <requête>` | Recherche une Skill |
| `validate [chemin]` | Vérifie les Skills et le registre |

| Option | Commande | Description |
| --- | --- | --- |
| `-s, --skill <name>` | `add` | Installe une seule Skill |
| `-t, --target <ids>` | `add` | Cibles séparées par des virgules |
| `--all` | `add` | Toutes les cibles détectées |
| `--user` | `add`, `update` | Portée globale au lieu du projet |
| `-y, --yes` | `add`, `update` | Aucune question |
| `--self` / `--self-only` | `update` | Met aussi/uniquement à jour le CLI |
| `-r, --repo <repository>` | `search` | Dépôt à interroger |
| `--fix` | `validate` | Régénère `registry.json` |
| `-h, --help` | — | Affiche l'aide |
| `-v, --version` | — | Affiche la version |

---

## 🤝 Contribution

Les contributions sont les bienvenues. Le guide complet se trouve dans [CONTRIBUTING.md](CONTRIBUTING.md).

### Étapes

1. Forker le dépôt
2. Créer une branche

```bash
git checkout -b add-new-skill
```

3. Ajouter votre Skill

```text
skills/
└── category/
    └── skill-name/
        └── SKILL.md
```

4. Régénérer le registre et vérifier

```bash
npm run validate -- --fix
npm test
```

5. Commit

```bash
git commit -m "feat: add new skill"
```

6. Ouvrir une Pull Request

---

## 📋 Convention de nommage

Utiliser uniquement :

```text
a-z
0-9
-
```

Exemples :

✅ linux-hardening

✅ active-directory-audit

✅ phishing-analysis

❌ Linux Hardening

❌ ActiveDirectoryAudit

---

## 🏷️ Catégories disponibles

- Cybersecurity
- SysAdmin
- DevOps
- Cloud
- Linux
- Windows
- Networking
- OSINT
- AI
- Web Development
- Mobile Development
- Design
- Productivity
- Business
- Debugging

---

## ⭐ Pourquoi contribuer ?

Chaque Skill publiée :

- aide la communauté ;
- évite de réinventer la roue ;
- met en valeur votre expertise ;
- peut être utilisée par des milliers d'utilisateurs.

---

## 📜 Licence

MIT License

---

## 📋 Roadmap

### Phase 1
- [x] Création du dépôt GitHub
- [x] Ajout des premières Skills
- [x] Standardisation des métadonnées
- [x] Création du registry.json

### Phase 2
- [x] Développement du CLI OpenSkill
- [x] Préparation de la publication NPM (paquet `@kxlsys/openskill`)
- [ ] Première publication sur NPM
- [x] Support GitHub Repository Import

### Phase 3
- [x] Installation via NPX (nom scopé `@kxlsys/openskill`)
- [x] Recherche de Skills (`openskill search`)
- [x] Mise à jour automatique (`openskill update`)
- [x] Vérification des Skills (`openskill validate`)

### Phase 4
- [x] Détection automatique des assistants IA (`openskill detect`)
- [x] Installation multi-assistants avec conversion de format
- [x] Mise à jour groupée des Skills et du CLI
- [x] Conformité au standard Agent Skills (agentskills.io)
- [x] Support des harnais Hermes, OpenCode, MiMo Code, OpenClaw
- [ ] Publication du CLI sur NPM (`npm run release`)

---

## 🔥 Notre ambition

Construire la plus grande collection francophone et internationale de Skills open source pour les agents IA.

Créer une fois.
Partager avec tous.
Améliorer ensemble.

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
├── registry.json               # Index généré (npx openskill validate . --fix)
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

## 📦 Utilisation du CLI

### Détecter vos assistants IA

OpenSkill repère les assistants installés (marqueurs projet, dossiers personnels, binaires du PATH) :

```bash
npx openskill detect
```

### Installer

L'installation détecte vos assistants et vous propose les cibles. Les Skills sont converties au format de chacun :

```bash
npx openskill add BlackAngel242/OpenSkill              # propose les cibles détectées
npx openskill add BlackAngel242/OpenSkill --all --yes  # toutes les cibles, sans question
npx openskill add BlackAngel242/OpenSkill --target claude-code,cursor
npx openskill add BlackAngel242/OpenSkill --skill phishing-analysis
npx openskill add BlackAngel242/OpenSkill --user       # installation globale
npx openskill add ./mon-depot-local
```

### Assistants supportés

| Cible | Assistant | Destination |
| --- | --- | --- |
| `claude-code` | Claude Code | `.claude/skills/<nom>/SKILL.md` |
| `cursor` | Cursor | `.cursor/rules/<nom>.mdc` |
| `windsurf` | Windsurf | `.windsurf/rules/<nom>.md` |
| `copilot` | GitHub Copilot | `.github/instructions/<nom>.instructions.md` |
| `cline` | Cline | `.clinerules/<nom>.md` |
| `continue` | Continue | `.continue/rules/<nom>.md` |
| `codex` | Codex | `AGENTS.md` (bloc géré) + `.agents/skills/` |
| `gemini` | Gemini CLI | `GEMINI.md` (bloc géré) + `.agents/skills/` |
| `aider` | Aider | `CONVENTIONS.md` (bloc géré) + `.agents/skills/` |
| `agents` | Générique | `.agents/skills/<nom>/` |

Trois modes de pose :

- **Dossier** — le dossier de la Skill est copié tel quel, fichiers annexes compris.
- **Fichier** — un fichier de règles est généré au format de l'assistant. Si la Skill embarque des références ou des gabarits, ils sont conservés dans `.agents/skills/<nom>/` et cités dans le fichier généré.
- **Bloc géré** — un bloc délimité `<!-- BEGIN OPENSKILL -->` … `<!-- END OPENSKILL -->` est inséré dans le fichier de contexte racine. Le reste du fichier n'est jamais modifié, et une réinstallation remplace le bloc au lieu de l'empiler.

### Mettre à jour

Chaque installation est enregistrée dans `.openskill.json`. Une seule commande met tout à jour, dans toutes les cibles :

```bash
npx openskill update          # toutes les Skills installées
npx openskill update --self   # + le CLI lui-même via NPM
npx openskill update --self-only
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
npx openskill list                      # dépôt officiel
npx openskill list ./mon-depot-local
```

Rechercher une Skill par nom, description, catégorie, auteur ou tag (insensible à la casse et aux accents, tous les termes doivent correspondre) :

```bash
npx openskill search kubernetes
npx openskill search "audit active-directory"
npx openskill search hardening --repo ./mon-depot-local
```

### Vérifier

Valider les Skills d'un dépôt (frontmatter, convention de nommage, cohérence de `registry.json`) :

```bash
npx openskill validate .
npx openskill validate . --fix          # régénère registry.json depuis les SKILL.md
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
- [ ] Publication sur NPM
- [x] Support GitHub Repository Import

### Phase 3
- [ ] Installation via NPX (package global) — bloquée : le nom `openskill` est pris sur NPM
- [x] Recherche de Skills (`openskill search`)
- [x] Mise à jour automatique (`openskill update`)
- [x] Vérification des Skills (`openskill validate`)

### Phase 4
- [x] Détection automatique des assistants IA (`openskill detect`)
- [x] Installation multi-assistants avec conversion de format
- [x] Mise à jour groupée des Skills et du CLI
- [ ] Publication du CLI sous un nom NPM disponible

---

## 🔥 Notre ambition

Construire la plus grande collection francophone et internationale de Skills open source pour les agents IA.

Créer une fois.
Partager avec tous.
Améliorer ensemble.

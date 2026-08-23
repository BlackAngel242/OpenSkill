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
│   ├── installer.js            # Installation dans .agents/skills/
│   ├── search.js               # Listing et recherche
│   ├── source.js               # Résolution et clonage des dépôts
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

### Installer

Installer l'ensemble du dépôt :

```bash
npx openskill add BlackAngel242/OpenSkill
```

Installer une Skill spécifique :

```bash
npx openskill add BlackAngel242/OpenSkill --skill phishing-analysis
```

Installer depuis un dépôt local :

```bash
npx openskill add ./mon-depot-local
```

Les Skills sont copiées dans `.agents/skills/<nom>/` du répertoire courant.

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
| `add <repository>` | Installe les Skills dans `.agents/skills/` |
| `list [repository]` | Liste les Skills d'un dépôt |
| `search <requête>` | Recherche une Skill |
| `validate [chemin]` | Vérifie les Skills et le registre |

| Option | Commande | Description |
| --- | --- | --- |
| `-s, --skill <name>` | `add` | Installe une seule Skill |
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
- [ ] Installation via NPX (package global)
- [x] Recherche de Skills (`openskill search`)
- [ ] Mise à jour automatique
- [x] Vérification des Skills (`openskill validate`)

---

## 🔥 Notre ambition

Construire la plus grande collection francophone et internationale de Skills open source pour les agents IA.

Créer une fois.
Partager avec tous.
Améliorer ensemble.

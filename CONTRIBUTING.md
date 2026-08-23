# 🤝 Contribuer à OpenSkill

Merci de vouloir enrichir la bibliothèque ! Ce guide décrit comment ajouter une Skill et comment vérifier votre contribution avant d'ouvrir une Pull Request.

---

## 1. Prérequis

- Node.js >= 18
- Git

Aucune dépendance externe n'est nécessaire : le CLI est volontairement sans `node_modules`.

```bash
git clone https://github.com/BlackAngel242/OpenSkill.git
cd OpenSkill
npm test
```

---

## 2. Ajouter une Skill

### Arborescence

Une Skill est un dossier contenant un fichier `SKILL.md` :

```text
skills/
└── <catégorie>/
    └── <nom-de-la-skill>/
        └── SKILL.md
```

Le nom du dossier **doit** être identique au champ `name` du frontmatter.

Une Skill peut embarquer des fichiers annexes (références, gabarits, assets) :

```text
skills/business/prd-table-ronde/
├── SKILL.md
├── references/
│   └── personas.md
└── assets/
    └── design-system.css
```

Sur les assistants qui rangent les Skills en dossiers (Claude Code, générique), l'arborescence est copiée telle quelle. Sur ceux qui attendent un fichier de règles unique (Cursor, Copilot, Cline…), les fichiers annexes sont conservés dans `.agents/skills/<nom>/` et cités dans le fichier généré.

### Convention de nommage

Uniquement des minuscules, des chiffres et des tirets simples :

| ✅ Valide | ❌ Invalide |
| --- | --- |
| `linux-hardening` | `Linux-Hardening` |
| `phishing-analysis` | `phishing_analysis` |
| `ad-audit` | `-ad-audit` / `ad--audit` |

### Frontmatter obligatoire

Chaque `SKILL.md` commence par un bloc YAML contenant les champs suivants, tous obligatoires :

```yaml
---
name: ma-skill              # identique au nom du dossier
author: VotrePseudo         # attribution de la contribution
version: 1.0.0              # format MAJEUR.MINEUR.CORRECTIF
description: Une phrase décrivant ce que fait la Skill.
tags:                       # au moins un tag
  - categorie
  - mot-cle
---
```

La description sert aussi de condition de déclenchement pour les agents : dites ce que fait la Skill **et** quand l'utiliser. Elle peut être longue, auquel cas un scalaire YAML replié est accepté :

```yaml
description: >
  Transforme un brief client en PRD constructible. À utiliser pour un cahier
  des charges, un blueprint produit ou un audit d'application. Ne pas
  l'utiliser pour une question technique ponctuelle.
```

Le champ optionnel `category` peut être ajouté ; sinon la catégorie est déduite du dossier parent.

### Contenu

Après le frontmatter, rédigez la méthode en Markdown : contexte d'utilisation, étapes numérotées, et format de rapport attendu le cas échéant. Voir `skills/cybersecurity/phishing-analysis/SKILL.md` pour un exemple court, et `skills/cybersecurity/devsecops-complete-audit/SKILL.md` pour un exemple détaillé.

---

## 3. Mettre à jour le registre

`registry.json` est l'index consommé par le CLI. Il est **généré**, ne l'éditez pas à la main :

```bash
npm run validate -- --fix   # régénère registry.json depuis les SKILL.md
```

ou directement :

```bash
node bin/index.js validate . --fix
```

---

## 4. Vérifier avant de proposer

```bash
npm test        # suites unitaires (installateur, catalogue, validation)
npm run validate # frontmatter, conventions de nommage, cohérence du registre
```

Ces deux commandes sont exécutées par la CI sur chaque Pull Request : une contribution qui échoue localement échouera aussi en CI.

---

## 5. Ouvrir la Pull Request

```bash
git checkout -b add-<nom-de-la-skill>
git add .
git commit -m "feat: add <nom-de-la-skill> skill"
git push -u origin add-<nom-de-la-skill>
```

Décrivez dans la PR :

- ce que fait la Skill et à qui elle s'adresse ;
- le contexte dans lequel vous l'avez éprouvée.

---

## 6. Contribuer au CLI

Le code source est organisé ainsi :

| Fichier | Rôle |
| --- | --- |
| `bin/index.js` | Analyse des arguments et affichage |
| `src/source.js` | Résolution d'un dépôt (local, GitHub, URL Git) et clonage |
| `src/catalog.js` | Découverte des Skills (registre puis scan) |
| `src/frontmatter.js` | Analyse du frontmatter YAML, sans dépendance |
| `src/targets.js` | Assistants IA : détection, destinations, conversion de format |
| `src/manifest.js` | `.openskill.json` : suivi des installations |
| `src/updater.js` | Mise à jour des Skills et du CLI |
| `src/prompt.js` | Sélection interactive des cibles |
| `src/search.js` | Listing et recherche |
| `src/validator.js` | Vérification des Skills et du registre |
| `src/installer.js` | Installation dans les assistants choisis |

### Ajouter un assistant IA

Un assistant se décrit par une entrée dans `TARGETS` (`src/targets.js`) :

- `markers` : indices de détection (fichiers/dossiers du projet, dossiers personnels, binaires du PATH) ;
- `layout` : `directory`, `file` ou `managed-block` ;
- `render` : conversion du `SKILL.md` vers le format attendu (cibles `file` uniquement).

N'ajoutez que des conventions réellement lues par l'outil : un fichier écrit au mauvais endroit n'est jamais chargé, et donne l'illusion d'une installation réussie.

Deux règles à respecter :

1. **Zéro dépendance runtime** — le CLI doit rester exécutable via `npx` sans installation.
2. **Entrées non fiables** — les noms de Skill et les chemins du registre proviennent de dépôts tiers. Toute nouvelle écriture sur disque doit valider le nom (`isValidSkillName`) et vérifier le confinement du chemin de destination (`assertContained`).
3. **Jamais d'installation aveugle** — toute commande susceptible d'exécuter du code tiers (`npm install -g`) doit d'abord vérifier l'identité du paquet.

Toute modification du CLI doit être accompagnée d'un test dans `test/`.

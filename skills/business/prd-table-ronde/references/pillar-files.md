# Gabarits des fichiers de continuité

Ne pas imposer `CLAUDE.md` à tous les environnements. Utiliser le fichier d'instructions natif de l'agent cible quand il existe; `AGENTS.md` peut servir d'option portable. Adapter chaque gabarit au projet réel et aux préférences explicitement fournies. Aucune signature, convention typographique personnelle ou branding n'est imposé par ce skill.

Le mode de livraison est indépendant: fichiers séparés, blocs Markdown, ou blocs copiables si une livraison HTML a été retenue. Ne jamais supposer que le HTML existe.

## CLAUDE.md / AGENTS.md · instructions projet

Pour `AGENTS.md`, reprendre la même structure de contenu et adapter seulement ce qui dépend réellement de l'agent cible.

```md
# [Nom du projet] · [Client]

## Contexte
[Produit, cible, contraintes clés.]

## Stack
- [Framework + langage]
- [Backend / base de données]
- [UI]
- [Déploiement]

## Règles de code
- [Typage et conventions]
- [Architecture/couches]
- [Règles d'accès et sécurité]
- [Contraintes performance/offline]
- Langue de l'interface : [langue]

## Règles de contribution / rédaction
- [Uniquement les conventions réellement demandées par le projet ou l'utilisateur]

## Commandes
- [dev / build / lint / test]
- [migrations]
```

## JOURNAL.md · journal de bord

```md
# Journal de bord · [Nom du projet]

## [date] · [titre]
- Fait : ...
- En cours : ...
- Bloqué par : ...
- Décisions : ...
- Prochaine étape : ...
```

## DECISIONS.md · arbitrages structurants

```md
# Décisions · [Nom du projet]

## DEC-001 · [titre]
- Statut : [CONFIRMÉ/HYPOTHÈSE/À VALIDER/BLOQUANT]
- Contexte : ...
- Décision : ...
- Pourquoi : ...
- Contrepartie : ...
- Revoir si : ...
```

## LESSONS.md · leçons apprises

```md
# Leçons apprises · [Nom du projet]

## [Thème]
- Constat : ...
- Parade / règle : ...
```

## HANDOFF.md · passation

```md
# Handoff · [Nom du projet]

## Démarrer en local
1. git clone [repo] && cd [projet]
2. [installer les dépendances]
3. cp .env.example .env.local
4. [lancer]

## État actuel
- Phase : ...
- Ce qui marche : ...
- Ce qui reste : ...

## Accès et secrets
- [Services et emplacement sécurisé des clés; jamais les valeurs]

## Pièges connus
- Voir LESSONS.md avant de toucher aux zones sensibles.
```

## Hook · garde-fou avant commit

Un hook ne bloque que des règles **réellement adoptées par le projet**. Ne pas encoder une préférence personnelle générique.

```sh
#!/bin/sh
[lint] || exit 1
[typecheck] || exit 1
[test] || exit 1
```

## .env.example · configuration modèle

Jamais de vraie clé dans le dépôt.

```dotenv
SERVICE_URL="..."
PUBLIC_KEY="..."
SERVICE_ROLE_KEY="... (serveur uniquement)"
```

## Piliers optionnels
- `ROADMAP.md`: lots livrables et indicateurs de succès.
- `SEED.md`: comptes et données de test sans secrets réels.
- Hooks d'agent: seulement s'ils apportent un garde-fou concret.
- `CONTRIBUTING.md`: conventions pour contributeurs.

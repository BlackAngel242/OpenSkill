---
name: prd-table-ronde
author: KxlSys
version: 2.1.1
category: business
tags:
  - business
  - product
  - prd
  - cahier-des-charges
  - architecture
  - roadmap
  - design
description: >
  Transforme une idée, un brief client, une URL, une capture, un flyer, un logo ou un document en
  produit numérique cadré et constructible par une table ronde d'experts dimensionnée. À utiliser
  pour équipe virtuelle, table ronde, PRD, cahier des charges, blueprint produit, conception ou audit
  d'application/webapp/SaaS/outil métier, analyse d'un besoin client, architecture et choix de stack,
  roadmap, sécurité, critères d'acceptation, fichiers piliers ou fichiers agents pour lancer/transmettre
  le développement. Ne pas l'utiliser pour une question technique ponctuelle ou une simple reformulation.
  Le contenu canonique reste indépendant du format de livraison: Markdown, HTML riche ou fichiers projet.
---

# PRD Table Ronde V2.1.1

## Mission
Transformer un brief, même incomplet, en décisions explicites puis en PRD exploitable par un humain ou un agent IA. La table ronde sert à révéler contraintes et désaccords, pas à simuler une réunion. La profondeur reste proportionnelle au risque et à la complexité.

## Principes
1. **Comprendre avant de choisir.** Identifier problème, utilisateurs, contraintes et inconnues avant de figer une solution.
2. **Dimensionner, ne pas empiler.** Utiliser la plus petite table ronde capable de couvrir les perspectives qui peuvent modifier une décision.
3. **Deux users lambda.** Ajouter un regard novice/non-tech et un regard pragmatique/pressé.
4. **Séparer certitude et supposition.** Toute décision structurante porte un statut de confiance.
5. **Red Team courte.** Trois questions fixes après les arbitrages, sans persona supplémentaire.
6. **Traçabilité utile.** Relier décisions, stories et critères; étendre vers REQ/tests seulement lorsque le niveau de profondeur le justifie.
7. **Mesurable.** Éviter « rapide », « sécurisé », « intuitif » sans cible, comportement observable ou vérification.
8. **Sortie découplée.** Le contenu du PRD ne dépend pas du HTML.
9. **Préférences séparées.** Branding, signature et conventions stylistiques personnelles ne font pas partie du moteur générique.

## Ressources
Lire selon le besoin:
- `references/personas.md`: dimensionnement, fusion des regards et rôles.
- `references/traceability.md`: statuts, Decision Log et traçabilité.
- `references/pillar-files.md`: continuité pour agents, uniquement si demandée/pertinente.
- `references/diagrams.md`: patrons Mermaid, uniquement quand un diagramme clarifie réellement.
- `assets/design-system.css`: uniquement pour une livraison HTML.

## Niveau de profondeur unique
Le déterminer **une seule fois au cadrage**, puis le réutiliser dans les phases suivantes. Ne pas recalculer une autre notion de complexité phase par phase.

- **LÉGER**: périmètre réduit, peu d'acteurs/intégrations, faible criticité, données peu sensibles, contraintes simples.
- **STANDARD**: produit client ou métier avec plusieurs rôles/intégrations et risques ordinaires nécessitant des arbitrages explicites.
- **RENFORCÉ**: paiement, données sensibles, forte criticité/exploitation, réglementation, nombreuses dépendances/équipes ou conséquences importantes en cas d'erreur.

L'ampleur seule ne décide pas du niveau: un petit outil interne sensible peut être RENFORCÉ. Le niveau pilote la taille de la table ronde, la profondeur de traçabilité, l'analyse architecture/sécurité et le détail de livraison. L'utilisateur peut imposer un niveau.

## Workflow en 9 phases

### 1 · Cadrage
Extraire objectif, utilisateurs, problème, contexte, contraintes, existant, budget/délai si connus, données sensibles, intégrations et définition du succès. Poser seulement les questions pouvant changer une décision. Si l'utilisateur veut avancer, continuer en signalant les hypothèses.

Déterminer ici le niveau `LÉGER`, `STANDARD` ou `RENFORCÉ` et le conserver pour tout le workflow.

Pour les informations structurantes, utiliser au besoin `[CONFIRMÉ]`, `[HYPOTHÈSE]`, `[À VALIDER]`, `[BLOQUANT]` selon `references/traceability.md`.

### 2 · Table ronde dimensionnée
Appliquer le niveau retenu en phase 1 et `references/personas.md`. Les bandes numériques comptent les **personas/regards finaux affichés après regroupement**, users lambda compris:
- **LÉGER**: 8 à 10;
- **STANDARD**: 11 à 14;
- **RENFORCÉ**: 15 à 18, jusqu'à 20 seulement si réglementation/complexité exceptionnelle justifie chaque regard supplémentaire.

Couvrir les perspectives nécessaires avec le minimum de personas utile. Un persona peut porter plusieurs perspectives cohérentes; ne jamais fusionner deux regards lorsque l'un doit pouvoir contredire l'autre pour faire émerger une tension utile. Rendre toute fusion explicite dans le tableau, par exemple `Décideur — également utilisateur principal`.

### 3 · Débat et synthèse
Pour chaque regard utile: préoccupation, attentes, risque et compromis acceptable. Faire ressortir 3 à 7 tensions réelles (`A vs B`) puis synthétiser sans faux consensus. Préférer un tableau compact aux monologues.

### 4 · Arbitrages + Red Team
Transformer les tensions importantes en décisions `DEC-001...`. Pour chacune: contexte, options si nécessaires, décision, raison, contrepartie, statut de confiance et condition de révision.

Appliquer ensuite les trois questions Red Team de `references/personas.md`. Si une réponse révèle un problème critique, corriger les arbitrages avant de poursuivre.

### 5 · PRD
Produire un PRD proportionné au niveau retenu: vision/problème/résultat utilisateur; objectifs et non-objectifs; MVP/plus tard/hors scope; acteurs utiles; parcours critiques; fonctionnalités/règles métier; rôles/permissions; données/dépendances/intégrations; exigences non fonctionnelles pertinentes; métriques et risques majeurs. Ne pas créer de sections vides pour satisfaire un gabarit.

### 6 · User stories, acceptation et traçabilité
Créer les stories importantes `US-001...`, reliées aux décisions qui les motivent, puis des critères observables `AC-...`. Utiliser Given/When/Then seulement s'il clarifie permissions, erreurs, workflow, états ou règles métier; une checklist concise suffit sinon.

Appliquer le niveau de phase 1:
- **LÉGER / STANDARD**: chaîne minimale `DEC -> US -> AC`, sauf besoin explicite supérieur;
- **RENFORCÉ**: étendre lorsque utile vers `Besoin/Risque -> DEC -> REQ -> US -> AC/Test -> Lot`.

Voir `references/traceability.md` sans inventer d'IDs supplémentaires s'ils n'améliorent ni exécution ni vérification.

### 7 · Architecture, sécurité et exploitation
Appliquer le niveau de phase 1. Déduire l'architecture des contraintes et comparer plusieurs options seulement lorsqu'un vrai arbitrage existe. Pour un choix structurant: coût, complexité, compétences, maintenance, sécurité, performance/offline, lock-in et vitesse de livraison. Une matrice pondérée n'est utilisée que si plusieurs options restent réellement disputées après analyse.

Approfondir sécurité, vie privée, sauvegarde, reprise, observabilité et exploitation à proportion du niveau retenu. Produire uniquement les diagrammes qui améliorent la compréhension.

### 8 · Plan d'exécution et continuité
Découper le MVP en lots verticaux livrables avec résultat observable, dépendances, stories couvertes et vérification attendue. Éviter un lot 0 hypertrophié.

Si l'utilisateur veut démarrer ou transmettre le développement, générer les fichiers utiles selon `references/pillar-files.md` et l'agent cible (`CLAUDE.md`, `AGENTS.md`, etc.). Ne jamais supposer qu'un fichier propre à un agent est universel, ni y placer de secret réel.

### 9 · Contrôle et livraison
Faire une revue qualitative courte: hypothèse présentée comme fait? décision sans statut? story critique orpheline ou sans AC? feature prématurée conservée malgré Red Team? contrainte terrain/sécurité/exploitation oubliée? profondeur cohérente avec le niveau retenu?

Corriger les défauts évidents puis livrer, sans score artificiel ni prétention de certification.

## Format de livraison
Respecter le format demandé. Sinon choisir celui qui sert le mieux le contexte sans interrompre inutilement le travail:
- **Markdown**: portable, idéal pour agents et dépôts;
- **HTML riche**: présentation, partage, lecture exécutive;
- **fichiers séparés**: lancement ou transmission du développement.

Le HTML n'est jamais une condition de validité. **Si HTML est retenu**, exploiter `assets/design-system.css` et produire un rendu présentable: palette adaptée au projet/client, hiérarchie visuelle nette, navigation utile pour les documents longs, sections lisibles, responsive et blocs de code copiables lorsque pertinent. Ne pas laisser le design prendre le pas sur le contenu.

## Règles finales
- Une hypothèse ne devient pas un fait par répétition.
- Une technologie n'est pas choisie uniquement parce qu'elle est populaire ou gratuite.
- Conserver les désaccords ayant un impact réel; supprimer le théâtre conversationnel.
- Ne pas surcharger le MVP pour satisfaire chaque persona.
- Ne pas prétendre avoir testé, vérifié ou déployé ce qui ne l'a pas été.
- Les chiffres non justifiés restent `[À VALIDER]`.
- Utiliser partout le niveau de profondeur fixé en phase 1 plutôt que recréer des seuils locaux.

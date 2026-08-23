# Audit V2.1 — arbitrage ChatGPT × critique Claude

## Adopté de la critique Claude
1. Statuts explicites: CONFIRMÉ / HYPOTHÈSE / À VALIDER / BLOQUANT.
2. Dimensionnement simple et déterministe de la table ronde.
3. Red Team courte à trois questions, sans ajouter un persona obligatoire.
4. Traçabilité DEC -> US -> AC par défaut, étendue seulement si le projet le justifie.
5. Given/When/Then conditionnel, pas systématique.
6. HTML découplé du contenu canonique.
7. Suppression du Quality Gate chiffré et de la repasse automatique basée sur une auto-note LLM.
8. Retour à neuf phases compactes au lieu de quinze.

## Ce que V2.1 ne reprend pas tel quel
- Le dimensionnement n'est pas basé uniquement sur « interne vs client »: le niveau de
  risque (paiement, données sensibles, réglementation, exploitation) peut faire monter la
  table ronde même pour un outil interne.
- Le format n'est pas forcément une question obligatoire à poser. Si le contexte permet un
  choix évident, le skill avance et choisit le format utile; l'utilisateur peut toujours le
  forcer. Cela évite une friction artificielle.
- La Red Team reste un mécanisme obligatoire, mais peut déclencher une correction des
  arbitrages si elle découvre un problème critique. Elle n'est donc pas purement décorative.
- La traçabilité étendue n'est pas supprimée: elle devient conditionnelle pour les projets
  où elle apporte une valeur réelle (réglementation, multi-équipe, tests forts).

## Critique de notre propre V2
La V2 apportait de bonnes idées mais confondait parfois rigueur et quantité de mécanismes:
15 phases, Quality Gate sur 12 dimensions, auto-score /10, IDs multiples par défaut et Red
Team personnifiée. V2.1 conserve la discipline utile et retire le cérémonial.

## Principe directeur V2.1
**La profondeur doit être proportionnelle au risque et à la complexité du projet.**

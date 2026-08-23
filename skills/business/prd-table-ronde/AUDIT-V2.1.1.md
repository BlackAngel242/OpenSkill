# V2.1.1 · corrections ciblées avant tests réels

Cette révision ne change pas l'architecture à 9 phases. Elle corrige les blockers relevés lors de la revue contradictoire de V2.1.

## Corrigé
1. Frontmatter enrichi avec les déclencheurs d'usage importants: équipe virtuelle/table ronde, PRD/cahier des charges/blueprint, brief/URL/visuel/flyer/logo/document, architecture/stack, fichiers piliers/agents.
2. `pillar-files.md` neutralisé: suppression de la signature DrSmoke, de l'interdiction générique du tiret cadratin et du hook associé; suppression de l'hypothèse HTML obligatoire.
3. Dimensionnement clarifié: les bandes comptent les personas finaux après regroupement; fusion permise seulement si elle ne supprime pas une contradiction utile; fusion rendue explicite dans la sortie.
4. Branche HTML premium restaurée uniquement lorsque HTML est le format retenu; `design-system.css` retrouve un usage explicite.
5. Signal unique `LÉGER / STANDARD / RENFORCÉ` défini une fois en phase 1 et réutilisé par référence pour dimensionnement, traçabilité, architecture/sécurité et livraison.
6. `AGENTS.md` reçoit une règle minimale de dérivation depuis le même contenu projet sans créer un second gros template.

## Non ajouté volontairement
Pas de Quality Gate chiffré, pas de nouvelles phases, pas de nouveaux personas obligatoires, pas d'auto-scoring, pas de marketplace dans cette révision.

# Table ronde dimensionnée

## Principe
Utiliser la plus petite équipe capable de couvrir les risques et perspectives qui peuvent modifier le produit. Les bandes comptent les **personas/regards finaux affichés après regroupement**, pas les perspectives brutes.

Le niveau `LÉGER / STANDARD / RENFORCÉ` est fixé une seule fois en phase 1 de `SKILL.md`; ce fichier ne le recalcule pas.

## Bandes par niveau
- **LÉGER**: 8 à 10 regards finaux, 2 users lambda compris.
- **STANDARD**: 11 à 14.
- **RENFORCÉ**: 15 à 18; jusqu'à 20 uniquement si réglementation/complexité exceptionnelle justifie chaque regard supplémentaire.

Ce sont des garde-fous, pas des quotas à remplir artificiellement.

## Couverture minimale des perspectives
Couvrir selon le projet:
- décideur ou responsable métier;
- utilisateurs finaux aux besoins réellement distincts;
- produit / pilotage;
- architecture / développement;
- UX;
- QA / test;
- 2 users lambda:
  - novice/non-tech: « Est-ce que je comprends ce qu'on construit et pourquoi? »
  - pragmatique/pressé: « Est-ce que ceci m'aide à décider ou construire sans blabla? »

## Fusion de perspectives
Un même persona peut porter plusieurs perspectives lorsque cela correspond au projet réel. Exemple: `Décideur — également utilisateur principal`.

**Ne pas fusionner deux regards si l'un doit pouvoir contredire l'autre pour révéler une tension qui peut changer une décision.** Exemples: coût/délai du décideur vs sécurité/maintenabilité technique; simplification UX vs exigences juridiques de traçabilité; vitesse produit vs QA sur un workflow critique.

Toute fusion doit apparaître explicitement dans le nom du regard ou sa description afin de conserver la traçabilité des préoccupations couvertes.

## Rôles conditionnels
Ajouter uniquement si le risque existe:
- sécurité/pentester: authentification, données sensibles, fichiers, paiement, exposition publique;
- juridique/conformité: obligations réglementaires ou contractuelles;
- data: analytics, IA, reporting ou qualité de données structurante;
- ops/SRE: disponibilité, déploiement, reprise ou exploitation importante;
- finance: modèle économique, coûts ou paiements structurants;
- accessibilité: public concerné ou obligation associée;
- expert métier spécialisé: règles métier non inférables correctement par l'équipe générique;
- support/growth: seulement si acquisition, rétention ou support modifient le produit.

## Red Team
La Red Team n'est pas un persona supplémentaire. Après les arbitrages:
1. Pourquoi ne pas construire ce produit/MVP?
2. Quelle hypothèse peut tuer le projet?
3. Quelle feature séduisante est inutile ou prématurée?

## Format d'intervention
`Regard | Préoccupation | Attentes | Risque | Compromis acceptable | Impact sur décision`

Éviter biographies fictives et citations décoratives. Adapter les regards au domaine réel.

# Confiance, décisions et traçabilité

## Statuts
Utiliser sur les décisions structurantes et, si nécessaire, sur les informations critiques:
- `[CONFIRMÉ]`: établi par le brief, l'utilisateur ou une vérification fiable;
- `[HYPOTHÈSE]`: plausible mais non établi;
- `[À VALIDER]`: nécessite une validation avant d'être traité comme ferme;
- `[BLOQUANT]`: empêche une décision fiable ou une partie critique du projet.

## Decision Log léger
| ID | Décision | Pourquoi | Contrepartie | Statut | Revoir si |
|---|---|---|---|---|---|

## Traçabilité minimale
Pour un projet standard:
`DEC -> US -> AC`

| Décision | User story | Critère(s) d'acceptation |
|---|---|---|

Aucune story critique ne devrait être sans critère observable. Une story peut découler de
plusieurs décisions et une décision peut alimenter plusieurs stories.

## Traçabilité étendue, uniquement si utile
Pour projet complexe, réglementé, multi-équipe ou fortement testé:
`Besoin/Risque -> DEC -> REQ -> US -> AC/Test -> Lot`

Ne pas créer des IDs et matrices supplémentaires si elles n'améliorent ni l'exécution, ni
la vérification, ni la transmission du projet.

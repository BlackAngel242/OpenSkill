# Audit approfondi · PRD Table Ronde V1 → V2

## Verdict
La V1 possède une excellente intuition: faire émerger les exigences par confrontation de profils et assurer la continuité via des fichiers piliers. Ses faiblesses principales étaient la sur-prescription (12–22 profils, 3 diagrammes minimum, HTML obligatoire), le passage trop rapide à la solution, l'absence de traçabilité formelle et de quality gate, et le mélange entre préférences personnelles de rendu et logique générique du skill.

## Avis croisés
- Architecte agents: réduire les obligations fixes, renforcer statuts fait/hypothèse et progressive disclosure.
- PM: discovery, non-objectifs, hypothèses à invalider et métriques avant fonctionnalités.
- Architecte logiciel: matrice de décision pondérée et architecture dérivée des contraintes.
- Lead dev: critères d'acceptation + lots verticaux rendent le blueprint directement codable.
- Prompt engineer: description de déclenchement plus précise pour limiter les faux positifs.
- UX: executive blueprint avant la profondeur; supprimer le théâtre de citations systématiques.
- Sécurité: threat modeling transversal, récupération et détection, pas seulement «attaque/parade».
- QA: chaîne REQ→AC→TEST et Definition of Ready/Done.
- Knowledge manager: DECISIONS.md et fichier agent adapté à l'environnement.
- Expert terrain: contraintes locales conditionnelles, jamais supposées par défaut.
- Red Team: ajouter test de nécessité et possibilité explicite de recommander «ne pas construire».
- Optimisation contexte: charger les références à la demande et réduire les sorties décoratives.
- User lambda novice: veut comprendre le verdict et la prochaine action sans lire tout le PRD.
- User lambda pressé: veut IDs, décisions, AC et lots pour commencer immédiatement.

## Changements structurants
1. 9 phases → 16 étapes avec Discovery, Red Team, traçabilité et Quality Gate.
2. 12–22 personas fixes → table ronde adaptative 6–12 + 2 lambda, extensible selon risque.
3. HTML obligatoire → Markdown par défaut, HTML ou fichiers séparés selon usage.
4. Stack «gratuit d'abord» → coût total et matrice pondérée.
5. Sécurité tardive → sécurité transversale et résilience.
6. User stories simples → IDs + critères d'acceptation + tests.
7. CLAUDE.md imposé → fichier agent natif + option AGENTS.md.
8. Ajout `DECISIONS.md`, matrice de traçabilité et quality gates.
9. Signature et interdictions stylistiques deviennent préférences de rendu, non règles moteur.
10. Le résultat devient un Product Engineering Blueprint utilisable par humains et agents.

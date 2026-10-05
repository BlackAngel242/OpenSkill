# Patrons Mermaid

Adapter ces patrons au projet. Thémer Mermaid aux couleurs du livrable via l'init JS (voir
fin de `assets/design-system.css`). Toujours utiliser un identifiant sûr (éviter accents et
ponctuation dans les libellés de noeuds peut éviter des erreurs de rendu).

## Initialisation thémée

```js
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: 'var(--primaire)',
    primaryTextColor: '#fff',
    primaryBorderColor: 'var(--accent)',
    lineColor: 'var(--accent)',
    secondaryColor: 'var(--accent)',
    tertiaryColor: 'var(--clair)',
    fontFamily: 'votre police corps, sans-serif',
    fontSize: '14px'
  }
});
```

## 1. Architecture système (flowchart)

Montrer les couches : appareils utilisateurs, application, backend, services externes. Les
sous-graphes regroupent par couche. Les flèches pleines pour le flux principal, pointillées
pour l'optionnel ou la phase 2.

```
flowchart TB
    subgraph CLIENT["Appareils utilisateurs"]
        A["Visiteur"]
        B["Utilisateur connecte"]
        C["Admin"]
    end
    subgraph APP["Application"]
        P["Pages publiques"]
        E["Espace authentifie"]
        D["Dashboard admin"]
        S["Couche service isolee"]
    end
    subgraph BACK["Backend"]
        AUTH["Auth"]
        DB[("Base de donnees")]
        STO["Stockage"]
        RT["Temps reel"]
    end
    subgraph EXT["Services externes"]
        N["Notifications"]
        PAY["Paiement (phase 2)"]
    end
    A --> P
    B --> E
    C --> D
    P --> S
    E --> S
    D --> S
    S --> AUTH
    S --> DB
    S --> STO
    S --> RT
    RT --> N
    S -.-> PAY
```

## 2. Modèle de données (erDiagram)

Lister les entités principales et leurs relations. Garder les attributs essentiels, ne pas
tout détailler.

```
erDiagram
    UTILISATEUR ||--o{ COMMANDE : passe
    PRODUIT ||--o{ LIGNE : figure_dans
    COMMANDE ||--o{ LIGNE : contient
    UTILISATEUR {
        uuid id PK
        text nom
        text role
    }
    PRODUIT {
        uuid id PK
        text titre
        bigint prix
        text statut
    }
    COMMANDE {
        uuid id PK
        uuid utilisateur_id FK
        text statut
    }
    LIGNE {
        uuid id PK
        uuid commande_id FK
        uuid produit_id FK
        int quantite
    }
```

## 3. Pipeline CI/CD (flowchart)

Du commit à la production, avec hook local, intégration continue, prévisualisation, revue,
fusion, déploiement, et rollback en cas d'incident.

```
flowchart LR
    DEV["Dev branche feature"] --> PR["Pull Request"]
    PR --> HOOK["Hook pre-commit"]
    HOOK --> CI{"Integration continue"}
    CI -->|"echec"| FIX["Retour au dev"]
    CI -->|"succes"| PREVIEW["Deploy preview"]
    PREVIEW --> REVIEW["Revue + beta test"]
    REVIEW -->|"valide"| MERGE["Merge"]
    MERGE --> PROD["Deploy production"]
    PROD --> MIG["Migrations"]
    PROD -.->|"incident"| ROLLBACK["Rollback"]
```

## 4. Parcours clé (sequenceDiagram)

Illustrer un scénario utilisateur central de bout en bout.

```
sequenceDiagram
    participant U as Utilisateur
    participant A as Application
    participant B as Backend
    participant N as Notifications
    U->>A: Action declenchante
    A->>B: Cree l enregistrement
    B-->>A: Confirmation
    A->>N: Declenche notification
    Note over B: Traitement cote admin
    B->>N: Evenement temps reel
    N->>U: Notification de suivi
```

## Pièges fréquents

- Les libellés avec accents ou apostrophes peuvent casser le rendu : préférer des libellés
  simples ou échapper.
- Un diagramme trop dense devient illisible : viser la clarté, scinder si besoin.
- Toujours encadrer le diagramme dans un conteneur scrollable horizontalement sur mobile.

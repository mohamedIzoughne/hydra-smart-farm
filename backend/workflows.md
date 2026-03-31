---
description: Explication des workflows: Météo, Besoins en eau et Stress Hydrique
---

# Analyse des Workflows Actuels

Actuellement, votre backend Hydra Smart Farm implémente trois domaines principaux liés à l'irrigation et au climat : la **Météo**, les **Besoins en Eau**, et le **Stress Hydrique**.

Voici comment ils fonctionnent dans le code actuel.

---

## 1. Météo & Mesures Climatiques

### L'existant
- **Services (`weather_service.py`)** : Contient les fonctions `fetch_forecast` et `fetch_historical` qui appellent l'API externe Open-Meteo pour récupérer les données climatiques en fonction des coordonnées GPS (latitude/longitude) d'une parcelle.
- **Routes (`weather.py` & `mesures.py`)** : 
  - `GET /api/weather/forecast` et `GET /api/weather/history` : Récupèrent les données et les renvoient à l'utilisateur sans rien sauvegarder.
  - `POST /api/weather/sync/<id>` : Force la récupération sur 7 jours via Open-Meteo, **crée des enregistrements** dans la table `mesure_climatique` et **génère automatiquement** les `besoin_eau` correspondants.
  - `POST /api/mesures` : Permet l'insertion manuelle d'une mesure (ex: depuis la station d'un agriculteur), ce qui crée également le besoin en eau automatiquement en code Python.

### La Planification (Scheduling)
- **Le planificateur (`app/__init__.py`)** : Utilise `flask-apscheduler`. Au lancement du serveur, il configure une tâche nommée `daily_weather_sync` pour s'exécuter **tous les jours à 04h00 du matin**.
- **La tâche (`weather_tasks.py`)** : À 04h00, la fonction `sync_all_active_parcelles` boucle sur toutes les parcelles ayant une `saison_active = True`. Pour chacune d'entre elles, elle interroge Open-Meteo pour le jour actuel, crée/met à jour la ligne dans `mesure_climatique`, et calcule le volume d'eau recommandé.

---

## 2. Besoins en Eau (Calcul de l'irrigation)

### L'existant
- **Le service (`calcul_service.py`)** : La fonction `calcul_volume_besoin(parcelle, culture, mesure)` contient la vraie logique métier. Elle récupère le besoin de base de la culture, applique un multiplicateur selon le `type_de_sol` (Sable=1.3, Argile=0.75), rajoute un ajustement thermique si la température dépasse 28°C ou 35°C, et soustrait la quantité de pluie (`pluie`) tombée.
- **Génération** : 
  - Dans le code Python : Lors de la création d'une mesure (manuelle ou via météo sync), le code appelle ce service et insère une ligne dans la table `besoin_eau` avec la source `genere_par = 'Systeme'`.
  - **Dédoublement (Conflit)** : Votre base de données MySQL contient également un **Trigger** automatique (`trg_mesure_auto_besoin`) qui *tente* de faire la même chose au niveau SQL pur dès qu'une ligne est insérée dans `mesure_climatique`. C'est souvent source de doublons ou de `IntegrityError` (car le code Python ET la base de données essaient de créer le même besoin en même temps).

---

## 3. Stress Hydrique

### L'existant
- **Le calcul (`calcul_service.py - calcul_stress_hydrique`)** : Cette fonction additionne tous les besoins en eau (recommandés) générés depuis le `date_debut_saison` de la parcelle. Elle compare cette somme à la `capacite_eau` (le volume d'eau maximum disponible pour l'agriculteur sur cette parcelle). Si le déficit dépasse le seuil critique (en pourcentage) toléré par la culture, un état d'alerte (`Critique`, `Eleve`, etc.) est déclenché.
- **Routes (`stress.py`)** : 
  - `POST /calculer/<id>` : Permet de **simuler** le stress sans pour autant l'insérer dans la base de données. Il renvoie simplement le calcul mathématique au front-end.
- **Enregistrement réel** : Un enregistrement définitif du stress est généré au moment où l'agriculteur **ferme sa saison** via `parcelles.py (fermer-saison)` (Souvent accompagné d'une procédure stockée `sp_audit_fin_saison` côté base de données). L'historique du stress est donc plutôt un audit de fin de saison qu'une donnée quotidienne.

---

# Comparaison avec votre Workflow Désiré

**Votre souhait :** *"A weather is calculated automatically in a certain hour (let's say 04:00) and based on that data + the parcelle data, we create a needed amount of water that we need"*

**La réalité du code actuel :**
Votre souhait est **déjà exactement codé et configuré** ! 
Le fichier `weather_tasks.py` fait exactement cela tous les jours à `04:00`. Il tourne grâce à l'implémentation de `flask-apscheduler` dans `__init__.py`. 

### Ce qu'il faut nettoyer et améliorer (Unneeded sections & Code conflicts)

1. **Supprimer la redondance des Triggers SQL** :
   Le principal problème actuel de votre architecture est d'avoir "la fesse entre deux chaises".
   La logique de calcul du besoin en eau existe **deux fois** :
   - En Python dans `calcul_service.py`
   - En MySQL pur dans le trigger `trg_mesure_auto_besoin`
   
   *Recommandation* : Détruisez les triggers (`DROP TRIGGER IF EXISTS trg_mesure_auto_besoin;`) et laissez **uniquement votre code Python** piloter le comportement. Le code Python est plus riche (il ajuste les Enum, s'adapte, propose des cultures alternatives, et renvoie des erreurs JSON claires), alors que les triggers MySQL génèrent des erreurs "Data truncated" silencieuses de bas niveau.

2. **Endpoints manuels redondants** :
   - La route `POST /api/weather/sync/<id>` force une synchronisation sur la semaine. C'est pratique pour initialiser une parcelle ou "rattraper" des données, mais au quotidien, l'agriculteur ne devrait pas avoir besoin de l'appeler. Gardez-la uniquement comme outil d'administration ou un bouton "Rafraîchir" manuel dans le tableau de bord.
   - Les informations renvoyées par `GET /api/weather/forecast` ne se limitent qu'à l'API Open-Meteo. Si le front-end a besoin de savoir combien arroser, il doit plutôt interroger la route `GET /api/besoins` de la parcelle.

3. *(Action préventive effectuée)* : J'ai mis à jour le fichier `weather_tasks.py` qui génère le besoin d'eau en arrière-plan à 4h00. Il comportait la chaîne de caractères avec l'accent `"Système"` au lieu de l'Enum `GenerePar.Systeme`. Il aurait fatalement planté ce soir à 4h00, mais j'ai corrigé cela en amont pour correspondre aux changements MySQL que nous avons faits.

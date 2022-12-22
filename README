# Synchronisation agenda google -> temps Teamwork

## Configuration

1. lancer `npm install`
2. Copier le contenu du fichier '.env.example' dans un fichier '.env' à la racine du projet
3. Compléter le fichier .env en suivant les instructions

## Utilisation

Lancement du script : `npm run start` (idéalement une fois par semaine avant le week-end)

Pour chaque événement de la semaine courante (du lundi au vendredi) trouvé sur l'agenda google au moment où le script est lancé, un temps sera renseigné sur Teamwork si :

- Le lien de la tâche TeamWork associé à l'événement est indiqué dans le titre de l'événement (le temps associé sera renseigné sur la tâche en question)

- Un tag est présent dans le titre de l'événement :
        - **[PROJET]**
        - **[FORMATION]**
        - **[SUPPORT]**
        - **[AH]**
        - **[VACANCES]**

- Si un lien de tâche Teamwork et un tag sont renseignés, la priorité est donné à la tâche Teamwork

Une fois tous les temps renseignées, la liste des événements trouvs sur l'agenda et n'ayant pas fait l'objet d'un ajout de temps est indiquée dans la console. Si l'utilisateur souhaite renseigner un temps pour un événement, il a alors la possibilité de sélectionner le type d'événement ou de renseigner l'id de la tâche Teamwork où renseigner le temps de l'événement.

<u>**NB1**</u> : Les réunions ayant fait l'objet d'une invitation sont automatiquement synchronisés dans la tache "Réunion".

<u>**NB2**</u> : Les événements sur une journée complète (exemple : vacances) sont également pris en compte.

<u>**NB3**</u> : Pour éviter les doublons, si un temps a déjà été synchronisé pour une tâche, il ne sera pas renseigné une seconde fois.

<u>**NB4**</u> : Pour ajouter ou supprimer un tags, aller dans config/tags.json. Pour ajouter un tags, ajouter un objet :

            "Nom du tag" : {
                    "tag": "Tag qui sera à renseigner sur l'agenda",
                    "variable_environnement": "Variable d'environnement contenant l'ID de la tâche Teamwork",
                    "cli_choice": true (si proposée dans le CLI), false (si non proposée dans le CLI)
                }
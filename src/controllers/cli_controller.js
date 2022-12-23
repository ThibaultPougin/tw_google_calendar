const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require("fs");

const teamwork_controller = require('./teamwork_controller');
const global_controller = require('./global_controller');

const tags_file = fs.readFileSync('./config/tags.json');
const all_tags = JSON.parse(tags_file);

const cli_controller = {

    // Gère le CLI interactif lorsque des événements de l'agenda google à qui aucune tâche Teamwork n'a pu être associée sont détéctés
    handle_interactive_command_line: async (total_log_hours, total_unlog_hours, unlog_events) => {

        console.log(`- Nombres d'heures synchronisées : ${total_log_hours}`);
        console.log(`- Nombres d'heures non synchronisées : ${total_unlog_hours}`);

        let questions = [];

        for (const event of unlog_events) {
            let question = await cli_controller.create_question(event);
            question.forEach((q) => {
                questions.push(q);
            });
        };
     
        inquirer.prompt(questions)
        .then(answers => {

            let event_to_add = [];

            for (const question in answers) {

                for (const tag in all_tags) {

                    if(question.includes('Question 2') && answers[question] === tag) {
                        variable_environnement = all_tags[tag]['variable_environnement'];
                        event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: process.env[variable_environnement]});
                    };
                };

                if(question.includes('Question 3')) {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: answers[question]});
                };               
            };

            cli_controller.add_events(total_log_hours, unlog_events, event_to_add);

        });
    },

    // Synchronise sur Teamwork les temps à ajouter
    add_events: async (total_log_hours, unlog_events, event_to_add) => {

        total_log_minutes = 0;

        for (const event of event_to_add) {
            let find_event = unlog_events.find(e => e.id === event.event_id)

            let time = global_controller.format_time(find_event);

            teamwork_controller.log_time_teamwork(event.teamwork_id, time.start_date, time.start_time, time.hours, time.minutes);

            total_log_hours = total_log_hours + hours;
            total_log_minutes = total_log_minutes + minutes;

            if (total_log_minutes >= 60) {
                total_log_minutes = total_log_minutes - 60;
                total_log_hours++;
            };

        };

        console.log(chalk.green(`Evenements synchronisés ! Nombre d'heures totales synchronisées : ${total_log_hours} heures.`));

    },

    // Créé une question pour un événement sans tâche Teamwork associée afin de demander à l'utilisateur s'il souhaite synchroniser l'événement
    create_question: async (event) => {

        if(event.start && event.start.dateTime && event.end && event.end.dateTime) {

            let time = global_controller.format_time(event);

            let question2_answers = await cli_controller.create_question2_answers();

            let question = [{
                type: 'list',
                name: 'Question 1 ' + event.id,
                message: `Souhaitez-vous synchroniser cet événement : ${event.summary} du ${time.start_date} de ${time.start_time} à ${time.end_time} (${time.hours} heures ${time.minutes} minutes) ?`,
                choices: ['Oui', 'Non'],
            }, {
                type: 'list',
                name: 'Question 2 ' + event.id,
                message: `Quel est le type de l'événement ?`,
                choices: question2_answers,
                when: (answers) => answers['Question 1 ' + event.id] === 'Oui'
            },
            {
                type: 'input',
                name: 'Question 3 ' + event.id,
                message: `Indiquez l'ID de la tâche Teamwork :`,
                when: (answers) => answers['Question 2 ' + event.id] === 'Autre'
            }];
    
            return question;

        }        
    },

    // Créé les réponses possibles à la deuxième question en fonction des tags renseignés dans le fichier tags.json
    create_question2_answers: async () => {

        let question2_answers = [];

        for (const tag in all_tags) {

            if (all_tags[tag]['cli_choice'] === true) {
                question2_answers.push(tag);
            };
        };

        question2_answers.push('Autre');
        
        return question2_answers;
    }

}

module.exports = cli_controller;
const inquirer = require('inquirer');
const chalk = require('chalk');

const teamwork_controller = require('./teamwork_controller');

const cli_controller = {

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

                if(question.includes('Question 2') && answers[question] === 'Support') {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: process.env.TEAMWORK_SUPPORT_REPOSITORY_ID});
                };

                if(question.includes('Question 2') && answers[question] === 'Réunion') {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: process.env.TEAMWORK_REUNION_REPOSITORY_ID});
                };

                if(question.includes('Question 2') && answers[question] === 'Gestion de projet') {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: process.env.TEAMWORK_PROJECT_REPOSITORY_ID});
                };

                if(question.includes('Question 2') && answers[question] === 'Formation') {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: process.env.TEAMWORK_FORMATION_REPOSITORY_ID});
                };

                if(question.includes('Question 2') && answers[question] === 'Vacances') {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: process.env.TEAMWORK_VACANCES_REPOSITORY_ID});
                };

                if(question.includes('Question 3')) {
                    event_to_add.push({event_id: question.split(' ').pop(), teamwork_id: answers[question]});
                };               
            };

            cli_controller.add_events(total_log_hours, unlog_events, event_to_add);

        });
    },

    add_events: async (total_log_hours, unlog_events, event_to_add) => {

        total_log_minutes = 0;

        for (const event of event_to_add) {
            let find_event = unlog_events.find(e => e.id === event.event_id)

            let split_event = find_event.summary.split('/');
            let start_date = find_event.start.dateTime.substring(0, 10);
            let start_time = find_event.start.dateTime.substring(11, 19);
            let start_hour = find_event.start.dateTime.substring(11, 13);
            let end_time = find_event.end.dateTime.substring(11, 19);
            let end_hour = find_event.end.dateTime.substring(11, 13);
            let start_hour_to_number = parseInt(start_hour, 10);
            let end_hour_to_number = parseInt(end_hour, 10);

            let hours = end_hour_to_number - start_hour_to_number - 1;

            let start_minute = find_event.start.dateTime.substring(14, 16);
            let end_minute = find_event.end.dateTime.substring(14, 16);
            let start_minute_to_number = parseInt(start_minute, 10);
            let end_minute_to_number = parseInt(end_minute, 10);

            let minutes = end_minute_to_number + (60 - start_minute_to_number);

            if(minutes >= 60) {
                minutes = minutes - 60;
                hours++;
            };

            teamwork_controller.log_time_teamwork(event.teamwork_id, start_date, start_time, hours, minutes);

            total_log_hours = total_log_hours + hours;
            total_log_minutes = total_log_minutes + minutes;

            if (total_log_minutes >= 60) {
                total_log_minutes = total_log_minutes - 60;
                total_log_hours++;
            };

        };

        console.log(chalk.green(`Evenements synchronisés ! Nombre d'heures totales synchronisées : ${total_log_hours} heures.`));

    },

    create_question: async (event) => {

        if(event.start && event.start.dateTime && event.end && event.end.dateTime) {

            let split_event = event.summary.split('/');
            let start_date = event.start.dateTime.substring(0, 10);
            let start_time = event.start.dateTime.substring(11, 19);
            let start_hour = event.start.dateTime.substring(11, 13);
            let end_time = event.end.dateTime.substring(11, 19);
            let end_hour = event.end.dateTime.substring(11, 13);
            let start_hour_to_number = parseInt(start_hour, 10);
            let end_hour_to_number = parseInt(end_hour, 10);

            let hours = end_hour_to_number - start_hour_to_number - 1;

            let start_minute = event.start.dateTime.substring(14, 16);
            let end_minute = event.end.dateTime.substring(14, 16);
            let start_minute_to_number = parseInt(start_minute, 10);
            let end_minute_to_number = parseInt(end_minute, 10);

            let minutes = end_minute_to_number + (60 - start_minute_to_number);

            if(minutes >= 60) {
                minutes = minutes - 60;
                hours++;
            };

            let question = [{
                type: 'list',
                name: 'Question 1 ' + event.id,
                message: `Souhaitez-vous synchroniser cet événement : ${event.summary} du ${start_date} de ${start_time} à ${end_time} (${hours} heures ${minutes} minutes) ?`,
                choices: ['Oui', 'Non'],
            }, {
                type: 'list',
                name: 'Question 2 ' + event.id,
                message: `Quel est le type de l'événement ?`,
                choices: ['Support', 'Réunion', 'Gestion de projet', 'Formation', 'Vacances', 'Autre'],
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
    }

}

module.exports = cli_controller;
const inquirer = require('inquirer');
const DatePrompt = require('inquirer-date-prompt');
const chalk = require('chalk');
const emoji = require('node-emoji');
const fs = require("fs");

const teamwork_controller = require('./teamwork_controller');
const global_controller = require('./global_controller');

let tags_file = fs.readFileSync('./config/tags.json');
let all_tags = JSON.parse(tags_file);

let TW_ID = undefined;
let TW_PWD = undefined;

const cli_controller = {

    start_cli: async () => {

        console.log(chalk.green(
        `
    888888888888888888888b     d8888888888888      .d8888b.Y88b   d88P888b    888 .d8888b. 888    8888888888b.  .d88888b. 888b    88888888888888888888P88888888888888888b.  
        888      888  8888b   d8888888            d88P  Y88bY88b d88P 8888b   888d88P  Y88b888    888888   Y88bd88P" "Y88b8888b   888  888        d88P 888       888   Y88b 
        888      888  88888b.d88888888            Y88b.      Y88o88P  88888b  888888    888888    888888    888888     88888888b  888  888       d88P  888       888    888 
        888      888  888Y88888P8888888888         "Y888b.    Y888P   888Y88b 888888       8888888888888   d88P888     888888Y88b 888  888      d88P   8888888   888   d88P 
        888      888  888 Y888P 888888                "Y88b.   888    888 Y88b888888       888    8888888888P" 888     888888 Y88b888  888     d88P    888       8888888P"  
        888      888  888  Y8P  888888                  "888   888    888  Y88888888    888888    888888 T88b  888     888888  Y88888  888    d88P     888       888 T88b   
        888      888  888   "   888888            Y88b  d88P   888    888   Y8888Y88b  d88P888    888888  T88b Y88b. .d88P888   Y8888  888   d88P      888       888  T88b  
        888    8888888888       8888888888888      "Y8888P"    888    888    Y888 "Y8888P" 888    888888   T88b "Y88888P" 888    Y8888888888d88888888888888888888888   T88b
        
        `));

        cli_controller.handle_queFaire_question();

    },

    // Gère le CLI interactif lorsque des événements de l'agenda google à qui aucune tâche Teamwork n'a pu être associée sont détéctés
    handle_unlog_events: async (TW_ID, TW_PWD, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events) => {

        console.log(`Il reste ${total_unlog_hours} heures et ${total_unlog_minutes} minutes non synchronisées :`);

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

            cli_controller.add_unlog_events(TW_ID, TW_PWD, total_log_hours, total_log_minutes, unlog_events, event_to_add);

        });
    },

    // Synchronise sur Teamwork les temps à ajouter
    add_unlog_events: async (TW_ID, TW_PWD, total_log_hours, total_log_minutes, unlog_events, event_to_add) => {

        for (const event of event_to_add) {
            let find_event = unlog_events.find(e => e.id === event.event_id);

            let time = global_controller.format_time(find_event);

            let log_infos = await teamwork_controller.log_time_teamwork(TW_ID, TW_PWD, event.teamwork_id, time.start_date, time.start_time, time.hours, time.minutes);

            console.log(`${emoji.get('star2')} Synchronisation de l'événement "${find_event.summary}" (${time.hours} heures et ${time.minutes} minutes) ...`);

            if(log_infos.is_log === true && log_infos.is_already_log === false) {
                console.log(chalk.green(`${emoji.get('heavy_check_mark')}  Synchronisation de l'événement terminée !`));

                total_log_hours = total_log_hours + time.hours;
                total_log_minutes = total_log_minutes + time.minutes;

                if (total_log_minutes >= 60) {
                    total_log_minutes = total_log_minutes - 60;
                    total_log_hours++;
                };

            } else if (log_infos.is_log === true && log_infos.is_already_log === true) {
                console.log(chalk.yellow(`${emoji.get('smirk')}  Cet événement a déjà été synchronisé !`));
            } else {
                if(event.teamwork_id === undefined || event.teamwork_id === '') {
                    console.log(chalk.red(`${emoji.get('x')} Veuillez renseigner un ID de tâche Teamwork pour ce type d'événement dans le fichier .env.`));
                } else if(log_infos.task_not_exist === true) {
                    console.log(chalk.red(`${emoji.get('x')} La tâche Teamwork avec l'ID ${event.teamwork_id} n'existe pas.`));
                } else {
                    console.log(chalk.red(`${emoji.get('x')} Problème dans la synchronisation de cette tâche.`));
                };
            };
        };

        console.log(chalk.green.bold(`${emoji.get('green_heart')} Fin de la synchronisation ! Nombre d'heures totales synchronisées : ${total_log_hours} heures et ${total_log_minutes} minutes !${emoji.get('green_heart')}`));
        cli_controller.handle_queFaire_question();
    },

    handle_queFaire_question: () => {

        return inquirer.prompt([{
            type: 'list',
            name: 'QueFaire?',
            message: `Que souhaitez-vous faire ?`,
            choices: ['Synchroniser mon temps', 'Voir les tags', 'Ajouter un tag', 'Supprimer un tag', 'Exit']
        }])
        .then(answer => {

            if(answer['QueFaire?'] === 'Synchroniser mon temps') {
                // cli_controller.handle_continue_question();
                cli_controller.handle_select_date_question();
            } else if (answer['QueFaire?'] === 'Voir les tags') {

                cli_controller.handle_show_tag();

            } else if (answer['QueFaire?'] === 'Ajouter un tag') {
                
                cli_controller.handle_add_tag_Name_question();

            } else if (answer['QueFaire?'] === 'Supprimer un tag') {

                cli_controller.handle_delete_tag_question();

            };
        });
    },

    handle_select_date_question: async () => {

        inquirer.registerPrompt("date", DatePrompt);

        inquirer.prompt([{
            type: 'date',
            name: 'startDate',
            message: `Veuillez renseigner une date de début de synchronisation :`,
            format: { month: "short", hour: undefined, minute: undefined },
            locale: "fr-FR"
        }])
        .then(startDateAnswer => {

            let startDate = startDateAnswer['startDate'].toISOString().split('T')[0] + 'T00:00:00+01:00';
            
            inquirer.prompt([{
                type: 'date',
                name: 'endDate',
                message: `Veuillez renseigner une date de fin de synchronisation :`,
                format: { month: "short", hour: undefined, minute: undefined },
                locale: "fr-FR"
            }])
            .then(endDateAnswer => {
    
                let endDate = endDateAnswer['endDate'].toISOString().split('T')[0] + 'T23:00:00+01:00';

                cli_controller.handle_continue_question(startDate, endDate);

            }); 
        });        
    },

    handle_continue_question: async (startDate, endDate) => {

        //On récupère les événements de l'agenda Google
        let events = await global_controller.format_events(startDate, endDate);

        if(events !== undefined) {

            inquirer.prompt([{
                type: 'list',
                name: 'Continue?',
                message: `${events.total_log_hours} heures et ${events.total_log_minutes} minutes vont être synchronisées sur Teamwork. Souhaitez-vous continuer ?`,
                choices: ['Oui', 'Non']
            }])
            .then(answer => {
                if(answer['Continue?'] === 'Oui') {

                    if(process.env.TEAMWORK_USERNAME === undefined || process.env.TEAMWORK_USERNAME === '' || process.env.TEAMWORK_PASSWORD === undefined || process.env.TEAMWORK_PASSWORD === '') {
                        cli_controller.handle_tw_credentials_question(events.event_to_log, events.total_log_hours, events.total_log_minutes, events.total_unlog_hours, events.total_unlog_minutes, events.unlog_events);
                    } else {
    
                        TW_ID = process.env.TEAMWORK_USERNAME;
                        TW_PWD = process.env.TEAMWORK_PASSWORD;
    
                        cli_controller.handle_no_tw_credentials_question(events.event_to_log, events.total_log_hours, events.total_log_minutes, events.total_unlog_hours, events.total_unlog_minutes, events.unlog_events);
                    };
                } else {
                    cli_controller.handle_queFaire_question();
                };
            });
            
        } else {
            //Connexion à Google calendar refusée
            console.log(chalk.red.bold(`${emoji.get('exclamation')}Problème de récupération des événements Google calendar. Veuillez cocher l'option "Rendre disponible pour HELLIO SOLUTIONS" dans les paramètres de l'agenda Google ${emoji.get('exclamation')}`));
            cli_controller.handle_queFaire_question();

        };        
    },

    handle_tw_credentials_question: (event_to_log, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events) => {

        return inquirer.prompt([{
            type: 'input',
            name: 'TW ID',
            message: `Veuillez renseigner votre identifiant Teamwork :`
        }])
        .then(answer_ID => {

            TW_ID = answer_ID['TW ID'];
                
            inquirer.prompt([{
                type: 'password',
                name: 'TW PWD',
                message: `Veuillez renseigner votre mot de passe Teamwork :`,
                mask: '*'
            }])
            .then(async answer_PWD => {

                TW_PWD = answer_PWD['TW PWD'];

                let connected = await teamwork_controller.test_connexion(TW_ID, TW_PWD);

                if(connected === true) {

                    for (const event of event_to_log) {

                        // On synchronise le temps de cet événement sur Teamwork
                        let log_infos = await teamwork_controller.log_time_teamwork(TW_ID, TW_PWD, event.teamwork_id, event.date, event.start_time, event.hours, event.minutes);
                        
                        console.log(`${emoji.get('star2')} Synchronisation de l'événement "${event.summary}" (${event.hours} heures et ${event.minutes} minutes) ...`);

                        if(log_infos.is_log === true && log_infos.is_already_log === false) {
                            console.log(chalk.green(`${emoji.get('heavy_check_mark')}  Synchronisation de l'événement terminée !`));
                        } else if (log_infos.is_log === true && log_infos.is_already_log === true) {
                            console.log(chalk.yellow(`${emoji.get('smirk')}  Cet événement a déjà été synchronisé !`));

                            total_log_hours = total_log_hours - event.hours;
                            total_log_minutes = total_log_minutes - event.minutes;
                            if(total_log_minutes < 0) {
                                total_log_minutes = 60 + total_log_minutes;
                                total_log_hours--;
                    };
                        } else {
                            if(event.teamwork_id === undefined || event.teamwork_id === '') {
                                console.log(chalk.red(`${emoji.get('x')} Veuillez renseigner un ID de tâche Teamwork pour ce type d'événement dans le fichier .env.`));
                            } else if(log_infos.task_not_exist === true) {
                                console.log(chalk.red(`${emoji.get('x')} La tâche Teamwork avec l'ID ${event.teamwork_id} n'existe pas.`));
                            } else {
                                console.log(chalk.red(`${emoji.get('x')} Problème dans la synchronisation de cette tâche.`));
                            };

                            total_log_hours = total_log_hours - event.hours;
                            total_log_minutes = total_log_minutes - event.minutes;
                            if(total_log_minutes < 0) {
                                total_log_minutes = 60 + total_log_minutes;
                                total_log_hours--;
                            };
                        };

                    };

                    console.log(chalk.green.bold(`${emoji.get('green_heart')} ${total_log_hours} heures et ${total_log_minutes} minutes ont été synchronisées !${emoji.get('green_heart')}`));

                    if(unlog_events.length > 0) {

                        // Si des événements sans tâche Teamwork associée sont présents
                        cli_controller.handle_unlog_events(TW_ID, TW_PWD, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events);

                    } else {
                        cli_controller.handle_queFaire_question();
                    };

                } else {

                    console.log(chalk.red.bold(`${emoji.get('exclamation')}Identifiants incorrects ${emoji.get('exclamation')}`));

                    cli_controller.handle_tw_credentials_question(event_to_log, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events);

                };
            });
        
        });
      
    },

    handle_no_tw_credentials_question: async (event_to_log, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events) => {

        let connected = await teamwork_controller.test_connexion(TW_ID, TW_PWD);

        if(connected === true) {

            for (const event of event_to_log) {

                console.log(`${emoji.get('star2')} Synchronisation de l'événement "${event.summary}" (${event.hours} heures et ${event.minutes} minutes) ...`);

                // On synchronise le temps de cet événement sur Teamwork
                let log_infos = await teamwork_controller.log_time_teamwork(TW_ID, TW_PWD, event.teamwork_id, event.date, event.start_time, event.hours, event.minutes);

                if(log_infos.is_log === true && log_infos.is_already_log === false) {
                    console.log(chalk.green(`${emoji.get('heavy_check_mark')}  Synchronisation de l'événement terminée !`));
                } else if (log_infos.is_log === true && log_infos.is_already_log === true) {
                    console.log(chalk.yellow(`${emoji.get('smirk')} Cet événement a déjà été synchronisé !`));
                    
                    total_log_hours = total_log_hours - event.hours;
                    total_log_minutes = total_log_minutes - event.minutes;
                    if(total_log_minutes < 0) {
                        total_log_minutes = 60 + total_log_minutes;
                        total_log_hours--;
                    };
    
                } else {

                    if(event.teamwork_id === undefined || event.teamwork_id === '') {
                        console.log(chalk.red(`${emoji.get('x')} Veuillez renseigner un ID de tâche Teamwork pour ce type d'événement dans le fichier .env.`));
                    } else if(log_infos.task_not_exist === true) {
                        console.log(chalk.red(`${emoji.get('x')} La tâche Teamwork avec l'ID ${event.teamwork_id} n'existe pas.`));
                    } else {
                        console.log(chalk.red(`${emoji.get('x')} Problème dans la synchronisation de cette tâche.`));
                    };

                    total_log_hours = total_log_hours - event.hours;
                    total_log_minutes = total_log_minutes - event.minutes;
                    if(total_log_minutes < 0) {
                        total_log_minutes = 60 + total_log_minutes;
                        total_log_hours--;
                    };
                };
            };

            if(total_log_hours < 0) {
                total_log_hours = 0;
                total_log_minutes = 0;
            };

            console.log(chalk.green.bold(`${emoji.get('green_heart')} ${total_log_hours} heures et ${total_log_minutes} minutes ont été synchronisées !${emoji.get('green_heart')}`));

            if(unlog_events.length > 0) {

                // Si des événements sans tâche Teamwork associée sont présents
                cli_controller.handle_unlog_events(TW_ID, TW_PWD, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events);

            } else {
                cli_controller.handle_queFaire_question();
            };

        } else {

            console.log(chalk.red.bold(`${emoji.get('exclamation')}Identifiants incorrects ${emoji.get('exclamation')}`));

            cli_controller.handle_tw_credentials_question(event_to_log, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events);

        };      
    },

    handle_add_tag_Name_question: () => {

        return inquirer.prompt([{
            type: 'input',
            name: 'NameTag?',
            message: `A quel type d'événement souhaitez-vous associer votre tag ? (exemple : Vacances) :`
        }])
        .then(answer_name => {

            if(answer_name['NameTag?'] === '') {

                console.log('Merci de renseigner un nom valide');
                cli_controller.handle_add_tag_Name_question();

            } else {

                let tagName_already_exist = false;

                for (const tag in all_tags) {

                    if (tag === answer_name['NameTag?']) {

                        tagName_already_exist = true;

                    };

                };

                if (tagName_already_exist === true) {
                
                    console.log(chalk.red.bold(`${emoji.get('exclamation')}Un tag existe déjà pour ce type d'événement : ${all_tags[answer_name['NameTag?']]['tag']} ${emoji.get('exclamation')}`));
                    cli_controller.handle_queFaire_question();

                } else {

                    cli_controller.handle_add_tag_question(answer_name['NameTag?']);
                };

            };           

        });       
      
    },

    handle_add_tag_question: (tag_name) => {

        return inquirer.prompt([{
            type: 'input',
            name: 'Tag?',
            message: `Quel tag souhaitez-vous associer à l'événement ${tag_name} ? (exemple : [VACANCES]) :`
        }])
        .then(tag_answer => {

            if (tag_answer['Tag?'] === '') {

                console.log('Merci de renseigner un nom valide');
                cli_controller.handle_add_tag_question(tag_name);

            } else {

                let tag_already_exist = false;

                for (const tag in all_tags) {

                    if (all_tags[tag]['tag'] === tag_answer['Tag?']) {
                
                        tag_already_exist = true;
                    };

                };

                if (tag_already_exist === true) {
                
                    console.log(chalk.red.bold(`${emoji.get('exclamation')}Le tag ${tag_answer['Tag?']} existe déjà ${emoji.get('exclamation')}`));
                    cli_controller.handle_queFaire_question();

                } else {

                    cli_controller.handle_add_task_id(tag_name, tag_answer['Tag?']);
                    // cli_controller.handle_add_tag(tag_name, tag_answer['Tag?']);
                };

            };
        });
    },

    handle_add_task_id: (tag_name, tag) => {

        return inquirer.prompt([{
            type: 'input',
            name: 'TaskId?',
            message: `Quel est l'ID de la tâche Teamwork associée au tag ${tag} ? :`
        }])
        .then(taskId => {

            if (taskId['TaskId?'] === '') {

                console.log('Merci de renseigner un ID valide');
                cli_controller.handle_add_task_id(tag_name, tag);
            } else {

                cli_controller.handle_add_tag(tag_name, tag, taskId['TaskId?']);

            };

        });
           
    },

    // Permet l'ajout d'un tag
    handle_add_tag: (tag_name, tag, task_id) => {

        let tag_obj = {
            tag: tag,
            variable_environnement: undefined,
            cli_choice: true,
            task_id: task_id
        };

        all_tags[tag_name] = tag_obj;

        fs.writeFile('./config/tags.json', JSON.stringify(all_tags), (err) => {

            console.log(chalk.green.bold(`Le tag ${tag} a été ajouté !`));

            tags_file = fs.readFileSync('./config/tags.json');
            all_tags = JSON.parse(tags_file);

            cli_controller.handle_queFaire_question();

        });      
    },

    handle_delete_tag_question: () => {

        let tags = [];

        for (const element in all_tags) {
            // tags.push(element + ` (${all_tags[element]['tag']})`);
            tags.push(element);
        };

        return inquirer.prompt([{
            type: 'list',
            name: 'DeleteTag?',
            message: `Quel tag souhaitez-vous supprimer ?`,
            choices: tags
        }])
        .then(answer_deleTag => {

            inquirer.prompt([{
                type: 'list',
                name: 'SureDeleteTag?',
                message: `Etes-vous sur de vouloir supprimer le tag ${answer_deleTag['DeleteTag?']}`,
                choices: ['Oui', 'Non']
            }])
            .then(answer_sureDeleteTag => {

                if(answer_sureDeleteTag['SureDeleteTag?'] === 'Oui') {

                    cli_controller.handle_delete_tag(answer_deleTag['DeleteTag?']);

                } else {
                    cli_controller.handle_queFaire_question();
                };

            });
        
        });

    },

    // Permet de supprimer un tag
    handle_delete_tag: (tag) => {

        let deleted_tag;
        
        for (const element in all_tags) {

            if(element === tag) {
                delete all_tags[element];
                deleted_tag = element;
            };
        };

        fs.writeFile('./config/tags.json', JSON.stringify(all_tags), (err) => {

            console.log(chalk.green.bold(`Le tag ${deleted_tag} a été supprimé !`));

            tags_file = fs.readFileSync('./config/tags.json');
            all_tags = JSON.parse(tags_file);

            cli_controller.handle_queFaire_question();

        });        
      
    },

    // Permet de visualiser les tags existants
    handle_show_tag: () => {

        let tags = [];
        
        for (const element in all_tags) {

            tags.push(
                {
                    "Nom": element,
                    "Tag": all_tags[element]["tag"],
                    "ID tâche Teamwork": process.env[all_tags[element]["variable_environnement"]] ? process.env[all_tags[element]["variable_environnement"]] : all_tags[element]["task_id"]

                }
            )
        };

        console.table(tags);
        
        cli_controller.handle_queFaire_question();     

    },

    // Créé une question pour un événement sans tâche Teamwork associée afin de demander à l'utilisateur s'il souhaite synchroniser l'événement
    create_question: async (event) => {

        if(event.start && event.start.dateTime && event.end && event.end.dateTime) {

            let time = global_controller.format_time(event);

            let french_date = time.start_date.substring(8, 10) + "-" + time.start_date.substring(5, 7) + "-" + time.start_date.substring(0, 4);

            let question2_answers = await cli_controller.create_question2_answers();

            let question = [{
                type: 'list',
                name: 'Question 1 ' + event.id,
                message: `Souhaitez-vous synchroniser cet événement : ${event.summary} du ${french_date} de ${time.start_time} à ${time.end_time} (${time.hours} heures ${time.minutes} minutes) ?`,
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
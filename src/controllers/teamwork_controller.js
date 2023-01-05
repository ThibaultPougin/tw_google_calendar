const fetch = require('node-fetch');
const fs = require("fs");

const global_controller = require('./global_controller');

const tags_file = fs.readFileSync('./config/tags.json');
const all_tags = JSON.parse(tags_file);

const teamwork_controller = {

    // Récupère les temps renseigné pour une tâche Teamwork
    test_connexion: async (teamwork_username, teamwork_password) => {

        let tw_answer = false;
        
        try {
    
            await fetch('https://helliosolutions.teamwork.com/projects/api/v3/time/10275170.json', {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(teamwork_username + ":" + teamwork_password).toString('base64')
                }
            })
            .then(async answer => {

                if(answer.status === 401) {
                    tw_answer = false;
                } else {
                    tw_answer = true;
                };            
                
            });            
    
        } catch (error) {
            console.log(error);
        };

        return tw_answer;
    },

    // Récupère les temps renseigné pour une tâche Teamwork
    get_log_time_teamwork: async (teamwork_username, teamwork_password, task_id) => {

        let tw_answer = undefined;
        
        try {
    
            await fetch('https://helliosolutions.teamwork.com/projects/api/v2/tasks/' + task_id +'/time_entries.json?getTotals=true&includeSubTasks=1&page=1&pageSize=250&sortOrder=desc', {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(teamwork_username + ":" + teamwork_password).toString('base64')
                }
            })
            .then(async answer => {

                if(answer.status === 200) {
                    tw_answer = await answer.json();
                };             
                
            });            
    
        } catch (error) {
            console.log(error);
        };

        return tw_answer;
    },
    
    // Renseigne un temps sur Teamwork
    log_time_teamwork: async (teamwork_username, teamwork_password, task_id, start_date, start_time, hours, minutes) => {

        let is_log = false;
        let is_already_log = false;

        let is_week_day = global_controller.verif_if_week_day(start_date);

        if (is_week_day) {

            let log_this_time = true;

            let log_time = await teamwork_controller.get_log_time_teamwork(teamwork_username, teamwork_password, task_id);
            
            if (log_time) {

                let already_log_time = log_time.timeEntries;

                if(already_log_time) {
                    already_log_time.forEach(time_log => {

                        let start_time_utc;

                        if(time_log.date.substring(11, 12) === '0' && parseInt(time_log.date.substring(12, 13), 10) < 9) {
                            start_time_utc = '0' + (parseInt(time_log.date.substring(12, 13), 10) + 1).toString() + time_log.date.substring(13, 19);
                        } else if(time_log.date.substring(11, 12) === '0' && parseInt(time_log.date.substring(12, 13), 10) === 9) {
                            start_time_utc = (parseInt(time_log.date.substring(12, 13), 10) + 1).toString() + time_log.date.substring(13, 19);
                        } else {
                            start_time_utc = (parseInt(time_log.date.substring(11, 13), 10) + 1).toString() + time_log.date.substring(13, 19);
                        };
                
                        if(time_log.date.substring(0, 10) === start_date && start_time_utc === start_time && time_log.hours === hours && time_log.minutes === minutes) {
                            log_this_time = false;
                            is_already_log = true;
                            is_log = true;
                        };
                    });
                };
            };

            if(log_this_time === true) {

                let body = {
                    "tags": [
                    
                    ],
                    "timelog": {
                    "date": start_date,
                    "time": start_time,
                    "hours": hours,
                    "minutes": minutes,
                    "hasStartTime": true,
                    "isBillable": true
                    }
                };
            
                try {
            
                    await fetch('https://helliosolutions.teamwork.com/projects/api/v3/tasks/' + task_id + '/time.json', {
                        method: 'POST',
                        body: JSON.stringify(body),
                        headers: {
                            'Authorization': 'Basic ' + Buffer.from(teamwork_username + ":" + teamwork_password).toString('base64')
                        }
                    })
                    .then(async answer => {

                        if(answer.status === 201) {
                            is_log = true;
                        } else {
                            is_log = false;
                        };             
                        
                    });
            
                } catch (error) {
                    console.log(error);
                    is_log = false;
                };

            };
        };
        
        return { is_log, is_already_log };
    },

    // Récupère l'id de la tâche teamwork en fonction des tags renseigné dans le fichier tags.json
    retrieve_tag: (event) => {

        let teamwork_id = undefined;

        for (const tag in all_tags) {

            if (event.summary.includes(all_tags[tag]['tag'])) {

                if(all_tags[tag]['variable_environnement'] !== undefined) {
                    let variable_environnement = all_tags[tag]['variable_environnement'];
                    teamwork_id = process.env[variable_environnement];
                    return teamwork_id;
                } else if(all_tags[tag]['task_id'] !== undefined) {
                    teamwork_id = all_tags[tag]['task_id'];
                    return teamwork_id;
                };                
            };
        };
    },

    // Récupère l'id de la tâche Teamwork en fonction de l'événement google agenda
    get_teamwork_task_id: (event) => {

        let teamwork_id = undefined; 
      
        if(event.summary && event.summary.includes('https://helliosolutions.teamwork.com') && !event.attendees) {
            
            const task = 'tasks/';
            const index = event.summary.indexOf(task);

            if(index !== -1) {
                const length = task.length;
                const string1 = event.summary.slice(index + length);

                if (string1.match(/[0-9]+/)) {

                    teamwork_id = string1.match(/[0-9]+/)[0];

                };
            };        
                       
        } else if (event.summary && !event.summary.includes('https://helliosolutions.teamwork.com')) {
            
            teamwork_id = teamwork_controller.retrieve_tag(event);

        };

        return teamwork_id;
    }
}

module.exports = teamwork_controller;
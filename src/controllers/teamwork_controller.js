const fetch = require('node-fetch');
const fs = require("fs");

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
    get_log_time_teamwork: async (teamwork_username, teamwork_password, task_id, tw_type) => {

        let tw_answer = undefined;

        let url;

        if(tw_type === "Tâche") {
            url = 'https://helliosolutions.teamwork.com/projects/api/v2/tasks/' + task_id +'/time_entries.json?getTotals=true&includeSubTasks=1&page=1&pageSize=250&sortOrder=desc';
        } else if(tw_type === "Projet") {
            url = 'https://helliosolutions.teamwork.com/projects/api/v2/projects/' + task_id +'/time_entries.json?getTotals=true&includeSubTasks=1&page=1&pageSize=250&sortOrder=desc';
        };
        
        try {
    
            await fetch(url, {
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

    // Vérifie si une date est un jour compris entre lundi et vendredi
    verif_if_week_day: (date) => {

        let day_number = new Date(date).getDay();

        if (day_number >= 1 && day_number <= 5) {
            return true;
        } else {
            return false;
        };
    },
    
    // Renseigne un temps sur Teamwork si l'événement est un événement de la semaine et si l'événement n'a pas déjà été synchronisé
    log_time_teamwork: async (teamwork_username, teamwork_password, task_id, start_date, start_time, hours, minutes, tw_type) => {

        let url;

        if(tw_type === "Tâche") {
            url = 'https://helliosolutions.teamwork.com/projects/api/v3/tasks/' + task_id + '/time.json';
        } else if(tw_type === "Projet") {
            url = 'https://helliosolutions.teamwork.com/projects/api/v3/projects/' + task_id + '/time.json';
        };

        let is_log = false;
        let is_already_log = false;
        let problem_log_task = false;
        let task_not_exist = false;

        let is_week_day = teamwork_controller.verif_if_week_day(start_date);

        if (is_week_day) {

            let log_this_time = true;

            let log_time = await teamwork_controller.get_log_time_teamwork(teamwork_username, teamwork_password, task_id, tw_type);
            
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
            
                    await fetch(url, {
                        method: 'POST',
                        body: JSON.stringify(body),
                        headers: {
                            'Authorization': 'Basic ' + Buffer.from(teamwork_username + ":" + teamwork_password).toString('base64')
                        }
                    })
                    .then(async answer => {

                        if(answer.status === 201) {
                            is_log = true;
                        } else if(answer.status === 400) {
                            is_log = false;
                            tw_infos = await answer.json();

                            if(tw_infos.errors[0].detail.includes('task not found')) {
                                task_not_exist = true;
                            } else {

                                
                                problem_log_task = true;
                            };                            

                        } else {
                            is_log = false;
                            problem_log_task = true;
                        };             
                        
                    });
            
                } catch (error) {
                    console.log(error);
                    is_log = false;
                    problem_log_task = true;
                };

            };
        };
        
        return { is_log, is_already_log, problem_log_task, task_not_exist };
    },

    // Récupère l'id de la tâche teamwork en fonction des tags renseigné dans le fichier tags.json
    retrieve_tag: (event) => {

        let teamwork_id = undefined;
        let tw_type = undefined;

        for (const tag in all_tags) {

            if (event.summary.includes(all_tags[tag]['tag'])) {

                if(all_tags[tag]['variable_environnement'] !== undefined) {
                    let variable_environnement = all_tags[tag]['variable_environnement'];
                    tw_type = all_tags[tag]['type'];
                    teamwork_id = process.env[variable_environnement];
                    return { teamwork_id, tw_type };
                } else if(all_tags[tag]['tw_id'] !== undefined) {
                    tw_type = all_tags[tag]['type'];
                    teamwork_id = all_tags[tag]['tw_id'];
                    return { teamwork_id, tw_type };
                };                
            };
        };
    },

    // Récupère l'id de la tâche Teamwork en fonction de l'événement google agenda
    get_teamwork_task_id: (event) => {

        let teamwork_id = undefined;
        let tw_type = undefined; 
      
        if(event.summary && event.summary.includes('https://helliosolutions.teamwork.com')) {
            
            const task = 'tasks/';
            const project = 'projects/';
            const task_index = event.summary.indexOf(task);
            const project_index = event.summary.indexOf(project);

            if(task_index !== -1) {
                const length = task.length;
                const id = event.summary.slice(task_index + length);

                if (id.match(/[0-9]+/)) {

                    teamwork_id = id.match(/[0-9]+/)[0];
                    tw_type = 'Tâche';

                };
            } else if (project_index !== -1) {
                const length = project.length;
                const id = event.summary.slice(project_index + length);

                if (id.match(/[0-9]+/)) {

                    teamwork_id = id.match(/[0-9]+/)[0];
                    tw_type = 'Projet';

                };
            };        
                       
        } else if (event.summary && !event.summary.includes('https://helliosolutions.teamwork.com')) {
            
            if(teamwork_controller.retrieve_tag(event) && teamwork_controller.retrieve_tag(event).teamwork_id) {
                teamwork_id = teamwork_controller.retrieve_tag(event).teamwork_id;
            };
            
            if(teamwork_controller.retrieve_tag(event) && teamwork_controller.retrieve_tag(event).tw_type) {
                tw_type = teamwork_controller.retrieve_tag(event).tw_type;
            };
        };

        return { teamwork_id, tw_type };
    }
}

module.exports = teamwork_controller;
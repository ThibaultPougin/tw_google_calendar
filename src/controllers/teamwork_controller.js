const fetch = require('node-fetch');
require('dotenv').config();

let teamwork_username = process.env.TEAMWORK_USERNAME;
let teamwork_password = process.env.TEAMWORK_PASSWORD;



const teamwork_controller = {

    log_time_teamwork: async (task_id, start_date, start_time, hours, minutes) => {

        let log_this_time = true;

        let log_time = await teamwork_controller.get_log_time_teamwork(task_id);
        let already_log_time = log_time.timeEntries;

        already_log_time.forEach(time_log => {
            
            if(time_log.date.substring(0, 10) === start_date) {
                log_this_time = false;
            };           
        });

        if(log_this_time === true) {

            let body = {
                "tags": [
                
                ],
                "timelog": {
                "date": start_date,
                "time": start_time,
                "description": "Vacances",
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
                });
        
            } catch (error) {
                console.log(error);
            };

        };
    },

    get_log_time_teamwork: async (task_id) => {

        let tw_answer = undefined;
        
        try {
    
            await fetch('https://helliosolutions.teamwork.com/projects/api/v2/tasks/' + task_id +'/time_entries.json?getTotals=true&includeSubTasks=1&page=1&pageSize=250&sortOrder=desc', {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(teamwork_username + ":" + teamwork_password).toString('base64')
                }
            })
            .then(async answer => {
                tw_answer = await answer.json();
            });            
    
        } catch (error) {
            console.log(error);
        };

        return tw_answer;
    }
}

module.exports = teamwork_controller;
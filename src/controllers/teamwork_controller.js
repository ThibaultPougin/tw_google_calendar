const fetch = require('node-fetch');
require('dotenv').config();

const teamwork_controller = {

    log_time_teamwork: async (task_id, start_date, start_time, hours, minutes) => {

        let teamwork_username = process.env.TEAMWORK_USERNAME;
        let teamwork_password = process.env.TEAMWORK_PASSWORD;
    
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
    }
}

module.exports = teamwork_controller;
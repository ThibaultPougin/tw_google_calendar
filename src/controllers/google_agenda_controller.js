const { google } = require('googleapis');

const teamwork_controller = require('./teamwork_controller');
const cli_controller = require('./cli_controller');

let google_client_id = process.env.GOOGLE_CLIENT_ID;
let google_client_secret = process.env.GOOGLE_CLIENT_SECRET;
let refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
let calendar_id = process.env.CALENDAR_ID;

const google_agenda_controller = {

    getEvents : async (dateTimeStart, dateTimeEnd) => {

        const oauth2Client = new google.auth.OAuth2(google_client_id, google_client_secret);

        oauth2Client.setCredentials({
            refresh_token: refresh_token
          });
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        try {
            const response = await calendar.events.list({
                calendarId: calendar_id,
                timeMin: dateTimeStart,
                timeMax: dateTimeEnd,
                timeZone: 'Europe/Paris',
                singleEvents: true,
                orderBy: 'startTime'
            });
    
            const events = response.data.items;
            return events;
    
        } catch (error) {
            console.log(error);
        };
    },
    
    getMonday: (date) => {
        
        const first = date.getDate() - date.getDay() + 1;
        const monday = new Date(date.setDate(first));
    
        return monday.toISOString().split('T')[0];
    },
    
    getFriday: (date) => {
      
        const first = date.getDate() - date.getDay() + 5;
        const friday = new Date(date.setDate(first));
    
        return friday.toISOString().split('T')[0];
    },

    get_teamwork_task_id: (event) => {

        let teamwork_id = undefined; 
      
        if(event.summary && event.summary.includes('https://helliosolutions.teamwork.com')) {
            const task = 'tasks/';
            const index = event.summary.indexOf(task);
            const length = task.length;
            const string1 = event.summary.slice(index + length);
            teamwork_id = string1.match(/[0-9]+/)[0];
        } else if (event.summary && !event.summary.includes('https://helliosolutions.teamwork.com') && (event.summary.includes('Daily meeting') || event.summary.includes('Weekly Dev - Point Projets') || event.summary.includes('Attribution des US') || event.summary.includes('Sprint') || event.summary.includes('Temps TW'))) {
            teamwork_id = process.env.TEAMWORK_PROJECT_REPOSITORY_ID;    
        } else if (event.summary && !event.summary.includes('https://helliosolutions.teamwork.com') && event.summary.includes('Formation')) {
            teamwork_id = process.env.TEAMWORK_FORMATION_REPOSITORY_ID;
        } else if(event.summary && !event.summary.includes('https://helliosolutions.teamwork.com') && event.summary.includes('Support') || event.summary.includes('AH')) {
            teamwork_id = process.env.TEAMWORK_SUPPORT_REPOSITORY_ID;   
        } else if(event.attendees) {
            teamwork_id = process.env.TEAMWORK_REUNION_REPOSITORY_ID;   
        };

        return teamwork_id;
    },

    start: async () => {

        // On récupère la date de début (lundi matin) et date de fin (vendredi soir) de la semaine courante
        const start = google_agenda_controller.getMonday(new Date()) + 'T00:00:00+01:00';
        const end = google_agenda_controller.getFriday(new Date()) + 'T23:00:00+01:00';
        
        // On récupère tous les événements de la semaine renseignés dans l'agenda
        const events = await google_agenda_controller.getEvents(start, end);

        let total_log_hours = 0;
        let total_log_minutes = 0;
        let total_unlog_hours = 0;
        let total_unlog_minutes = 0;

        let unlog_events = [];
    
        events.forEach(event => {

            // Si l'événement a une date de début et une date de fin (exclu les événements sur une journée entière comme les congés)
            if(event.start && event.start.dateTime && event.end && event.end.dateTime) {
                
                let teamwork_id = google_agenda_controller.get_teamwork_task_id(event);

                if(teamwork_id !== undefined) {

                    let split_event = event.summary.split('/');
                    let start_date = event.start.dateTime.substring(0, 10);
                    let start_time = event.start.dateTime.substring(11, 19);
                    let start_hour = event.start.dateTime.substring(11, 13);
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
                   
                    // teamwork_controller.log_time_teamwork(teamwork_id, start_date, start_time, hours, minutes);

                    total_log_hours = total_log_hours + hours;
                    total_log_minutes = total_log_minutes + minutes;

                    if (total_log_minutes >= 60) {
                        total_log_minutes = total_log_minutes - 60;
                        total_log_hours++;
                    };
                } else {
                    unlog_events.push(event);

                    let start_hour = event.start.dateTime.substring(11, 13);
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

                    total_unlog_hours = total_unlog_hours + hours;
                    total_unlog_minutes = total_unlog_minutes + minutes;
                };
            };

        });

        cli_controller.handle_interactive_command_line(total_log_hours, total_unlog_hours, unlog_events);

    }    
};

module.exports = google_agenda_controller;
  
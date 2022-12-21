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
        } else if (event.summary && !event.summary.includes('https://helliosolutions.teamwork.com') && (event.summary.includes('Daily meeting') || event.summary.includes('Weekly Dev - Point Projets') || event.summary.includes('Attribution des US') || event.summary.includes('Sprint') || event.summary.includes('Temps TW') || event.summary.includes('[PROJET]'))) {
            teamwork_id = process.env.TEAMWORK_PROJECT_REPOSITORY_ID;    
        } else if (event.summary && !event.summary.includes('https://helliosolutions.teamwork.com') && event.summary.includes('[FORMATION]')) {
            teamwork_id = process.env.TEAMWORK_FORMATION_REPOSITORY_ID;
        } else if(event.summary && !event.summary.includes('https://helliosolutions.teamwork.com') && event.summary.includes('[SUPPORT]') || event.summary.includes('[AH]')) {
            teamwork_id = process.env.TEAMWORK_SUPPORT_REPOSITORY_ID;   
        } else if(event.summary && event.summary.includes('[VACANCES]')) {
            teamwork_id = process.env.TEAMWORK_VACANCES_REPOSITORY_ID;   
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

            // Prise en compte des événements sur la journée entière 
            if(event.start && !event.start.dateTime && event.start.date && event.end && !event.end.dateTime && event.end.date) {
                          
                event['isDayEvent'] = true;
                event.start['dateTime'] = event.start.date + 'T09:00:00+01:00';
                event.end['dateTime'] = event.end.date + 'T17:00:00+01:00';
                event['dayToLog'] = [];

                let number_to_log = event.end.date.substring(8, 10) - event.start.date.substring(8, 10);

                for (let i = 0; i < number_to_log; i++) {
                    
                    let new_day = parseInt(event.start.date.substring(8, 10), 10) + i;
                    let final_day = event.start.date.slice(0, -2) + new_day.toString();

                    let is_week_day = google_agenda_controller.verif_if_week_day(final_day);

                    if(is_week_day === true) {
                        event['dayToLog'].push(final_day); 
                    };          
                    
                };
            };

            // Si l'événement a une date de début et une date de fin
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
                   
                    if(event['isDayEvent'] === true) {

                        event['dayToLog'].forEach(date => {

                            teamwork_controller.log_time_teamwork(teamwork_id, date, start_time, hours, minutes);
                            total_log_hours = total_log_hours + hours;
                            total_log_minutes = total_log_minutes + minutes;

                            if (total_log_minutes >= 60) {
                                total_log_minutes = total_log_minutes - 60;
                                total_log_hours++;
                            };
                        });

                    } else {
                        teamwork_controller.log_time_teamwork(teamwork_id, start_date, start_time, hours, minutes);
                        
                        total_log_hours = total_log_hours + hours;
                        total_log_minutes = total_log_minutes + minutes;

                        if (total_log_minutes >= 60) {
                            total_log_minutes = total_log_minutes - 60;
                            total_log_hours++;
                        };
                    }
                    
                    
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

    },
    
    verif_if_week_day: (start_date) => {

        let day_number = new Date(start_date).getDay();

        if (day_number >= 1 && day_number <= 5) {
            return true;
        } else {
            return false;
        };
    }
};

module.exports = google_agenda_controller;
  
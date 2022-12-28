const google_agenda_controller = require('./google_agenda_controller');
const teamwork_controller = require('./teamwork_controller');
const cli_controller = require('./cli_controller');
const global_controller = require('./global_controller');

const synchro_controller = {
    
    format_events: async () => {

        // On récupère la date de début (lundi matin) et date de fin (vendredi soir) de la semaine courante
        const start = global_controller.getMonday(new Date()) + 'T00:00:00+01:00';
        const end = global_controller.getFriday(new Date()) + 'T23:00:00+01:00';
        
        // On récupère tous les événements de la semaine renseignés dans l'agenda
        const events = await google_agenda_controller.getEvents(start, end);

        let total_log_hours = 0;
        let total_log_minutes = 0;
        let total_unlog_hours = 0;
        let total_unlog_minutes = 0;

        let event_to_log = [];
        let unlog_events = [];

        if(events !== undefined) {

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
    
                        let is_week_day = global_controller.verif_if_week_day(final_day);
    
                        if(is_week_day === true) {
                            event['dayToLog'].push(final_day); 
                        };          
                        
                    };
                };
    
                // Si l'événement a une date de début et une date de fin
                if(event.start && event.start.dateTime && event.end && event.end.dateTime) {
                    
                    let teamwork_id = teamwork_controller.get_teamwork_task_id(event);
    
                    if(teamwork_id !== undefined) {
    
                        let time = global_controller.format_time(event);
                       
                        if(event['isDayEvent'] === true) {
    
                            event['dayToLog'].forEach(date => {
    
                                event_to_log.push({ summary: event.summary, teamwork_id: teamwork_id, date: date, start_time: time.start_time, hours: time.hours, minutes: time.minutes })
                                // On synchronise le temps de cet événement sur Teamwork
                                // teamwork_controller.log_time_teamwork(teamwork_id, date, time.start_time, time.hours, time.minutes);
                            });
    
                        } else {
    
                            event_to_log.push({ summary: event.summary, teamwork_id: teamwork_id, date: time.start_date, start_time: time.start_time, hours: time.hours, minutes: time.minutes })
                            // On synchronise le temps de cet événement sur Teamwork
                            // teamwork_controller.log_time_teamwork(teamwork_id, time.start_date, time.start_time, time.hours, time.minutes);
                        };
    
                        total_log_hours = total_log_hours + time.hours;
                        total_log_minutes = total_log_minutes + time.minutes;
    
                        if (total_log_minutes >= 60) {
                            total_log_minutes = total_log_minutes - 60;
                            total_log_hours++;
                        };                    
                        
                    } else {
                        unlog_events.push(event);
    
                        let time = global_controller.format_time(event);
    
                        total_unlog_hours = total_unlog_hours + time.hours;
                        total_unlog_minutes = total_unlog_minutes + time.minutes;
                    };
                };
    
            });
    
            return { event_to_log, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events }; 

        } else {
            return undefined;
        }
    
               
    }

};

module.exports = synchro_controller;
  
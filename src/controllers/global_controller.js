const google_agenda_controller = require('./google_agenda_controller');
const teamwork_controller = require('./teamwork_controller');

const global_controller = {

    // Retourne le lundi de la semaine en cours
    getMonday: (date) => {
        
        const first = date.getDate() - date.getDay() + 1;
        const monday = new Date(date.setDate(first));
    
        return monday.toISOString().split('T')[0];
    },
    
    // Retourne le vendredi de la semaine en cours
    getFriday: (date) => {
      
        const first = date.getDate() - date.getDay() + 5;
        const friday = new Date(date.setDate(first));
    
        return friday.toISOString().split('T')[0];
    },

    // s
    verify_if_day_include: (startDate, endDate, dayToVerify) => {
      
        let d1 = startDate.split("-");
        let d2 = endDate.split("-");
        let c = dayToVerify.split("-");

        let from = new Date(d1[0], parseInt(d1[1])-1, d1[2]);  // -1 because months are from 0 to 11
        let to = new Date(d2[0], parseInt(d2[1])-1, d2[2]);
        let check = new Date(c[0], parseInt(c[1])-1, c[2]);

        return check >= from && check <= to;
    },

    // Calcul et retourne la date de début, l'heure de début, l'heure de fin, la durée (en heures et en minutes) d'un événement au bon format
    format_time: (event) => {
    
        let start_date = event.start.dateTime.substring(0, 10);
        let start_time = event.start.dateTime.substring(11, 19);
        let start_hour = event.start.dateTime.substring(11, 13);
        let end_hour = event.end.dateTime.substring(11, 13);
        let end_time = event.end.dateTime.substring(11, 19);
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

        return { start_date, start_time, end_time, hours, minutes};
    },

    // Récupère la liste des événements calendar, et la traite pour retourner les événements à synchroniser, et les événements ne pouvant pas être synchronisés automatiquement
    format_events: async (startDate, endDate) => {

        // On récupère la date de début (lundi matin) et date de fin (vendredi soir) de la semaine courante
        // const start = global_controller.getMonday(new Date()) + 'T00:00:00+01:00';
        // const end = global_controller.getFriday(new Date()) + 'T23:00:00+01:00';
        
        // On récupère tous les événements de la semaine renseignés dans l'agenda
        const events = await google_agenda_controller.getEvents(startDate, endDate);

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

                        if(final_day.length === 9) {
                            final_day = final_day.substring(0, 8) + "0" + final_day.substring(8, 9);
                        };

                        let is_week_day = teamwork_controller.verif_if_week_day(final_day);

                        let day_include = global_controller.verify_if_day_include(startDate.substring(0, 10), endDate.substring(0, 10), final_day)
    
                        if(is_week_day === true && day_include === true) {
                            event['dayToLog'].push(final_day); 
                        };          
                        
                    };
                };
    
                // Si l'événement a une date de début et une date de fin
                if(event.start && event.start.dateTime && event.end && event.end.dateTime) {

                    let is_week_day = teamwork_controller.verif_if_week_day(event.start.dateTime.substring(0, 10));

                    if(is_week_day === true) {

                        let teamwork_id = undefined;
                        let tw_type = undefined;

                        if(teamwork_controller.get_teamwork_task_id(event) && teamwork_controller.get_teamwork_task_id(event).teamwork_id) {
                            teamwork_id = teamwork_controller.get_teamwork_task_id(event).teamwork_id;
                        };

                        if(teamwork_controller.get_teamwork_task_id(event) && teamwork_controller.get_teamwork_task_id(event).tw_type) {
                            tw_type = teamwork_controller.get_teamwork_task_id(event).tw_type;
                        };
    
                        if(teamwork_id !== undefined) {
        
                            let time = global_controller.format_time(event);
                        
                            if(event['isDayEvent'] === true) {
        
                                event['dayToLog'].forEach(date => {
        
                                    event_to_log.push({ summary: event.summary, teamwork_id: teamwork_id, date: date, start_time: time.start_time, hours: time.hours, minutes: time.minutes, tw_type: tw_type });
                                });
        
                            } else {

                                event_to_log.push({ summary: event.summary, teamwork_id: teamwork_id, date: time.start_date, start_time: time.start_time, hours: time.hours, minutes: time.minutes, tw_type: tw_type });
                            };
        
                            total_log_hours = total_log_hours + time.hours;
                            total_log_minutes = total_log_minutes + time.minutes;
        
                            if (total_log_minutes >= 60) {
                                total_log_minutes = total_log_minutes - 60;
                                total_log_hours++;
                            };                    
                            
                        } else {

                            event["tw_type"] = tw_type;

                            if(event['isDayEvent'] === true) {
        
                                event['dayToLog'].forEach(date => {
        
                                    unlog_events.push({ summary: event.summary, id: event.id + date ,start: { date: date, dateTime: date + event.start.dateTime.slice(10) }, end: { date: event.end.date, dateTime: event.end.dateTime }, tw_type: tw_type });
                                });
        
                            } else {
                                unlog_events.push(event);
                            };                                                       
        
                            let time = global_controller.format_time(event);
        
                            total_unlog_hours = total_unlog_hours + time.hours;
                            total_unlog_minutes = total_unlog_minutes + time.minutes;
                        };
                                
                    };
                };
    
            });
    
            return { event_to_log, total_log_hours, total_log_minutes, total_unlog_hours, total_unlog_minutes, unlog_events }; 

        } else {
            return undefined;
        };      
    }
};

module.exports = global_controller;
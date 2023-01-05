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

    // Vérifie si une date est un jour compris entre lundi et vendredi
    verif_if_week_day: (date) => {

        let day_number = new Date(date).getDay();

        if (day_number >= 1 && day_number <= 5) {
            return true;
        } else {
            return false;
        };
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
    }
};

module.exports = global_controller;
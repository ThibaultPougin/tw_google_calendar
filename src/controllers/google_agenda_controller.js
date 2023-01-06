const { google } = require('googleapis');

let google_client_id = process.env.GOOGLE_CLIENT_ID;
let google_client_secret = process.env.GOOGLE_CLIENT_SECRET;
let refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
let calendar_id = process.env.CALENDAR_ID;

const google_agenda_controller = {

    // Récupère la liste des événements entre renseignés dans l'agenda google entre dateTimeStart et dateTimeEnd
    getEvents : async (dateTimeStart, dateTimeEnd) => {

        let events = undefined;

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
    
            events = response.data.items;
            return events;
    
        } catch (error) {
            return events;
        };
    }
};

module.exports = google_agenda_controller;
  
require('dotenv').config();

const google_agenda_controller = require('./src/controllers/google_agenda_controller');

google_agenda_controller.start();
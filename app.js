require('dotenv').config();

const cli_controller = require('./src/controllers/cli_controller');

//On démarre le CLI
cli_controller.start_cli();
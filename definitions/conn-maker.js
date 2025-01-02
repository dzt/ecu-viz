const connectors = require('./connectors.js');
const utils = require('../src/helpers/utils.js');

utils.readFolders('../pinout_data/chassis', (err, chassis_options) => {
    if (err) return console.error(err);
    let connector_summary = connectors(chassis_options);
    console.log(connector_summary);
});
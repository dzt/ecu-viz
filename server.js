const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

const app = express();
app.server = http.createServer(app);

const PORT = 8080;

// API Definitions
const chassis = require('./definitions/chassis.json');
const ecus = require('./definitions/ecus.json');
const engines = require('./definitions/engines.json');
const inserts = require('./definitions/inserts.json');

app.use(bodyParser.urlencoded({extended: true, limit: '50mb' }));
app.set('view engine', 'html');

app.get('/', (req, res) => {
    return res.end('Hello World');
});

app.server.listen(process.env.PORT || PORT, () => {
    console.log(`App is running on at http://127.0.0.1:${app.server.address().port}`);
});
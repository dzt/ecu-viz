const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

const temp = require('temp');
const YAML = require('json-to-pretty-yaml');
const lib = require('./lib/index.js');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const app = express();
app.server = http.createServer(app);

const PORT = 8080;

// API Definitions
const chassis = require('./definitions/chassis.json');
const ecus = require('./definitions/ecus.json');
const engines = require('./definitions/engines.json');
const inserts = require('./definitions/inserts.json');

temp.track();
app.use(bodyParser.json())
app.set('view engine', 'html');

app.get('/', (req, res) => {
    return res.end('Hello World');
});

app.post('/fetch', (req, res) => {

    const input = req.body;
    let output = generateDiagram(input);
    let output_yaml = YAML.stringify(output);

    temp.cleanupSync();
    temp.mkdir({dir: path.join(__dirname, 'tmp')}, function(err, dirPath) {
        if (err) return res.end('Error occured spwaning temp directory')
        const yamlFilePath = path.join(dirPath, 'output.yaml');
        fs.writeFile(yamlFilePath, output_yaml, (err) => {
            if (err) res.end('Write error has occured');
            process.chdir(dirPath);
            exec(`wireviz ${yamlFilePath}`, function(err, stdout) {
                if (err) res.end('WireViz Error');
                const pngFilePath = yamlFilePath.split('.yaml')[0] + '.png';
                return res.sendFile(pngFilePath);
            });
        });
    });

});

const generateDiagram = (input) => {
    let connectors = lib.createConnectors(input);
    let cables = lib.createCables(connectors.summary, input);
    let connections = lib.createConnections(connectors, cables, input);
    return { connectors: connectors.data, cables, connections };
}

app.server.listen(process.env.PORT || PORT, () => {
    console.log(`App is running on at http://127.0.0.1:${app.server.address().port}`);
});
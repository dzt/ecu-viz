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

// Connector Definitions
const chassis = require('./definitions/chassis.json');
const ecus = require('./definitions/ecus.json');
const engines = require('./definitions/engines.json');
const inserts = require('./definitions/inserts.json');

temp.track();
app.use(bodyParser.json())
app.set('view engine', 'ejs');
app.use('/public', express.static(__dirname + '/public'));

app.get('/', (_req, res) => {
    return res.json({ message: 'ECUViz API' });
});

app.get('/definitions', (req, res) => {
    return res.json({chassis, ecus, engines, inserts});
});

app.post('/fetch', (req, res) => {

    const input = req.body;
    let output = generateDiagram(input);
    let output_yaml = YAML.stringify(output);

    temp.cleanupSync();
    temp.mkdir({dir: path.join(__dirname, 'tmp')}, (err, dirPath) => {
        if (err) return res.end('Error occured spwaning temp directory')
        const yamlFilePath = path.join(dirPath, 'output.yaml');
        fs.writeFile(yamlFilePath, output_yaml, (err) => {
            if (err) res.end('Write error has occured');
            process.chdir(dirPath);
            exec(`wireviz ${yamlFilePath}`, (err, stdout) => {
                if (err) res.end('WireViz Error');
                const pngFilePath = yamlFilePath.split('.yaml')[0] + '.png';
                return res.sendFile(pngFilePath);
            });
        });
    });

});

app.get('/viz', (req, res) => {
    return res.render('viz');
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
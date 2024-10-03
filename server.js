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
const connectors = require('./definitions/connector-list.json');

temp.track();
app.use(bodyParser.json())
app.set('view engine', 'ejs');
app.use('/public', express.static(__dirname + '/views/public'));

app.get('/', (_req, res) => {
    return res.json({
        message: 'ECUViz API'
    });
});

app.get('/definitions', (req, res) => {
    return res.json({
        chassis,
        ecus,
        engines,
        inserts,
        connectors
    });
});

app.post('/fetch', (req, res) => {

    const input = req.body;
    let output;
    
    try {
        output = generateDiagram(input);
    } catch(e) {
        console.log(e)
        return res.status(400).json({
            data: null,
            error: {
                code: 400,
                message: `${e}`
            }
        });
    }

    output.tweak = {
        override: {
            graph: {
                ranksep: '2.5'
            }
        }
    }

    let output_yaml = YAML.stringify(output);
 
    console.dir(input)

    temp.cleanupSync();
    temp.mkdir({
        dir: path.join(__dirname, 'tmp')
    }, (err, dirPath) => {
        if (err) return res.status(400).json({
            data: null,
            error: {
                code: 400,
                message: 'Error occured spawning temp directory.'
            }
        });
        const yamlFilePath = path.join(dirPath, 'output.yaml');
        fs.writeFile(yamlFilePath, output_yaml, (err) => {
            if (err) return res.status(400).json({
                data: null,
                error: {
                    code: 400,
                    message: 'Write Error has occured.'
                }
            });
            process.chdir(dirPath);
            exec(`wireviz ${yamlFilePath}`, (err, stdout) => {

                if (err) console.error(err)
                if (err) return res.status(400).json({
                    data: null,
                    error: {
                        code: 400,
                        message: 'WireViz Engine Failure.'
                    }
                });
                
                const pngFilePath = yamlFilePath.split('.yaml')[0] + '.png';
                const buffer = fs.readFileSync(pngFilePath);
                const base64String = Buffer.from(buffer).toString('base64');

                return res.status(200).json({
                    data: `data:image/png;base64,${base64String}`,
                    error: null
                });

            });
        });
    });

});

app.get('/viz', (req, res) => {
    return res.render('viz', {
        chassis,
        ecus,
        engines,
        inserts,
        connectors,
        raw: {
            chassis: JSON.stringify(chassis),
            ecus: JSON.stringify(ecus),
            engines: JSON.stringify(engines),
            inserts: JSON.stringify(inserts),
            connectors: JSON.stringify(connectors)
        }
    });
});

const generateDiagram = (input) => {
    let connectors = lib.createConnectors(input);
    let cables = lib.createCables(connectors.summary, input);
    let connections = lib.createConnections(connectors, cables, input);
    return {
        connectors: connectors.data,
        cables,
        connections
    };
}

app.server.listen(process.env.PORT || PORT, () => {
    console.log(`App is running on at http://127.0.0.1:${app.server.address().port}`);
});
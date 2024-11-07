const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

const temp = require('temp');
const YAML = require('json-to-pretty-yaml');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const YamlGenerator = require('./src/YamlGenerator.js');

const app = express();
app.server = http.createServer(app);

const PORT = 8080;

// Connector Definitions
const chassis = require('./definitions/chassis.json');
const ecus = require('./definitions/ecus.json');
const engines = require('./definitions/engines.json');
const inserts = require('./definitions/inserts.json');
const connectors = require('./definitions/connector-list.json');
const utils = require('./src/helpers/utils.js');

temp.track();
app.use(bodyParser.json())
app.set('view engine', 'ejs');
app.use('/public', express.static(__dirname + '/views/public'));

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
        const yg = new YamlGenerator(input);
        output = yg.generateOutput()
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
                ranksep: '3.5',
                pad: '10.0'
            }
        }
    }

    // Return JSON payload with entire I/O List?
    let io_sheet = utils.getIOList(output.connections, input.ecu);

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
            console.log(`YAML File Generated: ${yamlFilePath}`)
            exec(`wireviz ${yamlFilePath}`, (err, _stdout) => {

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
                    data: {
                        image: `data:image/png;base64,${base64String}`,
                        io_sheet
                    },
                    error: null
                });

            });
        });
    });

});

app.get('/', (req, res) => {
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

app.server.listen(process.env.PORT || PORT, () => {
    console.log(`App is running on at http://127.0.0.1:${app.server.address().port}`);
});
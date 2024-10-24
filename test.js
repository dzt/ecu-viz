const input_file = require('./input_examples/http.json');
const YamlGenerator = require('./src/YamlGenerator.js');
const utils = require('./src/utils.js');
const fs = require('fs');

const YAML = require('json-to-pretty-yaml');

let generateDiagram = (input) => {
    const yg = new YamlGenerator(input);
    let connectors = yg.createConnectors(input);
    let cables = yg.createCables(connectors.summary, input);
    let connections = yg.createConnections(connectors, cables, input);

    return { 
        connectors: connectors.data,
        cables,
        connections
    };
}

/* Used for testing */
let output = generateDiagram(input_file);
let data = YAML.stringify(output)

/* ECU Summary Print */
console.log('ECU Summary:');
let summary = utils.getECUSummary(input_file.ecu, false);
console.dir(summary);

/* YAML Generation */
fs.writeFile('out/output.yaml', data, function(error) {
    if(error) {
        console.log('[write auth]: ' + err);
    } else {
      console.log('[write auth]: success (output.yaml)');
    }
});

/* JSON Generation (for testing) */
fs.writeFile('out/output.json', JSON.stringify(output, null, 4), function(error) {
    if(error) {
        console.log('[write auth]: ' + err);
    } else {
      console.log('[write auth]: success (output.json)');
    }
});

module.exports.generateDiagram = generateDiagram;
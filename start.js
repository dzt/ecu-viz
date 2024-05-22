const s4_example = require('./input_examples/s4-550.json');
const lib = require('./lib/index.js');
const fs = require('fs');

const YAML = require('json-to-pretty-yaml');

const generateDiagram = (input) => {

    let connectors = lib.createConnectors(input);
    let cables = lib.createCables(connectors.summary, input);
    let connections = lib.createConnections(connectors, cables, input);

    return { connectors: connectors.data, cables, connections };
}

// Used for testing
let output = generateDiagram(s4_example);
// console.dir(output)
let data = YAML.stringify(output)

fs.writeFile('out/output.yaml', data, function(error) {
    if(error) {
        console.log('[write auth]: ' + err);
    } else {
      console.log('[write auth]: success (output.yaml)');
    }
});

fs.writeFile('out/output.json', JSON.stringify(output, null, 4), function(error) {
    if(error) {
        console.log('[write auth]: ' + err);
    } else {
      console.log('[write auth]: success (output.json)');
    }
});
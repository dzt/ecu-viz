// Importing required modules
const connector = require('./connector.js');
const cables = require('./cables.js');
const connections = require('./connections.js');
const utils = require('./utils.js');

let lib = {};

// Function to create connectors
lib.createConnectors = function(input) {
    // Array to build connectors
    let buildArr = [
        connector.create(input.ecu, "ecu"), // ECU connector
        connector.createECUGrounds(input.ecu), // ECU ground connections
        connector.createChassisConnections(input.chassis), // Chassis connections
        connector.create(input.tps, "tps"), // Throttle position sensor connection
        connector.createInjectorConnections(input.injectors, input.engine), // Injector connections
        connector.createIgnitionConnections(input.ignition, input.engine), // Ignition connections
        connector.createTempConnections(input.clt, input.iat), // Temperature sensors
        connector.create(input.trigger, "trigger_options"), // Trigger connector
        connector.create(input.flex, "flex_options"), // Flex fuel connector if applicable
        connector.createMultipleConnections(input.external_inputs, "can_bus"), // External inputs
        connector.createMultipleConnections(input.auxiliary_options, "auxiliary_options"), // Auxiliary outputs
        connector.createMultipleConnections(input.analog_inputs, "analog_inputs"), // Analog inputs
        utils.getRelay().connector, // Coil relay
        connector.createCoilGrounds(input.engine) // Ignition coil grounds
    ];

    let connObj = utils.builder(buildArr); // Build connectors
    let summary = utils.createConnectorSummary(connObj); // Create connector summary
    return {
        data: connObj,
        summary: summary
    };
}

// Function to create cables
lib.createCables = function(summary, input) {
    let useChassisTacho = input.use_chassis_tacho;
    let ecuID = input.ecu;

    let cableObj = utils.builder([
        cables.createChassisConnections(summary.auxiliary_outputs, ecuID, useChassisTacho), // Chassis connections
        cables.createInjectors(summary.injector_outputs, ecuID), // Injector connections
        cables.createIgnitionConnections(summary.ignition_outputs, ecuID), // Ignition connections
        cables.createAnalogConnections(summary.analog_inputs, ecuID), // Analog inputs
        cables.createTempConnections(summary.temp_inputs, ecuID), // Temperature sensors
        cables.createAuxConnections(summary.auxiliary_outputs, ecuID), // Auxiliary outputs
        cables.createTriggerConnection(summary.trigger_options[0], ecuID), // Trigger connections
        cables.createCANConnection(summary.can_bus[0], ecuID), // CAN bus connections
        cables.createGroundCables(ecuID) // ECU ground connections
    ]);

    return cableObj;
}

// Function to create connections
lib.createConnections = function(connectors, cables, input) {
    let ecuGroundConnections = connections.createECUGrounds(input.ecu); // ECU ground connections

    let chassisConnections = connections.createChassisConnections(
        cables['ECU to Chassis Connections'],
        connectors,
        'ECU to Chassis Connections',
        input.chassis
    );

    let injectorConnections = connections.createInjectorConnections(
        cables['Fuel Injectors'],
        connectors,
        'Fuel Injectors',
        input.chassis
    );

    let ignitionConnections = connections.createIgnitionConnections(
        cables['Ignition System'],
        connectors,
        'Ignition System'
    );

    let analogsConnections = connections.createAnalogConnections(
        cables['Analog Inputs'],
        connectors,
        'Analog Inputs'
    );

    let tempConnections = connections.createTempConnections(
        cables['Temperature Sensors'],
        connectors,
        'Temperature Sensors'
    );

    let auxConnections = connections.createAuxConnections(
        cables['Auxiliary Outputs'],
        connectors,
        'Auxiliary Outputs',
        input.chassis
    );

    let triggerConnection = connections.createTriggerConnection(
        cables['Trigger Sensor(s)'],
        connectors,
        'Trigger Sensor(s)',
        input.chassis
    );

    let canConnections = connections.createCANConnections(
        cables['CAN Bus Communication'],
        connectors,
        'CAN Bus Communication',
        input.chassis
    );

    let connectionBuild = utils.connectionBuilder([
        ecuGroundConnections,
        chassisConnections,
        injectorConnections,
        ignitionConnections,
        analogsConnections,
        tempConnections,
        auxConnections,
        triggerConnection,
        canConnections
    ]);

    return connectionBuild;
}

module.exports = lib;

const connector = require('./connector.js');
const cables = require('./cables.js');
const connections = require('./connections.js');
const utils = require('./utils.js');

let lib = {};

// TODO: Add Images
// TODO: Add exceptions for unique cases (for example: RX7 wipers and whatnot)
lib.createConnectors = function(input) {

    let buildArr = [
        connector.create(input.ecu, "ecu"), // ecu
        connector.createECUGrounds(input.ecu),
        connector.createChassisConnections(input.chassis), // chassis connections
        connector.create(input.tps, "tps"), // tps connection
        connector.createInjectorConnections(input.injectors, input.engine), // injector connections
        connector.createIgnitionConnections(input.ignition, input.engine), // ignition connections
        connector.createTempConnections(input.clt, input.iat), // temp sensors
        connector.create(input.trigger, "trigger_options"), // trigger connector
        connector.create(input.flex, "flex_options"), // flex fuel connector if aplicabale
        connector.createMultipleConnections(input.external_inputs, "can_bus"), // external inputs
        connector.createMultipleConnections(input.auxiliary_options, "auxiliary_options"), // aux outputs
        connector.createMultipleConnections(input.analog_inputs, "analog_inputs"), // analog inputs
        utils.getRelay().connector, // Adds a coil relay
        connector.createCoilGrounds(input.engine) // ignition coil grounds
    ]

    let connObj = utils.builder(buildArr);
    let summary = utils.createConnectorSummary(connObj);
    return {
        data: connObj,
        summary: summary
    };
}

// TODO: Validation Checks are done here to check for I/O
lib.createCables = function(summary, input) {

    // exception for people who intend on using digital can cluster
    let useChassisTacho = input.use_chassis_tacho;
    let ecuID = input.ecu;

    let cableObj = utils.builder([
        cables.createChassisConnections(summary.auxiliary_outputs, ecuID,useChassisTacho), // 12v, fuel pump, tacho?
        cables.createInjectors(summary.injector_outputs, ecuID), // 12v, inj 1..x
        cables.createIgnitionConnections(summary.ignition_outputs, ecuID),  // 12v, ground, ground?, ground? ign 1..x
        cables.createAnalogConnections(summary.analog_inputs, ecuID), // 5v, signal ground, an1..x
        cables.createTempConnections(summary.temp_inputs, ecuID), // signal ground, temp 1..x
        cables.createAuxConnections(summary.auxiliary_outputs, ecuID), // 12v+, aux 1..x
        cables.createTriggerConnection(summary.trigger_options[0], ecuID), // normal pinout arrangment
        cables.createCANConnection(summary.can_bus[0], ecuID), // 12v, ground, can-h, can-l
        cables.createGroundCables(ecuID) // ecu ground
    ]);

    return cableObj;

}

lib.createConnections = function(connectors, cables, input) {
    
    let ecuGroundConnections = connections.createECUGrounds(input.ecu)

    let chassisConnections = connections.createChassisConnections(
        cables['ECU to Chassis Connections'],
        connectors,
        'ECU to Chassis Connections',
        input.chassis
    )

    let injectorConnections = connections.createInjectorConnections(
        cables['Fuel Injectors'],
        connectors,
        'Fuel Injectors',
        input.chassis
    )

    let ignitionConnections = connections.createIgnitionConnections(
        cables['Ignition System'],
        connectors,
        'Ignition System'
    )

    let analogsConnections = connections.createAnalogConnections(
        cables['Analog Inputs'],
        connectors,
        'Analog Inputs'
    )

    let tempConnections = connections.createTempConnections(
        cables['Temperature Sensors'],
        connectors,
        'Temperature Sensors'
    )

    let auxConnections = connections.createAuxConnections(
        cables['Auxiliary Outputs'],
        connectors,
        'Auxiliary Outputs',
        input.chassis
    )

    let triggerConnection = connections.createTriggerConnection(
        cables['Trigger Sensor(s)'],
        connectors,
        'Trigger Sensor(s)',
        input.chassis
    )

    let canConnections = connections.createCANConnections(
        cables['CAN Bus Communication'],
        connectors,
        'CAN Bus Communication',
        input.chassis
    )

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
// Importing required modules
const connector = require('./connector.js');
const cables = require('./cables.js');
const connections = require('./connections.js');
const utils = require('./utils.js');

const { CABLE } = require('./constants.js');

let lib = {};

// Function to create connectors
lib.createConnectors = function(input) {
    // Array to build connectors
    let fusebox = connector.createFusebox(input);
    let buildArr = [
        connector.create(input.ecu, "ecu"), /* ECU connector */
        fusebox, /* Fusebox */
        connector.createECUGrounds(input.ecu), /* ECU ground connections */
        connector.createChassisConnections(input.chassis), /* Chassis connections */
        connector.createInsertConnections(input), /* Insert Connectors */
        connector.create(input.tps, "tps"), /* Throttle position sensor connection */
        connector.createInjectorConnections(input.injectors, input.engine), /* Injector connections */
        connector.createIgnitionConnections(input.ignition, input.engine), /* Ignition connections */
        connector.createTempConnections(input.clt, input.iat), /* Temperature sensors */
        connector.create(input.trigger, "trigger_options"), /* Trigger connector */
        (input.flex != null) ? connector.create(input.flex, "flex_options") : null, /* Flex fuel connector if applicable */
        (input.can_devices.length > 1) ? connector.createMultipleConnections(input.can_devices, "can_bus") : null, /* CAN Devices */
        connector.createMultipleConnections(input.auxiliary_options, "auxiliary_options"), /* Auxiliary outputs */
        connector.createMultipleConnections(input.analog_inputs, "analog_inputs"), /* Analog Inputs */
        connector.createCoilGrounds(input.engine), /* Ignition coil grounds */
        connector.createBattery()
    ];

    let connObj = utils.builder(buildArr); /* Build connectors */
    let summary = utils.createConnectorSummary(connObj); /* Create connector summary */

    return {
        data: connObj,
        summary: summary,
        fusebox
    };
}

// Function to create cables
lib.createCables = function(summary, input) {
    let useChassisTacho = input.use_chassis_tacho;
    let ecuID = input.ecu;

    let cableObj = utils.builder([
        cables.createChassisConnections(summary.auxiliary_outputs, ecuID, useChassisTacho), /* Chassis connections */
        cables.createInjectors(summary.injector_outputs, ecuID), /* Injector connections */
        cables.createIgnitionConnections(summary.ignition_outputs, ecuID), /* Ignition connections */
        cables.createAnalogConnections(summary.analog_inputs, ecuID), /* Analog inputs */
        cables.createTempConnections(summary.temp_inputs, ecuID), /* Temperature sensors */
        cables.createAuxConnections(summary.auxiliary_outputs, ecuID), /* Auxiliary outputs */
        cables.createTriggerConnection(summary.trigger_options[0], ecuID), /* Trigger connections */
        (input.can_devices.length > 1) ? cables.createCANConnection(summary.can_bus[0], ecuID) : null, /* CAN bus connections */
        (input.flex != null) ? cables.createFlexConnection(summary.digital_inputs, ecuID) : null, /* Flex Fuel Connection */
        cables.createGroundCables(ecuID), /* ECU ground connections */
        cables.createInsertCable(input),
        cables.createFuseboxCables(input)
    ]);

    return cableObj;
}

/* Function to create connections */
lib.createConnections = function(connectors, cables, input) {

    //const fusebox = connectors.fusebox;
    let chassisConnections = connections.createChassisConnections(cables[CABLE.ECU], connectors, CABLE.ECU, input.chassis);
    let usedAuxOutputs = (chassisConnections.length - 1) + connectors.summary.auxiliary_outputs.length;

    let usedDIs = (input.flex) ? 1 : 0;

    let connectionBuild = utils.connectionBuilder([
        connections.createFuseboxConnections(input, connectors),
        connections.createECUGrounds(input.ecu),
        connections.createInsertConnections(input.inserts, input.ecu, usedAuxOutputs, usedDIs), 
        chassisConnections,
        connections.createInjectorConnections(cables[CABLE.INJ], connectors, CABLE.INJ, input.chassis),
        connections.createIgnitionConnections(cables[CABLE.IGN], connectors, CABLE.IGN, input),
        connections.createAnalogConnections(cables[CABLE.ANALOG], connectors, CABLE.ANALOG),
        connections.createTempConnections(cables[CABLE.TEMP], connectors, CABLE.TEMP, input.clt, input.iat),
        connections.createAuxConnections(cables[CABLE.AUX], connectors, CABLE.AUX, input.chassis),
        connections.createTriggerConnection(cables[CABLE.TRIG], connectors, CABLE.TRIG, input.chassis),
        (input.can_devices.length > 1) ? connections.createCANConnections(cables[CABLE.CAN], connectors, CABLE.CAN, input.chassis) : null,
        (input.flex != null) ? connections.createFlexConnection(cables[CABLE.FLEX], connectors, CABLE.FLEX, input.chassis) : null
    ]);

    return connectionBuild;

}

module.exports = lib;

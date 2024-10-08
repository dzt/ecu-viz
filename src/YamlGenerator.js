const utils = require('./helpers/utils.js');
const _ = require('underscore');
const ecus = require('../definitions/ecus.json');

const { CABLE } = require('./helpers/constants.js');

const Connector = require('./Connector.js');
const Cables = require('./Cables.js');
const Connections = require('./Connections.js');

class YamlGenerator {

    constructor(input) {
        this.input = input;
        this.ecu = _.findWhere(ecus, { id: input.ecu });
        this.used_aux_outputs = []
        this.used_digital_inputs = []
        this.summary = null;
        this.cables = null;
        this.connectors = null;
    }

    createConnectors () {
        // Array to build connectors
        let connector = new Connector(this);
        let fusebox = connector.createFusebox();
        let buildArr = [
            connector.create(this.input.ecu, "ecu"), /* ECU connector */
            fusebox, /* Fusebox */
            connector.createECUGrounds(), /* ECU ground connections */
            connector.createChassisConnections(), /* Chassis connections */
            connector.createInsertConnections(), /* Insert Connectors */
            connector.create(this.input.tps, "tps"), /* Throttle position sensor connection */
            connector.createInjectorConnections(), /* Injector connections */
            connector.createIgnitionConnections(), /* Ignition connections */
            connector.createTempConnections(), /* Temperature sensors */
            connector.create(this.input.trigger, "trigger_options"), /* Trigger connector */
            connector.createMultipleConnections(this.input.auxiliary_options, "auxiliary_options"), /* Auxiliary outputs */
            connector.createMultipleConnections(this.input.analog_inputs, "analog_inputs"), /* Analog Inputs */
            connector.createCoilGrounds(), /* Ignition coil grounds */
            connector.createBattery(),
            /* Optional Cases */
            (this.input.flex != null) ? connector.create(this.input.flex, "flex_options") : null, /* Flex fuel connector if applicable */
            (this.input.idle_valve != null) ? connector.create(this.input.idle_valve, "stepper_valve_options") : null, /* Stepper Valve connector if applicable */
            (this.input.can_devices.length > 1) ? connector.createMultipleConnections(this.input.can_devices, "can_bus") : null /* CAN Devices */
        ];
    
        let connObj = utils.builder(buildArr); /* Build connectors */
        let summary = utils.createConnectorSummary(connObj); /* Create connector summary */

        this.summary = summary;
        this.connectors = {
            data: connObj,
            summary: summary,
            fusebox
        }
    
        return {
            data: connObj,
            summary: summary,
            fusebox
        };
    }

    createCables () {
        let cables = new Cables(this);
        let cableObj = utils.builder([
            cables.createChassisConnections(), /* Chassis connections */
            cables.createInjectors(), /* Injector connections */
            cables.createIgnitionConnections(), /* Ignition connections */
            cables.createAnalogConnections(), /* Analog inputs */
            cables.createTempConnections(), /* Temperature sensors */
            cables.createAuxConnections(), /* Auxiliary outputs */
            cables.createTriggerConnection(), /* Trigger connections */
            cables.createGroundCables(), /* ECU ground connections */
            cables.createFuseboxCables(),
            /* Optional Cases */
            cables.createInsertCable(), /* Inserts */
            cables.createCANConnection(), /* CAN bus connections */
            cables.createIdleValveConnection(), /* Stepper Valve connector if applicable */
            cables.createFlexConnection(), /* Flex Fuel Connection */
        ]);

        this.cables = cableObj;
        return cableObj;

    }

    createConnections () {
        let connections = new Connections(this);
        let chassisConnections = connections.createChassisConnections(this.cables[CABLE.ECU], this.connectors, CABLE.ECU, this.input.chassis);
        let usedAuxOutputs = (chassisConnections.length - 1) + this.connectors.summary.auxiliary_outputs.length;
        let usedDIs = (this.input.flex) ? 1 : 0;
        let connectionBuild = utils.connectionBuilder([
            connections.createFuseboxConnections(),
            connections.createECUGrounds(this.input.ecu),
            connections.createInsertConnections(this.input.inserts, this.input.ecu, usedAuxOutputs, usedDIs), 
            chassisConnections,
            connections.createInjectorConnections(this.cables[CABLE.INJ], this.connectors, CABLE.INJ, this.input.chassis),
            connections.createIgnitionConnections(this.cables[CABLE.IGN], this.connectors, CABLE.IGN, this.input),
            connections.createAnalogConnections(this.cables[CABLE.ANALOG], this.connectors, CABLE.ANALOG),
            connections.createTempConnections(this.cables[CABLE.TEMP], this.connectors, CABLE.TEMP, this.input.clt, this.input.iat),
            connections.createAuxConnections(this.cables[CABLE.AUX], this.connectors, CABLE.AUX, this.input.chassis),
            connections.createTriggerConnection(this.cables[CABLE.TRIG], this.connectors, CABLE.TRIG, this.input.chassis),
            (this.input.can_devices.length > 1) ? connections.createCANConnections(this.cables[CABLE.CAN], this.connectors, CABLE.CAN, this.input.chassis) : null,
            (this.input.flex != null) ? connections.createFlexConnection(this.cables[CABLE.FLEX], this.connectors, CABLE.FLEX, this.input.chassis) : null
        ]);
        return connectionBuild;
    }

    getAvailableAuxOutputs() {
        let allAuxOutputs = _.where(this.ecu.pinout, { type: 'auxiliary_output' });
        let diff = _.difference(allAuxOutputs, this.used_aux_outputs);
        return _.sortBy(diff, 'name');
    }

    getAvailableDIs() {
        let di_inputs = _.where(this.ecu.pinout, { type: 'digital_input' });
        let diff = _.difference(di_inputs, this.used_digital_inputs);
        return _.sortBy(diff, 'name');
    }

    updateAuxCounter (pin_detailed) {
        if (!(_.findWhere(this.used_aux_outputs, { pin: pin_detailed.pin }))) {
            this.used_aux_outputs.push(pin_detailed);
        }
    }

    updateDICounter (pin) {
        if (!(_.findWhere(this.used_digital_inputs, { pin: pin }))) {
            this.used_digital_inputs.push(pin);
        }
    }

    generateOutput() {
        return {
            connectors: this.createConnectors().data,
            cables: this.createCables(),
            connections: this.createConnections()
        }
    }

}

module.exports = YamlGenerator;

const utils = require('./helpers/utils.js');
const _ = require('underscore');
const ecus = require('../definitions/ecus.json');
const engines = require('../definitions/engines.json');

const { CABLE } = require('./helpers/constants.js');

const Connector = require('./Connector.js');
const Cables = require('./Cables.js');
const Connections = require('./Connections.js');

class YamlGenerator {

    constructor(input, connector_list) {
        this.input = input;
        this.ecu = _.findWhere(ecus, { id: input.ecu });
        this.used_aux_outputs = []
        this.used_digital_inputs = []
        this.used_analog_inputs = []
        this.connector_list = connector_list;

        // Injector Mode (Sequential, Semi-Sequential, Batch)
        const engine = _.findWhere(engines, { id: input.engine });
        this.injector_mode = input.injector_mode ?? 'sequential';
        this.injector_assignment = Array.from({length: engine.cylinders}, (_, i) => i + 1); // [1...n]
        if (this.injector_mode == 'semi-sequential') {
            this.injector_assignment = utils.getSemiSequentialSummary(engine.firing_order);
        } else if (this.injector_mode == 'batch') {
            this.injector_assignment = utils.getBatchSummary(engine.cylinders);
        }

        // Ignition Mode (Direct Fire or Wasted Spark)
        this.ignition_mode = input.ignition_mode ?? 'direct-fire';
        this.ignition_assignment = Array.from({length: engine.cylinders}, (_, i) => i + 1); // [1...n];
        if (this.ignition_mode == 'wasted-spark') {
            this.ignition_assignment = utils.getSemiSequentialSummary(engine.firing_order);
        }

        // Mandatory Connections
        this.fuel_pump_output = null;
        this.tach_output = null;
        
        // sorted properly in accordance to idle steps (if stepper) or [open, close] for 3-wire isc
        this.isc_pins = []

        // DBW Analog Inputs
        this.dbw_apps_pins = [];
        this.dbw_tb_pins = [];
        
        this.summary = null
        this.cables = null
        this.connectors = null
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
            (this.input.wideband_control != null) ? connector.create(this.input.wideband_control, "wideband_options") : null, /* Internal Wideband */
            (this.input.dbw != null) ? connector.create(this.input.dbw.pedal, "dbw_app_options") : null, /* DBW Pedal */
            (this.input.dbw != null) ? connector.create(this.input.dbw.throttle_body, "dbw_tb_options") : null, /* DBW Motor */
            (this.input.flex != null) ? connector.create(this.input.flex, "flex_options") : null, /* Flex fuel connector if applicable */
            (this.input.idle_valve != null) ? connector.create(this.input.idle_valve, "stepper_valve_options") : null, /* Stepper Valve connector if applicable */
            (this.input.can_devices.length > 0) ? connector.createMultipleConnections(this.input.can_devices, "can_bus") : null /* CAN Devices */
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
             /* Optional Cases */
            cables.createWidebandCables(),
            cables.createDBWCables(),
            cables.createInsertCable(), /* Inserts */
            cables.createCANConnection(), /* CAN bus connections */
            cables.createIdleValveConnection(), /* Stepper Valve connector if applicable */
            cables.createFlexConnection(), /* Flex Fuel Connection */,
            /* Default Cases */
            cables.createChassisConnections(), /* Chassis connections */
            cables.createInjectors(), /* Injector connections */
            cables.createIgnitionConnections(), /* Ignition connections */
            cables.createAnalogConnections(), /* Analog inputs */
            cables.createTempConnections(), /* Temperature sensors */
            cables.createAuxConnections(), /* Auxiliary outputs */
            cables.createTriggerConnection(), /* Trigger connections */
            cables.createGroundCables(), /* ECU ground connections */
            cables.createFuseboxCables()
        ]);

        this.cables = cableObj;
        return cableObj;

    }

    createConnections () {
        let connections = new Connections(this);
        let connectionBuild = utils.connectionBuilder([
            connections.createFuseboxConnections(),
            connections.createChassisConnections(),
            connections.createECUGrounds(),
            connections.createInsertConnections(), 
            connections.createWidebandConnections(),
            connections.createInjectorConnections(),
            connections.createIgnitionConnections(),
            connections.createAnalogConnections(),
            connections.createTempConnections(),
            connections.createAuxConnections(),
            connections.createTriggerConnection(),
            connections.createCANConnections(),
            connections.createFlexConnection(),
            connections.createIdleValveConnection(),
            connections.createDBWConnections()
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

    getAvailableAnalogInputs() {
        let analog_inputs = _.where(this.ecu.pinout, { type: 'analog_input' });
        let diff = _.difference(analog_inputs, this.used_analog_inputs);
        return _.sortBy(diff, 'name');
    }

    updateAnalogInputCounter (pin_detailed) {
        if (!(_.findWhere(this.used_analog_inputs, { pin: pin_detailed.pin }))) {
            this.used_analog_inputs.push(pin_detailed);
        }
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

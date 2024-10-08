const ecus = require('../definitions/ecus.json');
const connectorsDefinitions = require('../definitions/connector-list.json');
const inserts = require('../definitions/inserts.json');
const engines = require('../definitions/engines.json');
const utils = require('./helpers/utils.js');
const _ = require('underscore');

const { ECU_GROUND, FUSEBOX } = require('./helpers/constants.js');

class Connections {

    constructor(context) {
        this.context = context;
    }

    createFuseboxConnections () {

        let input = this.context.input;
        let connectors = this.context.connectors;

        let connList = [];
    
        let chassis12VPins = utils.getChassisAvailablePinsByType(input.chassis, 'switched_12v');
        let fb_switched12v = utils.getFuseBoxPin(connectors.fusebox.pn, 'switched_12v');
        let fb_ground = utils.getFuseBoxPin(connectors.fusebox.pn, 'ground');
    
        // Ignition Switch 12V+
        connList.push(connections.connectionHelper(
            [fb_switched12v.key, 'Fusebox Connections', chassis12VPins[0].name],
            [fb_switched12v.value, 1, chassis12VPins[0].pin]
        ))
    
        // Ground
        connList.push(connections.connectionHelper(
            [fb_ground.key, 'Fusebox Connections', 'BATTERY'],
            [fb_ground.value, 2, 2] // Battery, Pin 2 = Ground
        ))
    
        // Battery (Constant 12V+)
        let constant_pins = utils.getFuseBoxPins(connectors.fusebox.pn, 'battery_12v');
        for (let i = 0; i < constant_pins.length; i++) {
            connList.push(connections.connectionHelper(
                [constant_pins[i].key, 'Fusebox Connections', 'BATTERY'],
                [constant_pins[i].value, 3, 1] // Battery, Pin 1 = 12V+
            ))
        }
        
        // TODO: Optional Condition where Fuel Pump Trigger from ECU is needed
        
        return connList;
    }
    
    createChassisConnections (cableSetup, connectors, cableTitle, chassisCode) {
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
        let connList = [];
    
        const definedAuxOutputs = connectors.summary.auxiliary_outputs;
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
    
            const colorNumber = i + 1;
            let keys, values;
    
            let fbQuery = utils.getFuseBoxPin(connectors.fusebox.pn, 'main_12v');
    
            if (i === 0) {
                keys = [
                    ecuTitle,
                    cableTitle,
                    fbQuery.key
                ];
                values = [
                    _.findWhere(ecuPinout,{ type: 'power' }).pin,
                    colorNumber,
                    fbQuery.value
                ];
            } else {
                const chassisPinType = (i === 1) ? 'fuel_pump' : 'tacho'; // tacho, i == 2
                const auxPin = (definedAuxOutputs.length) + i;
                if (i == 2 && !(utils.getChassisPinByType(chassisCode, chassisPinType))) {
                    throw new Error('This chassis option does not have an auxiliary tachometer signal. Review your input, and try again.')
                }
                keys = [
                    ecuTitle,
                    cableTitle,
                    utils.getChassisPinByType(chassisCode, chassisPinType).name
                ];
                values = [
                    _.sortBy(_.where(ecuPinout, { type: 'auxiliary_output' }), 'name')[auxPin - 1].pin,
                    colorNumber,
                    utils.getChassisPinByType(chassisCode, chassisPinType).pin
                ];
            }
            const conn = connections.connectionHelper(keys, values);
            connList.push(conn);
        }
    
        return connList;
    
    };
    
    createInjectorConnections (cableSetup, connectors, cableTitle, chassisCode) {
        let connList = [];
        const injectorCount = cableSetup.wirecount - 1;
    
        // Extract necessary data
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
    
        // Sort injector list and retrieve injector part number and pinout
        const injectorList = _.sortBy(_.where(ecuPinout, { type: 'injector' }), 'name');
        const injectorPartNumber = _.findWhere(connectors.data, { type: 'injector' }).pn;
        const injectorPinout = _.findWhere(connectorsDefinitions.injectors, { part_number: injectorPartNumber }).pinout;
    
        // Retrieve injector pin for 12V and signal
        const injector12VPin = _.findWhere(injectorPinout, { type: 'switched_12v' }).pin;
        const injectorSignalPin = _.findWhere(injectorPinout, { type: 'signal' }).pin;
    
        let fbQuery = utils.getFuseBoxPin(connectors.fusebox.pn, 'main_12v');
    
        // Iterate through cable wires
        for (let i = 0; i < cableSetup.wirecount; i++) {
            const colorNumber = i + 1;
            let keys, values;
    
            if (i === 0) { // Connections for switched 12V source
                const available12VPins = utils.getChassisAvailablePinsByType(chassisCode, 'switched_12v');
                let loadPin = available12VPins[0].pin;
    
                // Create connections for each injector
                for (let j = 0; j < injectorCount; j++) {
    
                    // Determine load pin based on available pins
                    if (available12VPins.length === 2) loadPin = available12VPins[1].pin; // use 2nd available pin if there are only two sources
                    if (available12VPins.length >= 3) {
                        // use 2nd and 3rd 12v pin
                        loadPin = available12VPins[j < injectorCount / 2 ? 1 : 2];
                    }
    
                    keys = [
                        fbQuery.key,
                        cableTitle,
                        `Injector ${j + 1}`
                    ];
                    values = [
                        fbQuery.value,
                        colorNumber,    
                        injector12VPin
                    ];
                    // Add connection to the list
                    connList.push(connections.connectionHelper(keys, values));
                }
            } else { // Connections from ECU to injectors
                keys = [
                    ecuTitle,
                    cableTitle,
                    `Injector ${i}`
                ];
                values = [
                    injectorList[i - 1].pin,
                    colorNumber,
                    injectorSignalPin
                ];
                // Add connection to the list
                connList.push(connections.connectionHelper(keys, values));
            }
        }
        return connList;
    }
    
    createIgnitionConnections (cableSetup, connectors, cableTitle, input) {
        let connList = [];
    
        // Extract necessary data
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
    
        // Sort injector list and retrieve ignition coil part number and pinout
        const ignitionList = _.sortBy(_.where(ecuPinout, { type: 'ignition' }), 'name');
        const ignitionPartNumber = _.findWhere(connectors.data, { type: 'ignition' }).pn;
        let ignitionPinout = _.findWhere(connectorsDefinitions.ignition_coils, { part_number: ignitionPartNumber }).pinout;
    
        // Ignore Null Pins (IGF pins and unused pins for standalone applications)
        ignitionPinout = utils.removeNullPins(ignitionPinout);
    
        const selectedEngine = _.findWhere(engines, { id: input.engine });
        const engineType = selectedEngine.type;
        const engineCylinders = (engineType == "piston") ? selectedEngine.cylinders : selectedEngine.cylinders * 2;
        const ignitionCount = engineCylinders;
    
        let fbQuery = utils.getFuseBoxPin(connectors.fusebox.pn, 'ign_12v');
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
    
            if ((i == 0) ||
                (i == 1) ||
                (i == 2 && ignitionPinout.length != 3) ||
                ((i == 3) && (ignitionPinout.length > 4))) {
    
                // Ground and 12V+ Distribution
                for (let j = 0; j < ignitionCount; j++) {
    
                    let sourcePin;
                    if (i == 0) {
                        sourcePin = _.findWhere(ignitionPinout, { type: 'switched_12v'}).pin;
                    } else {
                        sourcePin = _.where(ignitionPinout, { type: 'ground'})[i - 1].pin;
                    }
    
                    let keys = [
                        (i == 0) ? fbQuery.key : `Coil Ground ${j + 1}`,
                        cableTitle,
                        `Ignition ${j + 1}`,
                    ]
                    let values = [
                        (i == 0) ? fbQuery.value : 1,
                        (i + 1),
                        sourcePin
                    ]
                    connList.push(connections.connectionHelper(keys, values));
    
                }
            } else {
                let ignitionNumber = (i - 2) + 1; // default values  (3-pin coil)
                if (ignitionPinout.length == 4) ignitionNumber = (i - 3) + 1; // 4-pin coil
                if (ignitionPinout.length == 5) ignitionNumber = (i - 4) + 1; // 5-pin coil
                let keys = [
                    ecuTitle,
                    cableTitle,
                    `Ignition ${ignitionNumber}`
                ]
                let values = [
                    ignitionList[ignitionNumber - 1].pin,
                    (i + 1),
                    _.findWhere(ignitionPinout, { type: 'signal' }).pin
                ]
                connList.push(connections.connectionHelper(keys, values));
            }
        }
        
        return connList;
    
    }
    
    createAnalogConnections (cableSetup, connectors, cableTitle) {
        let connList = [];
    
        // Extract necessary data
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
    
    
        let avaialbleAnalogInputs = Array.from(_.pluck(_.where(ecuPinout, { type: 'analog_input' }), 'name')); // Array Clone, used for ECUs with reserved TPS'
        let reservedTPSPin = _.findWhere(ecuPinout, { tps: true }) ? true : false;
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
            if (i == 0 || i == 1) { // Distribute 5v or Vref Ground to sensors
                for (let j = 0; j < (cableSetup.wirecount - 2); j++) {
    
                    let sensorDetails = _.findWhere(connectorsDefinitions.analog_inputs, { part_number: connectors.summary.analog_inputs[j].pn });
                    let multipleQuery = _.where(connectors.summary.analog_inputs, { pn: sensorDetails.part_number })
                    let isMultiple = false;
                    let multipleValue = 0;
    
                    if (multipleQuery.length > 1) {
                        let duplicateIndexs = utils.findAllDuplicatesInListOfObjects(connectors.summary.analog_inputs, 'pn')[0].indexes;
                        isMultiple = true;
                        for (let k = 0; k < duplicateIndexs.length; k++) {
                            if (duplicateIndexs[k] == j) multipleValue = k;
                        }
                    }
    
                    if (sensorDetails.pinout.length == 3) {
                        let type = (i == 0) ? 'vref' : 'vref_ground'
    
                        let keys = [
                            ecuTitle,
                            cableTitle,
                            (isMultiple) ? `${sensorDetails.name} (No. ${multipleValue + 1})` : sensorDetails.name
                        ]
                        let values = [
                            _.findWhere(ecuPinout, { type: type }).pin,
                            i + 1,
                            _.findWhere(sensorDetails.pinout, { type: type }).pin,
                        ]
                        connList.push(connections.connectionHelper(keys, values));
                    }
    
                }
            } else {
    
                // Distribute sensour outputs to ECU
                let sensorDetails = _.findWhere(connectorsDefinitions.analog_inputs, { part_number: connectors.summary.analog_inputs[i - 2].pn });
                let multipleQuery = _.where(connectors.summary.analog_inputs, { pn: sensorDetails.part_number })
                let isMultiple = false;
                let multipleValue = 0;
    
                let analog_input = _.sortBy(_.where(ecuPinout, { type: 'analog_input' }), 'name')[i - 2];
    
                if (multipleQuery.length > 1) {
                    isMultiple = true;
                    let duplicateIndexs = utils.findAllDuplicatesInListOfObjects(connectors.summary.analog_inputs, 'pn')[0].indexes;
                    for (let j = 0; j < duplicateIndexs.length; j++) {
                        if (duplicateIndexs[j] == (i - 2)) multipleValue = j;
                    }
                }
    
                    if (reservedTPSPin) {
                        if (sensorDetails.type == 'tps') {
                            // assign sensor to tps pin
                            analog_input = _.findWhere(ecuPinout, { tps: true });
                            avaialbleAnalogInputs = _.without(avaialbleAnalogInputs, analog_input.name)
                        } else {
                            // assign sensor to next avaialble pin (that isn't a tps pin)
                            for (let j = 0; j < avaialbleAnalogInputs.length; j++) {
                                let an_pin = _.findWhere(ecuPinout, { name: avaialbleAnalogInputs[j] })
                                if (!an_pin.tps) {
                                    analog_input = an_pin;
                                    avaialbleAnalogInputs = _.without(avaialbleAnalogInputs, an_pin.name)
                                }
                            }
                        }
                    }
    
                    let keys = [
                        ecuTitle,
                        cableTitle,
                        (isMultiple) ? `${sensorDetails.name} (No. ${multipleValue + 1})` : sensorDetails.name  // account for multiple
                    ]
                    let values = [analog_input.pin, i + 1, _.findWhere(sensorDetails.pinout, { type: 'signal' }).pin]
                    connList.push(connections.connectionHelper(keys, values));
    
            }
        }
    
        return connList;
        
    }
    
    createTempConnections (cableSetup, connectors, cableTitle, clt_pn, iat_pn) {
        let connList = [];
    
        // Extract necessary data
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
        
        const clts = connectorsDefinitions.clt_options;
        const iats = connectorsDefinitions.iat_options;
        let allTempSensors = clts.concat(iats);
    
        let tempSensorInput = connectors.summary.temp_inputs; // Selections picked by user
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
            if (i == 0) {
                // Distribute Signal Grounds to Temp Sensors
                for (let j = 0; j < (cableSetup.wirecount - 1); j++) {
                    let sensorDetails = _.findWhere(allTempSensors, { part_number: tempSensorInput[j].pn });
                    let keys = [ ecuTitle, cableTitle, sensorDetails.name ]
                    let values = [
                        _.findWhere(ecuPinout, { type: 'vref_ground' }).pin,
                        i + 1,
                        _.findWhere(sensorDetails.pinout, { type: 'vref_ground' }).pin,
                    ]
                    connList.push(connections.connectionHelper(keys, values));
                }
            } else {
                // Distribute sensor inputs to ECU
                let ecuPin = _.sortBy(_.where(ecuPinout, { type: 'temp' }), 'name')[i - 1];
                let sensorDetails = _.findWhere(allTempSensors, { part_number: tempSensorInput[i - 1].pn });
                
                // Special Case: Haltech ECUs, assign accordingly for IAT/CLT
                if (ecuPin.name.toLocaleLowerCase().indexOf('coolant') > -1) {
                    sensorDetails = _.findWhere(allTempSensors, { part_number: clt_pn });
                } else if (ecuPin.name.toLocaleLowerCase().indexOf('air') > -1) {
                    sensorDetails = _.findWhere(allTempSensors, { part_number: iat_pn });
                }
    
                let signalPin = _.findWhere(sensorDetails.pinout, { type: 'signal' }).pin
    
                let keys = [ ecuTitle, cableTitle, sensorDetails.name ]
                let values = [
                    ecuPin.pin,
                    i + 1,
                    signalPin,
                ]
                connList.push(connections.connectionHelper(keys, values));
    
            }
        }
    
        return connList;
    
    }
    
    createFlexConnection (cableSetup, connectors, cableTitle, chassisCode) {
    
        let connList = [];
         // Extracting ECU title and pinout
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
    
        // Finding device information based on part number
        let pn = _.findWhere(connectors.summary.digital_inputs, { type: 'flex_options' }).pn
        let flexSensor = _.findWhere(connectorsDefinitions.flex_options, { part_number: pn });
    
        const power_pin = utils.getChassisAvailablePinsByType(chassisCode, 'switched_12v')[0];
        let fbQuery = utils.getFuseBoxPin(connectors.fusebox.pn, 'main_12v');
    
        let sensor_pinout = flexSensor.pinout;
        let sensor_name = flexSensor.name;
    
        let firstDI = _.sortBy(_.where(ecuPinout, {type: 'digital_input'}), 'name')[0]
        
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
            let yamlIndex = i + 1;
            if (i == 0) { // For 12v
                let keys = [fbQuery.key, cableTitle, sensor_name];
                let values = [fbQuery.value, yamlIndex, _.findWhere(sensor_pinout, { type: 'switched_12v' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            } else if (i == 1) { // For ground (shared)
                let keys = [ECU_GROUND.CONNECTOR, cableTitle, sensor_name];
                let values = [1, yamlIndex, _.findWhere(sensor_pinout, { type: 'ground' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            } else if (i == 2) { // For CAN-H
                let keys = [ecuTitle, cableTitle, sensor_name];
                let values = [firstDI.pin, yamlIndex, _.findWhere(sensor_pinout, { type: 'signal' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            }
        }
    
        return connList;
    
    }
    
    createCANConnections (cableSetup, connectors, cableTitle, chassisCode) {
        let connList = [];
        
        // Extracting ECU title and pinout
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
    
        // Finding device information based on part number
        let pn = connectors.summary.can_bus[0].pn;
        let device = _.findWhere(connectorsDefinitions.can_bus, { part_number: pn });
        
        // Finding power pin based on chassis code
        const power_pin = utils.getChassisAvailablePinsByType(chassisCode, 'switched_12v')[0];
    
        let can_pinout = device.pinout;
        let can_name = device.name;
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
            let yamlIndex = i + 1;
            if (i == 0) { // For 12v
                let keys = [power_pin.name, cableTitle, can_name];
                let values = [power_pin.pin, yamlIndex, _.findWhere(can_pinout, { type: 'switched_12v' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            } else if (i == 1) { // For ground (shared)
                let keys = ['ECU Ground Terminal', cableTitle, can_name];
                let values = [1, yamlIndex, _.findWhere(can_pinout, { type: 'ground' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            } else if (i == 2) { // For CAN-H
                let keys = [ecuTitle, cableTitle, can_name];
                let values = [_.findWhere(ecuPinout, {type: 'can_h'}).pin, yamlIndex, _.findWhere(can_pinout, { type: 'can_h' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            } else { // For CAN-L
                let keys = [ecuTitle, cableTitle, can_name];
                let values = [_.findWhere(ecuPinout, {type: 'can_l'}).pin, yamlIndex, _.findWhere(can_pinout, { type: 'can_l' }).pin];
                connList.push(connections.connectionHelper(keys, values));
            }
        }
    
        return connList;   
    }
    
    
    createAuxConnections (cableSetup, connectors, cableTitle, chassisCode) {
        let connList = [];
    
        // Extract necessary data
        const ecuTitle = Object.keys(connectors.data)[0];
        const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
        let fbQuery = utils.getFuseBoxPin(connectors.fusebox.pn, 'main_12v');
    
        let summary = _.where(connectors.summary.auxiliary_outputs, { type: 'auxiliary_options' });
    
        console.log(summary)
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
            if (i == 0) {
                // Distribute 12V to Aux Outputs
                const available12VPins = utils.getChassisAvailablePinsByType(chassisCode, 'switched_12v');
                let availablePin = available12VPins[0]; // always use shared ecu 12v pin unless 4 pins or more are present
                if (available12VPins.length >= 4) availablePin = available12VPins[3]; // use 4th pin if readily avaialble
    
                for (let j = 0; j < (cableSetup.wirecount - 1); j++) {
                    
                    let auxDevice = summary[j];
                    let pinout = _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).pinout;
                    let auxName = _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).name;
                    let isMultiple = false;
                    let multipleVale = 0;
    
                    if (_.where(summary, { pn: auxDevice.pn }).length > 1) {
                        let duplicateIndexs = utils.findAllDuplicatesInListOfObjects(summary, 'pn')[0].indexes;
                        isMultiple = true;
                        for (let k = 0; k < duplicateIndexs.length; k++) {
                            if (duplicateIndexs[k] == j) multipleVale = k + 1;
                        }
                    }
    
                    let keys = [
                        fbQuery.key,
                        cableTitle,
                        (isMultiple) ? `${auxName} (No. ${multipleVale})`: auxName
                    ]
                    let values = [
                        fbQuery.value,
                        1, // always 1 as its 12v load
                        _.findWhere(pinout, { type: 'switched_12v' }).pin, // aux trigger pin
                    ]
                    connList.push(connections.connectionHelper(keys, values));
                }
            } else {
                // Distribute aux outputs to ECU
                let auxDevice = summary[i - 1];
           
                let pinout = _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).pinout;
                let auxName = _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).name;
                let isMultiple = false;
                let multipleVale = 0;
    
                if (_.where(summary, { pn: auxDevice.pn }).length > 1) {
                    let duplicateIndexs = utils.findAllDuplicatesInListOfObjects(summary, 'pn')[0].indexes;
                    isMultiple = true;
                    for (let j = 0; j < duplicateIndexs.length; j++) {
                        if (duplicateIndexs[j] == (i - 1)) multipleVale = j + 1;
                    }
                }
    
                let keys = [
                    ecuTitle,
                    cableTitle,
                    (isMultiple) ? `${auxName} (No. ${multipleVale})`: auxName
                ]
    
                let values = [
                    _.sortBy(_.where(ecuPinout, { type: 'auxiliary_output' }), 'name')[i - 1].pin,
                    i + 1,
                    _.findWhere(pinout, { type: 'signal' }).pin
                ]
                connList.push(connections.connectionHelper(keys, values));
            }
        }
    
        return connList;
    }
    
    createTriggerConnection (cableSetup, connectors, cableTitle, chassisCode) {
    
        let connList = [];
    
        for (let i = 0; i < cableSetup.wirecount; i++) {
    
            let triggerPn = connectors.summary.trigger_options[0].pn
            const ecuTitle = Object.keys(connectors.data)[0];
            const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
            const triggerPinout = _.findWhere(connectorsDefinitions.trigger_options, { part_number: triggerPn }).pinout
            const triggerTitle = _.findWhere(connectorsDefinitions.trigger_options, { part_number: triggerPn }).name;
            const pinType = triggerPinout[i].type;
    
            const available12VPins = utils.getChassisAvailablePinsByType(chassisCode, 'switched_12v');
            let availablePin = available12VPins[0]; // always use shared ecu 12v pin unless 4 pins or more are present
            if (available12VPins.length >= 4) availablePin = available12VPins[3]; // use 4th pin if readily avaialble
    
            let sourceValue;
            if (pinType == 'switched_12v') {
                sourceValue = availablePin.pin
            } else {
                // Determine ecu grounding method
                if (_.findWhere(ecuPinout, { type: pinType})) {
                    // ecu has a pin unique to this connection so assign it
                    sourceValue = _.findWhere(ecuPinout, { type: pinType}).pin
                } else {
                    // use shield ground pin on ecu which branches off to bother connection if aplicable
                    sourceValue = _.findWhere(ecuPinout, { type: 'shield_ground'}).pin
                }
            }
    
            let keys = [
                (pinType == 'switched_12v') ? availablePin.name : ecuTitle, // switched 12v conn name on chassis or ecu
                cableTitle,
                triggerTitle
            ]
            let values = [
                sourceValue, // chassis 12v pin to or ecu pin number
                i + 1,
                triggerPinout[i].pin
            ]
            connList.push(connections.connectionHelper(keys, values));
        }
        return connList;
    }
    
    createECUGrounds () {
        let ecuID = this.context.ecu.id;
        let connList = [];
        const groundPins = _.where(_.findWhere(ecus, { id: ecuID }).pinout, { type: 'ground' })
        for (let i = 0; i < groundPins.length; i++) {
            let keys = [_.findWhere(ecus, { id: ecuID }).name, ECU_GROUND.CABLE, ECU_GROUND.CONNECTOR]
            let values = [groundPins[i].pin, (i + 1), (i + 1)]
            connList.push(connections.connectionHelper(keys, values));
        }
        return connList;
    }
    
    createInsertConnections (insert_ids, ecuID, usedAuxOutputs, usedDIs) {
        
        let ioCount = {
            aux: usedAuxOutputs,
            di: usedDIs
        }
    
        let connList = [];
        for (let i = 0; i < insert_ids.length; i++) {
            let insert = _.findWhere(inserts, { id: insert_ids[i] });
            for (j = 0; j < insert.connections.length; j++) {
                let connection = insert.connections[j];
    
                let source = utils.autoPopulateInsert(connection[0], ecuID, ioCount)
                ioCount = source.io; // Update Counter
    
                let dest = utils.autoPopulateInsert(connection[1], ecuID, ioCount)
                ioCount = dest.io; // Update Counter
    
                let keys = [source.connector, insert.name, dest.connector]
                let values = [source.pin, j + 1, dest.pin]
                connList.push(connections.connectionHelper(keys, values));
    
            }
        }
        return connList;
    }
    
    connectionHelper (keys, values) {
        const conn = [];
        const source = {};
        source[keys[0]] = values[0];
        conn.push(source);
    
        const cable = {};
        cable[keys[1]] = values[1];
        conn.push(cable);
    
        const destination = {};
        destination[keys[2]] = values[2];
        conn.push(destination);
    
        return conn;
    };

}

module.exports = Connections;
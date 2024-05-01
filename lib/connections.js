const ecus = require('../definitions/ecus.json');
const connectorsDefinitions = require('../definitions/connector-list.json');
const utils = require('./utils.js');
const _ = require('underscore');

const connections = {};

connections.createChassisConnections = function(cableSetup, connectors, cableTitle, chassisCode) {
    const ecuTitle = Object.keys(connectors.data)[0];
    const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;
    const connList = [];

    const definedAuxOutputs = connectors.summary.auxiliary_outputs;

    for (let i = 0; i < cableSetup.wirecount; i++) {
        const colorNumber = i + 1;
        let keys, values;

        if (i === 0) {
            keys = [
                ecuTitle,
                cableTitle,
                utils.getChassisPinByType(chassisCode, 'switched_12v').name
            ];
            values = [
                _.findWhere(ecuPinout,{ type: 'power' }).pin,
                colorNumber,
                utils.getChassisPinByType(chassisCode, 'switched_12v').pin
            ];
        } else if (i === 1 || i === 2) {
            const chassisPinType = (i === 1) ? 'fuel_pump' : 'tacho';
            const auxPin = (definedAuxOutputs.length) + (i === 1 ? 1 : 2);
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

connections.createInjectorConnections = function (cableSetup, connectors, cableTitle, chassisCode) {
    const connList = [];
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
                    loadPin = available12VPins[j < injectorCount / 2 ? 1 : 2].pin;
                }

                keys = [
                    utils.getChassisPinByType(chassisCode, 'switched_12v').name,
                    cableTitle,
                    `Injector ${j + 1}`
                ];
                values = [
                    loadPin,
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

connections.createIgnitionConnections = function (cableSetup, connectors, cableTitle) {
    const connList = [];

    // Extract necessary data
    const ecuTitle = Object.keys(connectors.data)[0];
    const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;

    // Sort injector list and retrieve ignition coil part number and pinout
    const ignitionList = _.sortBy(_.where(ecuPinout, { type: 'ignition' }), 'name');
    const ignitionPartNumber = _.findWhere(connectors.data, { type: 'ignition' }).pn;
    const ignitionPinout = _.findWhere(connectorsDefinitions.ignition_coils, { part_number: ignitionPartNumber }).pinout;

    const ignitionCount = ignitionList.length;

    for (let i = 0; i < cableSetup.wirecount; i++) {
        if ((i == 0) || (i == 1) || (i == 2 && ignitionPinout.length != 3) || ((i == 3) && (ignitionPinout.length > 4))) {
            // Ground and 12V+ Distribution
            for (let j = 0; j < ignitionCount; j++) {

                let sourcePin;
                if (i == 0) {
                    sourcePin = _.findWhere(ignitionPinout, { type: 'switched_12v'}).pin;
                } else {
                    sourcePin = _.where(ignitionPinout, { type: 'ground'})[i - 1].pin;
                }

                let keys = [
                    (i == 0) ? 'Ignition Coil Relay' : `Coil Ground ${j + 1}`,
                    cableTitle,
                    `Ignition ${j + 1}`,
                ]
                let values = [
                    1, (i + 1), sourcePin
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

connections.createAnalogConnections = function (cableSetup, connectors, cableTitle) {
    const connList = [];

    // Extract necessary data
    const ecuTitle = Object.keys(connectors.data)[0];
    const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;

    for (let i = 0; i < cableSetup.wirecount; i++) {
        if (i == 0 || i == 1) { // Distribute 5v or vref ground to sensors
            for (let j = 0; j < (cableSetup.wirecount - 2); j++) {

                let sensorDetails = _.findWhere(connectorsDefinitions.analog_inputs, { part_number: connectors.summary.analog_inputs[j].pn });
                let multipleQuery = _.where(connectors.summary.analog_inputs, { pn: sensorDetails.part_number })
                let isMultiple = false;
                let multipleVale = 0;

                if (multipleQuery.length > 1) {
                    let duplicateIndexs = utils.findAllDuplicatesInListOfObjects(connectors.summary.analog_inputs, 'pn')[0].indexes;
                    isMultiple = true;
                    for (let k = 0; k < duplicateIndexs.length; k++) {
                        if (duplicateIndexs[k] == j) multipleVale = j;
                    }
                }

                if (sensorDetails.pinout.length == 3) {
                    let type = (i == 0) ? 'vref' : 'vref_ground'

                    let keys = [
                        ecuTitle,
                        cableTitle,
                        (isMultiple) ? `${sensorDetails.name} (No. ${multipleVale})` : sensorDetails.name
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
            let multipleVale = 0;

            if (multipleQuery.length > 1) {
                let duplicateIndexs = utils.findAllDuplicatesInListOfObjects(connectors.summary.analog_inputs, 'pn')[0].indexes;
                isMultiple = true;
                for (let j = 0; j < duplicateIndexs.length; j++) {
                    if (duplicateIndexs[j] == (i - 2)) multipleVale = j + 1;
                }
            }

            let keys = [
                ecuTitle,
                cableTitle,
                (isMultiple) ? `${sensorDetails.name} (No. ${multipleVale})` : sensorDetails.name  // account for multiple
            ]
            let values = [
                _.sortBy(_.where(ecuPinout, { type: 'analog_input' }), 'name')[i - 2].pin,
                i + 1,
                _.findWhere(sensorDetails.pinout, { type: 'signal' }).pin,
            ]

            connList.push(connections.connectionHelper(keys, values));
        }
    }

    return connList;
    
}

connections.createTempConnections = function (cableSetup, connectors, cableTitle) {
    const connList = [];

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
            // Distribute sensour outputs to ECU
            let sensorDetails = _.findWhere(allTempSensors, { part_number: tempSensorInput[i - 1].pn });
            let keys = [ ecuTitle, cableTitle, sensorDetails.name ]
            let values = [
                _.sortBy(_.where(ecuPinout, { type: 'temp' }), 'name')[i - 1].pin,
                i + 1,
                _.findWhere(sensorDetails.pinout, { type: 'signal' }).pin,
            ]
            connList.push(connections.connectionHelper(keys, values));
        }
    }

    return connList;

}

connections.createAuxConnections = function (cableSetup, connectors, cableTitle, chassisCode) {
    const connList = [];

    // Extract necessary data
    const ecuTitle = Object.keys(connectors.data)[0];
    const ecuPinout = _.findWhere(ecus, { name: ecuTitle }).pinout;

    for (let i = 0; i < cableSetup.wirecount; i++) {
        if (i == 0) {
            // Distribute 12V to Aux Outputs
            const available12VPins = utils.getChassisAvailablePinsByType(chassisCode, 'switched_12v');
            let availablePin = available12VPins[0]; // always use shared ecu 12v pin unless 4 pins or more are present
            if (available12VPins.length >= 4) availablePin = available12VPins[3]; // use 4th pin if readily avaialble

            for (let j = 0; j < (cableSetup.wirecount - 1); j++) {
                let auxDevice = connectors.summary.auxiliary_outputs[j];
                let pinout = _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).pinout;
                let keys = [
                    availablePin.name, // chassis connector name with 12v source
                    cableTitle,
                    _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).name // aux output name
                ]
                let values = [
                    availablePin.pin, // chassis 12v pin selection
                    1, // always 1 as its 12v load
                    _.findWhere(pinout, { type: 'switched_12v' }).pin, // aux trigger pin
                ]
                connList.push(connections.connectionHelper(keys, values));
            }
        } else {
            // Distribute aux outputs to ECU
            let auxDevice = connectors.summary.auxiliary_outputs[i -1];
            let pinout = _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).pinout;
            let keys = [
                ecuTitle, cableTitle, _.findWhere(connectorsDefinitions.auxiliary_options, { part_number: auxDevice.pn }).name
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

connections.createTriggerConnection = function (cableSetup, connectors, cableTitle, chassisCode) {

    const connList = [];

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

connections.createECUGrounds = function (ecuID) {
    const connList = [];
    const groundPins = _.where(_.findWhere(ecus, { id: ecuID }).pinout, { type: 'ground' })
    for (let i = 0; i < groundPins.length; i++) {
        let keys = [
            _.findWhere(ecus, { id: ecuID }).name,
            'ECU Ground(s)',
            'ECU Ground Terminal'
        ]
        let values = [groundPins[i].pin, (i + 1), (i + 1)]
        connList.push(connections.connectionHelper(keys, values));
    }
    return connList;
}


connections.connectionHelper = function(keys, values) {
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

module.exports = connections;

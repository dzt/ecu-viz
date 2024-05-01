const _ = require('underscore');

const ecus = require('../definitions/ecus.json');
const connectors = require('../definitions/connector-list.json');
const chassis = require('../definitions/chassis.json');
const engines = require('../definitions/engines.json');

let connector = {};

connector.create = function(partNumber, type) {
    let pins;
    if (type == "ecu") {
        let ecu = _.findWhere(ecus, { id: partNumber });
        pins = _.pluck(_.sortBy(ecu.pinout, 'pin'), 'name');
    } else {
        if (type == "tps") type = "analog_inputs"; // read tps value from analog inputs
        pins = _.pluck(_.findWhere(connectors[type], {
            part_number: partNumber
        }).pinout, 'name');
    }

    return {
        type: type,
        key: (type == "ecu") ? _.findWhere(ecus, { id: partNumber }).name : _.findWhere(connectors[type], { part_number: partNumber }).name,
        pn: partNumber,
        hide_disconnected_pins: (type == "ecu") ? true : false,
        pinlabels: pins,
        bgcolor: (type == "ecu") ? '#ADD8E6' : '#FFFFFF'
    }
}

connector.createECUGrounds = function(ecu_id) {
    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let groundPins = _.where(ecuPinout, { type: 'ground' })
    return {
        type: 'ecu-grounds',
        key: 'ECU Ground Terminal',
        hide_disconnected_pins: false,
        pincount: groundPins.length
    }
}

connector.createChassisConnections = function(chassis_id) {
    // Look into chassis definitions file and add all the connectors in the definition file
    let list = []
    let connectorIDs = _.findWhere(chassis, { id: chassis_id }).chassis_connectors
    for (let i = 0; i < connectorIDs.length; i++) {
        let connector_id = connectorIDs[i];
        let chassisConnector = _.findWhere(connectors.chassis_options, { name: connector_id });
        let connector = {
            key: chassisConnector.name,
            type: 'chassis_connection',
            pn: connector_id,
            hide_disconnected_pins: false,
            pinlabels: _.pluck(chassisConnector.pinout, 'name'),
            bgcolor: '#E5FFCC'
        }
        list.push(connector);
    }
    return list;
}

connector.createInjectorConnections = function(partNumber, engineType) {
    let list = []
    let engine = _.findWhere(engines, { id: engineType });
    let injector = _.findWhere(connectors.injectors, { part_number: partNumber });
    let injectorCount = engine.cylinders;
    if (engine.type == "rotary") injectorCount *= 2;
    for (let i = 0; i < injectorCount; i++) {
        list.push({
            key: `Injector ${i + 1}`,
            type: 'injector',
            pn: partNumber,
            hide_disconnected_pins: false,
            pinlabels: _.pluck(injector.pinout, 'name')
        })
    }
    return list;
}

connector.createIgnitionConnections = function(partNumber, engineType) {
    let list = []
    let engine = _.findWhere(engines, { id: engineType });
    let coil = _.findWhere(connectors.ignition_coils, { part_number: partNumber });
    let coilCount = engine.cylinders;
    if (engine.type == "rotary") coilCount *= 2;
    for (let i = 0; i < coilCount; i++) {
        list.push({
            key: `Ignition ${i + 1}`,
            type: 'ignition',
            pn: partNumber,
            hide_disconnected_pins: false,
            pinlabels: _.pluck(coil.pinout, 'name')
        })
    }
    return list;
}

connector.createTempConnections = function(clt_pn, iat_pn) {
    let list = []
    for (let i = 0; i < 2; i++) {
        let obj;
        if (i == 0) obj = _.findWhere(connectors.clt_options, { part_number: clt_pn })
        if (i == 1) obj = _.findWhere(connectors.iat_options, { part_number: iat_pn })
        list.push({
            key: obj.name,
            type: 'temp',
            pn: obj.part_number,
            hide_disconnected_pins: false,
            pinlabels: _.pluck(obj.pinout, 'name')
        })
    }
    return list;
}

connector.createMultipleConnections = function(partNumbers, type) {
    let list = []
    for (let i = 0; i < partNumbers.length; i++) {
        let conn = connector.create(partNumbers[i], type);
        conn.index = i;
        list.push(conn);
    }
    return connector.clean(list);
}

connector.createCoilGrounds = function(engineType) {
    let list = []
    let engine = _.findWhere(engines, { id: engineType });
    let count = engine.cylinders;
    if (engine.type == "rotary") count *= 2;
    for (let i = 0; i < count; i++) {
        list.push({
            key: `Coil Ground ${i + 1}`,
            type: 'ground',
            pn: 'gnd',
            hide_disconnected_pins: true,
            pincount: 1
        })
    }
    return connector.clean(list);
}

connector.clean = function(arr) {
    for (let i = 0; i < arr.length; i++) {
        let where = _.where(arr, { key: arr[i].key });
        if (where.length > 1) {
            for (let j = 0; j < where.length; j++) {
                let indexToModify = where[j].index;
                arr[indexToModify].key = `${arr[indexToModify].key} (No. ${j + 1})`
            }
        }
    }
    return arr;
}

module.exports = connector;
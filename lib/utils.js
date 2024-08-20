let utils = {};
const colors = require('../definitions/colors.json')
const _ = require('underscore');

const { IGN_RELAY } = require('../lib/constants.js');

const chassis = require('../definitions/chassis.json');
const connectors = require('../definitions/connector-list.json');
const ecus = require('../definitions/ecus.json');

utils.createConnectorSummary = function(connectorList) {

    let auxiliary_outputs = [];
    let analog_inputs = [];
    let digital_inputs = [];
    let injector_outputs = [];
    let ignition_outputs = [];
    let temp_inputs = [];
    let can_bus = [];
    let trigger_options = [];

    for (const key in connectorList) {
        let type = connectorList[key].type;
        switch(type) {
            case 'analog_inputs':
                analog_inputs.push(connectorList[key]);
                break;
            case 'injector':
                injector_outputs.push(connectorList[key]);
                break;
            case 'temp':
                temp_inputs.push(connectorList[key]);
                break;
            case 'flex_options':
                digital_inputs.push(connectorList[key]);
                break;
            case 'trigger_options':
                trigger_options.push(connectorList[key]);
                break;
            case 'auxiliary_options':
                auxiliary_outputs.push(connectorList[key]);
                break;
            case 'ignition':
                ignition_outputs.push(connectorList[key]);
                break;
            case 'can_bus':
                can_bus.push(connectorList[key]);
                break;
        }
    }
    return { auxiliary_outputs, analog_inputs, digital_inputs, injector_outputs, ignition_outputs, temp_inputs, can_bus, trigger_options }
}

utils.parseColor = function(color) {
    if (color.includes('/')) {
        let colorSplit = color.split('/');
        let primaryColor = _.findWhere(colors, { id: colorSplit[0] }).hex_code
        let secondaryColor = _.findWhere(colors, { id: colorSplit[1] }).hex_code
        return `${primaryColor}:${secondaryColor}`
    }
    return _.findWhere(colors, { id: color }).hex_code
}

utils.builder = function(inputs) {
    let obj = {}
    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        if (input != null) {
            if (!Array.isArray(input)) {
                let key = input.key;
                obj[key] = input;
                delete obj[key].key;
            } else {
                for (let j = 0; j < input.length; j++) {
                    let input_j = input[j];
                    let key = input_j.key;
                    obj[key] = input_j;
                    delete obj[key].key;
                    delete obj[key].index;
                }
            }
        }
    }
    return obj;
}

utils.connectionBuilder = function(arr) {
    let list = []
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] != null) {
            for (let j = 0; j < arr[i].length; j++) {
                list.push(arr[i][j]);
            }
        } 
    }
    return list;
}

utils.getChassisConnectors = function(chassisCode) {
    let chassisConnectors = _.findWhere(chassis, { id: chassisCode}).chassis_connectors;
    let pinoutList = [];
    for (let i = 0; i < chassisConnectors.length; i++) {
        let connector = _.findWhere(connectors.chassis_options, { name: chassisConnectors[i] });
        pinoutList.push(connector);
    }
    return pinoutList;
}

utils.getChassisPinByType = function(chassisCode, type) {
    let connectors = utils.getChassisConnectors(chassisCode);
    for (let i = 0; i < connectors.length; i++) {
        let connector = connectors[i];
        for (let j = 0; j < connector.pinout.length; j++) {
            let connType = connector.pinout[j].type;
            if (connType == type) return {
                name: connector.name,
                pin: connector.pinout[j].pin
            }
        }
    }
    return null;
}

utils.getChassisAvailablePinsByType = function(chassisCode, type) {
    let connectors = utils.getChassisConnectors(chassisCode);
    let list = [];
    for (let i = 0; i < connectors.length; i++) {
        let connector = connectors[i];
        for (let j = 0; j < connector.pinout.length; j++) {
            let connType = connector.pinout[j].type;
            if (connType == type) {
                list.push({
                    name: connector.name,
                    pin: connector.pinout[j].pin
                })
            }
        }
    }
    return list;
}

utils.isMultiConnectorECU = function(ecuTitle) {
    let ecuDefinition = _.findWhere(ecus, { name: ecuTitle });
    let ecuPinout = ecuDefinition.pinout;
    if (Array.isArray(ecuPinout[0])) return true;
    return false;
}

utils.arrSplit = function(arr) {
    let temp = arr.splice(0,arr.length/2);
    let splitted = [...arr , ...temp];
    return splitted;
}

// Predefined Entries
utils.getRelay = function() {
    
    let connector = {
        key: IGN_RELAY.KEY,
        type: IGN_RELAY.TYPE,
        pn: IGN_RELAY.PART_NUMBER,
        hide_disconnected_pins: false,
        pinlabels: IGN_RELAY.PINLABELS
    }

    let cable = {
        color_code: 'DIN',
        wirecount: 1,
        gauge: '0.25 mm2',
        show_equiv: true,
        colors: [
            utils.parseColor('R/Y'),
            utils.parseColor('B'),
            utils.parseColor('L'),
            utils.parseColor('R')
        ]
    }
    return { connector, cable }
    
}

utils.getGround = function() {
    let connector = {
        key: 'Engine Ground',
        type: 'ground',
        pn: 'gnd',
        hide_disconnected_pins: true,
        pincount: 1
    }
    let cable = {
        color_code: 'DIN',
        wirecount: 1,
        gauge: '0.25 mm2',
        show_equiv: true,
        colors: _.findWhere(colors, { name: 'black' }).hex_code
    }
    return { connector, cable }
}

utils.createCoilGrounds = function(numberOfCoils) {
    let list = [];
    for (let i = 0; i < numberOfCoils; i++) {
        let connector = {
            key: `Coil Ground ${i + 1}`,
            type: 'ground',
            pn: 'gnd',
            hide_disconnected_pins: true,
            pincount: 1
        }
        let cable = {
            color_code: 'DIN',
            wirecount: 1,
            gauge: '0.25 mm2',
            show_equiv: true,
            colors: _.findWhere(colors, { name: 'black' }).hex_code
        }
        list.push({ connector, cable })
    }
    return list;
}

utils.findAllDuplicatesInListOfObjects = function(list, prop) {
    const duplicates = [];
    const len = list.length;
    for (let i = 0; i < len - 1; i++) {
      for (let j = i + 1; j < len; j++) {
        if (list[i][prop] === list[j][prop]) {
          const index = duplicates.findIndex(e => e[prop] === list[i][prop]);
          if (index != -1) {
            if (!duplicates[index].indexes.includes(j)) {
              duplicates[index].indexes.push(j);
            }
          } else {
            duplicates.push({
              indexes: [i, j],
              [prop]: list[i][prop],
            });
          }
        }
      }
    }
    return duplicates;
}

utils.getECUSummary = function(id, isDetailed) {
    const pinout = _.findWhere(ecus, { id }).pinout;
    let summary = {
        analog_inputs: _.where(pinout, { type: "analog_input" }),
        auxiliary_outputs: _.where(pinout, { type: "auxiliary_output" }),
        digital_inputs: _.where(pinout, { type: "digital_input" }),
        injector_outputs: _.where(pinout, { type: "injector" }),
        ignition_outputs: _.where(pinout, { type: "ignition" }),
    }
    return {
        analog_inputs: (isDetailed) ? summary.analog_inputs : summary.analog_inputs.length,
        auxiliary_outputs: (isDetailed) ? summary.auxiliary_outputs : summary.auxiliary_outputs.length,
        digital_inputs: (isDetailed) ? summary.digital_inputs : summary.digital_inputs.length,
        injector_outputs: (isDetailed) ? summary.injector_outputs : summary.injector_outputs.length,
        ignition_outputs: (isDetailed) ? summary.ignition_outputs : summary.ignition_outputs.length,
    }
}

utils.removeNullPins = function(pinout) {
    let newArr = [];
    for (let i = 0; i < pinout.length; i++) {
        if (pinout[i].type != null) newArr.push(pinout[i]);
    }
    return newArr;
}

utils.autoPopulateInsert = function(connection, ecuID, io) {
    let connector, pin;
    let ecuQuery = _.findWhere(ecus, { id: ecuID });
    if (typeof connection == 'object') {
        connector = Object.keys(connection)[0];
        pin = connection[connector]
    } else {
        connector = ecuQuery.name
        if (connection == 'digital_input') {
            pin = _.sortBy(_.where(ecuQuery.pinout, { type: connection }), 'name')[io.di].pin
            io.di += 1;
        } else if (connection == 'auxiliary_output') {
            pin = _.sortBy(_.where(ecuQuery.pinout, { type: connection }), 'name')[io.aux].pin
            io.aux += 1;
        } else {
            pin = _.findWhere(ecuQuery.pinout, { type: connection }).pin
        }
    }
    return { connector, pin, io }
}

module.exports = utils;
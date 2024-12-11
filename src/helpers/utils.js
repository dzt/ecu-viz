let utils = {};
const colors = require('../../definitions/colors.json');
const _ = require('underscore');

const { FUSEBOX } = require('./constants.js');

const chassis = require('../../definitions/chassis.json');
const connectors = require('../../definitions/connector-list.json');
const ecus = require('../../definitions/ecus.json');

utils.createConnectorSummary = function(connectorList) {

    let auxiliary_outputs = [];
    let analog_inputs = [];
    let digital_inputs = [];
    let injector_outputs = [];
    let ignition_outputs = [];
    let temp_inputs = [];
    let can_bus = [];
    let trigger_options = [];
    let idle_valves = [];

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
            case 'stepper_valve_options':
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
    return { auxiliary_outputs, analog_inputs, digital_inputs, injector_outputs, ignition_outputs, temp_inputs, can_bus, trigger_options, idle_valves }
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

utils.autoPopulateInsert = function(connection, ecuID, color) {
    let connector, pin;
    let ecuQuery = _.findWhere(ecus, { id: ecuID });
    if (typeof connection == 'object') {
        connector = Object.keys(connection)[0];
        pin = connection[connector]
    } else {
        connector = ecuQuery.name
        if (connection == 'digital_input') {
            pin = _.findWhere(ecuQuery.pinout, { type: connection, color: color }).pin
        } else if (connection == 'auxiliary_output') {
            pin = _.findWhere(ecuQuery.pinout, { type: connection, color: color }).pin
        } else {
            pin = _.findWhere(ecuQuery.pinout, { type: connection }).pin
        }
    }
    return { connector, pin }
}

utils.getFuseBoxPin = function(fusebox_pn, pin_type) {
    let fuseboxQuery = _.findWhere(FUSEBOX, { PART_NUMBER: fusebox_pn });
    let pin = _.findWhere(fuseboxQuery.PINLABELS, { type: pin_type });
    return {
        key: fusebox_pn,
        value: _.indexOf(fuseboxQuery.PINLABELS, pin) + 1
    }
}

utils.getFuseBoxPins = function(fusebox_pn, pin_type) {
    let pinList = [];
    let fuseboxQuery = _.findWhere(FUSEBOX, { PART_NUMBER: fusebox_pn });
    let pins = _.where(fuseboxQuery.PINLABELS, { type: pin_type });
    for (let i = 0; i < pins.length; i++) {
        pinList.push({
            key: fusebox_pn,
            value: _.indexOf(fuseboxQuery.PINLABELS, pins[i]) + 1
        });
    }
    return pinList;
}

utils.createColoredWireLabels = function(colorList) {
    let parsedList = [];
    for (let i = 0; i < colorList.length; i++) {
        if (colorList[i].indexOf(':') > -1) {
            let col_1 = _.findWhere(colors, { hex_code: colorList[i].split(':')[0] }).name
            let col_2 = _.findWhere(colors, { hex_code: colorList[i].split(':')[1] }).name
            parsedList.push(`(${capitalize(col_1)}/${capitalize(col_2)})`);
        } else {
            parsedList.push(`(${capitalize(_.findWhere(colors, { hex_code: colorList[i] }).name)})`);
        }
    }
    return parsedList;
}

utils.countIdleSteps = function(pinout) {
    let types = ['step_1', 'step_2', 'step_3', 'step_4'];
    let count = 0;
    for (let i = 0; i < pinout.length; i++) {
        if (types.includes(pinout[i].type)) count++;
    }
    return count;
}

utils.getECUStepperPins = function(ecuPinout) {
    let stepperPins = [];
    for (let i = 0; i < ecuPinout.length; i++) {
        let pinType = ecuPinout[i].type;
        if (pinType && (pinType.indexOf('step_') > -1)) {
            stepperPins.push(ecuPinout[i]);
        }
    }
    return stepperPins;
}

utils.hexToShort = function(color) {
    if (color.indexOf(':') > -1) {
        let col_1 = _.findWhere(colors, { hex_code: color.split(':')[0] }).id
        let col_2 = _.findWhere(colors, { hex_code: color.split(':')[1] }).id
        return `${col_1}/${col_2}`
    } else {
        return `${_.findWhere(colors, { hex_code: color }).id}`
    }
}

utils.getIOList = function(connections, id) {
    let ecu = _.findWhere(ecus, { id });
    let ecuTitle = ecu.name;
    let io_list = [];
    let io_complete = [];
    for (let i = 0; i < connections.length; i++) {
        let connection = connections[i];
        if (Object.keys(connection[0])[0] == ecuTitle) {
            let existing_entry = _.findWhere(io_list, { pin: connection[0][ecuTitle] });
            if (!existing_entry) {
                io_list.push({
                    pin: connection[0][ecuTitle],
                    color: _.findWhere(ecu.pinout, { pin: connection[0][ecuTitle] }).color,
                    description: _.findWhere(ecu.pinout, { pin: connection[0][ecuTitle] }).name,
                    connection: `${Object.keys(connection[2])[0]} (Pin ${connection[2][Object.keys(connection[2])[0]]})`
                })
            } else {
                // Modify io_list for repeating inputs
                let entry = `${Object.keys(connection[2])[0]} (Pin ${connection[2][Object.keys(connection[2])[0]]})`
                let index_to_modify = _.indexOf(io_list, existing_entry);
                io_list[index_to_modify].connection = `${io_list[index_to_modify].connection}, ${entry}`
            }
        }
    }
    for (let i = 0; i < ecu.pinout.length; i++) {
        let pin_name = ecu.pinout[i].pin;
        let pin_query = _.findWhere(io_list, { pin: pin_name });
        if (!pin_query) {
            io_complete.push({ pin: pin_name, color: ecu.pinout[i].color,description: ecu.pinout[i].name, connection: 'None' })
        } else {
            io_complete.push(pin_query);
        }
    }
    return utils.sortBy(io_complete, 'pin')
}

utils.sortBy = function(arr, attr) {
    if (typeof arr[0][attr] == 'number') return _.sortBy(arr, attr);
    return [...arr].sort((a, b) => {
        const [aPrefix, aNumber] = [a[attr].charAt(0), parseInt(a[attr].slice(1))];
        const [bPrefix, bNumber] = [b[attr].charAt(0), parseInt(b[attr].slice(1))];
        if (aPrefix < bPrefix) return -1;
        if (aPrefix > bPrefix) return 1;
        return aNumber - bNumber;
    });
}

/*
    Returns Injector Output setup in accordance to being setup as a
    semi-sequential config (for semi and wasted spark)
    Returns something like this for 6 cylinder engines
        = [ [ 1, 6 ], [ 5, 2 ], [3, 4] ]
    Therefore utilizing only 3 injector outputs instead of 6
*/
utils.getSemiSequentialSummary = function(firing_order) {
    let summary = []
    const left = firing_order.slice(0, Math.floor(firing_order.length / 2));
    const right = firing_order.slice(Math.floor(firing_order.length / 2), firing_order.length);
    for (let i = 0; i < left.length; i++) {
        summary.push([left[i], right[i]])
    }
    return summary;
}

const capitalize = function(string) {
    return [
      ...string.slice(0, 1).toUpperCase(),
      ...string.slice(1)
    ].join('')
}

module.exports = utils;
let cables = {}
let gauge = "0.25 mm2";
let color_code = 'DIN';

const colors = require('../definitions/colors.json');
const connectors = require('../definitions/connector-list.json');
const ecus = require('../definitions/ecus.json');
const utils = require('./utils');
const _ = require('underscore');

cables.createChassisConnections = function(auxiliary_outputs, ecu_id, useTacho) {

    let key = "ECU to Chassis Connections"
    let colorList = []
    let count = 2;
    let auxNumber;
    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let auxiliaryOptions = _.where(ecuPinout, { type: 'auxiliary_output' });

    // sort in the event the pinout list is not sorted
    let auxiliaryOptionsSorted = _.sortBy(auxiliaryOptions, 'name');

    if (useTacho) count++;

    for (let i = 0; i < count; i++) {
        switch(i) {
            case 0:
                colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
                break;
            case 1: // aux (# of existing aux outputs + 1)
                auxNumber = auxiliary_outputs.length + 1;
                colorList.push(utils.parseColor(auxiliaryOptionsSorted[auxNumber - 1].color))
                break;
            case 2: // second used aux if aplicable (# of existing aux outputs + 2)
                auxNumber = auxiliary_outputs.length + 2;
                colorList.push(utils.parseColor(auxiliaryOptionsSorted[auxNumber - 1].color))
                break;
        }
    }

    let cable = {
        key,
        color_code,
        wirecount: count,
        gauge,
        show_equiv: true,
        colors: colorList // 12v, fuel pump, tacho?
    }

    return cable;
}

cables.createInjectors = function(injector_assignments, ecu_id) {
    let key = "Fuel Injectors"
    let count = injector_assignments.length + 1;
    let colorList = [];

    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let injectorsOptions = _.where(ecuPinout, { type: 'injector' });
    let injectorsOptionsSorted = _.sortBy(injectorsOptions, 'name');

    for (let i = 0; i < count; i++) {
        if (i == 0) {
            colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
        } else {
            colorList.push(utils.parseColor(injectorsOptionsSorted[i - 1].color))
        }
    }

    let cable = {
        key,
        color_code,
        wirecount: count,
        gauge,
        show_equiv: true,
        colors: colorList // 12v, inj 1..x
    }

    return cable;

}

cables.createIgnitionConnections = function(ignition_assignments, ecu_id) {

    let key = "Ignition System"
    let colorList = [];
    let count = ignition_assignments.length + 2; // default value (as if it were a 3 pin coil like a K20 style)
    if (ignition_assignments[0].pinlabels.length == 4) count += 1; // usually extra ground (i-e: LS coils)
    if (ignition_assignments[0].pinlabels.length == 5) count += 2; // usually 2 extra grounds (i-e: IGN-1A coils)

    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let ignitionOptions = _.where(ecuPinout, { type: 'ignition' });
    let ignitionOptionsSorted = _.sortBy(ignitionOptions, 'name');

    for (let i = 0; i < count; i++) {
        if (i == 0) { // 12v
            colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
        } else if (((count - ignition_assignments.length) <= i) || (i <= (count.length - 1))) { // signal wires
            let ignitionIndex = (ignition_assignments.length - (count - i));
            colorList.push(utils.parseColor(ignitionOptionsSorted[ignitionIndex].color))
        } else { // grounds
            colorList.push(_.findWhere(colors, { name: 'black' }).hex_code)
        }
    }

    let cable = {
        key,
        color_code,
        wirecount: count,
        gauge,
        show_equiv: true,
        colors: colorList // 12v, ground, ground?, ground? ign 1..x (first index will always be 12 and last items will always be ecu outputs)
    }

    return cable;

}

cables.createAnalogConnections = function(analog_assignments, ecu_id) {

    let key = "Analog Inputs";
    let count = analog_assignments.length + 2;

    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;

    let vref_color = _.findWhere(ecuPinout, { type: 'vref' }).color
    let vref_ground_color = _.findWhere(ecuPinout, { type: 'vref_ground' }).color

    let anOptions = _.where(ecuPinout, { type: 'analog_input' });
    let tempOptionsSorted = _.sortBy(anOptions, 'name');

    let colorList = [];

    for (let i = 0; i < count; i++) {
        if (i == 0) { // 5v
            colorList.push(utils.parseColor(vref_color))
        } else if (i == 1) { //signal ground
            colorList.push(utils.parseColor(vref_ground_color))
        } else { // signal
            let anNumber = i - 1;
            let color = tempOptionsSorted[anNumber - 1].color
            colorList.push(utils.parseColor(color))
        }
    }
    let cable = {
        key,
        color_code,
        wirecount: count,
        gauge,
        show_equiv: true,
        colors: colorList
    }

    return cable;

}

cables.createTempConnections = function(temp_assignments, ecu_id) {

    let key = "Temperature Sensors"
    let colorList = [];
    let count = temp_assignments.length + 1;

    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let tempOptions = _.where(ecuPinout, { type: 'temp' });
    let tempOptionsSorted = _.sortBy(tempOptions, 'name');

    let vrefGroundColor = _.findWhere(ecuPinout, { type: 'vref_ground' }).color;

    for (let i = 0; i < count; i++) {
        if (i == 0) {
            colorList.push(utils.parseColor(vrefGroundColor));
        } else {
            colorList.push(utils.parseColor(tempOptionsSorted[i - 1].color))
        }
    }

    let cable = {
        key,
        color_code,
        wirecount: count,
        gauge,
        show_equiv: true,
        colors: colorList // signal ground, temp 1..x
    }

    return cable;
}

cables.createGroundCables = function(ecuID) {
    let colorList = [];
    let groundPins =  _.where(_.findWhere(ecus, { id: ecuID }).pinout, { type: 'ground' });
    let cable = {
        key: 'ECU Ground(s)',
        color_code,
        wirecount: groundPins.length,
        gauge,
        show_equiv: true,
        colors: groundPins.map(() => utils.parseColor('B'))
    }

    return cable;
}

cables.createAuxConnections = function(aux_assignments, ecu_id) {
    let key = "Auxiliary Outputs"
    let colorList = [];
    let count = aux_assignments.length + 1;

    for (let i = 0; i < count; i++) {
        if (i == 0) { // 12v
            colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
        } else { // signals
            let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
            let auxiliaryOptions = _.where(ecuPinout, { type: 'auxiliary_output' });
            let auxiliaryOptionsSorted = _.sortBy(auxiliaryOptions, 'name');
            colorList.push(utils.parseColor(auxiliaryOptionsSorted[i - 1].color))
        }
    }

    let cable = {
        key,
        color_code,
        wirecount: count,
        gauge,
        show_equiv: true,
        colors: colorList // 12v+, aux 1..x
    }

    return cable;
}

cables.createCANConnection = function(canConnector, ecu_id) {

    let ecu_pinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let low_color = _.findWhere(ecu_pinout, { type: 'can_l' }).color;
    let high_color = _.findWhere(ecu_pinout, { type: 'can_h' }).color;

    let colorList = [
        _.findWhere(colors, { name: 'red' }).hex_code, // 12v
        _.findWhere(colors, { name: 'black' }).hex_code, // ground
        utils.parseColor(high_color), // can-h
        utils.parseColor(low_color), // can-l
    ]
    
    return {
        key: 'CAN Bus Communication',
        color_code,
        wirecount: canConnector.pinlabels.length,
        gauge,
        show_equiv: true,
        colors: colorList
    }
}

cables.createFlexConnection = function(digitalInputs, ecu_id) {

    let flexOption = _.findWhere(digitalInputs, { type: 'flex_options' });
    let connDefinition = _.findWhere(connectors.flex_options, { part_number: flexOption.pn });
    let ecu_pinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let ecu_digital_inputs = _.sortBy(_.where(ecu_pinout, { type: 'digital_input' }), 'name');

    let colorList = [
        _.findWhere(colors, { name: 'red' }).hex_code, // power
        _.findWhere(colors, { name: 'black' }).hex_code, // ground
        utils.parseColor(ecu_digital_inputs[0].color) // out
    ]

    return {
        key: 'Flex Fuel',
        color_code,
        wirecount: connDefinition.pinout.length,
        gauge,
        show_equiv: true,
        colors: colorList
    }
    
}

cables.createTriggerConnection = function(trigger, ecu_id) {

    let key = "Trigger Sensor(s)"
    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;

    let colorList = [];

    // Note: some ECUs just have one shielded ground opposed to two so account for that
    let findShieldGnd = _.findWhere(_.findWhere(ecus, { id: ecu_id }).pinout, { type: 'shield_ground' });
    let isSingleGround = findShieldGnd ? true : false;

    let homeColor = _.findWhere(ecuPinout, { type: 'home' }).color;
    let triggerColor = _.findWhere(ecuPinout, { type: 'trigger' }).color;
    let triggerPinout = _.findWhere(connectors.trigger_options, { part_number: trigger.pn }).pinout

    for (let i = 0; i < trigger.pinlabels.length; i++) {

        let pinType = _.findWhere(triggerPinout, { name: trigger.pinlabels[i] }).type;

        switch(pinType) {
            case 'switched_12v':
                colorList.push(_.findWhere(colors, { name: 'red' }).hex_code);
                break;
            case 'trigger':
                colorList.push(utils.parseColor(triggerColor));
                break;
            case 'trigger_ground':
                if (isSingleGround) {
                    colorList.push(utils.parseColor(findShieldGnd.color));
                } else {
                    colorList.push(utils.parseColor(_.findWhere(_.findWhere(ecus, { id: ecu_id }).pinout, { type: 'trigger_ground' }).color));
                }
                break;
            case 'home':
                colorList.push(utils.parseColor(homeColor));
                break;
            case 'ground': // Nissan CAS' for example have a single ground input, in the event it does just use the home ground
            case 'home_ground':
                if (isSingleGround) {
                    colorList.push(utils.parseColor(findShieldGnd.color));
                } else {
                    colorList.push(utils.parseColor(_.findWhere(_.findWhere(ecus, { id: ecu_id }).pinout, { type: 'home_ground' }).color));
                }
                break;
        }
    }

    let cable = {
        key,
        color_code,
        wirecount: trigger.pinlabels.length,
        gauge,
        show_equiv: true,
        colors: colorList
    }

    return cable

}

module.exports = cables;
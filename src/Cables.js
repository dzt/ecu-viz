let cables = {}

const { CABLE } = require('./helpers/constants.js');

const colors = require('../definitions/colors.json');
const connectors = require('../definitions/connector-list.json');
const ecus = require('../definitions/ecus.json');
const inserts = require('../definitions/inserts.json');
const utils = require('./helpers/utils.js');
const _ = require('underscore');

const { COLOR_CODE, WIRE_GAUGE } = require('./helpers/constants.js');

let gauge = WIRE_GAUGE;
let color_code = COLOR_CODE;

class Cables {

    constructor(context) {
        this.context = context;
    }

    createChassisConnections () {

        let useTacho = this.context.input.use_chassis_tacho;
        let key = CABLE.ECU;

        // If there is a Stepper Valve or PWM 3pin Valve aux assignment may need to change
        let idle_valve_id = this.context.input.idle_valve;

        if (idle_valve_id) {
            let idleValveDefinition = _.findWhere(connectors.stepper_valve_options, { part_number: idle_valve_id });
            let idle_pin_count = idleValveDefinition.pinout.length;
            let isc_rules, pins_to_pluck;
            isc_rules = this.context.ecu.multipurpose_pins[(idle_pin_count === 3) ? '3_wire_isc' : 'stepper_valve'];

            if (Array.isArray(isc_rules) || (typeof isc_rules == 'object')) {
                if (idle_pin_count === 3) {                    
                    pins_to_pluck = [isc_rules.open_pin, isc_rules.close_pin]; // n numbers of aux outputs
                } else {
                    pins_to_pluck = isc_rules.slice(0, utils.countIdleSteps(idleValveDefinition.pinout)); // n numbers of aux outputs
                }
            }

            pins_to_pluck.map((pin) =>  {
                let pin_detailed = _.findWhere(this.context.ecu.pinout, { pin: pin });
                this.context.updateAuxCounter(pin_detailed);
                return pin_detailed;
            });

        }

        let colorList = []
        let count = 2;
        if (useTacho) count++;

        for (let i = 0; i < count; i++) {
            switch(i) {
                case 0:
                    colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
                    break;
                case 1: // aux, fuel pump (# of existing aux outputs + 1)
                case 2: // second used aux if aplicable, tacho (# of existing aux outputs + 2)
                    colorList.push(utils.parseColor(this.context.getAvailableAuxOutputs()[0].color))
                    this.context.updateAuxCounter(this.context.getAvailableAuxOutputs()[0])
                    break;
            }
        }
    
        let cable = {
            key,
            color_code,
            wirecount: count,
            gauge,
            show_equiv: true,
            colors: colorList, // 12v, fuel pump, tacho?
            wirelabels: utils.createColoredWireLabels(colorList)
        }
        return cable;
    }
    
    createInjectors () {
        let injector_assignments = this.context.summary.injector_outputs;
        let key = "Fuel Injectors"
        let count = injector_assignments.length + 1;
        let colorList = [];
    
        let ecuPinout = _.findWhere(ecus, { id: this.context.input.ecu }).pinout;
        let injectorsOptions = _.where(ecuPinout, { type: 'injector' });
        let injectorsOptionsSorted = _.sortBy(injectorsOptions, 'name');
    
        for (let i = 0; i < count; i++) {
            if (i == 0) {
                colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
            } else {
                let injector_pin = injectorsOptionsSorted[i - 1];
                if (!injector_pin) throw new Error('Insufficent I/O, not enough injector outputs.');
                colorList.push(utils.parseColor(injector_pin.color))
            }
        }
    
        let cable = {
            key,
            color_code,
            wirecount: count,
            gauge,
            show_equiv: true,
            colors: colorList, // 12v, inj 1..x
            wirelabels: utils.createColoredWireLabels(colorList)
        }
    
        return cable;
    
    }
    
    createIgnitionConnections() {

        let ignition_assignments = this.context.summary.ignition_outputs;
    
        let key = "Ignition System"
        let colorList = [];
    
        let connDef = _.findWhere(connectors['ignition_coils'], { part_number: ignition_assignments[0].pn })
        let pinout_filtered = utils.removeNullPins(connDef.pinout);
    
        let count = ignition_assignments.length + 2; // default value (as if it were a 3 pin coil like a K20 style)
        if (pinout_filtered.length == 4) count += 1; // usually extra ground (i-e: LS coils)
        if (pinout_filtered.length == 5) count += 2; // usually 2 extra grounds (i-e: IGN-1A coils)
    
        let ecuPinout = _.findWhere(ecus, { id: this.context.input.ecu }).pinout;
        let ignitionOptions = _.where(ecuPinout, { type: 'ignition' });
        let ignitionOptionsSorted = _.sortBy(ignitionOptions, 'name');
    
        for (let i = 0; i < count; i++) {
            if (i == 0) { // 12v
                colorList.push(utils.parseColor('R/Y'))
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
            colors: colorList, // 12v, ground, ground?, ground? ign 1..x (first index will always be 12 and last items will always be ecu outputs)
            wirelabels: utils.createColoredWireLabels(colorList)
        }
    
        return cable;
    
    }
    
    createAnalogConnections () {

        let analog_assignments = this.context.summary.analog_inputs;
        let key = "Analog Inputs";
        let count = analog_assignments.length + 2;
    
        let ecuPinout = _.findWhere(ecus, { id: this.context.input.ecu }).pinout;
    
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
                let anOption = tempOptionsSorted[anNumber - 1];
                if (!anOption) throw new Error('Insufficent Analog Inputs to run this configuration.');
                colorList.push(utils.parseColor(anOption.color))
            }
        }
        let cable = {
            key,
            color_code,
            wirecount: count,
            gauge,
            show_equiv: true,
            colors: colorList,
            wirelabels: utils.createColoredWireLabels(colorList)
        }
    
        return cable;
    
    }
    
    createTempConnections () {

        let temp_assignments = this.context.summary.temp_inputs;
        let key = "Temperature Sensors"
        let colorList = [];
        let count = temp_assignments.length + 1;
    
        let ecuPinout = _.findWhere(ecus, { id: this.context.input.ecu }).pinout;
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
            colors: colorList, // signal ground, temp 1..x
            wirelabels: utils.createColoredWireLabels(colorList)
        }
    
        return cable;
    }
    
    createGroundCables () {
        let groundPins =  _.where(_.findWhere(ecus, { id: this.context.input.ecu }).pinout, { type: 'ground' });
        let cable = {
            key: 'ECU Ground(s)',
            color_code,
            wirecount: groundPins.length,
            gauge,
            show_equiv: true,
            colors: groundPins.map(() => utils.parseColor('B')),
            wirelabels: utils.createColoredWireLabels(groundPins.map(() => utils.parseColor('B')))
        }
    
        return cable;
    }
    
    createAuxConnections () {
        let aux_assignments = this.context.summary.auxiliary_outputs;
        let key = CABLE.AUX;
        let colorList = [];
        let summary = _.where(aux_assignments, { type: 'auxiliary_options' });
        let count = summary.length + 1;
    
        for (let i = 0; i < count; i++) {
            if (i == 0) { // 12v
                colorList.push(_.findWhere(colors, { name: 'red' }).hex_code)
            } else { // signals
                colorList.push(utils.parseColor(this.context.getAvailableAuxOutputs()[0].color))
                this.context.updateAuxCounter(this.context.getAvailableAuxOutputs()[0])
            }
        }
    
        let cable = {
            key,
            color_code,
            wirecount: count,
            gauge,
            show_equiv: true,
            colors: colorList, // 12v+, aux 1..x
            wirelabels: utils.createColoredWireLabels(colorList)
        }
    
        return cable;
    }
    
    createCANConnection () {

        if (this.context.input.can_devices.length < 1) return null;

        let canConnector = this.context.summary.can_bus[0]
        let ecu_pinout = _.findWhere(ecus, { id: this.context.input.ecu }).pinout;
        let low_color = _.findWhere(ecu_pinout, { type: 'can_l' }).color;
        let high_color = _.findWhere(ecu_pinout, { type: 'can_h' }).color;
    
        let colorList = [
            _.findWhere(colors, { name: 'red' }).hex_code, // 12v
            _.findWhere(colors, { name: 'black' }).hex_code, // ground
            utils.parseColor(high_color), // can-h
            utils.parseColor(low_color), // can-l
        ]
        
        return {
            key: CABLE.CAN,
            color_code,
            wirecount: canConnector.pinlabels.length,
            gauge,
            show_equiv: true,
            colors: colorList,
            wirelabels: utils.createColoredWireLabels(colorList)
        }
    }
    
    createFlexConnection () {
        
        if (this.context.input.flex == null) return null;
        let digitalInputs = this.context.summary.digital_inputs;
        let flexOption = _.findWhere(digitalInputs, { type: 'flex_options' });
        let connDefinition = _.findWhere(connectors.flex_options, { part_number: flexOption.pn });

        const di = this.context.getAvailableDIs()[0];
        let colorList = [
            _.findWhere(colors, { name: 'red' }).hex_code, // power
            _.findWhere(colors, { name: 'black' }).hex_code, // ground
            utils.parseColor(di.color) // out
        ]

        this.context.updateDICounter(di);
    
        return {
            key: 'Flex Fuel',
            color_code,
            wirecount: connDefinition.pinout.length,
            gauge,
            show_equiv: true,
            colors: colorList,
            wirelabels: utils.createColoredWireLabels(colorList)
        }
        
    }
    
    createInsertCable () {
        let input = this.context.input;
        let insert_ids = input.inserts;
        let insertCables = [];
    
        let ecuPinout = _.findWhere(ecus, { id: input.ecu }).pinout;
        let can_l_pin = _.findWhere(ecuPinout, { type: 'can_l' });
        let can_h_pin = _.findWhere(ecuPinout, { type: 'can_h' });
    
        for (let i = 0; i < insert_ids.length; i++) {
            let insert = _.findWhere(inserts, { id: insert_ids[i] });
            let cableColors = insert.colors.map((col, index) => {
                if (col.toLowerCase() == 'auto') {
                    let connection = insert.connections[index];
                    let type = (typeof connection[0] == 'string') ? connection[0] : connection[1];
                    if (type == 'digital_input') {
                        const di_pin = this.context.getAvailableDIs()[0];
                        if (!di_pin) throw new Error('Insufficent Digital Inputs to run this configuration.');
                        let color = utils.parseColor(di_pin.color);
                        this.context.updateDICounter(di_pin);
                        return color;
                    } else if (type == 'auxiliary_output') {
                        const aux_pin = this.context.getAvailableAuxOutputs()[0];
                        if (!aux_pin) throw new Error('Insufficent Auxiliary Outputs to run this configuration.');
                        let color = utils.parseColor(aux_pin.color);
                        this.context.updateDICounter(aux_pin);
                        return color;
                    } else if (type == 'can_h') {
                        return utils.parseColor(can_h_pin.color);
                    } else if (type == 'can_l') {
                        return utils.parseColor(can_l_pin.color);
                    }
                }
                return utils.parseColor(col);
            })
            let insertCable = {
                key: insert.name,
                color_code,
                wirecount: insert.connections.length,
                gauge,
                show_equiv: true,
                colors: cableColors,
                wirelabels: utils.createColoredWireLabels(cableColors)
            }
            insertCables.push(insertCable)
        }
        return insertCables;
    }
    
    createTriggerConnection () {

        let trigger = this.context.summary.trigger_options[0]
    
        let key = CABLE.TRIG;
        let ecuPinout = _.findWhere(ecus, { id: this.context.input.ecu }).pinout;
    
        let colorList = [];
    
        // Note: some ECUs just have one shielded ground opposed to two so account for that
        let findShieldGnd = _.findWhere(_.findWhere(ecus, { id: this.context.input.ecu }).pinout, { type: 'shield_ground' });
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
                        colorList.push(utils.parseColor(_.findWhere(_.findWhere(ecus, { id: this.context.input.ecu }).pinout, { type: 'trigger_ground' }).color));
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
                        colorList.push(utils.parseColor(_.findWhere(_.findWhere(ecus, { id: this.context.input.ecu }).pinout, { type: 'home_ground' }).color));
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
            colors: colorList,
            wirelabels: utils.createColoredWireLabels(colorList),
            shield: true
        }
    
        return cable
    
    }
    
    createFuseboxCables () {
        let cableColors = [
            utils.parseColor('P'), // 12V Turn-On
            utils.parseColor('B'), // Ground
            utils.parseColor('R/B') // Constant Battery 12V+
        ];
        let cable = {
            key: 'Fusebox Connections',
            color_code,
            wirecount: 3,
            gauge,
            show_equiv: true,
            colors: cableColors,
            wirelabels: utils.createColoredWireLabels(cableColors)
        }
        return cable;
    }
    
    createIdleValveConnection () {

        if (this.context.input.idle_valve == null) return null;
        /* First Check if the ECU has support */
        /* If ECU has support, priortize using Idle Stepper Pins first */
        /* If the ECU does not have Idle stepper pins, find the next available pin? */
        
        let idleConnector = _.findWhere(this.context.summary.auxiliary_outputs, { type: 'stepper_valve_options' })
        let ecu = _.findWhere(ecus, { id: this.context.input.ecu });
        let multipurpose_pins = ecu.multipurpose_pins;
        let idleValveDefinition = _.findWhere(connectors.stepper_valve_options, { part_number: idleConnector.pn });
    
        const idleStepCount = utils.countIdleSteps(idleValveDefinition.pinout);
        const uses_switched12v = _.findWhere(idleValveDefinition.pinout, { type: 'switched_12v' });
        const ecuStepperSpecificPins = utils.getECUStepperPins(ecu.pinout);
    
        const insufficentErrorMessage = `Insufficent I/O for this ECU to utilize the ${idleValveDefinition.name}`
    
        let cableColors = [];
        let cableTemplate = {
            key: 'Idle Control',
            color_code,
            wirecount: idleStepCount + ((uses_switched12v) ? 1 : 0),
            gauge,
            show_equiv: true,
            colors: cableColors,
            wirelabels: null // Populated Later
        }
    
        if (uses_switched12v) cableColors.push(utils.parseColor('R'));
    
        // Initial Error Validations
        if ((typeof multipurpose_pins.stepper_valve == 'boolean')
            && multipurpose_pins.stepper_valve == false) throw new Error(insufficentErrorMessage)
        if ((Array.isArray(multipurpose_pins.stepper_valve)) &&
            (idleStepCount > multipurpose_pins.stepper_valve.length)) throw new Error(insufficentErrorMessage)
    
        // Pin Assignment
        let ecuPinsToUse;
        if ((typeof multipurpose_pins.stepper_valve == 'boolean') && (multipurpose_pins.stepper_valve == true)) {
            if (idleStepCount <= ecuStepperSpecificPins.length) {
                // Use only the specified stepper pins from the ECU and call it a day
                ecuPinsToUse = ecuStepperSpecificPins.slice(ecuStepperSpecificPins.length - idleStepCount);
            } else if (idleStepCount.length > ecuStepperSpecificPins.length) {
                throw new Error(insufficentErrorMessage) // TODO?: Would need additional aux outputs as not enough stepper pins to operate
            }
        } else if ((Array.isArray(multipurpose_pins.stepper_valve)) &&
            (idleStepCount <= multipurpose_pins.stepper_valve.length)) {
            // In the case the ECU only has reserved pins for stepper idle control (i-e: Link ECUs)
            ecuPinsToUse = multipurpose_pins.stepper_valve.slice(multipurpose_pins.stepper_valve.length - idleStepCount).map((pinNumber) => {
                return _.findWhere(ecu.pinout, { pin: pinNumber });
            });
        }
    
        for (let i = 0; i < ecuPinsToUse.length; i++) {
            cableColors.push(utils.parseColor(ecuPinsToUse[i].color));
        }
        
        cableTemplate.wirelabels = utils.createColoredWireLabels(cableColors)
        return cableTemplate;

    }

}

module.exports = Cables;
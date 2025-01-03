let getSummary = function (ecu_id) {
    let pinout = _.findWhere(serverData.ecus, { id: ecu_id }).pinout;
    return {
        auxiliary_outputs: _.pluck(_.where(pinout, { type: 'auxiliary_output' }), 'name'),
        analog_inputs: _.pluck(_.where(pinout, { type: 'analog_input' }), 'name'),
        digital_inputs: _.pluck(_.where(pinout, { type: 'digital_input' }), 'name'),
    }
}

let parseAdditionalIO = function () {
    return {
        flex: (readOptionsFields('#flex_container').length > 0),
        can_devices: readOptionsFields('#can_container'),
        auxiliary_outputs: readOptionsFields('#aux_container'),
        analog_inputs: readOptionsFields('#analog_container')
    }
}

let readOptionsFields = function (selector) {
    let arr = [];
    $(selector).find('select').each(function (i, elm) {
        let val = $(elm).find('option:selected').val();
        if (val != 'null') arr.push(val);
    });
    return arr;
}

let getInsertCounts = function() {

    let aux = 0;
    let di = 0;

    $('#optionsContainer').find('input[type="checkbox"]:checked').each(function() {
        let insert_id = $(this).val();
        let insert_connections = _.findWhere(serverData.inserts, { id: insert_id }).connections
        for (let i = 0; i < insert_connections.length; i++) {
            let connection = insert_connections[i]; // arr type
            let type;
            if (typeof connection[0] == 'string') type = connection[0];
            if (typeof connection[1] == 'string') type = connection[1];
            if (type == 'digital_input') di++;
            if (type == 'auxiliary_output') aux++;
        }
    });

    return { aux, di }
}

let updateCounter = function () {
    let selectedECU = $('#ecu').find('option:selected').val();
    let idle_stepper = $('#idle_stepper').find('option:selected').val();
    let summary = getSummary(selectedECU);

    // Used I/O
    let additional_aux = readOptionsFields('#aux_container').length;
    let additional_an = readOptionsFields('#analog_container').length;
    let additional_di = 0; // for flex fuel input

    if (idle_stepper != '0') additional_aux += countIdleSteps(idle_stepper);
    if ($('#flex').find('option:selected').val() != '0') additional_di++;

    // Used I/O from Insert Option(s)
    let insertCounts = getInsertCounts();
    additional_aux += insertCounts.aux;
    additional_di +=  insertCounts.di;

    if ($('#use_factory_tacho').is(":checked")) additional_aux += 1; // tach is included is selected by user

    /* Active Count Values */
    let aux_count = summary.auxiliary_outputs.length - (1 + additional_aux); // Reserved for Fuel Pump Output
    let an_count = summary.analog_inputs.length - (1 + additional_an); // Reserved for TPS
    let di_count = summary.digital_inputs.length - additional_di;

    if ($('#dbw_enable').find('option:selected').val() == '1') {
        an_count += 1; // Free up reserved TPS pin if DBW present
        an_count -= 4; // 4 total an volts are required for working dbw (between tps and motor)
        aux_count -= 2; // 2 total aux pins are used for motor control on DBW throttle body
    }

    /* Set Values */
    $('#aux_count').text(aux_count);
    $('#an_count').text(an_count);
    $('#di_count').text(di_count);

}

let currentOptions = [];
let updateChassisOptions = function () {

    let chassisID = $('#vehicleChassis').find('option:selected').val();
    let options = _.findWhere(serverData.chassis, { id: chassisID }).insert_options;
    let checkboxArr = [];

    for (let i = 0; i < options.length; i++) {
        let option = _.findWhere(serverData.inserts, { id: options[i] });
        let checked = (option.required) ? 'checked disabled' : '';
        let div = `
            <div class="form-check form-check-inline">
                <input type="checkbox" class="form-check-input" value="${option.id}" id="checkbox_${i + 1}" ${checked}></input>
                <label class="form-check-label" for="checkbox_${i + 1}">${option.name}</label>
            </div>
        `
        checkboxArr.push(div);
    }

    let htmlText = checkboxArr.join('\n');
    if (currentOptions != options) {
        $('#optionsContainer').html(htmlText);
        currentOptions = options;
    }

}

const countIdleSteps = function(id) {
    console.log({id})
    let pinout = _.findWhere(serverData.connectors.stepper_valve_options, { part_number: id }).pinout;
    let types = ['step_1', 'step_2', 'step_3', 'step_4'];
    let count = 0;
    for (let i = 0; i < pinout.length; i++) {
        if (types.includes(pinout[i].type)) count++;
    }
    return count;
}

const wbo_support = function() {
    let wbo_pin_types = ['wbo_ip', 'wbo_input', 'wbo_heater', 'wbo_rcal', 'wbo_vs']
    let wbo_count = 0;
    let ecu_pinout = _.findWhere(serverData.ecus, { id: $('#ecu').find('option:selected').val() }).pinout
    
    for (let i = 0; i < wbo_pin_types.length; i++) {
        let pin_query = _.findWhere(ecu_pinout, { type: wbo_pin_types[i] });
        if (pin_query) wbo_count++;
    }
    if (wbo_count == wbo_pin_types.length) return true;
    return false;
}

const updateUI = function() {

    /* If DBW is enabled, enabled, disable the TPS (#tps) and Idle Control (#idle_stepper) Valve box */
    let dbw_mode = $('#dbw_enable').find('option:selected');
    let idle_stepper_select = $('#idle_stepper');
    let tps_select = $('#tps');

    if (dbw_mode.val() == '1') {
        idle_stepper_select.prop("disabled", true);
        tps_select.prop("disabled", true);
        idle_stepper_select.val('0'); // Set to "None" for Idle Stepper Valve
    } else {
        idle_stepper_select.prop("disabled", false);
        tps_select.prop("disabled", false);
    }

    /* Check if ECU has Internal Wideband Sensor Support, if so enable select box */
    if (wbo_support()) {
        $('#wbo_select').prop("disabled", false);
    } else {
        $('#wbo_select').prop("disabled", true);
    }

    /* If chassis does not have a built in tach disable the box and uncheck it */
}

const refresh = function() {
    updateCounter();
    updateUI();
    updateChassisOptions();
    refreshCartSummary();
}

$(document).ready(function () {
    /* Init: Called once page is loaded */
    refresh();
    /* Init: Frontend Components */
    $('#error').css({ display: 'none' });
    $('#io_table').css({ display: 'none' });
    /* Called anytime a change is made to the ECU selection */
    $('#nav-tabContent').on('change', function () {
        refresh();
    });
});
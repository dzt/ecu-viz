let getSummary = function (ecu_id) {
    let pinout = _.findWhere(serverData.ecus, {
        id: ecu_id
    }).pinout;
    return {
        auxiliary_outputs: _.pluck(_.where(pinout, {
            type: 'auxiliary_output'
        }), 'name'),
        analog_inputs: _.pluck(_.where(pinout, {
            type: 'analog_input'
        }), 'name'),
        digital_inputs: _.pluck(_.where(pinout, {
            type: 'digital_input'
        }), 'name'),
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

let updateCounter = function () {
    let selectedECU = $('#ecu').find('option:selected').val();
    let summary = getSummary(selectedECU);

    // Used I/O
    let additional_aux = readOptionsFields('#aux_container').length;
    let additional_an = readOptionsFields('#analog_container').length;
    let additional_di = readOptionsFields('#flex_container').length; // for flex fuel input

    if ($('#use_factory_tacho').is(":checked")) additional_aux += 1; // tach is included is selected by user

    /* Active Count Values */
    let aux_count = summary.auxiliary_outputs.length - (1 + additional_aux); // Reserved for Fuel Pump Output
    let an_count = summary.analog_inputs.length - (1 + additional_an); // Reserved for TPS
    let di_count = summary.digital_inputs.length - additional_di;

    /* Set Values */
    $('#aux_count').text(aux_count);
    $('#an_count').text(an_count);
    $('#di_count').text(di_count);

}

$(document).ready(function () {

    /* Called once page is loaded */
    updateCounter();

    /* Called anytime a change is made to the ECU selection */
    $('#ecu, #use_factory_tacho, #nav-io').on('change', function () {
        updateCounter();
    });

});
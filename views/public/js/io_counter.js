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
    let summary = getSummary(selectedECU);

    // Used I/O
    let additional_aux = readOptionsFields('#aux_container').length;
    let additional_an = readOptionsFields('#analog_container').length;
    let additional_di = readOptionsFields('#flex_container').length; // for flex fuel input

    // Used I/O from Insert Option(s)
    let insertCounts = getInsertCounts();
    additional_aux += insertCounts.aux;
    additional_di +=  insertCounts.di;

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

let currentOptions = [];
let updateChassisOptions = function () {

    let chassisID = $('#vehicleChassis').find('option:selected').val();
    let options = _.findWhere(serverData.chassis, { id: chassisID }).insert_options;
    let checkboxArr = [];

    for (let i = 0; i < options.length; i++) {
        let option = _.findWhere(serverData.inserts, { id: options[i] });
        let div = `
            <div class="form-check form-check-inline">
                <input type="checkbox" class="form-check-input" value="${option.id}" id="checkbox_${i + 1}"></input>
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

let refresh = function() {
    updateCounter();
    updateChassisOptions();
    refreshCartSummary();
}

$(document).ready(function () {

    /* Init: Called once page is loaded */
    refresh();

    /* Called anytime a change is made to the ECU selection */
    $('#nav-tabContent').on('change', function () {
        refresh();
    });

});
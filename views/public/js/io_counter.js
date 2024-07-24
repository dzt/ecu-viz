let getSummary = function(ecu_id) {
    let pinout = _.findWhere(serverData.ecus, { id: ecu_id }).pinout;
    return {
        auxiliary_outputs: _.pluck(_.where(pinout, { type: 'auxiliary_output'}), 'name'),
        analog_inputs: _.pluck(_.where(pinout, { type: 'analog_input'}), 'name'),
        digital_inputs: _.pluck(_.where(pinout, { type: 'digital_input'}), 'name'),
    }
}

let updateCounter = function() {
    let selectedECU = $('#ecu').find('option:selected').val();
    let summary = getSummary(selectedECU);

    // TODO
    let additional_aux = 0; // tach is included is selected by user
    let additional_an = 0;
    let additional_di = 0;

    if ($('#use_factory_tacho').is(":checked")) additional_aux += 1;

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
    $('#ecu, #use_factory_tacho').on('change', function() {
        updateCounter();
    });

});
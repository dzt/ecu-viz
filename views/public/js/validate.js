let getUserInput = function () {
    /* Form Fields */
    let chassis = $('#vehicleChassis').find('option:selected').val();
    let ecu = $('#ecu').find('option:selected').val();
    let engine = $('#engine').find('option:selected').val();
    let tps = $('#tps').find('option:selected').val();
    let injectors = $('#inj').find('option:selected').val();
    let ignition = $('#ign').find('option:selected').val();
    let clt = $('#clt').find('option:selected').val();
    let iat = $('#iat').find('option:selected').val();
    let trigger = $('#trigger').find('option:selected').val();

    let use_factory_tacho = $('#use_factory_tacho').is(":checked");

    // Assuming these values should be fetched or initialized
    let flex_fuel = ($('#flex').find('option:selected').val() == '0') ? null : serverData.connectors['flex_options'][0].part_number;

    let additional_io = parseAdditionalIO();

    let can_devices = additional_io.can_devices;
    let aux_outputs = additional_io.auxiliary_outputs;
    let analog_inputs = additional_io.analog_inputs;

    let options = []
    $('#optionsContainer').find('input[type="checkbox"]:checked').each(function() {
        options.push($(this).val())
    });

    console.log(options)

    let req_params = {
        "ecu": ecu,
        "use_chassis_tacho": use_factory_tacho,
        "inserts": options,
        "chassis": chassis,
        "engine": engine,
        "tps": tps,
        "injectors": injectors,
        "ignition": ignition,
        "alt": null,
        "clt": clt,
        "iat": iat,
        "trigger": trigger,
        "flex": flex_fuel,
        "can_devices": can_devices,
        "auxiliary_options": aux_outputs,
        "analog_inputs": analog_inputs
    };

    console.log(JSON.stringify(req_params));

    return req_params;
}

$(document).ready(function () {

    /* Buttons */
    let updateBtn = $('#updateBtn');
    let addIOButton = $('.add-select');

    addIOButton.click(function () {
        let vizID = $(this).attr('viz-id') // can, aux, or analog
        let selectClone = $(`#${vizID}_select`).clone().html();
        $(`#${vizID}_container`).append(`
            <div class="row">
                <div class="col-sm-9">
                    <select value="" class="form-select">
                        ${selectClone}
                    </select>
                </div>
                <div class="col-sm-3">
                    <button type="button" class="btn btn-outline-danger del-select">Delete</button>
                </div>
            </div>
        `);
        updateCounter();
    });

    // Handle dynamic delete button
    $(document).on('click', '.del-select', function () {
        $(this).parent().parent().remove();
        updateCounter();
    });

    updateBtn.click(function () {
        updateBtn.prop("disabled", true);
        $('#previewContainer').hide();
        $('#spinner').show();
        let req_params = getUserInput();
        fetch(req_params, function (err, image) {
            if (err) {
                $('#error').text(err);
                $('#error').css({ display: 'block' });
            } else {
                $('#downloadBtn').attr('href', image);
                $("#downloadBtn").removeClass('disabled');
                $('#previewImage').attr('src', image);
                $('#error').css({ display: 'none' });
            }
            updateBtn.prop("disabled", false);
            $('#spinner').hide();
            $('#previewContainer').show();
        });

    });

    let fetch = function (params, callback) {
        $.ajax({
            url: "/fetch",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(params),
            success: function (response, textStatus, jqXHR) {
                console.log({
                    response,
                    textStatus,
                    jqXHR
                });
                // Ensure data is in correct format
                if (response.data.startsWith("data:image/png;base64,")) {
                    return callback(null, response.data);
                } else {
                    return callback('Invalid Response', null);
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                let err = JSON.parse(xhr.responseText).error.message;
                return callback(err, null);
            }
        });
    }

});
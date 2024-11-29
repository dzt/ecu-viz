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
    let idle_valve = ($('#idle_stepper').find('option:selected').val() == '0') ? null : $('#idle_stepper').find('option:selected').val();

    let wideband_control = wbo_support() ? $('#wbo_select').find('option:selected').val() : null;
    if (wideband_control == 'null') wideband_control = null;

    let additional_io = parseAdditionalIO();

    let can_devices = additional_io.can_devices;
    let aux_outputs = additional_io.auxiliary_outputs;
    let analog_inputs = additional_io.analog_inputs;
    let dbw = null;

    if ($('#dbw_enable').find('option:selected').val() == '1') {
        dbw = {
            pedal: $('#dbw_app').find('option:selected').val(),
            throttle_body: $('#dbw_tb').find('option:selected').val()
        }
        tps = null;
        idle_valve = null;
    }

    let options = []
    $('#optionsContainer').find('input[type="checkbox"]:checked').each(function() {
        options.push($(this).val())
    });

    let req_params = {
        'ecu': ecu,
        'chassis': chassis,
        'use_chassis_tacho': use_factory_tacho,
        'inserts': options,
        'engine': engine,
        'tps': tps,
        'injectors': injectors,
        'ignition': ignition,
        'clt': clt,
        'iat': iat,
        'trigger': trigger,
        'flex': flex_fuel,
        'idle_valve': idle_valve,
        'can_devices': can_devices,
        'auxiliary_options': aux_outputs,
        'analog_inputs': analog_inputs,
        'dbw': dbw,
        'wideband_control': wideband_control
    };

    console.log(req_params);

    return req_params;
}

let updateIOSheet = function(io_sheet) {
    let tableItems = [];
    for (let i = 0; i < io_sheet.length; i++) {
        let pin = io_sheet[i];
        tableItems.push(`
            <tr>
                <th scope="row">${pin.pin}</th>
                <td>${pin.color}</td>
                <td>${pin.description}</td>
                <td>${pin.connection}</td>
            </tr>
        `)
    }
    let tableBody = tableItems.join('\n');
    $('#io_sheet_tbody').html(tableBody);
    $('#io_table').css({ display: 'block' });
    $('#io_sheet_message').css({ display: 'none' });
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
        fetch(req_params, function (err, response) {
            if (err) {
                $('#error').text(err);
                $('#error').css({ display: 'block' });
            } else {
                
                $('#downloadBtn').attr('href', response.image);
                $("#downloadBtn").removeClass('disabled');
                $('#previewImage').attr('src', response.image);
                $('#error').css({ display: 'none' });

                /* Update I/O Sheet */
                updateIOSheet(response.io_sheet)

                lg.destroy()
                loadGallery();
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
                // Ensure data is in correct format
                if (response.data.image.startsWith("data:image/png;base64,")) {
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
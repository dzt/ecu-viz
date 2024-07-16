$(document).ready(function () {

    /* Buttons */
    let updateBtn = $('#updateBtn');
    let downloadBtn = $('#downloadBtn');

    updateBtn.click(function () {
        updateBtn.prop("disabled", true);
        $('#previewContainer').hide();
        $('#spinner').show();
        let req_params = getUserInput();
        fetch(req_params, function(err, image) {
            if (!err) {
                $('#downloadBtn').attr('href', image);
                $("#downloadBtn").removeClass('disabled');
                $('#previewImage').attr('src', image);
            }
            updateBtn.prop("disabled", false);
            $('#spinner').hide();
            $('#previewContainer').show();
        });

    });

    // downloadBtn.click(function () {
    //     updateBtn.click();
    //     downloadBtn.prop("disabled", true);
    //     fetch(getUserInput(), function(err, image) {
    //         if (!err) {
    //             let a = document.createElement("a");
    //             a.href = image;
    //             a.download = `ecu-viz-download.png`;
    //             a.click();     
    //         }
    //         downloadBtn.prop("disabled", false);
    //     });
    // });

    let getUserInput = function() {
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

        // Assuming these values should be fetched or initialized
        let options = $('#chassisOptions').find('option:selected').val() || [];
        let flex_fuel = null;
        let can_devices = [];
        let aux_outputs = [];
        let analog_inputs = [];

        let req_params = {
            "ecu": ecu,
            "use_chassis_tacho": true,
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

    let fetch = function(params, callback) {
        $.ajax({
            url: "/fetch",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(params),
            success: function (data, textStatus, jqXHR) {
                console.log({ data, textStatus, jqXHR });
                // Ensure data is in correct format
                if (data.startsWith("data:image/png;base64,")) {
                    return callback(null, data);
                } else {
                    return callback('Invalid Response', null);
                }
            },
            error: function (_jqXHR, _textStatus, errorThrown) {
                return callback(errorThrown, null);
            }
        });
    }

});
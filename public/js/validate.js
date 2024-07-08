$(document).ready(function () {

    /* Buttons */
    let updateBtn = $('#updateBtn');
    let downloadBtn = $('#downloadBtn');

    updateBtn.click(function () {

        let previewImage = $('#previewImage');

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

        $.ajax({
            url: "/fetch",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(req_params),
            success: function (data, textStatus, jqXHR) {
                console.log({
                    data,
                    textStatus,
                    jqXHR
                });
                // Ensure data is in correct format
                if (data.startsWith("data:image/png;base64,")) {
                    $('#previewImage').attr('src', data);
                } else {
                    console.error("Invalid image data");
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error({
                    jqXHR,
                    textStatus,
                    errorThrown
                });
            }
        });
    });
});
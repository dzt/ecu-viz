
let getCartSummary = function(input) {
    let summary = [];
    let keys = Object.keys(input);

    let engine = _.findWhere(serverData.engines, { id: input.engine });
    let ign_inj_count = (engine.type == 'rotary') ? engine.cylinders * 2 : engine.cylinders;

    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        switch(key) {
            case 'chassis': // gather pricing data for all associated chassis connectors
                break;
            case 'injectors': // calulate based on engine sizing/type
                summary.push(cartBuilder(input[key], ign_inj_count, 'injectors'));
                break;
            case 'ignition': // calulate based on engine sizing/type
                summary.push(cartBuilder(input[key], ign_inj_count, 'ignition_coils'));
                break;
            case 'clt': // singular query for clt
                summary.push(cartBuilder(input[key], 1, 'clt_options'));
                break;
            case 'iat': // singular query for iat
                summary.push(cartBuilder(input[key], 1, 'iat_options'));
                break;
            case 'trigger': // singular query for trigger sensor
                summary.push(cartBuilder(input[key], 1, 'trigger_options'));
                break;
            case 'tps': // singular query for tps sensor
                summary.push(cartBuilder(input[key], 1, 'analog_inputs'));
                break;
            case 'can_devices': // bundle query for can device
                summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'can_bus');
                }))
                break;
            case 'auxiliary_options': // bundle query for aux device
                summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'auxiliary_options');
                }))            
                break;
            case 'analog_inputs': // bundle query for analog input
                summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'analog_inputs');
                }))  
                break;
        }
    }
    console.log(summary)
    return summary;
}

let cartBuilder = function(pn, qty, category) {

    console.log({ pn, qty, category })
    let conn = _.findWhere(serverData.connectors[category], { part_number: pn });
    let source;
    console.log(conn)

    if (conn.sources == 0) return null;

    try {
        source = conn.sources[0];
    } catch (e) {
        return null;
    }

    let row = {
        name: conn.name,
        qty: qty,
        source: source,
        est_cost: qty * source.estimated_price
    }
    return row;

}

let connectorQuery = function(pn, category) {}
let multiConnectorQuery = function() {}


let displaySummary = function(summary) {
    return 0;
}

/* Updates in realtime any values are changed throughout all the pages */
$(document).ready(function () {
    $('#nav-tabContent').on('change', function () {
        let cartSummary = getCartSummary(getUserInput());
        displaySummary(cartSummary);
        console.log('change detected')
    });
});
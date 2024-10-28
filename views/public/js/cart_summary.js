
let getCartSummary = function(input) {
    let summary = [];
    let keys = Object.keys(input);

    let engine = _.findWhere(serverData.engines, { id: input.engine });
    let ign_inj_count = (engine.type == 'rotary') ? engine.cylinders * 2 : engine.cylinders;
    let flex_sensor_id = serverData.connectors['flex_options'][0].part_number;

    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        switch(key) {
            case 'chassis': // gather pricing data for all associated chassis connectors
                let connector_ids = _.findWhere(serverData.chassis, { id: input.chassis }).chassis_connectors;
                connector_ids.map((name) => {
                    let pn = _.findWhere(serverData.connectors['chassis_options'], { name }).part_number
                    summary.push(cartBuilder(pn, 1, 'chassis_options'))
                });
                break;
            case 'inserts':
                let inserts_ids = input.inserts;
                for (let j = 0; j < inserts_ids.length; j++) {
                    let insertDefinition = _.findWhere(serverData.inserts, { id: inserts_ids[j] });
                    let additional_connectors = insertDefinition.additional_connectors;
                    for (let k = 0; k < additional_connectors.length; k++) {
                        // add connector if it has not been added before
                        let category = additional_connectors[k].category;
                        let name = additional_connectors[k].name;
                        let connDef = _.findWhere(serverData.connectors[category], { name })
                        if (!_.findWhere(summary, { name })) {
                            summary.push(cartBuilder(connDef.part_number, 1, category))
                        }
                    }
                }
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
                if (input[key] && !input.dbw) summary.push(cartBuilder(input[key], 1, 'analog_inputs'));
                break;
            case 'can_devices': // bundle query for can device
                summary = summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'can_bus');
                }))
                break;
            case 'flex':
                if (input[key]) summary.push(cartBuilder(flex_sensor_id, 1, 'flex_options'));
                break;
            case 'dbw':
                if (input[key]) {
                    summary.push(cartBuilder(input.dbw.pedal, 1, 'dbw_app_options')); // pedal
                    summary.push(cartBuilder(input.dbw.throttle_body, 1, 'dbw_tb_options')); // motor
                }
                break;
            case 'idle_valve':
                if (input[key] && !input.dbw) summary.push(cartBuilder(input[key], 1, 'stepper_valve_options'));
                break;
            case 'auxiliary_options': // bundle query for aux device
                summary = summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'auxiliary_options');
                }))            
                break;
            case 'analog_inputs': // bundle query for analog input
                summary = summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'analog_inputs');
                }))  
                break;
        }
    }
    return _.without(summary, null);
}

let cartBuilder = function(pn, qty, category) {

    if (!pn) return null;

    let conn = _.findWhere(serverData.connectors[category], { part_number: pn });
    let source;

    if (!conn) return null;

    source = conn.sources[0];

    let row = {
        name: conn.name,
        qty: qty,
        source: (source) ? source : null,
        est_cost: (source) ? qty * source.estimated_price : null
    }

    return row;

}


let displaySummary = function(summary) {
    let tableItems = [];
    for (let i = 0; i < summary.length; i++) {
        let conn = summary[i];
        if (conn.source) {
            tableItems.push(`
                <tr>
                    <th scope="row">${conn.name}</th>
                    <td>${conn.qty}</td>
                    <td><a target="_blank" href="${conn.source.url}">${conn.source.seller}</a></td>
                    <td>$${currencyFormatted(conn.est_cost)}</td>
                </tr>
            `)
        } else {
            tableItems.push(`
                <tr>
                    <th scope="row">${conn.name}</th>
                    <td>${conn.qty}</td>
                    <td>NLA</a></td>
                    <td>---</td>
                </tr>
            `)   
        }
    }
    let tableBody = tableItems.join('\n');
    $('#summaryTableBody').html(tableBody);
}

function currencyFormatted(amount) {
    var i = parseFloat(amount);
    if(isNaN(i)) { i = 0.00; }
    var minus = '';
    if(i < 0) { minus = '-'; }
    i = Math.abs(i);
    i = parseInt((i + .005) * 100);
    i = i / 100;
    s = new String(i);
    if(s.indexOf('.') < 0) { s += '.00'; }
    if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
    s = minus + s;
    return s;
}

let refreshCartSummary = function() {
    let cartSummary = getCartSummary(getUserInput());
    displaySummary(cartSummary);
}

/* Updates in realtime any values are changed throughout all the pages */
// $(document).ready(function () {
//     refreshCartSummary()
//     $('#nav-tabContent').on('change', function () {
//         refreshCartSummary()
//     });
// });
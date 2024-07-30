
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
                summary = summary.concat(input[key].map((pn) => {
                    return cartBuilder(pn, 1, 'can_bus');
                }))
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

    let conn = _.findWhere(serverData.connectors[category], { part_number: pn });
    let source;

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


let displaySummary = function(summary) {
    let tableItems = [];
    for (let i = 0; i < summary.length; i++) {
        let conn = summary[i];
        tableItems.push(`
            <tr>
                <th scope="row">${conn.name}</th>
                <td>${conn.qty}</td>
                <td><a target="_blank" href="${conn.source.url}">${conn.source.seller}</a></td>
                <td>$${currencyFormatted(conn.est_cost)}</td>
            </tr>
        `)
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
$(document).ready(function () {
    refreshCartSummary()
    $('#nav-tabContent').on('change', function () {
        refreshCartSummary()
    });
});
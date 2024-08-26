const _ = require('underscore');

const ecus = require('../definitions/ecus.json');
const connectors = require('../definitions/connector-list.json');
const chassis = require('../definitions/chassis.json');
const engines = require('../definitions/engines.json');
const inserts = require('../definitions/inserts.json');

let connector = {};

let imgDir = '../pinout_data'
let genericImagePaths = {
    ground: imgDir + '/generic/ground.png'
}

connector.getImage = function(partNumber, type) {
    let findImage;
    let image = {};
    if (type == 'ecu') {
        findImage = _.findWhere(ecus, { id: partNumber }).image
    } else {
        findImage = _.findWhere(connectors[type], { part_number: partNumber }).image
    }
    if (findImage) {
        image.src = imgDir + findImage.src
        image.height = findImage.height;
        image.width = findImage.width;
    }
    return (findImage) ? image : null;
}

connector.create = function(partNumber, type) {
    let pins;
    let ecu = (type == 'ecu') ? _.findWhere(ecus, { id: partNumber }) : null;

    if (type == "ecu") {
        if (typeof ecu.pinout[0].pin == 'number') {
            pins = _.pluck(_.sortBy(ecu.pinout, 'pin'), 'name');
        } else {
            pins = _.pluck(ecu.pinout, 'name');
        }
    } else {
        if (type == "tps") type = "analog_inputs"; // read tps value from analog inputs
        pins = _.pluck(_.findWhere(connectors[type], {
            part_number: partNumber
        }).pinout, 'name');
    }
    
    let conn =  {
        type: type,
        notes: (pins.length > 1) ? 'Harness Side View' : null,
        key: (type == "ecu") ? _.findWhere(ecus, { id: partNumber }).name : _.findWhere(connectors[type], { part_number: partNumber }).name,
        pn: partNumber,
        hide_disconnected_pins: (type == "ecu") ? true : false,
        pinlabels: pins,
        image: connector.getImage(partNumber, type),
        bgcolor: (type == "ecu") ? '#ADD8E6' : '#FFFFFF'
    }

    if (type == "ecu" && typeof ecu.pinout[0].pin == 'string') {
        conn.pins = _.pluck(_.findWhere(ecus, { id: partNumber }).pinout, 'pin')
    }

    return conn;
}

connector.createECUGrounds = function(ecu_id) {
    let ecuPinout = _.findWhere(ecus, { id: ecu_id }).pinout;
    let groundPins = _.where(ecuPinout, { type: 'ground' })
    return {
        type: 'ecu-grounds',
        key: 'ECU Ground Terminal',
        hide_disconnected_pins: false,
        image: {
            src: genericImagePaths.ground,
            height: 60
        },
        pincount: groundPins.length
    }
}

connector.createChassisConnections = function(chassis_id) {
    // Look into chassis definitions file and add all the connectors in the definition file
    let list = []
    let connectorIDs = _.findWhere(chassis, { id: chassis_id }).chassis_connectors
    for (let i = 0; i < connectorIDs.length; i++) {
        let connector_id = connectorIDs[i];
        let chassisConnector = _.findWhere(connectors.chassis_options, { name: connector_id });
        let conn = {
            hide_disconnected_pins: true,
            key: chassisConnector.name,
            type: 'chassis_connection',
            notes: 'Harness Side View',
            pn: connector_id,
            pinlabels: _.pluck(chassisConnector.pinout, 'name'),
            bgcolor: '#E5FFCC',
            image: (chassisConnector.image) ? connector.getImage(chassisConnector.part_number, 'chassis_options') : null,
        }
        if (typeof chassisConnector.pinout[0].pin == 'string') conn.pins = _.pluck(chassisConnector.pinout, 'pin')
        list.push(conn);
    }
    return list;
}
connector.createInsertConnections = function(input) {
    
    // Currently Populated Chassis Connectors
    let chassisConnectors = _.findWhere(chassis, { id: input.chassis }).chassis_connectors;

    let list = [];
    let connObjs = [];

    for (let i = 0; i < input.inserts.length; i++) {
        let insertID = input.inserts[i];
        let insertQuery = _.findWhere(inserts, { id: insertID });
        // Check if connector is already in list or chassis connectors array to avoid duplicate add
        for (let j = 0; j < insertQuery.additional_connectors.length; j++) {
            let additional_connector = insertQuery.additional_connectors[j];
            let additional_connector_query = _.findWhere(connectors[additional_connector.category], { name: additional_connector.name });

            let listCheck = _.findWhere(list, { name: additional_connector.name, part_number: additional_connector_query.part_number })
            let chassisCheck = _.findWhere(chassisConnectors, { name: additional_connector.name, part_number: additional_connector_query.part_number })

            if (!listCheck && !chassisCheck) {

                list.push(additional_connector_query);
                let connObj = {
                    hide_disconnected_pins: true,
                    key: additional_connector_query.name,
                    type: 'insert',
                    notes: 'Harness Side View',
                    pn: additional_connector_query.part_number,
                    pinlabels: _.pluck(additional_connector_query.pinout, 'name'),
                    bgcolor: '#E5FFCC',
                    image: (additional_connector_query.image) ? connector.getImage(additional_connector_query.part_number, additional_connector.category) : null,
                }

                if (typeof additional_connector_query.pinout[0].pin == 'string') connObj.pins = _.pluck(additional_connector_query.pinout, 'pin')

                connObjs.push(connObj);
            }

        }
    }

    return connObjs;

}

connector.createInjectorConnections = function(partNumber, engineType) {
    let list = []
    let engine = _.findWhere(engines, { id: engineType });
    let injector = _.findWhere(connectors.injectors, { part_number: partNumber });
    let injectorCount = engine.cylinders;
    if (engine.type == "rotary") injectorCount *= 2;
    for (let i = 0; i < injectorCount; i++) {
        list.push({
            key: `Injector ${i + 1}`,
            type: 'injector',
            pn: partNumber,
            hide_disconnected_pins: false,
            image: connector.getImage(partNumber, 'injectors'),
            pinlabels: _.pluck(injector.pinout, 'name')
        })
    }
    return list;
}

connector.createIgnitionConnections = function(partNumber, engineType) {
    let list = []
    let engine = _.findWhere(engines, { id: engineType });
    let coil = _.findWhere(connectors.ignition_coils, { part_number: partNumber });
    let coilCount = engine.cylinders;
    if (engine.type == "rotary") coilCount *= 2;
    for (let i = 0; i < coilCount; i++) {
        list.push({
            key: `Ignition ${i + 1}`,
            notes: 'Harness Side View',
            type: 'ignition',
            pn: partNumber,
            image: connector.getImage(partNumber, 'ignition_coils'),
            hide_disconnected_pins: false,
            pinlabels: _.pluck(coil.pinout, 'name')
        })
    }
    return list;
}

connector.createTempConnections = function(clt_pn, iat_pn) {
    let list = []
    for (let i = 0; i < 2; i++) {
        let obj;
        let connectorSection = ['clt_options', 'iat_options']
        let connectorPNs = [clt_pn, iat_pn]

        obj = _.findWhere(connectors[connectorSection[i]], { part_number: connectorPNs[i] })

        list.push({
            key: obj.name,
            type: 'temp',
            pn: obj.part_number,
            image: connector.getImage(connectorPNs[i], connectorSection[i]),
            hide_disconnected_pins: false,
            pinlabels: _.pluck(obj.pinout, 'name')
        })
    }
    return list;
}

connector.createMultipleConnections = function(partNumbers, type) {
    let list = []
    for (let i = 0; i < partNumbers.length; i++) {
        let conn = connector.create(partNumbers[i], type);
        conn.index = i;
        list.push(conn);
    }
    return connector.clean(list);
}

connector.createCoilGrounds = function(engineType) {
    let list = []
    let engine = _.findWhere(engines, { id: engineType });
    let count = engine.cylinders;
    if (engine.type == "rotary") count *= 2;
    for (let i = 0; i < count; i++) {
        list.push({
            key: `Coil Ground ${i + 1}`,
            type: 'ground',
            pn: 'gnd',
            hide_disconnected_pins: true,
            image: {
                src: genericImagePaths.ground,
                height: 60
            },
            pincount: 1
        })
    }
    return connector.clean(list);
}

connector.clean = function(arr) {
    for (let i = 0; i < arr.length; i++) {
        let where = _.where(arr, { key: arr[i].key });
        if (where.length > 1) {
            for (let j = 0; j < where.length; j++) {
                let indexToModify = where[j].index;
                arr[indexToModify].key = `${arr[indexToModify].key} (No. ${j + 1})`
            }
        }
    }
    return arr;
}

module.exports = connector;
const _ = require('underscore');

const ecus = require('../definitions/ecus.json');
const connectors = require('../definitions/connector-list.json');
const chassis = require('../definitions/chassis.json');
const engines = require('../definitions/engines.json');
const inserts = require('../definitions/inserts.json');

const { FUSEBOX, BATTERY } = require('./helpers/constants.js');

let imgDir = '../pinout_data'
let genericImagePaths = {
    ground: imgDir + '/generic/ground.png'
}

class Connector {

    constructor(context) {
        this.context = context;
    }

    getImage(partNumber, type) {
        let findImage;
        let image = {};
        if (type == 'ecu') {
            findImage = _.findWhere(ecus, {
                id: partNumber
            }).image
        } else {
            findImage = _.findWhere(connectors[type], {
                part_number: partNumber
            }).image
        }
        if (findImage) {
            image.src = imgDir + findImage.src
            image.height = findImage.height;
            image.width = findImage.width;
        }
        return (findImage) ? image : null;
    }

    create(partNumber, type) {

        let pins;
        let ecu = (type == 'ecu') ? _.findWhere(ecus, { id: partNumber }) : null;

        if ((type == 'tps') && (this.context.input.dbw)) return null; // eject as dbw uses a different strategy

        if (type == "ecu") {
            if (typeof ecu.pinout[0].pin == 'number') {
                pins = _.pluck(_.sortBy(ecu.pinout, 'pin'), 'name');
            } else {
                pins = _.pluck(ecu.pinout, 'name');
            }
        } else {
            console.log({partNumber, type})
            if (type == 'tps') type = 'analog_inputs' // read tps value from analog inputs
            pins = _.pluck(_.findWhere(connectors[type], {
                part_number: partNumber
            }).pinout, 'name');
        }

        let conn = {
            type: type,
            notes: (pins.length > 1) ? 'Harness Side View' : null,
            key: (type == "ecu") ? _.findWhere(ecus, {
                id: partNumber
            }).name : _.findWhere(connectors[type], {
                part_number: partNumber
            }).name,
            pn: partNumber,
            hide_disconnected_pins: (type == "ecu") ? true : false,
            pinlabels: pins,
            image: this.getImage(partNumber, type),
            bgcolor: (type == "ecu") ? '#ADD8E6' : '#FFFFFF',
        }

        if (type == "ecu") {
            conn.pins = _.pluck(_.findWhere(ecus, {
                id: partNumber
            }).pinout, 'pin')
        }

        return conn;
    }

    createFusebox() {
        let fb = FUSEBOX[0];
        let conn = {
            type: fb.TYPE,
            key: fb.PART_NUMBER,
            pn: fb.PART_NUMBER,
            hide_disconnected_pins: false,
            pinlabels: _.pluck(fb.PINLABELS, 'name'),
            image: {
                src: imgDir + '/generic/' + fb.IMAGE_FILE,
                height: 400
            }
        }
        return conn;
    }

    createBattery() {
        let conn = {
            type: BATTERY.TYPE,
            key: BATTERY.PART_NUMBER,
            pn: BATTERY.PART_NUMBER,
            hide_disconnected_pins: false,
            pinlabels: _.pluck(BATTERY.PINLABELS, 'name'),
            image: {
                src: imgDir + '/generic/' + BATTERY.IMAGE_FILE,
                height: 150
            }
        }
        return conn;
    }

    createECUGrounds() {
        let ecuPinout = _.findWhere(ecus, {
            id: this.context.input.ecu
        }).pinout;
        let groundPins = _.where(ecuPinout, {
            type: 'ground'
        })
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

    createChassisConnections() {
        // Look into chassis definitions file and add all the connectors in the definition file
        let list = []
        let connectorIDs = _.findWhere(chassis, {
            id: this.context.input.chassis
        }).chassis_connectors
        for (let i = 0; i < connectorIDs.length; i++) {
            let connector_id = connectorIDs[i];
            let chassisConnector = _.findWhere(connectors.chassis_options, {
                name: connector_id
            });
            let conn = {
                hide_disconnected_pins: true,
                key: chassisConnector.name,
                type: 'chassis_connection',
                notes: 'Harness Side View',
                pn: connector_id,
                pinlabels: _.pluck(chassisConnector.pinout, 'name'),
                bgcolor: '#E5FFCC',
                image: (chassisConnector.image) ? this.getImage(chassisConnector.part_number, 'chassis_options') : null,
            }
            if (typeof chassisConnector.pinout[0].pin == 'string') conn.pins = _.pluck(chassisConnector.pinout, 'pin')
            list.push(conn);
        }
        return list;
    }

    createInsertConnections() {
        // Currently Populated Chassis Connectors
        let chassisConnectors = _.findWhere(chassis, {
            id: this.context.input.chassis
        }).chassis_connectors;

        let list = [];
        let connObjs = [];

        for (let i = 0; i < this.context.input.inserts.length; i++) {
            let insertID = this.context.input.inserts[i];
            let insertQuery = _.findWhere(inserts, {
                id: insertID
            });
            // Check if connector is already in list or chassis connectors array to avoid duplicate add
            for (let j = 0; j < insertQuery.additional_connectors.length; j++) {
                let additional_connector = insertQuery.additional_connectors[j];
                let additional_connector_query = _.findWhere(connectors[additional_connector.category], {
                    name: additional_connector.name
                });

                let listCheck = _.findWhere(list, {
                    name: additional_connector.name,
                    part_number: additional_connector_query.part_number
                })
                let chassisCheck = _.findWhere(chassisConnectors, {
                    name: additional_connector.name,
                    part_number: additional_connector_query.part_number
                })

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
                        image: (additional_connector_query.image) ? this.getImage(additional_connector_query.part_number, additional_connector.category) : null,
                    }

                    if (typeof additional_connector_query.pinout[0].pin == 'string') connObj.pins = _.pluck(additional_connector_query.pinout, 'pin')

                    connObjs.push(connObj);
                }

            }
        }

        return connObjs;

    }

    createInjectorConnections() {
        let partNumber = this.context.input.injectors;
        let engineType = this.context.input.engine;
        let list = []
        let engine = _.findWhere(engines, {
            id: engineType
        });
        let injector = _.findWhere(connectors.injectors, {
            part_number: partNumber
        });
        let injectorCount = engine.cylinders;
        if (engine.type == "rotary") injectorCount *= 2;
        for (let i = 0; i < injectorCount; i++) {
            list.push({
                key: `Injector ${i + 1}`,
                type: 'injector',
                pn: partNumber,
                hide_disconnected_pins: false,
                image: this.getImage(partNumber, 'injectors'),
                pinlabels: _.pluck(injector.pinout, 'name')
            })
        }
        return list;
    }

    createIgnitionConnections() {

        let partNumber = this.context.input.ignition;
        let engineType = this.context.input.engine;

        let list = []
        let engine = _.findWhere(engines, {
            id: engineType
        });
        let coil = _.findWhere(connectors.ignition_coils, {
            part_number: partNumber
        });
        let coilCount = engine.cylinders;
        if (engine.type == "rotary") coilCount *= 2;
        for (let i = 0; i < coilCount; i++) {
            list.push({
                key: `Ignition ${i + 1}`,
                notes: 'Harness Side View',
                type: 'ignition',
                pn: partNumber,
                image: this.getImage(partNumber, 'ignition_coils'),
                hide_disconnected_pins: false,
                pinlabels: _.pluck(coil.pinout, 'name')
            })
        }
        return list;
        
    }

    createTempConnections() {
        let clt_pn = this.context.input.clt;
        let iat_pn = this.context.input.iat;
        let list = []
        for (let i = 0; i < 2; i++) {
            let obj;
            let connectorSection = ['clt_options', 'iat_options']
            let connectorPNs = [clt_pn, iat_pn]

            obj = _.findWhere(connectors[connectorSection[i]], {
                part_number: connectorPNs[i]
            })

            list.push({
                key: obj.name,
                type: 'temp',
                pn: obj.part_number,
                image: this.getImage(connectorPNs[i], connectorSection[i]),
                hide_disconnected_pins: false,
                pinlabels: _.pluck(obj.pinout, 'name')
            })
        }
        return list;
    }

    createMultipleConnections(partNumbers, type) {
        let list = []
        for (let i = 0; i < partNumbers.length; i++) {
            let conn = this.create(partNumbers[i], type);
            conn.index = i;
            list.push(conn);
        }
        return this.clean(list);
    }

    createCoilGrounds() {
        let engineType = this.context.input.engine;
        let list = []
        let engine = _.findWhere(engines, {
            id: engineType
        });
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
        return this.clean(list);
    }

    clean(arr) {
        for (let i = 0; i < arr.length; i++) {
            let where = _.where(arr, {
                key: arr[i].key
            });
            if (where.length > 1) {
                for (let j = 0; j < where.length; j++) {
                    let indexToModify = where[j].index;
                    arr[indexToModify].key = `${arr[indexToModify].key} (No. ${j + 1})`
                }
            }
        }
        return arr;
    }

}

module.exports = Connector;
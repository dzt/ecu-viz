module.exports = {
    COLOR_CODE: 'DIN',
    WIRE_GAUGE: '0.25 mm2',
    CABLE: {
        ECU: 'ECU to Chassis Connections',
        INJ: 'Fuel Injectors',
        IGN: 'Ignition System',
        ANALOG: 'Analog Inputs',
        TEMP: 'Temperature Sensors',
        AUX: 'Auxiliary Outputs',
        TRIG: 'Trigger Sensor(s)',
        CAN: 'CAN Bus Communication',
        FLEX: 'Flex Fuel'
    },
    ECU_GROUND: {
        CABLE: 'ECU Ground(s)',
        CONNECTOR: 'ECU Ground Terminal'
    },
    FUSEBOX: [
        {
            PART_NUMBER: 'FUSEBOX_TYP1',
            TYPE: 'fusebox',
            IMAGE_FILE: 'relaybox_1.png',
            PINLABELS: [
                { name: 'Switched 12V+ via Ignition Switch', type: 'switched_12v' },
                { name: 'Ground', type: 'ground' },
                { name: 'Battery (Constant 12V+)', type: 'battery' },
                { name: 'Battery (Constant 12V+)', type: 'battery' },
                { name: 'Main Relay Output 12V+', type: 'main_12v' },
                { name: 'Ignition Relay Output 12V+', type: 'ign_12v' }
            ]
        }
    ]
};
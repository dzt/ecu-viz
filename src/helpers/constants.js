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
        FLEX: 'Flex Fuel',
        IDLE: 'Idle Control Valve',
        DBW_MOTOR: 'Drive by Wire Throttle Body',
        DBW_PEDAL: 'Drive by Wire Accelerator Pedal'
    },
    ECU_GROUND: {
        CABLE: 'ECU Ground(s)',
        CONNECTOR: 'ECU Ground Terminal'
    },
    BATTERY: {
        PART_NUMBER: 'BATTERY',
        TYPE: 'battery',
        IMAGE_FILE: 'battery.png',
        PINLABELS: [
            { name: 'Positive (+)' },
            { name: 'Negative (-)' },
        ]
    },
    FUSEBOX: [
        {
            PART_NUMBER: 'FUSEBOX_TYPE1',
            TYPE: 'fusebox',
            IMAGE_FILE: 'relaybox_1.png',
            PINLABELS: [
                { name: 'Switched 12V+ via Ignition Switch', type: 'switched_12v' },
                { name: 'Ground', type: 'ground' },
                { name: 'Battery (Constant 12V+)', type: 'battery_12v' },
                { name: 'Battery (Constant 12V+)', type: 'battery_12v' },
                { name: 'Main Relay Output 12V+', type: 'main_12v' },
                { name: 'Ignition Relay Output 12V+', type: 'ign_12v' }
            ]
        }
    ]
};
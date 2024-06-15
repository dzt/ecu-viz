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
    IGN_RELAY: {
        PART_NUMBER: '4-pin-relay',
        TYPE: 'relay',
        KEY: 'Ignition Coil Relay',
        PINLABELS: [
            'Output 12V+ (87)',
            'Ground (85)',
            'Constant 12V+ (30)',
            'Switched 12V+ (86)'
        ]
    }
};
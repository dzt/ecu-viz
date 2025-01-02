module.exports = function(chassis_options) {
    
    let chassis_connectors = [];
    for (let i = 0; i < chassis_options.length; i++) {
        let chassis = chassis_options[i];
        let chassis_definition = require(`../pinout_data/chassis/${chassis}/connectors.json`);
        chassis_connectors = chassis_connectors.concat(chassis_definition);
    }

    return {
        chassis_options: [], // Chassis Specific Connectors
        analog_inputs: require('./connectors/analog_inputs.json'), // Ananlog Inputs
        injectors: require('./connectors/injectors.json'), // Injector Variants
        can_bus: require('./connectors/can_bus.json'), // CAN Specific Devices
        ignition_coils: require('./connectors/ignition_coils.json'), // Ignition Coils
        auxiliary_options: require('./connectors/auxiliary_options.json'), // Auxiliary Devices
        clt_options: require('./connectors/clt_options.json'), // Coolant Temp Sensors
        iat_options: require('./connectors/iat_options.json'), // Intake Air Temp Sensors
        trigger_options: require('./connectors/trigger_options.json'), // Trigger Sensors
        flex_options: require('./connectors/flex_options.json'), // Ethonal Content Sensors
        accessories: require('./connectors/accessories.json'), // Misc sensors, switches, etc.
        generics: require('./connectors/generics.json'), // Starter, Terminals, etc.
        wideband_options: require('./connectors/wideband_options.json'), // Wideband Sensors
        stepper_valve_options: require('./connectors/stepper_valve_options.json'), // Stepper Valve Motors
        dbw_tb_options: require('./connectors/dbw_tb_options.json'), // DBW Throttle Bodies
        dbw_app_options: require('./connectors/dbw_app_options.json'), // DBW Pedal Options
    }
}
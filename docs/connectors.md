
This documentation describes the schema for connectors used in the `ecu-viz` definitions file. Each connector serves a unique purpose and has specific attributes.

### Connector Schema

- **Type:** `Object`
  - **`name`** (`String`): The name of the connector. This is not the part number. Example: `"Sumitomo HX 090 Sealed Series 3-Way Connector (Male)"` or `"GM/Delphi Ignition Coil"`.
  - **`allow_multiple`** (`Boolean`): Allows multiple instances of the same connector.
  - **`part_number`** (`String`): The OE part number of the connector, serving as a unique identifier. Avoid repetition within the definition file.
  - **`connector_type`** (`String`): Describes the type of the connector, such as `"Male"` or `"Female"`.
  - **`sources`** (`Array<String>`): URLs related to the connector (e.g., purchase links, data sheets).
  - **`pinout`** (`Array<Object>`): Defines the connector's pinout.
    - **`name`** (`String`): Pin assignment according to the connector's function.
    - **`type`** (`String`): Determines the function of the pin. See the `Connector Types` section for more details.
    - **`pin`** (`Number`): Unique pin number.
  - **`image`** (`Object`): Pinout image.
    - **`src`** (`String`): Image path.
    - **`height`** (`Number`): Image height.

### Example

```json
{
  "name": "Mazda Series 4/5 CAS",
  "part_number": "6187-4441",
  "connector_type": "Female",
  "sources": ["https://www.corsa-technic.com/item.php?item_id=341"],
  "pinout": [
    { "name": "G+", "type": "trigger", "pin": 1 },
    { "name": "G-", "type": "home_ground", "pin": 2 },
    { "name": "Ne+", "type": "home", "pin": 3 },
    { "name": "Ne-", "type": "trigger_ground", "pin": 4 }
  ],
  "image": {
    "src": "/trigger_sensors/s4_s5_cas.png",
    "height": 120
  }
}
```

### Connector Types

#### `chassis_options`
Primary connectors interfacing between the OE body harness and engine harness. Includes pins for Switched 12V+ sources, Fuel Pump Control, and Tachometer signal.
- Pin Type Options:
  - `"switched_12v"` (Required)
  - `"constant_12v"` (Required)
  - `"clt_cluster"` (Optional)
  - `"fuel_pump"` (Required)
  - `"l_terminal"` (Optional)

#### `analog_inputs`
Connectors or devices serving as 0-5V analog inputs (e.g., pressure sensors, wideband inputs, throttle position sensors).
- Pin Type Options:
  - `"signal"` (Required)
  - `"vref"` (Optional)
  - `"vref_ground"` (Optional)

#### `injectors`
Non-polar circuits with designated 12V+ and Signal Pins.
- Pin Type Options:
  - `"switched_12v"`
  - `"signal"`

#### `can_bus`
- Pin Type Options:
  - `"switched_12v"` (Optional)
  - `"ground"` (Optional)
  - `"can_h"` (Required)
  - `"can_l"` (Required)

#### `ignition_coils`
- Pin Type Options:
  - `"ground"` (Required)
  - `"signal"` (Required)
  - `"switched_12v"` (Required)

#### `auxiliary_options`
- Pin Type Options:
  - `"switched_12v"` (Required)
  - `"signal"` (Required)

#### `alternator_options`
- Pin Type Options:
  - `"switched_12v"` (Optional, IG Terminal)
  - `"constant_12v"` (Optional, Sense Terminal)
  - `"l_terminal"` (Optional, Alternator Charge Light / L Terminal)

#### `clt_options`
- Pin Type Options:
  - `"signal"` (Required)
  - `"vref_ground"` (Required)

#### `iat_options`
- Pin Type Options:
  - `"signal"` (Required)
  - `"vref_ground"` (Required)

#### `trigger_options`
- Pin Type Options:
  - `"home"` (Required)
  - `"home_ground"` (Required)
  - `"trigger"` (Optional)
  - `"trigger_ground"` (Optional)
  - `"switched_12v"` (Optional)

#### `flex_options`
- Pin Type Options:
  - `"switched_12v"` (Required)
  - `"ground"` (Required)
  - `"signal"` (Required)

#### `accessories`
Primarily used for inserts. Pin Types are typically set to `null` as they are not considered for inserts. See the inserts README for further details.

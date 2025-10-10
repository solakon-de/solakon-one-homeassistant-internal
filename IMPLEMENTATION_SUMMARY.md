# Solakon ONE Home Assistant Integration - Implementation Summary

## Overview

Successfully implemented full read and write functionality for critical inverter control parameters based on the FOX Inverter Modbus definition (V1.05.02.00).

## Implemented Features

### 1. BMS1 SoC (Battery State of Charge) - **Read-Only**
- **Register Address:** 37612
- **Type:** U16
- **Scale:** 1
- **Unit:** %
- **Home Assistant Entities:**
  - `sensor.solakon_one_battery_state_of_charge` - Shows current battery charge percentage

### 2. EPS Output - **Read and Write**
- **Register Address:** 46613
- **Type:** U16
- **Values:**
  - 0 = Disable
  - 2 = EPS Mode
  - 3 = UPS Mode
- **Home Assistant Entities:**
  - `sensor.solakon_one_eps_output_mode` - Shows current EPS mode
  - `select.solakon_one_eps_output_control` - Control to change EPS mode

### 3. Export Power Limit - **Read and Write**
- **Register Address:** 46616 (2 registers, I32)
- **Type:** I32
- **Scale:** 1
- **Unit:** W (Watts)
- **Range:** [0, Pmax]
- **Home Assistant Entities:**
  - `sensor.solakon_one_export_power_limit` - Shows current power export limit
  - `number.solakon_one_export_power_limit_control` - Control to set power export limit

### 4. Work Mode - **Read and Write**
- **Register Address:** 49203
- **Type:** U16
- **Values:**
  - 1 = Self Use
  - 2 = Feedin Priority
  - 3 = Backup
  - 4 = Peak Shaving
  - 6 = Force Charge
  - 7 = Force Discharge
- **Home Assistant Entities:**
  - `sensor.solakon_one_work_mode` - Shows current work mode
  - `select.solakon_one_work_mode_control` - Control to change work mode

## Architecture

### Dual Entity Design (Read + Write)

The implementation uses a sophisticated dual-entity approach for read/write parameters:

1. **Sensor Entities** (Read-Only Display)
   - Show current values from the inverter
   - Update every 30 seconds (configurable)
   - Provide historical data for dashboards and automations

2. **Control Entities** (Read + Write)
   - **Select Entities:** For parameters with predefined options (EPS Output, Work Mode)
   - **Number Entities:** For numeric parameters (Export Power Limit)
   - Support both reading current state and writing new values
   - Optimistic updates for responsive UI
   - Automatic refresh after write to confirm changes

### File Structure

```
custom_components/solakon_one/
├── __init__.py           # Integration setup, coordinator
├── const.py              # Register definitions, entity configurations
├── modbus.py             # Modbus TCP communication layer
├── sensor.py             # Read-only sensors
├── select.py             # Select controls (EPS Output, Work Mode)
├── number.py             # Number controls (Export Power Limit)
└── config_flow.py        # Configuration UI
```

## Implementation Details

### Register Definitions (const.py)

All registers are defined in the `REGISTERS` dictionary with proper type, scale, and access flags:

```python
REGISTERS = {
    # ... existing registers ...

    # BMS Information (Read-Only)
    "bms1_soc": {"address": 37612, "count": 1, "type": "u16", "scale": 1, "unit": "%"},

    # Control Registers (Read/Write)
    "eps_output": {"address": 46613, "count": 1, "type": "u16", "scale": 1, "rw": True},
    "export_power_limit": {"address": 46616, "count": 2, "type": "i32", "scale": 1, "unit": "W", "rw": True},
    "work_mode": {"address": 49203, "count": 1, "type": "u16", "scale": 1, "rw": True},
}
```

### Modbus Communication Flow

#### Reading (Automatic, every 30 seconds)
1. Coordinator triggers `async_read_all_data()`
2. Modbus hub reads ALL registers in `REGISTERS` dict (including RW ones)
3. Values are processed (type conversion, scaling) in `_process_register_value()`
4. Data is distributed to all entities (sensors and controls)

#### Writing (User-initiated)
1. User changes select option or number value in Home Assistant UI
2. Control entity's `async_select_option()` or `async_set_native_value()` is called
3. Value is converted to raw Modbus format (handle 32-bit, scaling, etc.)
4. Write operation via `async_write_register()` or `async_write_registers()`
5. Optimistic UI update (immediate feedback)
6. Coordinator refresh requested to confirm the change

### Type Handling

#### 16-bit Values (U16/I16)
- Single register write using `async_write_register(address, value)`
- Used for: BMS1 SoC, EPS Output, Work Mode

#### 32-bit Values (I32)
- Two-register write using `async_write_registers(address, [high, low])`
- Big-endian byte order (high word first)
- Used for: Export Power Limit
- Example: 5000W → [0x0000, 0x1388]

### Error Handling

- Connection errors: Automatic reconnection on next poll
- Write failures: Logged with detailed error messages
- Invalid values: Validated before writing
- Type mismatches: Handled with appropriate warnings

## Usage in Home Assistant

### Monitoring (Sensors)
All current values are available as sensors for:
- Dashboards and cards
- Historical graphs
- Automation triggers
- Energy management

### Control (Selects & Numbers)
Control entities allow users to:
- Change EPS mode (Disable/EPS/UPS)
- Set work mode (Self Use, Feedin Priority, etc.)
- Adjust power export limits
- Create automations based on time, price, or other conditions

### Example Automations

```yaml
# Switch to Self Use mode during peak hours
automation:
  - alias: "Peak Hours - Self Use"
    trigger:
      - platform: time
        at: "17:00:00"
    action:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Self Use"

# Limit export power at night
  - alias: "Night Export Limit"
    trigger:
      - platform: time
        at: "22:00:00"
    action:
      - service: number.set_value
        target:
          entity_id: number.solakon_one_export_power_limit_control
        data:
          value: 2000  # 2kW
```

## Testing and Verification

All implementation checks pass:
- ✓ All required files present
- ✓ Register definitions correct
- ✓ Sensor definitions configured
- ✓ Control entity definitions configured
- ✓ Platforms properly registered

## Key Improvements Over Previous Implementation

1. **Dual Entity Approach:** Separate display (sensor) and control (select/number) entities
2. **Better Type Handling:** Proper 32-bit value encoding/decoding
3. **Optimistic Updates:** Immediate UI feedback before confirmation
4. **Enhanced Logging:** Detailed debug information for troubleshooting
5. **Robust Error Handling:** Graceful degradation on errors
6. **Full Documentation:** Comprehensive comments and docstrings

## Compatibility

- **Home Assistant:** 2023.1+
- **Protocol:** Modbus TCP
- **Inverter Firmware:** Compatible with FOX Inverter Modbus V1.05.02.00
- **Models:** All FOX ESS inverters supporting these registers

## Security Considerations

- **Local Network Only:** No cloud dependencies
- **Authentication:** Uses Modbus slave ID authentication
- **Safe Defaults:** Reasonable min/max values for all parameters
- **Validation:** Input validation before writing to inverter

## Future Enhancements

Potential additions for future versions:
- Additional BMS parameters (temperature, voltage, current)
- Time-based scheduling entities
- Advanced energy management modes
- Multi-inverter support
- Battery charge/discharge scheduling

## Support

For issues or questions:
- Check Home Assistant logs for detailed error messages
- Verify Modbus TCP connectivity (IP: port 502)
- Confirm inverter firmware version supports these registers
- Review register addresses in FOX Inverter documentation

## Conclusion

The implementation provides a robust, user-friendly interface to both monitor and control critical inverter parameters. The dual-entity design ensures users can see current values while also having intuitive controls to make changes, all integrated seamlessly into the Home Assistant ecosystem.
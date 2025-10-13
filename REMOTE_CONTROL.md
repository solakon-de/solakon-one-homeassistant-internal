# Remote Control Feature

This document describes the Remote Control functionality for the Solakon ONE Home Assistant integration, based on the Remote Control Definition V1.5.

## Overview

The remote control feature allows you to directly control the inverter's power flow behavior independent of the standard work modes. This provides fine-grained control over:
- Battery charging/discharging
- Grid import/export
- Load management
- Power balancing

## Entities Created

### Select Entity: Remote Control Mode

**Entity ID:** `select.solakon_one_remote_control_mode`

Allows you to select one of 8 control modes:

1. **Disabled** - Remote control is off, inverter operates in normal mode
2. **INV Discharge (PV Priority)** - AC port discharges power, PV generation prioritized, then battery discharge
3. **INV Charge (PV Priority)** - AC port charges battery, PV power prioritized for charging, then AC charging
4. **Battery Discharge** - Battery discharges, battery prioritized, then PV discharge
5. **Battery Charge** - Battery charges, PV charging prioritized, then grid supplementation
6. **Grid Discharge** - Grid port discharges, PV prioritized, then battery discharge (limited by export/import limits)
7. **Grid Charge** - Grid port charges, grid-side charging prioritized, then PV supplementation (limited by export/import limits)
8. **INV Discharge (AC First)** - AC port discharges, PV prioritized, then battery discharge (AC power usage prioritized)
9. **INV Charge (AC First)** - AC port charges, AC power charging prioritized, then PV charging

### Number Entities

**Entity ID:** `number.solakon_one_remote_active_power`
- **Range:** -100,000 to 100,000 W
- **Positive values:** Discharge/Export power
- **Negative values:** Charge/Import power
- **Step:** 100 W

**Entity ID:** `number.solakon_one_remote_reactive_power`
- **Range:** -100,000 to 100,000 Var
- **Step:** 100 Var

**Entity ID:** `number.solakon_one_remote_timeout`
- **Range:** 0 to 3,600 seconds
- **Purpose:** If no remote control command is received within this time, the inverter exits remote control mode
- **Step:** 10 seconds

### Sensor Entities

**Entity ID:** `sensor.solakon_one_remote_control_status`
- Shows the current remote control register value (bitfield)

**Entity ID:** `sensor.solakon_one_remote_timeout_countdown`
- Shows the remaining time before remote control mode times out
- Read-only

**Entity ID:** `sensor.solakon_one_remote_active_power_command`
- Shows the current active power command value
- Read-only (shows what's actually set)

**Entity ID:** `sensor.solakon_one_remote_reactive_power_command`
- Shows the current reactive power command value
- Read-only (shows what's actually set)

## Usage Examples

### Example 1: Force Battery Charging from Grid

```yaml
# Set the mode to Battery Charge
service: select.select_option
target:
  entity_id: select.solakon_one_remote_control_mode
data:
  option: "Battery Charge"

# Set charging power to 5000W (5kW)
service: number.set_value
target:
  entity_id: number.solakon_one_remote_active_power
data:
  value: 5000

# Set timeout to 1 hour
service: number.set_value
target:
  entity_id: number.solakon_one_remote_timeout
data:
  value: 3600
```

### Example 2: Discharge Battery to Load

```yaml
# Set the mode to Battery Discharge
service: select.select_option
target:
  entity_id: select.solakon_one_remote_control_mode
data:
  option: "Battery Discharge"

# Set discharge power to 3000W (3kW)
service: number.set_value
target:
  entity_id: number.solakon_one_remote_active_power
data:
  value: 3000

# Set timeout to 30 minutes
service: number.set_value
target:
  entity_id: number.solakon_one_remote_timeout
data:
  value: 1800
```

### Example 3: Control Grid Export

```yaml
# Set the mode to Grid Discharge
service: select.select_option
target:
  entity_id: select.solakon_one_remote_control_mode
data:
  option: "Grid Discharge"

# Set export power to 2000W (2kW)
service: number.set_value
target:
  entity_id: number.solakon_one_remote_active_power
data:
  value: 2000

# Set timeout to 10 minutes
service: number.set_value
target:
  entity_id: number.solakon_one_remote_timeout
data:
  value: 600
```

### Example 4: Disable Remote Control

```yaml
# Set the mode to Disabled to return to normal operation
service: select.select_option
target:
  entity_id: select.solakon_one_remote_control_mode
data:
  option: "Disabled"
```

## Automation Example: Peak Shaving

This automation uses remote control to prevent grid import during peak hours:

```yaml
automation:
  - alias: "Peak Shaving - Morning Peak"
    trigger:
      - platform: time
        at: "07:00:00"
    action:
      # Enable Battery Discharge mode
      - service: select.select_option
        target:
          entity_id: select.solakon_one_remote_control_mode
        data:
          option: "Battery Discharge"

      # Set discharge power to 5kW
      - service: number.set_value
        target:
          entity_id: number.solakon_one_remote_active_power
        data:
          value: 5000

      # Set timeout to 4 hours
      - service: number.set_value
        target:
          entity_id: number.solakon_one_remote_timeout
        data:
          value: 14400

  - alias: "Peak Shaving - End Morning Peak"
    trigger:
      - platform: time
        at: "11:00:00"
    action:
      # Disable remote control
      - service: select.select_option
        target:
          entity_id: select.solakon_one_remote_control_mode
        data:
          option: "Disabled"
```

## Mode Details

### Mode Behaviors

Each mode has specific power flow priorities:

#### INV Discharge (PV Priority)
- **Target:** AC Port
- **Direction:** Discharge (power generation)
- **Priority:** PV → Battery → Grid
- **Use Case:** Maximize PV usage, supplement with battery if needed

#### INV Charge (PV Priority)
- **Target:** AC Port
- **Direction:** Charge (power consumption)
- **Priority:** PV → Grid
- **Use Case:** Charge battery from PV first, use grid if PV insufficient

#### Battery Discharge
- **Target:** Battery
- **Direction:** Discharge
- **Priority:** Battery → PV
- **Use Case:** Force battery discharge, supplement with PV

#### Battery Charge
- **Target:** Battery
- **Direction:** Charge
- **Priority:** PV → Grid
- **Use Case:** Charge battery from PV first, grid supplementation if needed

#### Grid Discharge
- **Target:** Grid/Meter
- **Direction:** Discharge (export)
- **Priority:** PV → Battery
- **Limits:** Export and import limits apply
- **Use Case:** Control grid export, useful for feed-in tariff optimization

#### Grid Charge
- **Target:** Grid/Meter
- **Direction:** Charge (import)
- **Priority:** Grid → PV
- **Limits:** Export and import limits apply
- **Use Case:** Import from grid to charge battery

#### INV Discharge (AC First)
- **Target:** AC Port (with grid power used first)
- **Direction:** Discharge
- **Priority:** PV → Battery (AC load prioritized)
- **Use Case:** Similar to INV Discharge (PV Priority) but different behavior when consuming power

#### INV Charge (AC First)
- **Target:** AC Port (with grid power used first)
- **Direction:** Charge
- **Priority:** AC → PV
- **Use Case:** Charge battery from AC first, then PV

## Technical Details

### Register Mapping

The remote control functionality uses the following Modbus registers:

| Register | Address | Type | R/W | Description |
|----------|---------|------|-----|-------------|
| remote_control | 46001 | U16 Bitfield | R/W | Control mode (enable, direction, target) |
| remote_timeout_set | 46002 | U16 | R/W | Timeout in seconds |
| remote_active_power | 46003-46004 | I32 | R/W | Active power command in Watts |
| remote_reactive_power | 46005-46006 | I32 | R/W | Reactive power command in VAr |
| remote_timeout_countdown | 46007 | U16 | R | Remaining timeout in seconds |

### Bitfield Structure (Register 46001)

```
Bit 0: Enable (0=Disabled, 1=Enabled)
Bit 1: Direction (0=Generation/Discharge, 1=Consumption/Charge)
Bits 3:2: Target (00=AC, 01=Battery, 10=Grid, 11=AC Grid First)
Bits 15:4: Reserved
```

### Power Sign Convention

- **Positive values (+):** Discharge, Export, Generation
- **Negative values (-):** Charge, Import, Consumption

Examples:
- `+5000 W` = Discharge 5kW from battery or export 5kW to grid
- `-5000 W` = Charge battery with 5kW or import 5kW from grid

## Safety Features

1. **Timeout Protection:** Remote control automatically disables if no command is received within the timeout period
2. **BMS Protection:** Battery charging/discharging is always limited by BMS current limits
3. **Export/Import Limits:** Grid modes respect configured export and import power limits
4. **Priority System:** Built-in priority logic ensures safe power balancing

## Limitations

1. Remote control is independent of work modes but may interact with:
   - Export/import limits
   - BMS charge/discharge limits
   - Temperature limits
   - Grid frequency/voltage limits

2. The actual power achieved may be lower than commanded due to:
   - Available PV power
   - Battery state of charge limits
   - BMS current limits
   - Inverter rated power limits
   - Grid connection limits

3. PV power is never directly controlled - it operates at maximum power point

## Troubleshooting

### Remote Control Not Working

1. Check that the mode is not "Disabled"
2. Verify the timeout hasn't expired (check `sensor.solakon_one_remote_timeout_countdown`)
3. Ensure the power command is set to a non-zero value
4. Check that the inverter is online and communicating

### Power Not Reaching Target

1. Check BMS limits (battery may be limiting charge/discharge)
2. Verify battery SOC isn't at min/max limits
3. Check that commanded power is within inverter rating
4. For grid modes, verify export/import limits aren't restricting power

### Mode Changes Not Taking Effect

1. Wait a few seconds for the inverter to process the command
2. Check Home Assistant logs for communication errors
3. Verify Modbus connection is stable
4. Try reloading the integration

## References

- Based on: Remote Control Definition V1.5 (2024-09-18)
- Manufacturer: FOX ESS / Solakon
- Applicable to: FOX Hybrid Inverters (Self-use/Feed-in/Peak-shaving modes)

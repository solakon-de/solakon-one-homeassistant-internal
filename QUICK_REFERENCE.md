# Solakon ONE Integration - Quick Reference Guide

## Entity List

After installing this integration, you'll see these entities in Home Assistant:

### Read-Only Sensors (Monitoring)
| Entity ID | Description | Unit | Update Interval |
|-----------|-------------|------|-----------------|
| `sensor.solakon_one_battery_state_of_charge` | Battery SoC | % | 30s |
| `sensor.solakon_one_eps_output_mode` | Current EPS mode | - | 30s |
| `sensor.solakon_one_export_power_limit` | Current export limit | W | 30s |
| `sensor.solakon_one_work_mode` | Current work mode | - | 30s |

### Control Entities (Read + Write)
| Entity ID | Type | Description | Values |
|-----------|------|-------------|---------|
| `select.solakon_one_eps_output_control` | Select | Change EPS mode | Disable, EPS Mode, UPS Mode |
| `select.solakon_one_work_mode_control` | Select | Change work mode | Self Use, Feedin Priority, Backup, Peak Shaving, Force Charge, Force Discharge |
| `number.solakon_one_export_power_limit_control` | Number | Set export limit | 0-100000 W (step: 100W) |

## Usage Examples

### Via Home Assistant UI

1. **View Current Values:**
   - Go to **Settings** → **Devices & Services**
   - Click on your Solakon ONE device
   - All sensor values are displayed

2. **Change EPS Mode:**
   - Find `select.solakon_one_eps_output_control`
   - Click and select: Disable, EPS Mode, or UPS Mode
   - Change is applied immediately

3. **Change Work Mode:**
   - Find `select.solakon_one_work_mode_control`
   - Click and select desired mode
   - Inverter switches to new mode

4. **Set Export Power Limit:**
   - Find `number.solakon_one_export_power_limit_control`
   - Enter desired value in Watts (e.g., 5000)
   - Limit is applied to inverter

### Via Automations (YAML)

#### Example 1: Time-Based Work Mode
```yaml
automation:
  - id: morning_feedin
    alias: "Morning - Switch to Feedin Priority"
    trigger:
      - platform: time
        at: "06:00:00"
    action:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Feedin Priority"

  - id: evening_self_use
    alias: "Evening - Switch to Self Use"
    trigger:
      - platform: time
        at: "18:00:00"
    action:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Self Use"
```

#### Example 2: Battery-Based Mode Switching
```yaml
automation:
  - id: low_battery_force_charge
    alias: "Low Battery - Force Charge"
    trigger:
      - platform: numeric_state
        entity_id: sensor.solakon_one_battery_state_of_charge
        below: 20
    action:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Force Charge"

  - id: full_battery_feedin
    alias: "Full Battery - Feedin"
    trigger:
      - platform: numeric_state
        entity_id: sensor.solakon_one_battery_state_of_charge
        above: 95
    action:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Feedin Priority"
```

#### Example 3: Dynamic Export Limiting
```yaml
automation:
  - id: dynamic_export_limit
    alias: "Dynamic Export Limit Based on Grid Load"
    trigger:
      - platform: state
        entity_id: sensor.home_power_consumption
    action:
      - service: number.set_value
        target:
          entity_id: number.solakon_one_export_power_limit_control
        data:
          value: >
            {% set consumption = states('sensor.home_power_consumption') | float %}
            {% set max_export = 10000 %}
            {% if consumption < 2000 %}
              {{ max_export }}
            {% elif consumption < 5000 %}
              {{ (max_export * 0.5) | int }}
            {% else %}
              1000
            {% endif %}
```

#### Example 4: EPS Mode Based on Weather
```yaml
automation:
  - id: storm_ups_mode
    alias: "Storm Warning - Enable UPS Mode"
    trigger:
      - platform: state
        entity_id: weather.home
        attribute: severe_weather_warning
        to: "true"
    action:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_eps_output_control
        data:
          option: "UPS Mode"
```

### Via Scripts

```yaml
script:
  peak_shaving_mode:
    alias: "Enable Peak Shaving"
    sequence:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Peak Shaving"
      - service: number.set_value
        target:
          entity_id: number.solakon_one_export_power_limit_control
        data:
          value: 5000

  backup_mode:
    alias: "Enable Full Backup Mode"
    sequence:
      - service: select.select_option
        target:
          entity_id: select.solakon_one_work_mode_control
        data:
          option: "Backup"
      - service: select.select_option
        target:
          entity_id: select.solakon_one_eps_output_control
        data:
          option: "UPS Mode"
```

### Via Services (Developer Tools)

1. **Go to Developer Tools → Services**

2. **Change Work Mode:**
   - Service: `select.select_option`
   - Target: `select.solakon_one_work_mode_control`
   - Service Data:
     ```yaml
     option: "Self Use"
     ```

3. **Set Export Limit:**
   - Service: `number.set_value`
   - Target: `number.solakon_one_export_power_limit_control`
   - Service Data:
     ```yaml
     value: 5000
     ```

## Dashboard Cards

### Simple Sensor Card
```yaml
type: entities
entities:
  - entity: sensor.solakon_one_battery_state_of_charge
  - entity: sensor.solakon_one_work_mode
  - entity: sensor.solakon_one_export_power_limit
```

### Control Card with Entities
```yaml
type: entities
title: Inverter Controls
entities:
  - entity: sensor.solakon_one_battery_state_of_charge
    name: Battery Level
  - type: divider
  - entity: select.solakon_one_work_mode_control
    name: Work Mode
  - entity: select.solakon_one_eps_output_control
    name: EPS Mode
  - entity: number.solakon_one_export_power_limit_control
    name: Export Limit
```

### Gauge Card for Battery
```yaml
type: gauge
entity: sensor.solakon_one_battery_state_of_charge
name: Battery State of Charge
min: 0
max: 100
severity:
  green: 50
  yellow: 30
  red: 20
```

## Work Mode Descriptions

| Mode | Description | Best Used When |
|------|-------------|----------------|
| **Self Use** | Prioritize using solar power for home consumption | Normal operation, minimize grid import |
| **Feedin Priority** | Export excess solar to grid | Maximize feed-in tariff earnings |
| **Backup** | Prioritize battery charging for backup | Preparing for outages |
| **Peak Shaving** | Use battery during peak rates | Reducing demand charges |
| **Force Charge** | Force battery charging from grid/solar | Building reserve, cheap grid rates |
| **Force Discharge** | Force battery discharge | High export rates, peak shaving |

## EPS Mode Descriptions

| Mode | Description | Use Case |
|------|-------------|----------|
| **Disable** | EPS output off | Normal operation |
| **EPS Mode** | Manual switchover during outage | Planned backup |
| **UPS Mode** | Automatic switchover during outage | Uninterruptible power |

## Troubleshooting

### Values Not Updating
1. Check Modbus TCP connection (IP and port 502)
2. Verify slave ID configuration
3. Check Home Assistant logs for errors

### Cannot Write Values
1. Verify inverter firmware supports write operations
2. Check if inverter is in a state that allows changes
3. Review modbus write permissions

### Invalid Value Errors
1. Ensure values are within valid ranges
2. Check work mode compatibility with current inverter state
3. Verify export limit doesn't exceed inverter max power

## Register Information (Advanced)

| Parameter | Address | Type | Range | Default |
|-----------|---------|------|-------|---------|
| BMS1 SoC | 37612 | U16 | 0-100% | - |
| EPS Output | 46613 | U16 | 0,2,3 | 0 |
| Export Power Limit | 46616 | I32 | 0-Pmax | Pmax |
| Work Mode | 49203 | U16 | 1-7 | 1 |

## Support

For issues or questions:
- Check logs: `Settings` → `System` → `Logs`
- Search for "solakon_one" in logs
- Verify inverter firmware version
- Consult FOX Inverter Modbus documentation
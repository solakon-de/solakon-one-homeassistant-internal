"""Constants for the Solakon ONE integration."""
from typing import Final

DOMAIN: Final = "solakon_one"
DEFAULT_NAME: Final = "Solakon ONE"
DEFAULT_PORT: Final = 502
DEFAULT_SLAVE_ID: Final = 1
DEFAULT_SCAN_INTERVAL: Final = 30
SCAN_INTERVAL: Final = 30

# Register definitions
REGISTERS = {
    # Model Information (Table 3-1)
    "model_name": {"address": 30000, "count": 16, "type": "string"},
    "serial_number": {"address": 30016, "count": 16, "type": "string"},
    "mfg_id": {"address": 30032, "count": 16, "type": "string"},
    
    # Version Information (Table 3-2)
    "master_version": {"address": 36001, "count": 1, "type": "u16"},
    "slave_version": {"address": 36002, "count": 1, "type": "u16"},
    "manager_version": {"address": 36003, "count": 1, "type": "u16"},
    
    # Protocol & Device Info (Table 3-5)
    "protocol_version": {"address": 39000, "count": 2, "type": "u32"},
    "rated_power": {"address": 39053, "count": 2, "type": "i32", "scale": 1000, "unit": "kW"},
    "max_active_power": {"address": 39055, "count": 2, "type": "i32", "scale": 1000, "unit": "kW"},
    
    # Status
    "status_1": {"address": 39063, "count": 1, "type": "bitfield16"},
    "alarm_1": {"address": 39067, "count": 1, "type": "bitfield16"},
    "alarm_2": {"address": 39068, "count": 1, "type": "bitfield16"},
    "alarm_3": {"address": 39069, "count": 1, "type": "bitfield16"},
    
    # PV Input
    "pv1_voltage": {"address": 39070, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "pv1_current": {"address": 39071, "count": 1, "type": "i16", "scale": 100, "unit": "A"},
    "pv2_voltage": {"address": 39072, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "pv2_current": {"address": 39073, "count": 1, "type": "i16", "scale": 100, "unit": "A"},
    "pv3_voltage": {"address": 39074, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "pv3_current": {"address": 39075, "count": 1, "type": "i16", "scale": 100, "unit": "A"},
    "pv4_voltage": {"address": 39076, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "pv4_current": {"address": 39077, "count": 1, "type": "i16", "scale": 100, "unit": "A"},
    "total_pv_power": {"address": 39118, "count": 2, "type": "i32", "scale": 1000, "unit": "kW"},
    
    # Grid Information
    "grid_r_voltage": {"address": 39123, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "grid_s_voltage": {"address": 39124, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "grid_t_voltage": {"address": 39125, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "inverter_r_current": {"address": 39126, "count": 2, "type": "i32", "scale": 1000, "unit": "A"},
    "inverter_s_current": {"address": 39128, "count": 2, "type": "i32", "scale": 1000, "unit": "A"},
    "inverter_t_current": {"address": 39130, "count": 2, "type": "i32", "scale": 1000, "unit": "A"},
    "active_power": {"address": 39134, "count": 2, "type": "i32", "scale": 1000, "unit": "kW"},
    "reactive_power": {"address": 39136, "count": 2, "type": "i32", "scale": 1000, "unit": "kVar"},
    "power_factor": {"address": 39138, "count": 1, "type": "i16", "scale": 1000},
    "grid_frequency": {"address": 39139, "count": 1, "type": "i16", "scale": 100, "unit": "Hz"},
    
    # Temperature
    "internal_temp": {"address": 39141, "count": 1, "type": "i16", "scale": 10, "unit": "°C"},
    
    # Energy Statistics
    "cumulative_generation": {"address": 39149, "count": 2, "type": "u32", "scale": 100, "unit": "kWh"},
    "daily_generation": {"address": 39151, "count": 2, "type": "u32", "scale": 100, "unit": "kWh"},
    
    # Battery Information
    "battery1_voltage": {"address": 39227, "count": 1, "type": "i16", "scale": 10, "unit": "V"},
    "battery1_current": {"address": 39228, "count": 2, "type": "i32", "scale": 1000, "unit": "A"},
    "battery1_power": {"address": 39230, "count": 2, "type": "i32", "scale": 1, "unit": "W"},
    "battery_combined_power": {"address": 39237, "count": 2, "type": "i32", "scale": 1, "unit": "W"},

    # BMS Information (Read-Only)
    "bms1_soc": {"address": 37612, "count": 1, "type": "u16", "scale": 1, "unit": "%"},

    # Control Registers (Read/Write)
    "eps_output": {"address": 46613, "count": 1, "type": "u16", "scale": 1, "rw": True},
    # "export_power_limit": {"address": 46616, "count": 2, "type": "i32", "scale": 1, "unit": "W", "rw": True},
    # "import_power_limit": {"address": 46501, "count": 2, "type": "i32", "scale": 1, "unit": "W", "rw": True},
    # "export_peak_limit": {"address": 46504, "count": 2, "type": "i32", "scale": 1, "unit": "W", "rw": True},
    "minimum_soc": {"address": 46609, "count": 1, "type": "u16", "scale": 1, "unit": "%", "rw": True},
    "maximum_soc": {"address": 46610, "count": 1, "type": "u16", "scale": 1, "unit": "%", "rw": True},
    "minimum_soc_ongrid": {"address": 46611, "count": 1, "type": "u16", "scale": 1, "unit": "%", "rw": True},
    # "work_mode": {"address": 49203, "count": 1, "type": "u16", "scale": 1, "rw": True},
    "network_status": {"address": 49240, "count": 1, "type": "u16", "scale": 1},
}

# Sensor definitions for Home Assistant
SENSOR_DEFINITIONS = {
    # Power sensors
    "total_pv_power": {
        "name": "PV Power",
        "device_class": "power",
        "state_class": "measurement",
        "unit": "kW",
        "icon": "mdi:solar-power",
    },
    "active_power": {
        "name": "Active Power",
        "device_class": "power",
        "state_class": "measurement",
        "unit": "kW",
        "icon": "mdi:flash",
    },
    "reactive_power": {
        "name": "Reactive Power",
        "device_class": "reactive_power",
        "state_class": "measurement",
        "unit": "kVar",
        "icon": "mdi:flash-outline",
    },
    "battery_combined_power": {
        "name": "Battery Power",
        "device_class": "power",
        "state_class": "measurement",
        "unit": "W",
        "icon": "mdi:battery-charging",
    },
    
    # Voltage sensors
    "pv1_voltage": {
        "name": "PV1 Voltage",
        "device_class": "voltage",
        "state_class": "measurement",
        "unit": "V",
        "icon": "mdi:flash",
    },
    "pv2_voltage": {
        "name": "PV2 Voltage",
        "device_class": "voltage",
        "state_class": "measurement",
        "unit": "V",
        "icon": "mdi:flash",
    },
    "pv3_voltage": {
        "name": "PV3 Voltage",
        "device_class": "voltage",
        "state_class": "measurement",
        "unit": "V",
        "icon": "mdi:flash",
    },
    "pv4_voltage": {
        "name": "PV4 Voltage",
        "device_class": "voltage",
        "state_class": "measurement",
        "unit": "V",
        "icon": "mdi:flash",
    },
    "grid_r_voltage": {
        "name": "Grid R Voltage",
        "device_class": "voltage",
        "state_class": "measurement",
        "unit": "V",
        "icon": "mdi:sine-wave",
    },
    "battery1_voltage": {
        "name": "Battery Voltage",
        "device_class": "voltage",
        "state_class": "measurement",
        "unit": "V",
        "icon": "mdi:battery",
    },
    
    # Current sensors
    "pv1_current": {
        "name": "PV1 Current",
        "device_class": "current",
        "state_class": "measurement",
        "unit": "A",
        "icon": "mdi:current-dc",
    },
    "pv2_current": {
        "name": "PV2 Current",
        "device_class": "current",
        "state_class": "measurement",
        "unit": "A",
        "icon": "mdi:current-dc",
    },
    "pv3_current": {
        "name": "PV3 Current",
        "device_class": "current",
        "state_class": "measurement",
        "unit": "A",
        "icon": "mdi:current-dc",
    },
    "pv4_current": {
        "name": "PV4 Current",
        "device_class": "current",
        "state_class": "measurement",
        "unit": "A",
        "icon": "mdi:current-dc",
    },
    "battery1_current": {
        "name": "Battery Current",
        "device_class": "current",
        "state_class": "measurement",
        "unit": "A",
        "icon": "mdi:current-dc",
    },
    
    # Energy sensors
    "cumulative_generation": {
        "name": "Total Energy",
        "device_class": "energy",
        "state_class": "total_increasing",
        "unit": "kWh",
        "icon": "mdi:solar-panel",
    },
    "daily_generation": {
        "name": "Daily Energy",
        "device_class": "energy",
        "state_class": "total_increasing",
        "unit": "kWh",
        "icon": "mdi:solar-panel",
    },
    
    # Temperature sensors
    "internal_temp": {
        "name": "Internal Temperature",
        "device_class": "temperature",
        "state_class": "measurement",
        "unit": "°C",
        "icon": "mdi:thermometer",
    },
    
    # Other sensors
    "power_factor": {
        "name": "Power Factor",
        "device_class": "power_factor",
        "state_class": "measurement",
        "icon": "mdi:angle-acute",
    },
    "grid_frequency": {
        "name": "Grid Frequency",
        "device_class": "frequency",
        "state_class": "measurement",
        "unit": "Hz",
        "icon": "mdi:sine-wave",
    },

    # Battery Management System
    "bms1_soc": {
        "name": "Battery State of Charge",
        "device_class": "battery",
        "state_class": "measurement",
        "unit": "%",
        "icon": "mdi:battery",
    },

    # Control Status Sensors (showing current values of controllable parameters)
    "eps_output": {
        "name": "EPS Output Mode",
        "icon": "mdi:power-standby",
    },
    # "export_power_limit": {
    #     "name": "Export Power Limit",
    #     "device_class": "power",
    #     "state_class": "measurement",
    #     "unit": "W",
    #     "icon": "mdi:transmission-tower-export",
    # },
    # "import_power_limit": {
    #     "name": "Import Power Limit",
    #     "device_class": "power",
    #     "state_class": "measurement",
    #     "unit": "W",
    #     "icon": "mdi:transmission-tower-import",
    # },
    # "export_peak_limit": {
    #     "name": "Export Peak Limit",
    #     "device_class": "power",
    #     "state_class": "measurement",
    #     "unit": "W",
    #     "icon": "mdi:transmission-tower-export",
    # },
    "minimum_soc": {
        "name": "Minimum State of Charge",
        "device_class": "battery",
        "state_class": "measurement",
        "unit": "%",
        "icon": "mdi:battery-low",
    },
    "maximum_soc": {
        "name": "Maximum State of Charge",
        "device_class": "battery",
        "state_class": "measurement",
        "unit": "%",
        "icon": "mdi:battery-high",
    },
    "minimum_soc_ongrid": {
        "name": "Minimum SoC OnGrid",
        "device_class": "battery",
        "state_class": "measurement",
        "unit": "%",
        "icon": "mdi:battery-low",
    },
    # "work_mode": {
    #     "name": "Work Mode",
    #     "icon": "mdi:cog",
    # },
    "network_status": {
        "name": "Network Status",
        "icon": "mdi:network",
    },
}

# Select entity definitions for Home Assistant
SELECT_DEFINITIONS = {
    "eps_output": {
        "name": "EPS Output Control",
        "icon": "mdi:power-standby",
        "options": {
            0: "Disable",
            2: "EPS Mode",
            3: "UPS Mode",
        },
    },
    # "work_mode": {
    #     "name": "Work Mode Control",
    #     "icon": "mdi:cog",
    #     "options": {
    #         1: "Self Use",
    #         2: "Feedin Priority",
    #         3: "Backup",
    #         4: "Peak Shaving",
    #         6: "Force Charge",
    #         7: "Force Discharge",
    #     },
    # },
}

# Number entity definitions for Home Assistant
NUMBER_DEFINITIONS = {
    # "export_power_limit": {
    #     "name": "Export Power Limit Control",
    #     "icon": "mdi:transmission-tower-export",
    #     "min": 0,
    #     "max": 100000,  # 100kW max, will be adjusted based on inverter Pmax
    #     "step": 100,
    #     "unit": "W",
    #     "device_class": "power",
    #     "mode": "box",
    # },
    # "import_power_limit": {
    #     "name": "Import Power Limit Control",
    #     "icon": "mdi:transmission-tower-import",
    #     "min": 0,
    #     "max": 100000,  # 100kW max
    #     "step": 100,
    #     "unit": "W",
    #     "device_class": "power",
    #     "mode": "box",
    # },
    # "export_peak_limit": {
    #     "name": "Export Peak Limit Control",
    #     "icon": "mdi:transmission-tower-export",
    #     "min": 0,
    #     "max": 100000,  # 100kW max
    #     "step": 100,
    #     "unit": "W",
    #     "device_class": "power",
    #     "mode": "box",
    # },
    "minimum_soc": {
        "name": "Minimum SoC Control",
        "icon": "mdi:battery-low",
        "min": 0,
        "max": 100,
        "step": 1,
        "unit": "%",
        "mode": "slider",
    },
    "maximum_soc": {
        "name": "Maximum SoC Control",
        "icon": "mdi:battery-high",
        "min": 0,
        "max": 100,
        "step": 1,
        "unit": "%",
        "mode": "slider",
    },
    "minimum_soc_ongrid": {
        "name": "Minimum SoC OnGrid Control",
        "icon": "mdi:battery-low",
        "min": 0,
        "max": 100,
        "step": 1,
        "unit": "%",
        "mode": "slider",
    },
}
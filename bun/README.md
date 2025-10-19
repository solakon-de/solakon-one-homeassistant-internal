# FoxESS Solakon One - Modbus TCP Control

This project provides a complete Modbus TCP interface for the FoxESS Solakon One inverter with both read and write capabilities.

## Features

- **Read Operations**: Read all inverter parameters (status, power, energy, battery, etc.)
- **Write Operations**: Control inverter settings via Modbus registers
- **Web Interface**: Interactive control panel for testing
- **REST API**: JSON API for integration with other systems
- **Type-safe**: Written in TypeScript with proper type definitions
- **Fast**: Built with Bun for maximum performance

## Installation

```bash
bun install
```

## Configuration

Edit the configuration at the top of `index.ts`:

```typescript
const INVERTER_IP = '192.168.1.121'; // Your inverter's IP address
const INVERTER_PORT = 502;           // Standard Modbus TCP port
const SLAVE_ID = 1;                  // Slave address (usually 1)
```

## Usage

### Start the Server

```bash
bun run index.ts
```

The server will start on http://localhost:3000

### Web Interface

Open http://localhost:3000 in your browser for an interactive control panel.

### API Endpoints

#### Read Operations

**Get Status**
```bash
curl http://localhost:3000/api/status
```

**Get Device Info**
```bash
curl http://localhost:3000/api/info
```

**Get Energy Statistics**
```bash
curl http://localhost:3000/api/energy
```

#### Write Operations

**Set Work Mode**
```bash
curl -X POST http://localhost:3000/api/write/workmode \
  -H "Content-Type: application/json" \
  -d '{"mode": 1}'
```

Work modes:
- `1` = Self Use
- `2` = Feedin Priority
- `3` = BackUp
- `4` = Peak Shaving
- `6` = Force Charge
- `7` = Force Discharge

**Set Battery SoC Limits** (Registers 46609, 46610)
```bash
curl -X POST http://localhost:3000/api/write/soc-limits \
  -H "Content-Type: application/json" \
  -d '{"minSoC": 10, "maxSoC": 90}'
```

**Set Battery Charge/Discharge Limits** (Registers 46607, 46608)
```bash
curl -X POST http://localhost:3000/api/write/battery-limits \
  -H "Content-Type: application/json" \
  -d '{"maxChargeCurrent": 20, "maxDischargeCurrent": 20}'
```

Note: Values are in Amperes. Range: 0-26A (H3), 0-50A (H3 Pro)

**Set Power Import/Export Limits** (Registers 46501, 46504)
```bash
curl -X POST http://localhost:3000/api/write/power-limits \
  -H "Content-Type: application/json" \
  -d '{"importLimit": 5000, "exportLimit": 5000}'
```

**Set Remote Control Active Power** (Register 46003)
```bash
curl -X POST http://localhost:3000/api/write/remote-power \
  -H "Content-Type: application/json" \
  -d '{"power": 2000}'
```

Note: Requires Remote Control to be enabled (Register 46001)

**Generic Register Write**
```bash
curl -X POST http://localhost:3000/api/write/register \
  -H "Content-Type: application/json" \
  -d '{"registerName": "WORK_MODE", "value": 1}'
```

## Examples from Solakon One Documentation

### Common Use Cases

#### 1. Force Charge Battery
```typescript
// Set work mode to Force Charge
await client.setWorkMode(6);
```

#### 2. Optimize Self-Consumption
```typescript
// Set to Self Use mode
await client.setWorkMode(1);

// Set battery limits
await client.setBatteryLimits(20, 20); // 20A charge/discharge

// Set SoC limits (keep battery between 20-90%)
await client.setSoCLimits(20, 90);
```

#### 3. Peak Shaving
```typescript
// Set to Peak Shaving mode
await client.setWorkMode(4);

// Limit grid import to 3000W
await client.setPowerLimits(3000, 10000);
```

#### 4. Backup Power Configuration
```typescript
// Set to Backup mode
await client.setWorkMode(3);

// Keep minimum 50% SoC for backup
await client.setSoCLimits(50, 100);
```

## Writable Registers Reference

Based on FoxESS Modbus Protocol V1.05.02.00:

### Remote Control (Table 3-8)
| Register | Address | Type | Unit | Description |
|----------|---------|------|------|-------------|
| REMOTE_CONTROL | 46001 | Bitfield16 | - | Remote control enable/settings |
| REMOTE_TIMEOUT_SET | 46002 | U16 | s | Timeout in seconds |
| REMOTE_ACTIVE_POWER | 46003 | I32 | W | Active power command |
| REMOTE_REACTIVE_POWER | 46005 | I32 | Var | Reactive power command |

### Power Limits (Table 3-9)
| Register | Address | Type | Unit | Description |
|----------|---------|------|------|-------------|
| IMPORT_POWER_LIMIT | 46501 | I32 | W | Import power limit |
| THRESHOLD_SOC | 46503 | U16 | % | Threshold SoC |
| EXPORT_POWER_LIMIT | 46504 | I32 | W | Export power limit |

### Battery Settings (Table 3-10)
| Register | Address | Type | Unit | Range | Description |
|----------|---------|------|------|-------|-------------|
| BATTERY_MAX_CHARGE_CURRENT | 46607 | I16 | A | 0-26 (H3) | Max charging current |
| BATTERY_MAX_DISCHARGE_CURRENT | 46608 | I16 | A | 0-26 (H3) | Max discharge current |
| MIN_SOC | 46609 | U16 | % | 10-100 | Minimum State of Charge |
| MAX_SOC | 46610 | U16 | % | 10-100 | Maximum State of Charge |
| MIN_SOC_ONGRID | 46611 | U16 | % | 10-100 | Min SoC when on-grid |
| EXPORT_POWER_LIMIT_2 | 46616 | I32 | W | - | Export power limit |

### System Settings (Table 3-11)
| Register | Address | Type | Description |
|----------|---------|------|-------------|
| WORK_MODE | 49203 | U16 | 1=Self Use, 2=Feedin, 3=BackUp, 4=Peak Shaving, 6=Force Charge, 7=Force Discharge |
| POWER_ON | 49077 | U16 | Power on command (0=invalid, 1=valid) |
| POWER_OFF | 49078 | U16 | Shutdown command (0=invalid, 1=valid) |
| GRID_STANDARD_CODE | 49079 | U16 | Grid standard code (see Table 4-2) |

## Testing Write Operations

The web interface at http://localhost:3000 provides an easy way to test all write operations:

1. **Work Mode**: Click buttons to change between different modes
2. **Battery SoC**: Set min/max SoC limits (10-100%)
3. **Battery Current**: Set charge/discharge current limits (0-26A for H3)
4. **Power Limits**: Set import/export power limits in Watts
5. **Remote Power**: Set active power command

Each operation shows success/failure status immediately.

## Important Notes

- **Safety First**: Always understand what each register does before writing to it
- **Valid Ranges**: The code validates ranges automatically, but double-check values
- **Scaling**: Values are automatically scaled (e.g., current register uses scale 10)
- **Register Types**:
  - Single registers (U16/I16) use Function Code 0x06
  - Multiple registers (U32/I32) use Function Code 0x10
- **Read Status**: Always read back the register after writing to verify the change

## Protocol Documentation

This implementation is based on:
- **FoxESS Modbus Protocol** Version V1.05.02.00
- Released: 2024-08-15
- Supports: FOX Commercial Inverters including Solakon One

## License

MIT

## Disclaimer

This software is provided as-is. Always test in a safe environment before using in production. Incorrect register values can affect inverter operation.

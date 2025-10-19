import ModbusRTU from 'modbus-serial';

// Configuration
const INVERTER_IP = '192.168.1.121'; // Replace with your inverter's IP
const INVERTER_PORT = 502; // Standard Modbus TCP port
const SLAVE_ID = 1; // Slave address (1-247)
const TIMEOUT = 5000; // Connection timeout in ms

// Register definitions from the documentation
const Registers = {
  // Model Information (Table 3-1)
  MODEL_NAME: { address: 30000, length: 16, type: 'string' },
  SERIAL_NUMBER: { address: 30016, length: 16, type: 'string' },
  MFG_ID: { address: 30032, length: 16, type: 'string' },

  // Version Information (Table 3-2)
  MASTER_VERSION: { address: 36001, length: 1, type: 'u16' },
  SLAVE_VERSION: { address: 36002, length: 1, type: 'u16' },
  MANAGER_VERSION: { address: 36003, length: 1, type: 'u16' },

  // Protocol & Device Info (Table 3-5)
  PROTOCOL_VERSION: { address: 39000, length: 2, type: 'u32' },
  RATED_POWER: {
    address: 39053,
    length: 2,
    type: 'i32',
    scale: 1000,
    unit: 'kW',
  },
  MAX_ACTIVE_POWER: {
    address: 39055,
    length: 2,
    type: 'i32',
    scale: 1000,
    unit: 'kW',
  },

  // Status
  STATUS_1: { address: 39063, length: 1, type: 'bitfield16' },
  ALARM_1: { address: 39067, length: 1, type: 'bitfield16' },
  ALARM_2: { address: 39068, length: 1, type: 'bitfield16' },
  ALARM_3: { address: 39069, length: 1, type: 'bitfield16' },

  // PV Input (supports up to 24 strings)
  PV1_VOLTAGE: { address: 39070, length: 1, type: 'i16', scale: 10, unit: 'V' },
  PV1_CURRENT: {
    address: 39071,
    length: 1,
    type: 'i16',
    scale: 100,
    unit: 'A',
  },
  PV2_VOLTAGE: { address: 39072, length: 1, type: 'i16', scale: 10, unit: 'V' },
  PV2_CURRENT: {
    address: 39073,
    length: 1,
    type: 'i16',
    scale: 100,
    unit: 'A',
  },
  TOTAL_PV_POWER: {
    address: 39118,
    length: 2,
    type: 'i32',
    scale: 1000,
    unit: 'kW',
  },

  // Grid Information
  GRID_R_VOLTAGE: {
    address: 39123,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: 'V',
  },
  GRID_S_VOLTAGE: {
    address: 39124,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: 'V',
  },
  GRID_T_VOLTAGE: {
    address: 39125,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: 'V',
  },
  ACTIVE_POWER: {
    address: 39134,
    length: 2,
    type: 'i32',
    scale: 1000,
    unit: 'kW',
  },
  REACTIVE_POWER: {
    address: 39136,
    length: 2,
    type: 'i32',
    scale: 1000,
    unit: 'kVar',
  },
  POWER_FACTOR: { address: 39138, length: 1, type: 'i16', scale: 1000 },
  GRID_FREQUENCY: {
    address: 39139,
    length: 1,
    type: 'i16',
    scale: 100,
    unit: 'Hz',
  },

  // Temperature
  INTERNAL_TEMP: {
    address: 39141,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: '°C',
  },

  // Energy Statistics
  CUMULATIVE_GENERATION: {
    address: 39149,
    length: 2,
    type: 'u32',
    scale: 100,
    unit: 'kWh',
  },
  DAILY_GENERATION: {
    address: 39151,
    length: 2,
    type: 'u32',
    scale: 100,
    unit: 'kWh',
  },

  // Battery Information (if applicable)
  BATTERY1_VOLTAGE: {
    address: 39227,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: 'V',
  },
  BATTERY1_CURRENT: {
    address: 39228,
    length: 2,
    type: 'i32',
    scale: 1000,
    unit: 'A',
  },
  BATTERY1_POWER: {
    address: 39230,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'W',
  },
  BATTERY_COMBINED_POWER: {
    address: 39237,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'W',
  },
};

// Writable Registers (Table 3-7, 3-9, 3-10, 3-11)
const WritableRegisters = {
  // Remote Control (Table 3-8)
  REMOTE_CONTROL: {
    address: 46001,
    length: 1,
    type: 'bitfield16',
    access: 'RW',
    description: 'Remote control settings',
  },
  REMOTE_TIMEOUT_SET: {
    address: 46002,
    length: 1,
    type: 'u16',
    scale: 1,
    unit: 's',
    access: 'RW',
    description: 'Remote timeout in seconds',
  },
  REMOTE_ACTIVE_POWER: {
    address: 46003,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'W',
    access: 'RW',
    description: 'Remote control active power command',
  },
  REMOTE_REACTIVE_POWER: {
    address: 46005,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'Var',
    access: 'RW',
    description: 'Remote control reactive power command',
  },

  // Power Limits (Table 3-9)
  IMPORT_POWER_LIMIT: {
    address: 46501,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'W',
    access: 'RW',
    description: 'Import power limit',
  },
  THRESHOLD_SOC: {
    address: 46503,
    length: 1,
    type: 'u16',
    scale: 1,
    unit: '%',
    access: 'RW',
    range: [0, 100],
    description: 'Threshold SoC',
  },
  EXPORT_POWER_LIMIT: {
    address: 46504,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'W',
    access: 'RW',
    description: 'Export power limit',
  },

  // Battery Settings (Table 3-10)
  BATTERY_MAX_CHARGE_CURRENT: {
    address: 46607,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: 'A',
    access: 'RW',
    range: [0, 26], // H3: [0,26], H3Pro: [0,50]
    description: 'Battery maximum charging current',
  },
  BATTERY_MAX_DISCHARGE_CURRENT: {
    address: 46608,
    length: 1,
    type: 'i16',
    scale: 10,
    unit: 'A',
    access: 'RW',
    range: [0, 26], // H3: [0,26], H3Pro: [0,50]
    description: 'Battery maximum discharge current',
  },
  MIN_SOC: {
    address: 46609,
    length: 1,
    type: 'u16',
    scale: 1,
    unit: '%',
    access: 'RW',
    range: [10, 100],
    description: 'Minimum State of Charge',
  },
  MAX_SOC: {
    address: 46610,
    length: 1,
    type: 'u16',
    scale: 1,
    unit: '%',
    access: 'RW',
    range: [10, 100],
    description: 'Maximum State of Charge',
  },
  MIN_SOC_ONGRID: {
    address: 46611,
    length: 1,
    type: 'u16',
    scale: 1,
    unit: '%',
    access: 'RW',
    range: [10, 100],
    description: 'Minimum SoC OnGrid',
  },
  EXPORT_POWER_LIMIT_2: {
    address: 46616,
    length: 2,
    type: 'i32',
    scale: 1,
    unit: 'W',
    access: 'RW',
    description: 'Export power limit',
  },

  // Work Mode and System Settings (Table 3-11)
  WORK_MODE: {
    address: 49203,
    length: 1,
    type: 'u16',
    access: 'RW',
    description: 'Work mode: 1=Self Use, 2=Feedin Priority, 3=BackUp, 4=Peak Shaving, 6=Force Charge, 7=Force Discharge',
    values: {
      SELF_USE: 1,
      FEEDIN_PRIORITY: 2,
      BACKUP: 3,
      PEAK_SHAVING: 4,
      FORCE_CHARGE: 6,
      FORCE_DISCHARGE: 7,
    },
  },
  POWER_ON: {
    address: 49077,
    length: 1,
    type: 'u16',
    access: 'RW',
    range: [0, 1],
    description: 'Power on: 0=invalid, 1=valid',
  },
  POWER_OFF: {
    address: 49078,
    length: 1,
    type: 'u16',
    access: 'RW',
    range: [0, 1],
    description: 'Shut down: 0=invalid, 1=valid',
  },
  GRID_STANDARD_CODE: {
    address: 49079,
    length: 1,
    type: 'u16',
    access: 'RW',
    description: 'Grid standard code (see documentation Table 4-2)',
  },
};

class FoxESSModbusReader {
  private client: ModbusRTU;

  constructor() {
    this.client = new ModbusRTU();
  }

  async connect(ip: string, port: number): Promise<void> {
    try {
      await this.client.connectTCP(ip, { port });
      this.client.setID(SLAVE_ID);
      this.client.setTimeout(TIMEOUT);
      console.log(`Connected to FoxESS inverter at ${ip}:${port}`);
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async readRegister(registerDef: any): Promise<any> {
    try {
      const data = await this.client.readHoldingRegisters(
        registerDef.address,
        registerDef.length,
      );

      return this.parseRegisterValue(data.data, registerDef);
    } catch (error) {
      console.error(
        `Failed to read register at ${registerDef.address}:`,
        error,
      );
      return null;
    }
  }

  async writeSingleRegister(
    registerDef: any,
    value: number,
  ): Promise<boolean> {
    try {
      // Validate range if specified
      if (registerDef.range) {
        const [min, max] = registerDef.range;
        if (value < min || value > max) {
          throw new Error(
            `Value ${value} out of range [${min}, ${max}] for register ${registerDef.address}`,
          );
        }
      }

      // Apply scaling if defined
      let scaledValue = value;
      if (registerDef.scale) {
        scaledValue = Math.round(value * registerDef.scale);
      }

      // Write the register
      await this.client.writeRegister(registerDef.address, scaledValue);
      console.log(
        `Successfully wrote ${value} to register ${registerDef.address}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to write register at ${registerDef.address}:`,
        error,
      );
      return false;
    }
  }

  async writeMultipleRegisters(
    registerDef: any,
    value: number,
  ): Promise<boolean> {
    try {
      // Validate range if specified
      if (registerDef.range) {
        const [min, max] = registerDef.range;
        if (value < min || value > max) {
          throw new Error(
            `Value ${value} out of range [${min}, ${max}] for register ${registerDef.address}`,
          );
        }
      }

      // Apply scaling if defined
      let scaledValue = value;
      if (registerDef.scale) {
        scaledValue = Math.round(value * registerDef.scale);
      }

      // Convert to register array based on type
      let registerValues: number[] = [];

      if (registerDef.type === 'i32' || registerDef.type === 'u32') {
        // Split 32-bit value into two 16-bit registers (high, low)
        registerValues = [(scaledValue >> 16) & 0xffff, scaledValue & 0xffff];
      } else {
        // Single 16-bit register
        registerValues = [scaledValue & 0xffff];
      }

      // Write the registers
      await this.client.writeRegisters(registerDef.address, registerValues);
      console.log(
        `Successfully wrote ${value} to registers starting at ${registerDef.address}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to write registers at ${registerDef.address}:`,
        error,
      );
      return false;
    }
  }

  async writeRegister(registerDef: any, value: number): Promise<boolean> {
    if (registerDef.length === 1) {
      return this.writeSingleRegister(registerDef, value);
    } else {
      return this.writeMultipleRegisters(registerDef, value);
    }
  }

  private parseRegisterValue(data: number[], registerDef: any): any {
    let value: any;

    switch (registerDef.type) {
      case 'string':
        // Convert register values to string
        value = data
          .map((v) => String.fromCharCode((v >> 8) & 0xff, v & 0xff))
          .join('')
          .replace(/\0/g, '');
        break;

      case 'u16':
        value = data[0];
        break;

      case 'i16':
        value = this.toSigned16(data[0]);
        break;

      case 'u32':
        value = (data[0] << 16) | data[1];
        break;

      case 'i32':
        value = this.toSigned32((data[0] << 16) | data[1]);
        break;

      case 'bitfield16':
        value = this.parseBitfield16(data[0]);
        break;

      default:
        value = data;
    }

    // Apply scaling if defined
    if (registerDef.scale) {
      value = value / registerDef.scale;
    }

    return value;
  }

  private toSigned16(value: number): number {
    return value > 0x7fff ? value - 0x10000 : value;
  }

  private toSigned32(value: number): number {
    return value > 0x7fffffff ? value - 0x100000000 : value;
  }

  private parseBitfield16(value: number): object {
    const bits: { [key: string]: boolean } = {};
    for (let i = 0; i < 16; i++) {
      bits[`bit${i}`] = Boolean(value & (1 << i));
    }
    return bits;
  }

  private parseStatus1(value: number): object {
    return {
      standby: Boolean(value & 0x01),
      operation: Boolean(value & 0x04),
      fault: Boolean(value & 0x40),
    };
  }

  async readBasicInfo(): Promise<void> {
    console.log('\n=== BASIC INFORMATION ===');

    const modelName = await this.readRegister(Registers.MODEL_NAME);
    console.log(`Model: ${modelName}`);

    const serialNumber = await this.readRegister(Registers.SERIAL_NUMBER);
    console.log(`Serial Number: ${serialNumber}`);

    const protocolVersion = await this.readRegister(Registers.PROTOCOL_VERSION);
    if (protocolVersion) {
      const major = (protocolVersion >> 24) & 0xff;
      const minor = (protocolVersion >> 16) & 0xff;
      const patch = (protocolVersion >> 8) & 0xff;
      const build = protocolVersion & 0xff;
      console.log(
        `Protocol Version: V${major}.${minor.toString().padStart(2, '0')}.${patch.toString().padStart(2, '0')}.${build.toString().padStart(2, '0')}`,
      );
    }

    const ratedPower = await this.readRegister(Registers.RATED_POWER);
    console.log(`Rated Power: ${ratedPower} kW`);
  }

  async readOperationalData(): Promise<void> {
    console.log('\n=== OPERATIONAL DATA ===');

    // Status
    const status1Raw = await this.readRegister(Registers.STATUS_1);
    if (status1Raw) {
      const status = this.parseStatus1(status1Raw);
      console.log('Status:', status);
    }

    // PV Input
    const pv1Voltage = await this.readRegister(Registers.PV1_VOLTAGE);
    const pv1Current = await this.readRegister(Registers.PV1_CURRENT);
    console.log(`PV1: ${pv1Voltage} V, ${pv1Current} A`);

    const pv2Voltage = await this.readRegister(Registers.PV2_VOLTAGE);
    const pv2Current = await this.readRegister(Registers.PV2_CURRENT);
    console.log(`PV2: ${pv2Voltage} V, ${pv2Current} A`);

    const totalPvPower = await this.readRegister(Registers.TOTAL_PV_POWER);
    console.log(`Total PV Power: ${totalPvPower} kW`);

    // Grid
    const gridRVoltage = await this.readRegister(Registers.GRID_R_VOLTAGE);
    const gridSVoltage = await this.readRegister(Registers.GRID_S_VOLTAGE);
    const gridTVoltage = await this.readRegister(Registers.GRID_T_VOLTAGE);
    console.log(
      `Grid Voltage (R/S/T): ${gridRVoltage}/${gridSVoltage}/${gridTVoltage} V`,
    );

    const activePower = await this.readRegister(Registers.ACTIVE_POWER);
    const reactivePower = await this.readRegister(Registers.REACTIVE_POWER);
    const powerFactor = await this.readRegister(Registers.POWER_FACTOR);
    console.log(`Active Power: ${activePower} kW`);
    console.log(`Reactive Power: ${reactivePower} kVar`);
    console.log(`Power Factor: ${powerFactor}`);

    const gridFreq = await this.readRegister(Registers.GRID_FREQUENCY);
    console.log(`Grid Frequency: ${gridFreq} Hz`);

    // Temperature
    const temp = await this.readRegister(Registers.INTERNAL_TEMP);
    console.log(`Internal Temperature: ${temp} °C`);
  }

  async readEnergyStatistics(): Promise<void> {
    console.log('\n=== ENERGY STATISTICS ===');

    const totalGeneration = await this.readRegister(
      Registers.CUMULATIVE_GENERATION,
    );
    console.log(`Total Generation: ${totalGeneration} kWh`);

    const dailyGeneration = await this.readRegister(Registers.DAILY_GENERATION);
    console.log(`Daily Generation: ${dailyGeneration} kWh`);
  }

  async readBatteryInfo(): Promise<void> {
    console.log('\n=== BATTERY INFORMATION ===');

    const batteryVoltage = await this.readRegister(Registers.BATTERY1_VOLTAGE);
    const batteryCurrent = await this.readRegister(Registers.BATTERY1_CURRENT);
    const batteryPower = await this.readRegister(
      Registers.BATTERY_COMBINED_POWER,
    );

    if (batteryVoltage !== null) {
      console.log(`Battery Voltage: ${batteryVoltage} V`);
      console.log(`Battery Current: ${batteryCurrent} A`);
      console.log(`Battery Power: ${batteryPower} W`);
    } else {
      console.log('No battery connected or data unavailable');
    }
  }

  async disconnect(): Promise<void> {
    this.client.close(() => {
      console.log('\nDisconnected from inverter');
    });
  }

  // Example write operations based on Solakon One documentation
  async setWorkMode(mode: number): Promise<boolean> {
    console.log(`\n=== Setting Work Mode to ${mode} ===`);
    return this.writeRegister(WritableRegisters.WORK_MODE, mode);
  }

  async setBatteryLimits(
    maxChargeCurrent: number,
    maxDischargeCurrent: number,
  ): Promise<boolean> {
    console.log('\n=== Setting Battery Charge/Discharge Limits ===');
    const chargeSuccess = await this.writeRegister(
      WritableRegisters.BATTERY_MAX_CHARGE_CURRENT,
      maxChargeCurrent,
    );
    const dischargeSuccess = await this.writeRegister(
      WritableRegisters.BATTERY_MAX_DISCHARGE_CURRENT,
      maxDischargeCurrent,
    );
    return chargeSuccess && dischargeSuccess;
  }

  async setSoCLimits(minSoC: number, maxSoC: number): Promise<boolean> {
    console.log('\n=== Setting SoC Limits ===');
    if (minSoC < 10 || minSoC > 100 || maxSoC < 10 || maxSoC > 100) {
      console.error('SoC values must be between 10 and 100');
      return false;
    }
    if (minSoC >= maxSoC) {
      console.error('Min SoC must be less than Max SoC');
      return false;
    }

    const minSuccess = await this.writeRegister(
      WritableRegisters.MIN_SOC,
      minSoC,
    );
    const maxSuccess = await this.writeRegister(
      WritableRegisters.MAX_SOC,
      maxSoC,
    );
    return minSuccess && maxSuccess;
  }

  async setPowerLimits(
    importLimit: number,
    exportLimit: number,
  ): Promise<boolean> {
    console.log('\n=== Setting Power Import/Export Limits ===');
    const importSuccess = await this.writeRegister(
      WritableRegisters.IMPORT_POWER_LIMIT,
      importLimit,
    );
    const exportSuccess = await this.writeRegister(
      WritableRegisters.EXPORT_POWER_LIMIT,
      exportLimit,
    );
    return importSuccess && exportSuccess;
  }

  async setRemoteControlActivePower(power: number): Promise<boolean> {
    console.log('\n=== Setting Remote Control Active Power ===');
    return this.writeRegister(WritableRegisters.REMOTE_ACTIVE_POWER, power);
  }

  isConnected(): boolean {
    return this.client.isOpen;
  }
}

// Global instance for web server
let modbusClient: FoxESSModbusReader | null = null;

// Helper function to ensure connection
async function ensureConnection(): Promise<FoxESSModbusReader> {
  if (!modbusClient || !modbusClient.isConnected()) {
    modbusClient = new FoxESSModbusReader();
    await modbusClient.connect(INVERTER_IP, INVERTER_PORT);
  }
  return modbusClient;
}

// Web server with Bun
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (url.pathname === '/api/status') {
        const client = await ensureConnection();
        const status1 = await client.readRegister(Registers.STATUS_1);
        const activePower = await client.readRegister(Registers.ACTIVE_POWER);
        const totalPvPower = await client.readRegister(Registers.TOTAL_PV_POWER);
        const batteryPower = await client.readRegister(
          Registers.BATTERY_COMBINED_POWER,
        );

        return Response.json(
          {
            status: status1,
            activePower,
            totalPvPower,
            batteryPower,
          },
          { headers: corsHeaders },
        );
      }

      if (url.pathname === '/api/info') {
        const client = await ensureConnection();
        const modelName = await client.readRegister(Registers.MODEL_NAME);
        const serialNumber = await client.readRegister(Registers.SERIAL_NUMBER);
        const ratedPower = await client.readRegister(Registers.RATED_POWER);

        return Response.json(
          {
            modelName,
            serialNumber,
            ratedPower,
          },
          { headers: corsHeaders },
        );
      }

      if (url.pathname === '/api/energy') {
        const client = await ensureConnection();
        const totalGeneration = await client.readRegister(
          Registers.CUMULATIVE_GENERATION,
        );
        const dailyGeneration = await client.readRegister(
          Registers.DAILY_GENERATION,
        );

        return Response.json(
          {
            totalGeneration,
            dailyGeneration,
          },
          { headers: corsHeaders },
        );
      }

      // Write endpoints
      if (url.pathname === '/api/write/workmode' && req.method === 'POST') {
        const body = await req.json();
        const { mode } = body;

        if (!mode || mode < 1 || mode > 7) {
          return Response.json(
            { error: 'Invalid work mode. Valid values: 1-7' },
            { status: 400, headers: corsHeaders },
          );
        }

        const client = await ensureConnection();
        const success = await client.setWorkMode(mode);

        return Response.json({ success }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/write/soc-limits' && req.method === 'POST') {
        const body = await req.json();
        const { minSoC, maxSoC } = body;

        const client = await ensureConnection();
        const success = await client.setSoCLimits(minSoC, maxSoC);

        return Response.json({ success }, { headers: corsHeaders });
      }

      if (
        url.pathname === '/api/write/battery-limits' &&
        req.method === 'POST'
      ) {
        const body = await req.json();
        const { maxChargeCurrent, maxDischargeCurrent } = body;

        const client = await ensureConnection();
        const success = await client.setBatteryLimits(
          maxChargeCurrent,
          maxDischargeCurrent,
        );

        return Response.json({ success }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/write/power-limits' && req.method === 'POST') {
        const body = await req.json();
        const { importLimit, exportLimit } = body;

        const client = await ensureConnection();
        const success = await client.setPowerLimits(importLimit, exportLimit);

        return Response.json({ success }, { headers: corsHeaders });
      }

      if (
        url.pathname === '/api/write/remote-power' &&
        req.method === 'POST'
      ) {
        const body = await req.json();
        const { power } = body;

        const client = await ensureConnection();
        const success = await client.setRemoteControlActivePower(power);

        return Response.json({ success }, { headers: corsHeaders });
      }

      // Generic write endpoint
      if (url.pathname === '/api/write/register' && req.method === 'POST') {
        const body = await req.json();
        const { registerName, value } = body;

        if (!WritableRegisters[registerName as keyof typeof WritableRegisters]) {
          return Response.json(
            { error: 'Invalid register name' },
            { status: 400, headers: corsHeaders },
          );
        }

        const client = await ensureConnection();
        const registerDef =
          WritableRegisters[registerName as keyof typeof WritableRegisters];
        const success = await client.writeRegister(registerDef, value);

        return Response.json({ success }, { headers: corsHeaders });
      }

      // Test page
      if (url.pathname === '/') {
        return new Response(
          `
<!DOCTYPE html>
<html>
<head>
  <title>FoxESS Modbus Control</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .section { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
    .button:hover { background: #45a049; }
    .button.danger { background: #f44336; }
    .button.danger:hover { background: #da190b; }
    input { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
    .result { margin-top: 10px; padding: 10px; background: #fff; border-radius: 4px; }
    pre { background: #fff; padding: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>FoxESS Solakon One - Modbus TCP Control</h1>

  <div class="section">
    <h2>Read Operations</h2>
    <button class="button" onclick="readStatus()">Read Status</button>
    <button class="button" onclick="readInfo()">Read Info</button>
    <button class="button" onclick="readEnergy()">Read Energy</button>
    <div id="readResult" class="result"></div>
  </div>

  <div class="section">
    <h2>Work Mode (Register 49203)</h2>
    <p>1=Self Use, 2=Feedin Priority, 3=BackUp, 4=Peak Shaving, 6=Force Charge, 7=Force Discharge</p>
    <button class="button" onclick="setWorkMode(1)">Self Use</button>
    <button class="button" onclick="setWorkMode(2)">Feedin Priority</button>
    <button class="button" onclick="setWorkMode(3)">BackUp</button>
    <button class="button" onclick="setWorkMode(4)">Peak Shaving</button>
    <button class="button" onclick="setWorkMode(6)">Force Charge</button>
    <button class="button danger" onclick="setWorkMode(7)">Force Discharge</button>
    <div id="workModeResult" class="result"></div>
  </div>

  <div class="section">
    <h2>Battery SoC Limits (Registers 46609, 46610)</h2>
    <p>Range: 10-100%</p>
    Min SoC: <input type="number" id="minSoC" value="10" min="10" max="100">%
    Max SoC: <input type="number" id="maxSoC" value="100" min="10" max="100">%
    <button class="button" onclick="setSoCLimits()">Set SoC Limits</button>
    <div id="socResult" class="result"></div>
  </div>

  <div class="section">
    <h2>Battery Charge/Discharge Current (Registers 46607, 46608)</h2>
    <p>Range: 0-26A (H3), 0-50A (H3 Pro). Value in Amperes, Scale: 10</p>
    Max Charge: <input type="number" id="maxCharge" value="20" min="0" max="26" step="0.1">A
    Max Discharge: <input type="number" id="maxDischarge" value="20" min="0" max="26" step="0.1">A
    <button class="button" onclick="setBatteryLimits()">Set Battery Limits</button>
    <div id="batteryLimitsResult" class="result"></div>
  </div>

  <div class="section">
    <h2>Power Limits (Registers 46501, 46504)</h2>
    <p>Import/Export power limits in Watts</p>
    Import Limit: <input type="number" id="importLimit" value="5000" min="0">W
    Export Limit: <input type="number" id="exportLimit" value="5000" min="0">W
    <button class="button" onclick="setPowerLimits()">Set Power Limits</button>
    <div id="powerLimitsResult" class="result"></div>
  </div>

  <div class="section">
    <h2>Remote Control Active Power (Register 46003)</h2>
    <p>Set active power command in Watts (requires Remote Control enabled)</p>
    Power: <input type="number" id="remotePower" value="0">W
    <button class="button" onclick="setRemotePower()">Set Remote Power</button>
    <div id="remotePowerResult" class="result"></div>
  </div>

  <script>
    async function readStatus() {
      const res = await fetch('/api/status');
      const data = await res.json();
      document.getElementById('readResult').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    }

    async function readInfo() {
      const res = await fetch('/api/info');
      const data = await res.json();
      document.getElementById('readResult').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    }

    async function readEnergy() {
      const res = await fetch('/api/energy');
      const data = await res.json();
      document.getElementById('readResult').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    }

    async function setWorkMode(mode) {
      const res = await fetch('/api/write/workmode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      document.getElementById('workModeResult').innerHTML =
        '<strong>Result:</strong> ' + (data.success ? 'Success ✓' : 'Failed ✗');
    }

    async function setSoCLimits() {
      const minSoC = parseInt(document.getElementById('minSoC').value);
      const maxSoC = parseInt(document.getElementById('maxSoC').value);

      const res = await fetch('/api/write/soc-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minSoC, maxSoC })
      });
      const data = await res.json();
      document.getElementById('socResult').innerHTML =
        '<strong>Result:</strong> ' + (data.success ? 'Success ✓' : 'Failed ✗');
    }

    async function setBatteryLimits() {
      const maxChargeCurrent = parseFloat(document.getElementById('maxCharge').value);
      const maxDischargeCurrent = parseFloat(document.getElementById('maxDischarge').value);

      const res = await fetch('/api/write/battery-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxChargeCurrent, maxDischargeCurrent })
      });
      const data = await res.json();
      document.getElementById('batteryLimitsResult').innerHTML =
        '<strong>Result:</strong> ' + (data.success ? 'Success ✓' : 'Failed ✗');
    }

    async function setPowerLimits() {
      const importLimit = parseInt(document.getElementById('importLimit').value);
      const exportLimit = parseInt(document.getElementById('exportLimit').value);

      const res = await fetch('/api/write/power-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importLimit, exportLimit })
      });
      const data = await res.json();
      document.getElementById('powerLimitsResult').innerHTML =
        '<strong>Result:</strong> ' + (data.success ? 'Success ✓' : 'Failed ✗');
    }

    async function setRemotePower() {
      const power = parseInt(document.getElementById('remotePower').value);

      const res = await fetch('/api/write/remote-power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ power })
      });
      const data = await res.json();
      document.getElementById('remotePowerResult').innerHTML =
        '<strong>Result:</strong> ' + (data.success ? 'Success ✓' : 'Failed ✗');
    }
  </script>
</body>
</html>
          `,
          {
            headers: {
              'Content-Type': 'text/html',
              ...corsHeaders,
            },
          },
        );
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Server error:', error);
      return Response.json(
        { error: String(error) },
        { status: 500, headers: corsHeaders },
      );
    }
  },
});

console.log(`🚀 FoxESS Modbus Server running at http://localhost:${server.port}`);
console.log(`📊 Open http://localhost:${server.port} to access the control panel`);

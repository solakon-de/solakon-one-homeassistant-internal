import ModbusRTU from 'modbus-serial';

// Configuration
const INVERTER_IP = '192.168.1.148'; // Replace with your inverter's IP
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
        // Single 16-bit register (includes u16, i16, bitfield16)
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

      // Custom register read endpoint
      if (url.pathname === '/api/custom/read' && req.method === 'POST') {
        const body = await req.json();
        const { address, length, type, scale } = body;

        if (!address || !length || !type) {
          return Response.json(
            { error: 'Missing required fields: address, length, type' },
            { status: 400, headers: corsHeaders },
          );
        }

        const customRegister = {
          address: parseInt(address),
          length: parseInt(length),
          type,
          scale: scale ? parseFloat(scale) : undefined,
        };

        const client = await ensureConnection();
        const value = await client.readRegister(customRegister);

        return Response.json(
          {
            success: value !== null,
            value,
            register: customRegister,
          },
          { headers: corsHeaders },
        );
      }

      // Custom register write endpoint
      if (url.pathname === '/api/custom/write' && req.method === 'POST') {
        const body = await req.json();
        const { address, length, type, scale, value } = body;

        if (!address || !length || !type || value === undefined) {
          return Response.json(
            { error: 'Missing required fields: address, length, type, value' },
            { status: 400, headers: corsHeaders },
          );
        }

        const customRegister = {
          address: parseInt(address),
          length: parseInt(length),
          type,
          scale: scale ? parseFloat(scale) : undefined,
        };

        const client = await ensureConnection();
        const success = await client.writeRegister(
          customRegister,
          parseFloat(value),
        );

        return Response.json(
          {
            success,
            register: customRegister,
            writtenValue: value,
          },
          { headers: corsHeaders },
        );
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
    .section.custom { background: #fff3cd; border: 2px solid #ffc107; }
    .button { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
    .button:hover { background: #45a049; }
    .button.danger { background: #f44336; }
    .button.danger:hover { background: #da190b; }
    .button.info { background: #17a2b8; }
    .button.info:hover { background: #138496; }
    .button.warning { background: #ffc107; color: #000; }
    .button.warning:hover { background: #e0a800; }
    input, select { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
    select { min-width: 120px; }
    .result { margin-top: 10px; padding: 10px; background: #fff; border-radius: 4px; }
    .result.error { background: #f8d7da; border: 1px solid #f5c6cb; }
    .result.success { background: #d4edda; border: 1px solid #c3e6cb; }
    pre { background: #fff; padding: 10px; overflow-x: auto; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
    .field { display: flex; flex-direction: column; }
    .field label { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
    .warning-text { color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
    #customHistory { max-height: 300px; overflow-y: auto; margin-top: 10px; }
    .history-item { padding: 8px; margin: 5px 0; background: #fff; border-left: 3px solid #4CAF50; border-radius: 4px; font-family: monospace; font-size: 12px; }
    .history-item.write { border-left-color: #ffc107; }
    .history-item.error { border-left-color: #f44336; }
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

  <div class="section custom">
    <h2>Custom Register Testing</h2>
    <div class="warning-text">
      <strong>Warning:</strong> This is an advanced feature. Writing to wrong registers can damage your inverter.
      Always consult the Modbus documentation before writing to custom registers.
    </div>

    <h3>Read Custom Register</h3>
    <div class="grid">
      <div class="field">
        <label>Register Address:</label>
        <input type="number" id="readAddress" placeholder="e.g., 39070" value="39070">
      </div>
      <div class="field">
        <label>Length (registers):</label>
        <input type="number" id="readLength" placeholder="1 or 2" value="1" min="1" max="16">
      </div>
      <div class="field">
        <label>Data Type:</label>
        <select id="readType">
          <option value="u16">U16 (Unsigned 16-bit)</option>
          <option value="i16">I16 (Signed 16-bit)</option>
          <option value="u32">U32 (Unsigned 32-bit)</option>
          <option value="i32">I32 (Signed 32-bit)</option>
          <option value="string">String</option>
          <option value="bitfield16">Bitfield 16</option>
        </select>
      </div>
      <div class="field">
        <label>Scale (optional):</label>
        <input type="number" id="readScale" placeholder="e.g., 10, 100, 1000" step="any">
      </div>
    </div>
    <button class="button info" onclick="readCustomRegister()">Read Register</button>
    <button class="button" onclick="loadReadPreset('PV1_VOLTAGE')">Load PV1 Voltage Example</button>
    <button class="button" onclick="loadReadPreset('WORK_MODE')">Load Work Mode Example</button>
    <div id="customReadResult" class="result"></div>

    <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;">

    <h3>Write Custom Register</h3>
    <div class="grid">
      <div class="field">
        <label>Register Address:</label>
        <input type="number" id="writeAddress" placeholder="e.g., 49203" value="49203">
      </div>
      <div class="field">
        <label>Length (registers):</label>
        <input type="number" id="writeLength" placeholder="1 or 2" value="1" min="1" max="16">
      </div>
      <div class="field">
        <label>Data Type:</label>
        <select id="writeType" onchange="toggleBitfieldUI()">
          <option value="u16">U16 (Unsigned 16-bit)</option>
          <option value="i16">I16 (Signed 16-bit)</option>
          <option value="u32">U32 (Unsigned 32-bit)</option>
          <option value="i32">I32 (Signed 32-bit)</option>
          <option value="bitfield16">Bitfield16 (16 individual bits)</option>
        </select>
      </div>
      <div class="field">
        <label>Scale (optional):</label>
        <input type="number" id="writeScale" placeholder="e.g., 10, 100, 1000" step="any">
      </div>
      <div class="field" id="writeValueField">
        <label>Value to Write:</label>
        <input type="number" id="writeValue" placeholder="Enter value" step="any">
      </div>
    </div>

    <div id="bitfieldUI" style="display: none; margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 4px;">
      <h4 style="margin-top: 0;">Set Individual Bits (LSB = Bit 0, MSB = Bit 15)</h4>
      <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit0" onchange="updateBitfieldValue()">
          <label for="bit0" style="margin: 0; font-size: 12px;">Bit 0</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit1" onchange="updateBitfieldValue()">
          <label for="bit1" style="margin: 0; font-size: 12px;">Bit 1</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit2" onchange="updateBitfieldValue()">
          <label for="bit2" style="margin: 0; font-size: 12px;">Bit 2</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit3" onchange="updateBitfieldValue()">
          <label for="bit3" style="margin: 0; font-size: 12px;">Bit 3</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit4" onchange="updateBitfieldValue()">
          <label for="bit4" style="margin: 0; font-size: 12px;">Bit 4</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit5" onchange="updateBitfieldValue()">
          <label for="bit5" style="margin: 0; font-size: 12px;">Bit 5</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit6" onchange="updateBitfieldValue()">
          <label for="bit6" style="margin: 0; font-size: 12px;">Bit 6</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit7" onchange="updateBitfieldValue()">
          <label for="bit7" style="margin: 0; font-size: 12px;">Bit 7</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit8" onchange="updateBitfieldValue()">
          <label for="bit8" style="margin: 0; font-size: 12px;">Bit 8</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit9" onchange="updateBitfieldValue()">
          <label for="bit9" style="margin: 0; font-size: 12px;">Bit 9</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit10" onchange="updateBitfieldValue()">
          <label for="bit10" style="margin: 0; font-size: 12px;">Bit 10</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit11" onchange="updateBitfieldValue()">
          <label for="bit11" style="margin: 0; font-size: 12px;">Bit 11</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit12" onchange="updateBitfieldValue()">
          <label for="bit12" style="margin: 0; font-size: 12px;">Bit 12</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit13" onchange="updateBitfieldValue()">
          <label for="bit13" style="margin: 0; font-size: 12px;">Bit 13</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit14" onchange="updateBitfieldValue()">
          <label for="bit14" style="margin: 0; font-size: 12px;">Bit 14</label>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <input type="checkbox" id="bit15" onchange="updateBitfieldValue()">
          <label for="bit15" style="margin: 0; font-size: 12px;">Bit 15</label>
        </div>
      </div>
      <div style="padding: 10px; background: #fff; border-radius: 4px;">
        <strong>Resulting Value:</strong> <span id="bitfieldValueDisplay">0</span> (0x<span id="bitfieldValueHex">0000</span>)
        <button class="button" style="margin-left: 10px;" onclick="clearAllBits()">Clear All</button>
        <button class="button" style="margin-left: 5px;" onclick="setAllBits()">Set All</button>
      </div>
    </div>

    <button class="button warning" onclick="writeCustomRegister()">Write Register</button>
    <button class="button" onclick="loadWritePreset('WORK_MODE')">Load Work Mode Example</button>
    <button class="button" onclick="loadWritePreset('MIN_SOC')">Load Min SoC Example</button>
    <div id="customWriteResult" class="result"></div>

    <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;">

    <h3>Operation History</h3>
    <button class="button" onclick="clearHistory()">Clear History</button>
    <div id="customHistory"></div>
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
        '<strong>Result:</strong> ' + (data.success ? 'Success' : 'Failed');
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
        '<strong>Result:</strong> ' + (data.success ? 'Success' : 'Failed');
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
        '<strong>Result:</strong> ' + (data.success ? 'Success' : 'Failed');
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
        '<strong>Result:</strong> ' + (data.success ? 'Success' : 'Failed');
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
        '<strong>Result:</strong> ' + (data.success ? 'Success' : 'Failed');
    }

    // Custom Register Functions
    let operationHistory = [];

    async function readCustomRegister() {
      const address = document.getElementById('readAddress').value;
      const length = document.getElementById('readLength').value;
      const type = document.getElementById('readType').value;
      const scale = document.getElementById('readScale').value;

      const resultDiv = document.getElementById('customReadResult');
      resultDiv.className = 'result';
      resultDiv.innerHTML = '<em>Reading...</em>';

      try {
        const res = await fetch('/api/custom/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, length, type, scale: scale || null })
        });
        const data = await res.json();

        if (data.success) {
          resultDiv.className = 'result success';
          resultDiv.innerHTML =
            '<strong>Read Success</strong><pre>' +
            JSON.stringify(data, null, 2) +
            '</pre>';

          addToHistory('READ', address, length, type, scale, data.value, true);
        } else {
          resultDiv.className = 'result error';
          resultDiv.innerHTML = '<strong>Read Failed</strong><br>' + (data.error || 'Unknown error');
          addToHistory('READ', address, length, type, scale, null, false, data.error);
        }
      } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
        addToHistory('READ', address, length, type, scale, null, false, error.message);
      }
    }

    async function writeCustomRegister() {
      const address = document.getElementById('writeAddress').value;
      const length = document.getElementById('writeLength').value;
      const type = document.getElementById('writeType').value;
      const scale = document.getElementById('writeScale').value;
      const value = document.getElementById('writeValue').value;

      if (!value) {
        alert('Please enter a value to write');
        return;
      }

      if (!confirm(\`Are you sure you want to write value "\${value}" to register \${address}?\\n\\nThis operation could affect your inverter's behavior.\`)) {
        return;
      }

      const resultDiv = document.getElementById('customWriteResult');
      resultDiv.className = 'result';
      resultDiv.innerHTML = '<em>Writing...</em>';

      try {
        const res = await fetch('/api/custom/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, length, type, scale: scale || null, value })
        });
        const data = await res.json();

        if (data.success) {
          resultDiv.className = 'result success';
          resultDiv.innerHTML =
            '<strong>Write Success</strong><pre>' +
            JSON.stringify(data, null, 2) +
            '</pre>' +
            '<p><em>Tip: Read back the register to verify the change.</em></p>';

          addToHistory('WRITE', address, length, type, scale, value, true);
        } else {
          resultDiv.className = 'result error';
          resultDiv.innerHTML = '<strong>Write Failed</strong><br>' + (data.error || 'Unknown error');
          addToHistory('WRITE', address, length, type, scale, value, false, data.error);
        }
      } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.innerHTML = '<strong>Error:</strong> ' + error.message;
        addToHistory('WRITE', address, length, type, scale, value, false, error.message);
      }
    }

    function loadReadPreset(preset) {
      const presets = {
        'PV1_VOLTAGE': { address: 39070, length: 1, type: 'i16', scale: 10 },
        'WORK_MODE': { address: 49203, length: 1, type: 'u16', scale: '' },
        'ACTIVE_POWER': { address: 39134, length: 2, type: 'i32', scale: 1000 },
        'TOTAL_GENERATION': { address: 39149, length: 2, type: 'u32', scale: 100 },
      };

      const p = presets[preset];
      if (p) {
        document.getElementById('readAddress').value = p.address;
        document.getElementById('readLength').value = p.length;
        document.getElementById('readType').value = p.type;
        document.getElementById('readScale').value = p.scale;
      }
    }

    function loadWritePreset(preset) {
      const presets = {
        'WORK_MODE': { address: 49203, length: 1, type: 'u16', scale: '', value: 1 },
        'MIN_SOC': { address: 46609, length: 1, type: 'u16', scale: '', value: 20 },
        'MAX_CHARGE_CURRENT': { address: 46607, length: 1, type: 'i16', scale: 10, value: 20 },
      };

      const p = presets[preset];
      if (p) {
        document.getElementById('writeAddress').value = p.address;
        document.getElementById('writeLength').value = p.length;
        document.getElementById('writeType').value = p.type;
        document.getElementById('writeScale').value = p.scale;
        document.getElementById('writeValue').value = p.value;
      }
    }

    function addToHistory(operation, address, length, type, scale, value, success, error = null) {
      const timestamp = new Date().toLocaleTimeString();
      const historyItem = {
        timestamp,
        operation,
        address,
        length,
        type,
        scale,
        value,
        success,
        error
      };

      operationHistory.unshift(historyItem);
      if (operationHistory.length > 20) {
        operationHistory = operationHistory.slice(0, 20);
      }

      updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
      const historyDiv = document.getElementById('customHistory');
      if (operationHistory.length === 0) {
        historyDiv.innerHTML = '<p style="color: #999;">No operations yet</p>';
        return;
      }

      historyDiv.innerHTML = operationHistory.map(item => {
        const className = item.success ?
          (item.operation === 'WRITE' ? 'history-item write' : 'history-item') :
          'history-item error';

        const scaleText = item.scale ? \` scale=\${item.scale}\` : '';
        const valueText = item.value !== null && item.value !== undefined ?
          \` value=\${item.value}\` : '';
        const errorText = item.error ? \` - Error: \${item.error}\` : '';

        return \`<div class="\${className}">
          [\${item.timestamp}] \${item.operation} addr=\${item.address} len=\${item.length} type=\${item.type}\${scaleText}\${valueText} - \${item.success ? 'OK' : 'FAIL'}\${errorText}
        </div>\`;
      }).join('');
    }

    function clearHistory() {
      if (confirm('Clear operation history?')) {
        operationHistory = [];
        updateHistoryDisplay();
      }
    }

    // Initialize history display
    updateHistoryDisplay();

    // Bitfield UI functions
    function toggleBitfieldUI() {
      const type = document.getElementById('writeType').value;
      const bitfieldUI = document.getElementById('bitfieldUI');
      const valueField = document.getElementById('writeValueField');

      if (type === 'bitfield16') {
        bitfieldUI.style.display = 'block';
        valueField.style.display = 'none';
        updateBitfieldValue(); // Update display
      } else {
        bitfieldUI.style.display = 'none';
        valueField.style.display = 'block';
      }
    }

    function updateBitfieldValue() {
      let value = 0;
      for (let i = 0; i < 16; i++) {
        const checkbox = document.getElementById('bit' + i);
        if (checkbox && checkbox.checked) {
          value |= (1 << i);
        }
      }

      document.getElementById('bitfieldValueDisplay').textContent = value;
      document.getElementById('bitfieldValueHex').textContent = value.toString(16).toUpperCase().padStart(4, '0');

      // Also update the hidden value field for form submission
      document.getElementById('writeValue').value = value;
    }

    function clearAllBits() {
      for (let i = 0; i < 16; i++) {
        const checkbox = document.getElementById('bit' + i);
        if (checkbox) {
          checkbox.checked = false;
        }
      }
      updateBitfieldValue();
    }

    function setAllBits() {
      for (let i = 0; i < 16; i++) {
        const checkbox = document.getElementById('bit' + i);
        if (checkbox) {
          checkbox.checked = true;
        }
      }
      updateBitfieldValue();
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

console.log(`FoxESS Modbus Server running at http://localhost:${server.port}`);
console.log(`Open http://localhost:${server.port} to access the control panel`);

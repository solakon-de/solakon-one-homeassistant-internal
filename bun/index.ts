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
}

// Main execution
async function main() {
  const reader = new FoxESSModbusReader();

  try {
    // Connect to the inverter
    await reader.connect(INVERTER_IP, INVERTER_PORT);

    // Read different data categories
    await reader.readBasicInfo();
    await reader.readOperationalData();
    await reader.readEnergyStatistics();
    await reader.readBatteryInfo();

    // Disconnect
    await reader.disconnect();
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Run the script
main();

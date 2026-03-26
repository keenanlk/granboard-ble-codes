/**
 * GranBoard BLE Example — Web Bluetooth API (TypeScript)
 *
 * Connects to a GranBoard, listens for dart hits, and demonstrates
 * sending LED commands. Run in a browser that supports Web Bluetooth.
 */

const SERVICE_UUID = "442f1570-8a00-9a28-cbe1-e1d4212d53eb";

// --- Segment Mapping ---

const SEGMENT_MAP: Record<string, string> = {
  "50-46-51-64": "INNER_1",  "50-46-52-64": "TRP_1",
  "50-46-53-64": "OUTER_1",  "50-46-54-64": "DBL_1",
  "57-46-49-64": "INNER_2",  "57-46-48-64": "TRP_2",
  "57-46-50-64": "OUTER_2",  "56-46-50-64": "DBL_2",
  "55-46-49-64": "INNER_3",  "55-46-48-64": "TRP_3",
  "55-46-50-64": "OUTER_3",  "56-46-52-64": "DBL_3",
  "48-46-49-64": "INNER_4",  "48-46-51-64": "TRP_4",
  "48-46-53-64": "OUTER_4",  "48-46-54-64": "DBL_4",
  "53-46-49-64": "INNER_5",  "53-46-50-64": "TRP_5",
  "53-46-52-64": "OUTER_5",  "52-46-54-64": "DBL_5",
  "49-46-48-64": "INNER_6",  "49-46-49-64": "TRP_6",
  "49-46-51-64": "OUTER_6",  "52-46-52-64": "DBL_6",
  "49-49-46-49-64": "INNER_7",  "49-49-46-50-64": "TRP_7",
  "49-49-46-52-64": "OUTER_7",  "56-46-54-64": "DBL_7",
  "54-46-50-64": "INNER_8",  "54-46-52-64": "TRP_8",
  "54-46-53-64": "OUTER_8",  "54-46-54-64": "DBL_8",
  "57-46-51-64": "INNER_9",  "57-46-52-64": "TRP_9",
  "57-46-53-64": "OUTER_9",  "57-46-54-64": "DBL_9",
  "50-46-48-64": "INNER_10", "50-46-49-64": "TRP_10",
  "50-46-50-64": "OUTER_10", "52-46-51-64": "DBL_10",
  "55-46-51-64": "INNER_11", "55-46-52-64": "TRP_11",
  "55-46-53-64": "OUTER_11", "55-46-54-64": "DBL_11",
  "53-46-48-64": "INNER_12", "53-46-51-64": "TRP_12",
  "53-46-53-64": "OUTER_12", "53-46-54-64": "DBL_12",
  "48-46-48-64": "INNER_13", "48-46-50-64": "TRP_13",
  "48-46-52-64": "OUTER_13", "52-46-53-64": "DBL_13",
  "49-48-46-51-64": "INNER_14", "49-48-46-52-64": "TRP_14",
  "49-48-46-53-64": "OUTER_14", "49-48-46-54-64": "DBL_14",
  "51-46-48-64": "INNER_15", "51-46-49-64": "TRP_15",
  "51-46-50-64": "OUTER_15", "52-46-50-64": "DBL_15",
  "49-49-46-48-64": "INNER_16", "49-49-46-51-64": "TRP_16",
  "49-49-46-53-64": "OUTER_16", "49-49-46-54-64": "DBL_16",
  "49-48-46-49-64": "INNER_17", "49-48-46-48-64": "TRP_17",
  "49-48-46-50-64": "OUTER_17", "56-46-51-64": "DBL_17",
  "49-46-50-64": "INNER_18", "49-46-52-64": "TRP_18",
  "49-46-53-64": "OUTER_18", "49-46-54-64": "DBL_18",
  "54-46-49-64": "INNER_19", "54-46-48-64": "TRP_19",
  "54-46-51-64": "OUTER_19", "56-46-53-64": "DBL_19",
  "51-46-51-64": "INNER_20", "51-46-52-64": "TRP_20",
  "51-46-53-64": "OUTER_20", "51-46-54-64": "DBL_20",
  "56-46-48-64": "BULL",     "52-46-48-64": "DBL_BULL",
  "66-84-78-64": "RESET_BUTTON", "79-85-84-64": "MISS",
};

// --- LED Positions (dart number → ring cell) ---

const LED_POSITIONS = [
  0,  28, 49, 55, 34, 22, 40, 1,  7,  16,
  43, 10, 19, 37, 13, 46, 4,  52, 31, 58, 25,
];

// --- LED Command Builders ---

interface RGB { r: number; g: number; b: number }

function buildHitCommand(dartNumber: number, multiplier: 1 | 2 | 3, color: RGB): number[] {
  const cmd = new Array(16).fill(0);
  cmd[0]  = multiplier;
  cmd[1]  = color.r;
  cmd[2]  = color.g;
  cmd[3]  = color.b;
  cmd[10] = LED_POSITIONS[dartNumber] ?? 0;
  cmd[12] = 0x14;
  return cmd;
}

function buildBlinkCommand(color: RGB, duration = 0x1e): number[] {
  const cmd = new Array(16).fill(0);
  cmd[0]  = 0x17;
  cmd[1]  = color.r;
  cmd[2]  = color.g;
  cmd[3]  = color.b;
  cmd[12] = duration;
  cmd[15] = 0x01;
  return cmd;
}

function buildWaveCommand(colorUp: RGB, colorDown: RGB): number[] {
  const cmd = new Array(16).fill(0);
  cmd[0]  = 0x11;
  cmd[1]  = colorUp.r;
  cmd[2]  = colorUp.g;
  cmd[3]  = colorUp.b;
  cmd[4]  = colorDown.r;
  cmd[5]  = colorDown.g;
  cmd[6]  = colorDown.b;
  cmd[10] = 0x10;
  cmd[12] = 0x05;
  return cmd;
}

function buildLightRingCommand(color: RGB): number[] {
  const cmd = new Array(16).fill(0);
  cmd[0]  = 0x14;
  cmd[1]  = color.r;
  cmd[2]  = color.g;
  cmd[3]  = color.b;
  cmd[12] = 0x14;
  cmd[15] = 0x01;
  return cmd;
}

function buildPersistentNumbersCommand(dartNumbers: number[], colorByte: number): number[] {
  const cmd = new Array(20).fill(0);
  for (const n of dartNumbers) {
    if (n >= 1 && n <= 20) cmd[n - 1] = colorByte;
  }
  return cmd;
}

function buildClearCommand(): number[] {
  return new Array(20).fill(0);
}

// --- Connection & Usage ---

async function connect() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID] }],
  });

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristics = await service.getCharacteristics();

  const notifyChar = characteristics.find((c) => c.properties.notify)!;
  const writeChar = (
    characteristics.find((c) => c.properties.write || c.properties.writeWithoutResponse)
    ?? notifyChar
  )!;

  // Listen for hits
  await notifyChar.startNotifications();
  notifyChar.addEventListener("characteristicvaluechanged", (event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value!;
    const uid = Array.from(new Uint8Array(value.buffer)).join("-");
    const segment = SEGMENT_MAP[uid] ?? `UNKNOWN(${uid})`;
    console.log("Hit:", segment);
  });

  // Send a command
  const sendCommand = async (bytes: number[]) => {
    await writeChar.writeValueWithoutResponse(new Uint8Array(bytes));
  };

  device.addEventListener("gattserverdisconnected", () => {
    console.log("Disconnected");
  });

  return { device, sendCommand };
}

// --- Example Usage ---

async function main() {
  const { sendCommand } = await connect();

  // Light the ring red
  await sendCommand(buildLightRingCommand({ r: 255, g: 0, b: 0 }));

  // Blink white after 2 seconds
  setTimeout(() => sendCommand(buildBlinkCommand({ r: 255, g: 255, b: 255 })), 2000);

  // Clear after 4 seconds
  setTimeout(() => sendCommand(buildClearCommand()), 4000);
}

main().catch(console.error);

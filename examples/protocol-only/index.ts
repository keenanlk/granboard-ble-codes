// Pure protocol: no BLE at all. Use this when you already have your own
// Bluetooth layer and only need to turn notification bytes into hits and
// LED commands into bytes.
import {
  Colors,
  buildBlinkCommand,
  buildClearCommand,
  buildHitCommand,
  buildLightRingCommand,
  buildPersistentNumbersCommand,
  buildWaveCommand,
  decodeHit,
  toCode,
} from "granboard";

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");

// 1. Decode notifications. These are the bytes your notify characteristic
//    hands you. decodeHit accepts Uint8Array, DataView, ArrayBuffer or number[].
const notifications: number[][] = [
  [51, 46, 52, 64], // triple 20
  [56, 46, 51, 64], // double 17
  [1, 2, 3], // not in the table
];

for (const bytes of notifications) {
  const hit = decodeHit(bytes);
  if (hit) {
    console.log(`${toCode(bytes).padEnd(16)} -> ${hit.id} (${hit.ring}, ${hit.score} points)`);
  } else {
    console.log(`${toCode(bytes).padEnd(16)} -> unknown code, please report it upstream`);
  }
}

// 2. Build commands. Write each Uint8Array to the write characteristic.
const commands: Record<string, Uint8Array> = {
  "flash triple 20 (yellow, 3 blinks)": buildHitCommand(20, Colors.YELLOW, { blinks: 3 }),
  "light the ring green": buildLightRingCommand(Colors.GREEN),
  "blink the ring white": buildBlinkCommand(Colors.WHITE),
  "wave red up, blue down": buildWaveCommand(Colors.RED, Colors.BLUE),
  "light 15, 16, 17 (orange)": buildPersistentNumbersCommand([15, 16, 17]),
  "clear all LEDs": buildClearCommand(),
};

console.log();
for (const [label, bytes] of Object.entries(commands)) {
  console.log(`${label.padEnd(36)} ${hex(bytes)}`);
}

// 3. Flash the segment for a decoded hit, the way GranboardClient.highlightHit does.
const hit = decodeHit([51, 46, 52, 64]);
if (hit?.number && hit.number <= 20) {
  const color = hit.multiplier === 3 ? Colors.YELLOW : hit.multiplier === 2 ? Colors.GREEN : Colors.RED;
  const cmd = buildHitCommand(hit.number, color, { blinks: hit.multiplier as 1 | 2 | 3 });
  console.log(`\nhighlight ${hit.id}: ${hex(cmd)}`);
}

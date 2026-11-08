// Connect to the first GranBoard in range, run the sweep, light the ring,
// then print every hit and flash its segment. Ctrl+C clears the LEDs and exits.
import { Colors, GranboardClient } from "granboard";
import { findGranboard, nobleTransport } from "./nobleTransport.js";

console.log("Scanning for a GranBoard...");
const peripheral = await findGranboard();
console.log(`Found ${peripheral.advertisement.localName ?? peripheral.id}, connecting...`);

const board = await GranboardClient.create(await nobleTransport(peripheral), { minWriteIntervalMs: 20 });
console.log("Connected. Throw a dart (Ctrl+C to quit).");

board.onHit((hit) => {
  console.log(`${hit.id.padEnd(8)} ${String(hit.score).padStart(2)} pts  [${hit.code}]`);
  void board.highlightHit(hit);
});
board.onUnknown(({ code }) => console.log(`unknown code ${code}, please report it upstream`));
board.onDisconnect(() => {
  console.log("Board disconnected.");
  process.exit(0);
});

await board.sweep();
await board.lightRing(Colors.GREEN);

process.on("SIGINT", async () => {
  await board.clear().catch(() => undefined);
  await board.disconnect();
  process.exit(0);
});

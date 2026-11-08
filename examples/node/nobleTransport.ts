import noble, { type Peripheral } from "@stoprocent/noble";
import { SERVICE_UUID, type GranboardTransport } from "granboard";

// noble writes UUIDs lowercase with no dashes.
const NOBLE_SERVICE_UUID = SERVICE_UUID.replace(/-/g, "");

/** Scan until the first GranBoard shows up, then return it (not yet connected). */
export async function findGranboard(timeoutMs = 15_000): Promise<Peripheral> {
  await noble.waitForPoweredOnAsync();
  await noble.startScanningAsync([NOBLE_SERVICE_UUID], false);
  try {
    return await new Promise<Peripheral>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("No GranBoard found. Is it on and not connected elsewhere?")), timeoutMs);
      noble.once("discover", (peripheral) => {
        clearTimeout(timer);
        resolve(peripheral);
      });
    });
  } finally {
    await noble.stopScanningAsync();
  }
}

/** Connect to a peripheral and wrap it as a GranboardTransport. */
export async function nobleTransport(peripheral: Peripheral): Promise<GranboardTransport> {
  await peripheral.connectAsync();
  const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync([NOBLE_SERVICE_UUID], []);

  // The board has one notify characteristic (hits) and one write characteristic (LEDs).
  const notifyChar = characteristics.find((c) => c.properties.includes("notify"));
  const writeChar =
    characteristics.find((c) => c.properties.includes("writeWithoutResponse")) ??
    characteristics.find((c) => c.properties.includes("write"));
  if (!notifyChar || !writeChar) throw new Error("GranBoard characteristics not found");
  const withoutResponse = writeChar.properties.includes("writeWithoutResponse");

  return {
    async write(bytes) {
      await writeChar.writeAsync(Buffer.from(bytes), withoutResponse);
    },
    async subscribe(onData) {
      const handler = (data: Buffer) => onData(new Uint8Array(data));
      notifyChar.on("data", handler);
      await notifyChar.subscribeAsync();
      return () => {
        notifyChar.removeListener("data", handler);
        notifyChar.unsubscribeAsync().catch(() => undefined);
      };
    },
    onDisconnect(callback) {
      peripheral.once("disconnect", () => callback());
    },
    async disconnect() {
      await peripheral.disconnectAsync();
    },
  };
}

import { GranboardClient, type GranboardClientOptions, type GranboardTransport } from "./client.js";

/** GranBoard's primary BLE service. */
export const SERVICE_UUID = "442f1570-8a00-9a28-cbe1-e1d4212d53eb";

// Minimal structural types so consumers don't need @types/web-bluetooth.
interface Characteristic extends EventTarget {
  readonly properties: { notify: boolean; write: boolean; writeWithoutResponse: boolean };
  readonly value?: DataView | null;
  startNotifications(): Promise<unknown>;
  stopNotifications(): Promise<unknown>;
  writeValueWithoutResponse(value: Uint8Array): Promise<void>;
  writeValueWithResponse?(value: Uint8Array): Promise<void>;
}
interface Device extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: {
    connected: boolean;
    connect(): Promise<{ getPrimaryService(uuid: string): Promise<{ getCharacteristics(): Promise<Characteristic[]> }> }>;
    disconnect(): void;
  };
}
interface Bluetooth {
  requestDevice(options: { filters: { services: string[] }[] }): Promise<Device>;
}

/** Whether this environment exposes `navigator.bluetooth`. */
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/** Build a transport from an already-selected Web Bluetooth device. */
export async function webBluetoothTransport(device: Device): Promise<GranboardTransport> {
  if (!device.gatt) throw new Error("Device has no GATT server");
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristics = await service.getCharacteristics();

  const notifyChar = characteristics.find((c) => c.properties.notify);
  const writeChar =
    characteristics.find((c) => c.properties.writeWithoutResponse) ??
    characteristics.find((c) => c.properties.write) ??
    notifyChar;
  if (!notifyChar || !writeChar) throw new Error("GranBoard characteristics not found");

  const canWriteWithoutResponse = writeChar.properties.writeWithoutResponse;

  return {
    async write(bytes) {
      if (!canWriteWithoutResponse && writeChar.writeValueWithResponse) {
        await writeChar.writeValueWithResponse(bytes);
      } else {
        await writeChar.writeValueWithoutResponse(bytes);
      }
    },
    async subscribe(onData) {
      const handler = (event: Event) => {
        const value = (event.target as Characteristic).value;
        if (value) onData(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      };
      notifyChar.addEventListener("characteristicvaluechanged", handler);
      await notifyChar.startNotifications();
      return () => {
        notifyChar.removeEventListener("characteristicvaluechanged", handler);
        notifyChar.stopNotifications().catch(() => undefined);
      };
    },
    onDisconnect(callback) {
      device.addEventListener("gattserverdisconnected", () => callback(), { once: true });
    },
    disconnect() {
      if (device.gatt?.connected) device.gatt.disconnect();
    },
  };
}

/**
 * Show the browser's Bluetooth picker and connect to a GranBoard.
 * Must be called from a user gesture (e.g. a click handler).
 */
export async function connectWebBluetooth(
  options: GranboardClientOptions & { bluetooth?: Bluetooth } = {},
): Promise<GranboardClient & { device: Device }> {
  const bluetooth = options.bluetooth ?? (isWebBluetoothAvailable() ? (navigator as unknown as { bluetooth: Bluetooth }).bluetooth : undefined);
  if (!bluetooth) throw new Error("Web Bluetooth is not available in this environment");
  const device = await bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
  const client = await GranboardClient.create(await webBluetoothTransport(device), options);
  return Object.assign(client, { device });
}

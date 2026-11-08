import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State, type Device } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { SERVICE_UUID, type GranboardTransport } from "granboard";

/** Wrap a connected react-native-ble-plx device as a GranboardTransport. */
export async function blePlxTransport(device: Device): Promise<GranboardTransport> {
  await device.discoverAllServicesAndCharacteristics();
  const characteristics = await device.characteristicsForService(SERVICE_UUID);

  // The board has one notify characteristic (hits) and one write characteristic (LEDs).
  const notifyChar = characteristics.find((c) => c.isNotifiable);
  const writeChar =
    characteristics.find((c) => c.isWritableWithoutResponse) ?? characteristics.find((c) => c.isWritableWithResponse);
  if (!notifyChar || !writeChar) throw new Error("GranBoard characteristics not found");

  return {
    async write(bytes) {
      const base64 = Buffer.from(bytes).toString("base64");
      if (writeChar.isWritableWithoutResponse) await writeChar.writeWithoutResponse(base64);
      else await writeChar.writeWithResponse(base64);
    },
    subscribe(onData) {
      const sub = notifyChar.monitor((error, c) => {
        if (!error && c?.value) onData(new Uint8Array(Buffer.from(c.value, "base64")));
      });
      return () => sub.remove();
    },
    onDisconnect(callback) {
      const sub = device.onDisconnected(() => {
        sub.remove();
        callback();
      });
    },
    async disconnect() {
      await device.cancelConnection();
    },
  };
}

/** Ask for the Android 12+ runtime permissions BLE scanning needs. iOS uses Info.plist. */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (Platform.Version < 31) {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }
  const r = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return Object.values(r).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

/** Wait for Bluetooth to power on, scan for the first GranBoard, and connect to it. */
export async function findAndConnect(manager: BleManager, timeoutMs = 15_000): Promise<Device> {
  await new Promise<void>((resolve) => {
    const sub = manager.onStateChange((state) => {
      if (state === State.PoweredOn) {
        sub.remove();
        resolve();
      }
    }, true);
  });

  const found = await new Promise<Device>((resolve, reject) => {
    const timer = setTimeout(() => {
      void manager.stopDeviceScan();
      reject(new Error("No GranBoard found"));
    }, timeoutMs);
    void manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (error) {
        clearTimeout(timer);
        reject(error);
      } else if (device) {
        clearTimeout(timer);
        void manager.stopDeviceScan();
        resolve(device);
      }
    });
  });

  return found.connect();
}

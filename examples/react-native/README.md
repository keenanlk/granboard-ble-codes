# React Native (Expo + react-native-ble-plx)

An Expo app that connects to a GranBoard with [`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx) and drives it through [`granboard`](https://www.npmjs.com/package/granboard).

- [src/blePlxTransport.ts](src/blePlxTransport.ts) holds `blePlxTransport(device)`, a `GranboardTransport` adapter. It also has `requestBlePermissions()` and `findAndConnect(manager)`.
- [src/GranboardScreen.tsx](src/GranboardScreen.tsx) is a screen that uses `GranboardClient.create`. It logs hits, flashes the hit segment, and has Ring, Sweep, Clear and Disconnect buttons.

> **Untested on a real board or device.** `npm run typecheck` passes and `npx expo export` bundles the JS. The scan, connect, notify and write paths have not been run against a GranBoard yet.

## Requirements

- Node.js 18+
- A physical iOS or Android device, since simulators have no Bluetooth
- Xcode or Android Studio to build a development client

`react-native-ble-plx` has native code, so this example doesn't run in Expo Go. Build a development client instead. The config plugin in [app.json](app.json) adds the Bluetooth permissions on both platforms.

## Run

```bash
npm install
npx expo run:ios --device       # or: npx expo run:android --device
```

`npm run typecheck` checks types without hardware.

## Using it in a bare React Native app

Copy `src/blePlxTransport.ts` and install the dependencies:

```bash
npm install granboard react-native-ble-plx buffer
```

Then follow the [react-native-ble-plx setup](https://github.com/dotintent/react-native-ble-plx#configuration--installation) for the iOS `Info.plist` and Android manifest permissions.

```ts
const device = await findAndConnect(manager);
const board = await GranboardClient.create(await blePlxTransport(device));
board.onHit((hit) => board.highlightHit(hit));
```

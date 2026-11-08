# Node.js (noble)

A CLI that connects to a GranBoard over BLE using [`@stoprocent/noble`](https://www.npmjs.com/package/@stoprocent/noble), prints every hit, and flashes the hit segment. It runs the sweep on connect, lights the ring green, and clears the LEDs when you press Ctrl+C.

- [nobleTransport.ts](nobleTransport.ts) holds `findGranboard()` and a `GranboardTransport` adapter for noble.
- [index.ts](index.ts) is the CLI, built on `GranboardClient.create(transport)` from [`granboard`](https://www.npmjs.com/package/granboard).

> **Untested on a real board.** `npm run typecheck` passes. The scan, connect, notify and write paths have not been run against a GranBoard yet.

## Requirements

- Node.js 18+
- A Bluetooth LE adapter, and the platform setup noble needs. See the [noble README](https://github.com/stoprocent/noble#readme).
  - macOS: allow Bluetooth access for your terminal app when prompted.
  - Linux: BlueZ, plus `sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))` to run without root.
  - Windows: a compatible adapter. See the noble docs.
- The board must not be connected to another app, such as the GranBoard app on your phone.

## Run

```bash
npm install
npm start
```

```
Scanning for a GranBoard...
Found GRANBOARD, connecting...
Connected. Throw a dart (Ctrl+C to quit).
TRP_20   60 pts  [51-46-52-64]
```

`npm run typecheck` checks types without hardware.

## Using `@abandonware/noble` instead

The adapter only uses the async API that both forks share (`startScanningAsync`, `connectAsync`, `discoverSomeServicesAndCharacteristicsAsync`, `subscribeAsync`, `writeAsync`). Replace `waitForPoweredOnAsync()` with a wait for the `stateChange` event reaching `"poweredOn"`, then swap the import.

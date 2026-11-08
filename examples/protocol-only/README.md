# Protocol only (no BLE)

For when you already have your own Bluetooth layer, such as Capacitor, Flutter via JS, a native bridge, or a test harness. You don't need `GranboardClient` or a transport. Use the pure functions from [`granboard`](https://www.npmjs.com/package/granboard):

- `decodeHit(bytes)` turns notify characteristic bytes into a `Hit`, or `null` for unknown codes.
- `buildHitCommand`, `buildLightRingCommand`, `buildBlinkCommand`, `buildWaveCommand`, `buildPersistentNumbersCommand` and `buildClearCommand` each return a `Uint8Array` to write to the write characteristic.

Everything here runs without hardware.

## Run

```bash
npm install
npm start          # decodes sample notifications and prints command bytes
npm run typecheck
```

Example output:

```
51-46-52-64      -> TRP_20 (triple, 60 points)
56-46-51-64      -> DBL_17 (double, 34 points)
1-2-3            -> unknown code, please report it upstream

flash triple 20 (yellow, 3 blinks)   03 ff c8 00 00 00 00 00 00 00 19 00 14 00 00 00
light the ring green                 14 00 ff 00 00 00 00 00 00 00 00 00 14 00 00 01
...
```

## Wiring it to your BLE stack

```ts
myBle.onNotify((bytes) => {
  const hit = decodeHit(bytes);
  if (hit) console.log(hit.id, hit.score);
});

await myBle.write(buildLightRingCommand(Colors.GREEN));
```

If you would rather get the client's write queue, `sweep()` and `highlightHit()`, write a small `GranboardTransport` around your stack instead. The [Node](../node) and [React Native](../react-native) examples both do this.

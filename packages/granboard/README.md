# granboard

TypeScript client for [GranBoard](https://www.granboard.com/) electronic dartboards over Bluetooth LE. Decode dart hits and drive the LED ring from a browser, React Native, Capacitor, Electron, or Node.

Built from the community [GranBoard BLE protocol reference](https://github.com/keenanlk/granboard-ble-codes). Zero runtime dependencies, ESM + CJS, full types.

```bash
npm install granboard
```

**[API reference](https://keenanlk.github.io/granboard-ble-codes/api/)** · [Live demo](https://keenanlk.github.io/granboard-ble-codes/) · [Examples](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples)

## Browser (Web Bluetooth)

Works in Chrome, Edge, and Opera. `connectWebBluetooth` has to be called from a user gesture.

```ts
import { connectWebBluetooth, Colors } from "granboard";

button.onclick = async () => {
  const board = await connectWebBluetooth();

  board.onHit((hit) => {
    console.log(hit.id, hit.score); // "TRP_20" 60
    board.highlightHit(hit);        // flash the segment
  });

  board.onDisconnect(() => console.log("board disconnected"));

  await board.sweep();              // startup animation
  await board.lightRing(Colors.GREEN);
};
```

## Other BLE stacks

The client only needs a small transport. Here it is with `react-native-ble-plx`:

```ts
import { GranboardClient, SERVICE_UUID, type GranboardTransport } from "granboard";
import { Buffer } from "buffer";

const transport: GranboardTransport = {
  write: async (bytes) => {
    await device.writeCharacteristicWithoutResponseForService(
      SERVICE_UUID, WRITE_CHAR_UUID, Buffer.from(bytes).toString("base64"));
  },
  subscribe: (onData) => {
    const sub = device.monitorCharacteristicForService(SERVICE_UUID, NOTIFY_CHAR_UUID, (_err, c) => {
      if (c?.value) onData(Buffer.from(c.value, "base64"));
    });
    return () => sub.remove();
  },
  onDisconnect: (cb) => device.onDisconnected(cb),
  disconnect: () => device.cancelConnection().then(() => undefined),
};

const board = await GranboardClient.create(transport);
```

## Targets and Cricket

Light one or more numbers until you send another command, for a target or a set of open numbers:

```ts
await board.lightNumbers([20]);                 // one target
await board.setNumberColors({ 20: 0x05, 19: 0x02 }); // each number its own color

// Cricket: marks per player; lights every number not yet closed by all players
await board.showCricket([
  { 20: 3, 19: 1 },
  { 20: 3, 18: 2 },
]); // lights 15, 16, 17, 18, 19
```

`cricketOpenNumbers(players)` returns the same list without sending anything. Two limits come from the board itself: bull can't be lit this way, and colors are palette indices rather than RGB. Only `0x05` (orange) is confirmed; please report what `0x01`-`0x07` look like on your board.

## Just the protocol

If you already have your own BLE layer, use the pure functions:

```ts
import { decodeHit, buildHitCommand, buildClearCommand, Colors } from "granboard";

const hit = decodeHit(notificationBytes);  // Uint8Array | DataView | ArrayBuffer | number[]
// { id: "DBL_16", ring: "double", number: 16, multiplier: 2, score: 32, code: "49-49-46-54-64", raw }

write(buildHitCommand(16, Colors.GREEN, { blinks: 2 }));
write(buildClearCommand());
```

`decodeHit` returns `null` for codes it doesn't recognize. `client.onUnknown` hands you those codes so you can report them.

## Examples

Runnable examples live in the [repository](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples):

| Example | Stack |
|---|---|
| [web-vanilla](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples/web-vanilla) | One HTML file, Web Bluetooth, loaded from a CDN |
| [react](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples/react) | React + Vite with a `useGranboard` hook |
| [react-native](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples/react-native) | Expo + `react-native-ble-plx` transport |
| [node](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples/node) | Node.js CLI with a `@stoprocent/noble` transport |
| [protocol-only](https://github.com/keenanlk/granboard-ble-codes/tree/main/examples/protocol-only) | `decodeHit` and command builders, no BLE |

## API

A summary of the main exports. The [API reference](https://keenanlk.github.io/granboard-ble-codes/api/) has every export, type and parameter.

### Hits

| | |
|---|---|
| `decodeHit(bytes)` | `Hit \| null`, with `id`, `ring`, `number`, `multiplier`, `score`, `code`, `raw` |
| `describeSegment(id)` | ring, number, multiplier, and score for a `SegmentId` |
| `SEGMENT_CODES` | raw code → `SegmentId` map |

`ring` is one of `inner`, `outer`, `triple`, `double`, `bull` (25), `double_bull` (50), `miss`, `button`.

### `GranboardClient`

| | |
|---|---|
| `GranboardClient.create(transport, { minWriteIntervalMs? })` | wrap a transport |
| `onHit(fn)` / `onUnknown(fn)` / `onDisconnect(fn)` | subscribe; each returns an unsubscribe function |
| `send(bytes)` | raw write. Writes are queued and sent in order |
| `lightRing(color)` | solid ring until the next command |
| `blink(color, duration?)` | flash the ring, then off |
| `wave(colorUp, colorDown, speed?)` | two-color wave |
| `lightSegment(n, color, { blinks?, duration? })` | blink one number's segment |
| `lightNumbers(numbers, paletteColor?)` | persistently light numbers 1-20 in one color, e.g. a target |
| `setNumberColors({ 20: 0x05, 19: 0x02 })` | persistently light numbers, each in its own palette color |
| `showCricket(players, paletteColor?)` | light the Cricket numbers not yet closed by every player |
| `clear()` | all LEDs off |
| `highlightHit(hit, colors?)` | the suggested hit effect: red single, green double, yellow triple, blue bull |
| `sweep({ stepMs?, from?, to?, signal? })` | clockwise gradient sweep, then blink |
| `removeDartsCountdown({ durationMs?, paletteColor?, signal? })` | depleting ring, then clear |
| `disconnect()` | stop notifications and close |

### Command builders

`buildHitCommand`, `buildBlinkCommand`, `buildWaveCommand`, `buildLightRingCommand`, `buildPersistentNumbersCommand`, `buildNumberColorsCommand`, `buildClearCommand` all return a `Uint8Array`. The package also exports `Colors`, `PaletteColor`, `LED_POSITIONS`, `CLOCKWISE_ORDER`, `SERVICE_UUID`, and `lerpColor`.

## Disclaimer

The protocol was reverse engineered and may be incomplete. This package is not affiliated with or endorsed by GranDarts Co., Ltd.

MIT licensed.

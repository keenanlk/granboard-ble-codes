# granboard

TypeScript client for [GranBoard](https://www.granboard.com/) electronic dartboards over Bluetooth LE. Decode dart hits and drive the LED ring from a browser, React Native, Capacitor, Electron, or Node.

Built from the community [GranBoard BLE protocol reference](https://github.com/keenanlk/granboard-ble-codes). Zero runtime dependencies, ESM + CJS, full types.

```bash
npm install granboard
```

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

## API

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
| `lightNumbers(numbers, paletteColor?)` | persistently light numbers 1-20 (e.g. open Cricket numbers) |
| `clear()` | all LEDs off |
| `highlightHit(hit, colors?)` | the suggested hit effect: red single, green double, yellow triple, blue bull |
| `sweep({ stepMs?, from?, to?, signal? })` | clockwise gradient sweep, then blink |
| `removeDartsCountdown({ durationMs?, paletteColor?, signal? })` | depleting ring, then clear |
| `disconnect()` | stop notifications and close |

### Command builders

`buildHitCommand`, `buildBlinkCommand`, `buildWaveCommand`, `buildLightRingCommand`, `buildPersistentNumbersCommand`, `buildClearCommand` all return a `Uint8Array`. The package also exports `Colors`, `PaletteColor`, `LED_POSITIONS`, `CLOCKWISE_ORDER`, `SERVICE_UUID`, and `lerpColor`.

## Disclaimer

The protocol was reverse engineered and may be incomplete. This package is not affiliated with or endorsed by GranDarts Co., Ltd.

MIT licensed.

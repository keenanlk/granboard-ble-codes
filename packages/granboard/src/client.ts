import {
  CLOCKWISE_ORDER,
  Colors,
  PaletteColor,
  buildBlinkCommand,
  buildClearCommand,
  buildHitCommand,
  buildLightRingCommand,
  buildNumberColorsCommand,
  buildPersistentNumbersCommand,
  buildWaveCommand,
  lerpColor,
  type HitCommandOptions,
  type RGB,
} from "./commands.js";
import { cricketOpenNumbers, type CricketMarks } from "./cricket.js";
import { decodeHit, toBytes, toCode, type Hit } from "./hits.js";

/**
 * The minimum a BLE stack must provide. Implement this to use the client
 * with react-native-ble-plx, Capacitor, noble, etc. `connectWebBluetooth`
 * builds one for browsers.
 */
export interface GranboardTransport {
  /** Write a command to the board's write characteristic. */
  write(bytes: Uint8Array): Promise<void>;
  /** Start receiving notifications. Returns a function that stops them. */
  subscribe(onData: (bytes: Uint8Array) => void): Promise<() => void> | (() => void);
  /** Register a callback for when the link drops. */
  onDisconnect?(callback: () => void): void;
  /** Close the connection. */
  disconnect?(): Promise<void> | void;
}

/** Options for {@link GranboardClient.create} and {@link connectWebBluetooth}. */
export interface GranboardClientOptions {
  /**
   * Minimum gap in ms between consecutive writes. The board can drop
   * commands sent too quickly. Defaults to 0 (writes are still serialized).
   */
  minWriteIntervalMs?: number;
}

type Listener<T> = (value: T) => void;

/** Colors used by `highlightHit`. */
export const HIT_COLORS = Object.freeze({
  single: Colors.RED,
  double: Colors.GREEN,
  triple: Colors.YELLOW,
  bull: Colors.LIGHT_BLUE,
});

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * A connected GranBoard. Decodes notifications into {@link Hit}s and sends
 * LED commands through a queue so they reach the board in order.
 *
 * Create one with {@link GranboardClient.create} from any {@link GranboardTransport},
 * or with {@link connectWebBluetooth} in a browser.
 *
 * ```ts
 * const board = await GranboardClient.create(transport);
 * board.onHit((hit) => board.highlightHit(hit));
 * await board.sweep();
 * ```
 */
export class GranboardClient {
  private readonly hitListeners = new Set<Listener<Hit>>();
  private readonly unknownListeners = new Set<Listener<{ code: string; raw: Uint8Array }>>();
  private readonly disconnectListeners = new Set<Listener<void>>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastWrite = 0;
  private unsubscribe: (() => void) | null = null;
  private connected = true;

  private constructor(
    private readonly transport: GranboardTransport,
    private readonly options: GranboardClientOptions,
  ) {}

  /** Wrap a transport and start listening for hits. */
  static async create(transport: GranboardTransport, options: GranboardClientOptions = {}): Promise<GranboardClient> {
    const client = new GranboardClient(transport, options);
    transport.onDisconnect?.(() => client.handleDisconnect());
    client.unsubscribe = await transport.subscribe((bytes) => client.handleData(bytes));
    return client;
  }

  /** `false` once the link has dropped or {@link disconnect} was called. */
  get isConnected(): boolean {
    return this.connected;
  }

  /** Called for every recognized dart hit, miss, or button press. Returns an unsubscribe function. */
  onHit(listener: Listener<Hit>): () => void {
    this.hitListeners.add(listener);
    return () => this.hitListeners.delete(listener);
  }

  /** Called for notifications that are not in the known code table. */
  onUnknown(listener: Listener<{ code: string; raw: Uint8Array }>): () => void {
    this.unknownListeners.add(listener);
    return () => this.unknownListeners.delete(listener);
  }

  /** Called once when the link drops or {@link disconnect} is called. Returns an unsubscribe function. */
  onDisconnect(listener: Listener<void>): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  /**
   * Send raw command bytes. Writes are queued so they reach the board in
   * order, one at a time.
   */
  send(bytes: Uint8Array | ArrayLike<number>): Promise<void> {
    const data = toBytes(bytes);
    const run = async () => {
      if (!this.connected) throw new Error("GranBoard is disconnected");
      const gap = this.options.minWriteIntervalMs ?? 0;
      const wait = this.lastWrite + gap - Date.now();
      if (gap > 0 && wait > 0) await sleep(wait);
      await this.transport.write(data);
      this.lastWrite = Date.now();
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Light the whole ring in one color until the next command. */
  lightRing(color: RGB): Promise<void> {
    return this.send(buildLightRingCommand(color));
  }

  /** Flash the whole ring, then turn it off after `duration` board frames (default `0x1E`). */
  blink(color: RGB, duration?: number): Promise<void> {
    return this.send(buildBlinkCommand(color, duration));
  }

  /** Run a two-color wave around the ring. `speed` defaults to `0x05`. */
  wave(colorUp: RGB, colorDown: RGB, speed?: number): Promise<void> {
    return this.send(buildWaveCommand(colorUp, colorDown, speed));
  }

  /** Blink one dart number's (1-20) segment of the ring. */
  lightSegment(dartNumber: number, color: RGB, options?: HitCommandOptions): Promise<void> {
    return this.send(buildHitCommand(dartNumber, color, options));
  }

  /** Persistently light dart numbers (1-20) in one palette color, e.g. a target or Cricket's open numbers. */
  lightNumbers(dartNumbers: Iterable<number>, paletteColor: number = PaletteColor.ORANGE): Promise<void> {
    return this.send(buildPersistentNumbersCommand(dartNumbers, paletteColor));
  }

  /** Persistently light dart numbers (1-20), each in its own palette color. Unlisted numbers turn off. */
  setNumberColors(colors: Partial<Record<number, number>> | ReadonlyMap<number, number>): Promise<void> {
    return this.send(buildNumberColorsCommand(colors));
  }

  /**
   * Light the Cricket numbers that every player hasn't closed yet. Call it
   * again after each dart. Bull is in play but can't be lit by the board.
   */
  showCricket(players: readonly CricketMarks[], paletteColor: number = PaletteColor.ORANGE): Promise<void> {
    const open = cricketOpenNumbers(players);
    return open.length ? this.lightNumbers(open, paletteColor) : this.clear();
  }

  /** Turn every LED off. */
  clear(): Promise<void> {
    return this.send(buildClearCommand());
  }

  /**
   * Flash the LEDs for a hit using the suggested scheme: red singles,
   * green doubles, yellow triples, light-blue blink for bull. Does nothing
   * for misses and the button.
   */
  highlightHit(hit: Hit, colors: Partial<typeof HIT_COLORS> = {}): Promise<void> {
    const c = { ...HIT_COLORS, ...colors };
    if (hit.ring === "bull" || hit.ring === "double_bull") return this.blink(c.bull, 0x14);
    if (hit.number === null || hit.number === 25) return Promise.resolve();
    const color = hit.multiplier === 3 ? c.triple : hit.multiplier === 2 ? c.double : c.single;
    return this.lightSegment(hit.number, color, { blinks: hit.multiplier as 1 | 2 | 3 });
  }

  /** Light each number clockwise with a red→green gradient, then blink green. */
  async sweep(options: { stepMs?: number; from?: RGB; to?: RGB; signal?: AbortSignal } = {}): Promise<void> {
    const { stepMs = 60, from = Colors.RED, to = Colors.GREEN, signal } = options;
    const last = CLOCKWISE_ORDER.length - 1;
    for (const [i, n] of CLOCKWISE_ORDER.entries()) {
      await this.lightSegment(n, lerpColor(from, to, i / last));
      await sleep(stepMs, signal);
    }
    await this.blink(to, 0x14);
  }

  /**
   * Light all 20 numbers, then turn them off one at a time counter-clockwise
   * over `durationMs`, then clear.
   */
  async removeDartsCountdown(
    options: { durationMs?: number; paletteColor?: number; signal?: AbortSignal } = {},
  ): Promise<void> {
    const { durationMs = 3000, paletteColor = PaletteColor.ORANGE, signal } = options;
    const remaining = [...CLOCKWISE_ORDER];
    const step = durationMs / remaining.length;
    await this.lightNumbers(remaining, paletteColor);
    while (remaining.length > 0) {
      await sleep(step, signal);
      remaining.pop();
      await (remaining.length ? this.lightNumbers(remaining, paletteColor) : this.clear());
    }
  }

  /** Stop notifications and close the connection. */
  async disconnect(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    await this.transport.disconnect?.();
    this.handleDisconnect();
  }

  private handleData(bytes: Uint8Array): void {
    const hit = decodeHit(bytes);
    if (hit) {
      for (const l of this.hitListeners) l(hit);
    } else {
      const raw = Uint8Array.from(bytes);
      for (const l of this.unknownListeners) l({ code: toCode(raw), raw });
    }
  }

  private handleDisconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    for (const l of this.disconnectListeners) l();
  }
}

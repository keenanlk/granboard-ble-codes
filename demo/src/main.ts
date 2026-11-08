import {
  CLOCKWISE_ORDER,
  Colors,
  SEGMENT_CODES,
  buildBlinkCommand,
  buildClearCommand,
  buildHitCommand,
  buildLightRingCommand,
  buildPersistentNumbersCommand,
  buildWaveCommand,
  connectWebBluetooth,
  decodeHit,
  isWebBluetoothAvailable,
  type GranboardClient,
  type Hit,
  type RGB,
  type SegmentId,
} from "granboard";
import { drawBoard } from "./board";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- state ----------

type ColorName = keyof typeof Colors;
type ActionId = "ring" | "blink" | "wave" | "sweep" | "countdown" | "clear";

const COLOR_CHOICES: { id: ColorName; label: string }[] = [
  { id: "RED", label: "Red" },
  { id: "GREEN", label: "Green" },
  { id: "BLUE", label: "Blue" },
  { id: "WHITE", label: "White" },
  { id: "YELLOW", label: "Yellow" },
  { id: "ORANGE", label: "Orange" },
  { id: "LIGHT_BLUE", label: "Light blue" },
];

let board: (GranboardClient & { device: { name?: string } }) | null = null;
let color: ColorName = "WHITE";
let action: ActionId = "blink";
let running: AbortController | null = null;
const history: { hit: Hit; simulated: boolean }[] = [];

// ---------- actions ----------

interface ActionSpec {
  label: string;
  code: (c: ColorName) => string;
  bytes: (c: RGB, name: ColorName) => Uint8Array;
  note: string;
  run: (b: GranboardClient, c: RGB, name: ColorName, signal: AbortSignal) => Promise<void>;
}

const other = (name: ColorName): ColorName => (name === "RED" ? "WHITE" : "RED");

const ACTIONS: Record<ActionId, ActionSpec> = {
  ring: {
    label: "Light ring",
    code: (c) => `await board.lightRing(Colors.${c});`,
    bytes: (c) => buildLightRingCommand(c),
    note: "Stays lit until the next command.",
    run: (b, c) => b.lightRing(c),
  },
  blink: {
    label: "Blink",
    code: (c) => `await board.blink(Colors.${c});`,
    bytes: (c) => buildBlinkCommand(c),
    note: "Flashes the ring for 30 frames, then turns off.",
    run: (b, c) => b.blink(c),
  },
  wave: {
    label: "Wave",
    code: (c) => `await board.wave(Colors.${c}, Colors.${other(c)});`,
    bytes: (c, n) => buildWaveCommand(c, Colors[other(n)]),
    note: "A two-color wave around the full ring.",
    run: (b, c, n) => b.wave(c, Colors[other(n)]),
  },
  sweep: {
    label: "Sweep",
    code: (c) => `await board.sweep({ to: Colors.${c} });`,
    bytes: () => buildHitCommand(CLOCKWISE_ORDER[0]!, Colors.RED),
    note: "The first of 20 commands, sent 60 ms apart, fading from red to your color.",
    run: (b, c, _n, signal) => b.sweep({ to: c, signal }),
  },
  countdown: {
    label: "Countdown",
    code: () => "await board.removeDartsCountdown({ durationMs: 3000 });",
    bytes: () => buildPersistentNumbersCommand(CLOCKWISE_ORDER),
    note: "Lights all 20 numbers, then turns one off every 150 ms.",
    run: (b, _c, _n, signal) => b.removeDartsCountdown({ durationMs: 3000, signal }),
  },
  clear: {
    label: "Clear",
    code: () => "await board.clear();",
    bytes: () => buildClearCommand(),
    note: "Twenty zero bytes turn every LED off.",
    run: (b) => b.clear(),
  },
};

// ---------- rendering ----------

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
const rgbHex = ({ r, g, b }: RGB) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

function hitLabel(hit: Hit): string {
  switch (hit.ring) {
    case "inner": return `Inner single ${hit.number}`;
    case "outer": return `Outer single ${hit.number}`;
    case "triple": return `Triple ${hit.number}`;
    case "double": return `Double ${hit.number}`;
    case "bull": return "Bull";
    case "double_bull": return "Double bull";
    case "miss": return "Miss";
    case "button": return "Board button";
  }
}

function hitBadge(hit: Hit): string {
  switch (hit.ring) {
    case "inner":
    case "outer": return `S${hit.number}`;
    case "triple": return `T${hit.number}`;
    case "double": return `D${hit.number}`;
    case "bull": return "BULL";
    case "double_bull": return "DBULL";
    case "miss": return "MISS";
    case "button": return "BTN";
  }
}

const ascii = (raw: Uint8Array) => String.fromCharCode(...raw);

function renderCode() {
  const spec = ACTIONS[action];
  const bytes = spec.bytes(Colors[color], color);
  $("code").textContent = spec.code(color);
  $("bytes").textContent = hex(bytes);
  $("byte-count").textContent = `${bytes.length} bytes`;
  $("byte-note").textContent = spec.note;
}

function renderControls() {
  const swatches = $("swatches");
  swatches.replaceChildren(
    ...COLOR_CHOICES.map(({ id, label }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("aria-pressed", String(id === color));
      const chip = document.createElement("span");
      chip.style.background = rgbHex(Colors[id]);
      btn.append(chip);
      btn.addEventListener("click", () => {
        color = id;
        renderControls();
        void send();
      });
      return btn;
    }),
  );
  $("color-name").textContent = COLOR_CHOICES.find((c) => c.id === color)!.label;

  const actions = $("actions");
  actions.replaceChildren(
    ...(Object.keys(ACTIONS) as ActionId[]).map((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "action";
      btn.textContent = ACTIONS[id].label;
      btn.setAttribute("aria-pressed", String(id === action));
      btn.addEventListener("click", () => {
        action = id;
        renderControls();
        void send();
      });
      return btn;
    }),
  );
  renderCode();
}

function renderHits() {
  const list = $("hits");
  list.replaceChildren(
    ...history.slice(0, 8).map(({ hit, simulated }, i) => {
      const li = document.createElement("li");
      const badge = document.createElement("span");
      badge.className = "badge" + (i === 0 ? " latest" : hit.score === 0 ? " zero" : "");
      badge.textContent = hitBadge(hit);
      const text = document.createElement("div");
      text.className = "hit-text";
      const label = document.createElement("span");
      label.textContent = hitLabel(hit);
      if (simulated) {
        const sim = document.createElement("span");
        sim.className = "sim";
        sim.textContent = "SIM";
        sim.title = "Simulated by clicking the board";
        label.append(sim);
      }
      const code = document.createElement("code");
      code.textContent = hit.code;
      text.append(label, code);
      const score = document.createElement("span");
      score.className = "hit-score";
      score.textContent = String(hit.score);
      li.append(badge, text, score);
      return li;
    }),
  );
  $("hits-empty").hidden = history.length > 0;
  const scoring = history.filter((h) => h.hit.ring !== "button").slice(0, 3);
  $("turn-total").textContent = String(scoring.reduce((sum, h) => sum + h.hit.score, 0));
}

function renderConnection() {
  const supported = isWebBluetoothAvailable();
  $("unsupported").hidden = supported;
  $("connect-panel").hidden = !supported || board !== null;
  $("status-panel").hidden = board === null;
  if (board) $("device-name").textContent = `${board.device.name ?? "GranBoard"} · Bluetooth`;
  $("led-mode").textContent = board ? "Sending to your board" : "Preview only until connected";
  $("board-hint").textContent = board ? "Throw a dart, or click to simulate" : "Click a segment to simulate a throw";
  view.setDimmed(false);
}

function showError(message: string | null) {
  const el = $("error");
  el.hidden = !message;
  el.textContent = message ?? "";
}

// ---------- behavior ----------

const view = drawBoard($<SVGSVGElement & HTMLElement>("board") as unknown as SVGSVGElement, (id) => simulate(id));

const CODE_FOR_ID = new Map<SegmentId, string>(
  Object.entries(SEGMENT_CODES).map(([code, id]) => [id, code]),
);

function simulate(id: SegmentId) {
  const code = CODE_FOR_ID.get(id);
  if (!code) return;
  const hit = decodeHit(code.split("-").map(Number));
  if (hit) handleHit(hit, true);
}

function handleHit(hit: Hit, simulated: boolean) {
  history.unshift({ hit, simulated });
  history.length = Math.min(history.length, 50);
  view.show(hit);
  $("last-label").textContent = hitLabel(hit);
  $("last-code").textContent = `${hit.code} · "${ascii(hit.raw)}" → ${hit.id}`;
  $("last-score").textContent = String(hit.score);
  renderHits();
  if (board && ($("auto-highlight") as HTMLInputElement).checked) {
    board.highlightHit(hit).catch((err: unknown) => showError(`Couldn't flash the segment: ${String(err)}`));
  }
}

async function send() {
  renderCode();
  if (!board) return;
  running?.abort();
  const ctrl = new AbortController();
  running = ctrl;
  try {
    await ACTIONS[action].run(board, Colors[color], color, ctrl.signal);
    showError(null);
  } catch (err) {
    if (!ctrl.signal.aborted) showError(`The board didn't accept that command: ${String(err)}`);
  }
}

async function connect() {
  const btn = $<HTMLButtonElement>("connect-btn");
  btn.disabled = true;
  showError(null);
  try {
    board = await connectWebBluetooth();
    board.onHit((hit) => handleHit(hit, false));
    board.onUnknown(({ code }) => showError(`Unknown code ${code}. Please report it on GitHub.`));
    board.onDisconnect(() => {
      board = null;
      running?.abort();
      renderConnection();
    });
    renderConnection();
  } catch (err) {
    // The user closing the picker is not an error worth showing.
    if (!(err instanceof DOMException && err.name === "NotFoundError")) {
      showError(`Couldn't connect: ${err instanceof Error ? err.message : String(err)}`);
    }
  } finally {
    btn.disabled = false;
  }
}

$("connect-btn").addEventListener("click", () => void connect());
$("disconnect-btn").addEventListener("click", () => void board?.disconnect());

for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  btn.addEventListener("click", () => void navigator.clipboard?.writeText(btn.dataset.copy!));
}
$("copy-link").addEventListener("click", async (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  try {
    await navigator.clipboard.writeText(location.href);
    btn.lastChild!.textContent = " Link copied";
  } catch {
    btn.lastChild!.textContent = " Copy the address bar instead";
  }
});

renderControls();
renderHits();
renderConnection();

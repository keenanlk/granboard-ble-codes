import { describe, expect, it, vi } from "vitest";
import { Colors, GranboardClient, connectWebBluetooth, decodeHit, type GranboardTransport, type Hit } from "../src/index.js";

function fakeTransport() {
  let onData: ((b: Uint8Array) => void) | null = null;
  let onDisc: (() => void) | null = null;
  const writes: Uint8Array[] = [];
  const transport: GranboardTransport = {
    write: vi.fn(async (b: Uint8Array) => {
      await new Promise((r) => setTimeout(r, Math.random() * 3));
      writes.push(b);
    }),
    subscribe: (cb) => {
      onData = cb;
      return () => (onData = null);
    },
    onDisconnect: (cb) => (onDisc = cb),
    disconnect: vi.fn(),
  };
  return {
    transport,
    writes,
    emit: (bytes: number[]) => onData?.(new Uint8Array(bytes)),
    drop: () => onDisc?.(),
  };
}

describe("GranboardClient", () => {
  it("emits hits and unknown codes", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    const hits: Hit[] = [];
    const unknown: string[] = [];
    const off = client.onHit((h) => hits.push(h));
    client.onUnknown((u) => unknown.push(u.code));

    t.emit([51, 46, 52, 64]);
    t.emit([9, 9]);
    off();
    t.emit([51, 46, 52, 64]);

    expect(hits.map((h) => h.id)).toEqual(["TRP_20"]);
    expect(unknown).toEqual(["9-9"]);
  });

  it("serializes writes in order", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    await Promise.all([1, 2, 3, 4, 5].map((n) => client.lightSegment(n, Colors.RED)));
    expect(t.writes.map((w) => w[10])).toEqual([28, 49, 55, 34, 22]);
  });

  it("keeps the queue going after a failed write", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    vi.mocked(t.transport.write).mockRejectedValueOnce(new Error("boom"));
    await expect(client.clear()).rejects.toThrow("boom");
    await client.clear();
    expect(t.writes).toHaveLength(1);
  });

  it("highlights hits with the suggested colors", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    await client.highlightHit(decodeHit([51, 46, 52, 64])!); // T20
    await client.highlightHit(decodeHit([56, 46, 48, 64])!); // bull
    await client.highlightHit(decodeHit([79, 85, 84, 64])!); // miss: no-op
    expect(t.writes).toHaveLength(2);
    expect(Array.from(t.writes[0]!.slice(0, 4))).toEqual([3, 255, 200, 0]);
    expect(t.writes[1]![0]).toBe(0x17);
  });

  it("runs the remove-darts countdown in the documented order", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    await client.removeDartsCountdown({ durationMs: 20 });
    expect(t.writes).toHaveLength(21);
    const lit = (w: Uint8Array) => Array.from(w).flatMap((v, i) => (v ? [i + 1] : []));
    const removed = t.writes.slice(0, -1).map((w, i) => lit(w).filter((n) => !lit(t.writes[i + 1]!).includes(n))[0]);
    expect(removed).toEqual([19, 3, 17, 2, 15, 10, 6, 13, 4, 18, 1, 20, 5, 12, 9, 14, 11, 8, 16, 7]);
  });

  it("sweep can be aborted", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    const ac = new AbortController();
    const p = client.sweep({ stepMs: 5, signal: ac.signal });
    setTimeout(() => ac.abort(new Error("stop")), 12);
    await expect(p).rejects.toThrow("stop");
    expect(t.writes.length).toBeLessThan(20);
  });

  it("reports disconnects and refuses writes after", async () => {
    const t = fakeTransport();
    const client = await GranboardClient.create(t.transport);
    const onDisc = vi.fn();
    client.onDisconnect(onDisc);
    t.drop();
    t.drop();
    expect(onDisc).toHaveBeenCalledTimes(1);
    expect(client.isConnected).toBe(false);
    await expect(client.clear()).rejects.toThrow("disconnected");
  });
});

describe("connectWebBluetooth", () => {
  it("wires a Web Bluetooth device to the client", async () => {
    const notify = Object.assign(new EventTarget(), {
      properties: { notify: true, write: false, writeWithoutResponse: false },
      value: null as DataView | null,
      startNotifications: vi.fn(async () => undefined),
      stopNotifications: vi.fn(async () => undefined),
      writeValueWithoutResponse: vi.fn(),
    });
    const write = Object.assign(new EventTarget(), {
      properties: { notify: false, write: false, writeWithoutResponse: true },
      startNotifications: vi.fn(),
      stopNotifications: vi.fn(),
      writeValueWithoutResponse: vi.fn(async () => undefined),
    });
    const device = Object.assign(new EventTarget(), {
      id: "x",
      gatt: {
        connected: true,
        connect: async () => ({ getPrimaryService: async () => ({ getCharacteristics: async () => [notify, write] }) }),
        disconnect: vi.fn(),
      },
    });
    const bluetooth = { requestDevice: vi.fn(async () => device) };

    const board = await connectWebBluetooth({ bluetooth });
    expect(board.device).toBe(device);

    const hits: string[] = [];
    board.onHit((h) => hits.push(h.id));
    const buf = new Uint8Array([7, 51, 46, 52, 64]).buffer;
    notify.value = new DataView(buf, 1, 4);
    notify.dispatchEvent(new Event("characteristicvaluechanged"));
    expect(hits).toEqual(["TRP_20"]);

    await board.clear();
    expect(write.writeValueWithoutResponse).toHaveBeenCalledWith(new Uint8Array(20));

    const disc = vi.fn();
    board.onDisconnect(disc);
    device.dispatchEvent(new Event("gattserverdisconnected"));
    expect(disc).toHaveBeenCalled();
  });
});

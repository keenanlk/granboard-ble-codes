import { useCallback, useEffect, useRef, useState } from "react";
import { connectWebBluetooth, type GranboardClient, type Hit } from "granboard";

export type GranboardStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface UseGranboardOptions {
  /** Flash the segment that was hit. Defaults to true. */
  highlightHits?: boolean;
  /** Called for every hit. */
  onHit?: (hit: Hit) => void;
}

/**
 * Connect to a GranBoard over Web Bluetooth.
 * Call `connect` from a click handler; the browser requires a user gesture.
 */
export function useGranboard({ highlightHits = true, onHit }: UseGranboardOptions = {}) {
  const [board, setBoard] = useState<GranboardClient | null>(null);
  const [status, setStatus] = useState<GranboardStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [lastHit, setLastHit] = useState<Hit | null>(null);

  // Keep the latest options in refs so changing them doesn't re-subscribe.
  const onHitRef = useRef(onHit);
  const highlightRef = useRef(highlightHits);
  onHitRef.current = onHit;
  highlightRef.current = highlightHits;

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      setBoard(await connectWebBluetooth({ minWriteIntervalMs: 20 }));
      setStatus("connected");
    } catch (err) {
      setError(err as Error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!board) return;
    const offHit = board.onHit((hit) => {
      setLastHit(hit);
      onHitRef.current?.(hit);
      if (highlightRef.current) void board.highlightHit(hit);
    });
    const offDisconnect = board.onDisconnect(() => {
      setStatus("disconnected");
      setBoard(null);
    });
    return () => {
      offHit();
      offDisconnect();
    };
  }, [board]);

  // Close the connection when the component using the hook unmounts.
  useEffect(() => () => void board?.disconnect(), [board]);

  return { board, status, error, lastHit, connect };
}

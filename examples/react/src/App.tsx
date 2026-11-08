import { useState } from "react";
import { Colors, isWebBluetoothAvailable, type Hit } from "granboard";
import { useGranboard } from "./useGranboard";

export function App() {
  const [hits, setHits] = useState<Hit[]>([]);
  const [highlight, setHighlight] = useState(true);
  const { board, status, error, lastHit, connect } = useGranboard({
    highlightHits: highlight,
    onHit: (hit) => setHits((prev) => [hit, ...prev].slice(0, 20)),
  });

  if (!isWebBluetoothAvailable()) {
    return <p>This browser has no Web Bluetooth. Try Chrome, Edge or Opera.</p>;
  }

  return (
    <main>
      <h1>GranBoard</h1>
      <p>
        Status: {status}
        {error && ` (${error.message})`}
      </p>

      {!board ? (
        <button onClick={connect} disabled={status === "connecting"}>
          Connect
        </button>
      ) : (
        <div>
          <button onClick={() => board.lightRing(Colors.GREEN)}>Light ring</button>
          <button onClick={() => board.sweep()}>Sweep</button>
          <button onClick={() => board.clear()}>Clear</button>
          <button onClick={() => board.disconnect()}>Disconnect</button>
          <label>
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
            Flash segment on hit
          </label>
        </div>
      )}

      {lastHit && (
        <h2>
          {lastHit.id}: {lastHit.score} points
        </h2>
      )}
      <ul>
        {hits.map((hit, i) => (
          <li key={hits.length - i}>
            {hit.id} ({hit.score})
          </li>
        ))}
      </ul>
    </main>
  );
}

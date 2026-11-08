# React (Vite + Web Bluetooth)

A `useGranboard` hook ([src/useGranboard.ts](src/useGranboard.ts)) and a small component ([src/App.tsx](src/App.tsx)) built on [`granboard`](https://www.npmjs.com/package/granboard).

What it shows: connecting, logging hits, flashing the hit segment, lighting the ring, the sweep animation, and clearing.

> **Untested on a real board.** `npm run build` type-checks and bundles. The Bluetooth paths have not been run against a GranBoard yet.

## Requirements

- Node.js 18+
- Chrome, Edge or Opera, because Web Bluetooth isn't available in Safari or Firefox

## Run

```bash
npm install
npm run dev        # open the printed localhost URL
npm run build      # type-check and production build
```

## The hook

```tsx
const { board, status, error, lastHit, connect } = useGranboard({
  highlightHits: true,           // flash the segment on every hit
  onHit: (hit) => console.log(hit.id, hit.score),
});

<button onClick={connect}>Connect</button>   // must run from a user gesture
<button onClick={() => board?.sweep()}>Sweep</button>
```

`board` is the `GranboardClient`, or `null` when not connected. The hook disconnects when the component unmounts.

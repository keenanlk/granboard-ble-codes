# Plain browser (Web Bluetooth)

One HTML file with no build step. It loads [`granboard`](https://www.npmjs.com/package/granboard) from the esm.sh CDN and uses `connectWebBluetooth`.

What it shows: connecting, logging hits, flashing the hit segment, lighting the ring, the sweep animation, and clearing.

> **Untested on a real board.** The page loads and the import resolves, but the Bluetooth paths have not been run against a GranBoard yet.

## Requirements

- Chrome, Edge or Opera on desktop or Android. Safari and Firefox don't support Web Bluetooth.
- The page must be served over `https://` or from `localhost`.

## Run

```bash
npx serve .
```

Open the URL it prints, click **Connect**, and pick your GranBoard.

## Using a bundler instead of the CDN

```bash
npm install granboard
```

Then change the import to:

```js
import { connectWebBluetooth, Colors } from "granboard";
```

The [React example](../react) shows a full Vite setup.

# GranBoard BLE — TypeScript Example

## Requirements

- Node.js 18+
- A browser with [Web Bluetooth](https://caniuse.com/web-bluetooth) support (Chrome, Edge, Opera)

## Setup

```bash
npm install
```

## Run

```bash
npm run serve
```

This compiles the TypeScript and starts a local server. Open the URL shown in your browser, click **Connect**, and pair with your GranBoard.

The page provides buttons to test LED commands (red ring, green ring, blink, wave, clear) and logs dart hits to the screen.

## Alternative

You can also build and serve separately:

```bash
npm run build          # compiles granboard.ts → granboard.js
npx serve .            # or any static file server
# open index.html in browser
```

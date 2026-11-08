# GranBoard BLE — TypeScript Example

> **For new projects, use the [`granboard`](../../packages/granboard) npm package** (`npm install granboard`). It ships the decoder, command builders and a Web Bluetooth client from this example, with types and tests. See [`../web-vanilla`](../web-vanilla) for the same page built on the package, and the other [examples](../../README.md#examples) for React, React Native, Node and protocol-only use.
>
> This folder is kept as a dependency-free reference that implements the protocol from scratch in one file ([granboard.ts](granboard.ts)).

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

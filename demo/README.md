# GranBoard browser demo

A live page for trying a GranBoard over Web Bluetooth. It shows hits as they land, lets you drive the LED ring, and prints the exact code and bytes for every command. Without a board, or in a browser without Web Bluetooth, you can click the board to simulate throws.

It builds against the package source in `packages/granboard/src`, so it always matches the code in this repo.

## Run locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL in Chrome, Edge or Opera. Web Bluetooth only works on `https://` pages or `localhost`.

## Deploy

`.github/workflows/pages.yml` builds and deploys it to GitHub Pages on every push to `main` that touches `demo/` or the package source. Turn Pages on once under **Settings → Pages → Source: GitHub Actions**.

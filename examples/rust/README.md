# GranBoard BLE — Rust Example

## Requirements

- Rust 1.75+
- Bluetooth adapter

## Build & Run

```bash
cargo run
```

The program will scan for a GranBoard, connect, run a short LED demo (red ring, white blink, clear), then listen for dart hits until you press Ctrl+C.

# GranBoard BLE — Python Example

## Requirements

- Python 3.10+
- Bluetooth adapter

## Setup & Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python granboard.py
```

The script will scan for a GranBoard, connect, run a short LED demo (red ring, white blink, clear), then listen for dart hits until you press Ctrl+C.

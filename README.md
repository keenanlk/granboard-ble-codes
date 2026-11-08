# GranBoard BLE Protocol Reference

> A community-driven, reverse-engineered reference for the Bluetooth Low Energy protocol used by [GranBoard](https://www.granboard.com/) electronic dartboards.

There is almost no public documentation about how GranBoard communicates over BLE. This repository aims to change that by providing a complete, open reference for developers building apps, tools, or integrations for the GranBoard.

**Building in JavaScript or TypeScript?** Use the [`granboard`](packages/granboard) npm package. It decodes hits and builds LED commands, and it works with Web Bluetooth or any other BLE stack:

```bash
npm install granboard
```

**Have a board?** Try the [live demo](https://keenanlk.github.io/granboard-ble-codes/) in Chrome, Edge or Opera. It shows hits as they land and the exact bytes behind every LED command. No board? Click the dartboard to simulate throws.

---

## Examples

Each example connects, logs hits, flashes the hit segment, lights the ring, runs the sweep, and clears the LEDs, unless noted otherwise. The JavaScript examples install `granboard` from npm.

| Example | Stack | What it shows |
|---|---|---|
| [`examples/web-vanilla`](examples/web-vanilla) | One HTML file, Web Bluetooth, CDN import | `connectWebBluetooth` with no build step |
| [`examples/react`](examples/react) | React + Vite, Web Bluetooth | A `useGranboard` hook and a small component |
| [`examples/react-native`](examples/react-native) | Expo + `react-native-ble-plx` | A `GranboardTransport` adapter and a screen using `GranboardClient.create` |
| [`examples/node`](examples/node) | Node.js + `@stoprocent/noble` | A noble transport adapter and a CLI that prints hits |
| [`examples/protocol-only`](examples/protocol-only) | Any JS runtime, no BLE | `decodeHit` and the command builders, for your own BLE layer |
| [`examples/typescript`](examples/typescript) | Browser, no dependencies | The protocol implemented from scratch in one file |
| [`examples/python`](examples/python) | Python + `bleak` | Standalone protocol implementation |
| [`examples/rust`](examples/rust) | Rust + `btleplug` | Standalone protocol implementation |
| [`examples/swift`](examples/swift) | Swift + CoreBluetooth (macOS) | Standalone protocol implementation |

The Bluetooth paths in the `granboard` package examples have not been tested on a real board yet. They type-check and build, and `protocol-only` runs without hardware.

---

## Table of Contents

- [Examples](#examples)
- [Overview](#overview)
- [Hit Detection Protocol](#hit-detection-protocol)
  - [Decoding Steps](#decoding-steps)
  - [Byte Format](#byte-format)
  - [Segment Types](#segment-types)
  - [Complete Segment Mapping](#complete-segment-mapping)
  - [Quick Reference Lookup Table](#quick-reference-lookup-table)
- [LED Command Protocol](#led-command-protocol)
  - [16-Byte Command Format](#16-byte-command-format)
  - [20-Byte Command Format](#20-byte-command-format)
  - [LED Ring Position Mapping](#led-ring-position-mapping)
  - [Predefined Colors](#predefined-colors)
  - [Command Examples](#command-examples)
- [LED Effect Patterns](#led-effect-patterns)
  - [Hit Highlight](#hit-highlight)
  - [Blink Effect](#blink-effect)
  - [Wave Animation](#wave-animation)
  - [Persistent Number Display](#persistent-number-display)
  - [Remove-Darts Countdown](#remove-darts-countdown)
  - [Sweep Animation](#sweep-animation)
  - [Clear All LEDs](#clear-all-leds)
  - [Light Entire Ring](#light-entire-ring)
  - [Timing Considerations](#timing-considerations)
- [Tested Models](#tested-models)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

---

## Overview

The GranBoard uses a single BLE service with two characteristics:

| Property | Value |
|---|---|
| **Service UUID** | `442f1570-8a00-9a28-cbe1-e1d4212d53eb` |
| **Notify Characteristic** | Sends hit data when a dart lands |
| **Write Characteristic** | Receives LED control commands |

Subscribe to notifications on the notify characteristic to receive dart hits, and write byte arrays to the write characteristic to control the LED ring.

---

## Hit Detection Protocol

When a dart lands on the board (or the button is pressed, or a miss is detected), the GranBoard sends a BLE notification on the **notify characteristic**. The notification payload is a small byte array (typically 4-5 bytes).

### Decoding Steps

1. **Receive** the raw bytes from the BLE notification
2. **Convert** each byte to its decimal value
3. **Join** the decimal values with `-` as a delimiter
4. **Look up** the resulting string in the segment mapping table

### Byte Format

Each byte in the notification is an ASCII character code. The dash-delimited decimal string, when decoded to ASCII, produces a human-readable label:

```
Bytes:   [50, 46, 51, 64]
Decimal: "50-46-51-64"
ASCII:   "2.3@"          →  INNER_1
```

Most segments use 4 bytes. Numbers 7, 9, 10, 14, 16, and 17 use 5 bytes because their ASCII labels are longer (e.g., `10.3@`, `11.1@`).

The `@` suffix (byte `64`) is a consistent terminator across all segment codes.

### Segment Types

Each dart number (1-20) has four ring segments, plus bull, double bull, the reset button, and miss:

| Type | Description | Multiplier |
|---|---|---|
| **INNER** | Inner single | x1 |
| **TRP** | Triple ring | x3 |
| **OUTER** | Outer single | x1 |
| **DBL** | Double ring | x2 |
| **BULL** | Single bull (outer) | 25 points |
| **DBL_BULL** | Double bull (inner) | 50 points |
| **RESET_BUTTON** | Physical button on the board | N/A |
| **MISS** | Dart missed the board | 0 points |

### Complete Segment Mapping

#### Dart 1

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `50-46-51-64` | `2.3@` | INNER_1 |
| `50-46-52-64` | `2.4@` | TRP_1 |
| `50-46-53-64` | `2.5@` | OUTER_1 |
| `50-46-54-64` | `2.6@` | DBL_1 |

#### Dart 2

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `57-46-49-64` | `W.1@` | INNER_2 |
| `57-46-48-64` | `W.0@` | TRP_2 |
| `57-46-50-64` | `W.2@` | OUTER_2 |
| `56-46-50-64` | `V.2@` | DBL_2 |

<details>
<summary>Dart 3-20</summary>

#### Dart 3

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `55-46-49-64` | `U.1@` | INNER_3 |
| `55-46-48-64` | `U.0@` | TRP_3 |
| `55-46-50-64` | `U.2@` | OUTER_3 |
| `56-46-52-64` | `V.4@` | DBL_3 |

#### Dart 4

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `48-46-49-64` | `0.1@` | INNER_4 |
| `48-46-51-64` | `0.3@` | TRP_4 |
| `48-46-53-64` | `0.5@` | OUTER_4 |
| `48-46-54-64` | `0.6@` | DBL_4 |

#### Dart 5

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `53-46-49-64` | `5.1@` | INNER_5 |
| `53-46-50-64` | `5.2@` | TRP_5 |
| `53-46-52-64` | `5.4@` | OUTER_5 |
| `52-46-54-64` | `4.6@` | DBL_5 |

#### Dart 6

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `49-46-48-64` | `1.0@` | INNER_6 |
| `49-46-49-64` | `1.1@` | TRP_6 |
| `49-46-51-64` | `1.3@` | OUTER_6 |
| `52-46-52-64` | `4.4@` | DBL_6 |

#### Dart 7

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `49-49-46-49-64` | `11.1@` | INNER_7 |
| `49-49-46-50-64` | `11.2@` | TRP_7 |
| `49-49-46-52-64` | `11.4@` | OUTER_7 |
| `56-46-54-64` | `V.6@` | DBL_7 |

#### Dart 8

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `54-46-50-64` | `6.2@` | INNER_8 |
| `54-46-52-64` | `6.4@` | TRP_8 |
| `54-46-53-64` | `6.5@` | OUTER_8 |
| `54-46-54-64` | `6.6@` | DBL_8 |

#### Dart 9

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `57-46-51-64` | `W.3@` | INNER_9 |
| `57-46-52-64` | `W.4@` | TRP_9 |
| `57-46-53-64` | `W.5@` | OUTER_9 |
| `57-46-54-64` | `W.6@` | DBL_9 |

#### Dart 10

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `50-46-48-64` | `2.0@` | INNER_10 |
| `50-46-49-64` | `2.1@` | TRP_10 |
| `50-46-50-64` | `2.2@` | OUTER_10 |
| `52-46-51-64` | `4.3@` | DBL_10 |

#### Dart 11

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `55-46-51-64` | `U.3@` | INNER_11 |
| `55-46-52-64` | `U.4@` | TRP_11 |
| `55-46-53-64` | `U.5@` | OUTER_11 |
| `55-46-54-64` | `U.6@` | DBL_11 |

#### Dart 12

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `53-46-48-64` | `5.0@` | INNER_12 |
| `53-46-51-64` | `5.3@` | TRP_12 |
| `53-46-53-64` | `5.5@` | OUTER_12 |
| `53-46-54-64` | `5.6@` | DBL_12 |

#### Dart 13

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `48-46-48-64` | `0.0@` | INNER_13 |
| `48-46-50-64` | `0.2@` | TRP_13 |
| `48-46-52-64` | `0.4@` | OUTER_13 |
| `52-46-53-64` | `4.5@` | DBL_13 |

#### Dart 14

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `49-48-46-51-64` | `10.3@` | INNER_14 |
| `49-48-46-52-64` | `10.4@` | TRP_14 |
| `49-48-46-53-64` | `10.5@` | OUTER_14 |
| `49-48-46-54-64` | `10.6@` | DBL_14 |

#### Dart 15

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `51-46-48-64` | `3.0@` | INNER_15 |
| `51-46-49-64` | `3.1@` | TRP_15 |
| `51-46-50-64` | `3.2@` | OUTER_15 |
| `52-46-50-64` | `4.2@` | DBL_15 |

#### Dart 16

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `49-49-46-48-64` | `11.0@` | INNER_16 |
| `49-49-46-51-64` | `11.3@` | TRP_16 |
| `49-49-46-53-64` | `11.5@` | OUTER_16 |
| `49-49-46-54-64` | `11.6@` | DBL_16 |

#### Dart 17

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `49-48-46-49-64` | `10.1@` | INNER_17 |
| `49-48-46-48-64` | `10.0@` | TRP_17 |
| `49-48-46-50-64` | `10.2@` | OUTER_17 |
| `56-46-51-64` | `V.3@` | DBL_17 |

#### Dart 18

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `49-46-50-64` | `1.2@` | INNER_18 |
| `49-46-52-64` | `1.4@` | TRP_18 |
| `49-46-53-64` | `1.5@` | OUTER_18 |
| `49-46-54-64` | `1.6@` | DBL_18 |

#### Dart 19

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `54-46-49-64` | `6.1@` | INNER_19 |
| `54-46-48-64` | `6.0@` | TRP_19 |
| `54-46-51-64` | `6.3@` | OUTER_19 |
| `56-46-53-64` | `V.5@` | DBL_19 |

#### Dart 20

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `51-46-51-64` | `3.3@` | INNER_20 |
| `51-46-52-64` | `3.4@` | TRP_20 |
| `51-46-53-64` | `3.5@` | OUTER_20 |
| `51-46-54-64` | `3.6@` | DBL_20 |

#### Bull, Miss & Button

| Byte Sequence | ASCII | Segment |
|---|---|---|
| `56-46-48-64` | `V.0@` | BULL |
| `52-46-48-64` | `4.0@` | DBL_BULL |
| `66-84-78-64` | `BTN@` | RESET_BUTTON |
| `79-85-84-64` | `OUT@` | MISS |

</details>

### Quick Reference Lookup Table

A flat, searchable view of all 88 segments sorted by ASCII code:

| ASCII | Bytes | Dart # | Type |
|---|---|---|---|
| `0.0@` | `48-46-48-64` | 13 | Inner |
| `0.1@` | `48-46-49-64` | 4 | Inner |
| `0.2@` | `48-46-50-64` | 13 | Triple |
| `0.3@` | `48-46-51-64` | 4 | Triple |
| `0.4@` | `48-46-52-64` | 13 | Outer |
| `0.5@` | `48-46-53-64` | 4 | Outer |
| `0.6@` | `48-46-54-64` | 4 | Double |
| `1.0@` | `49-46-48-64` | 6 | Inner |
| `1.1@` | `49-46-49-64` | 6 | Triple |
| `1.2@` | `49-46-50-64` | 18 | Inner |
| `1.3@` | `49-46-51-64` | 6 | Outer |
| `1.4@` | `49-46-52-64` | 18 | Triple |
| `1.5@` | `49-46-53-64` | 18 | Outer |
| `1.6@` | `49-46-54-64` | 18 | Double |
| `2.0@` | `50-46-48-64` | 10 | Inner |
| `2.1@` | `50-46-49-64` | 10 | Triple |
| `2.2@` | `50-46-50-64` | 10 | Outer |
| `2.3@` | `50-46-51-64` | 1 | Inner |
| `2.4@` | `50-46-52-64` | 1 | Triple |
| `2.5@` | `50-46-53-64` | 1 | Outer |
| `2.6@` | `50-46-54-64` | 1 | Double |
| `3.0@` | `51-46-48-64` | 15 | Inner |
| `3.1@` | `51-46-49-64` | 15 | Triple |
| `3.2@` | `51-46-50-64` | 15 | Outer |
| `3.3@` | `51-46-51-64` | 20 | Inner |
| `3.4@` | `51-46-52-64` | 20 | Triple |
| `3.5@` | `51-46-53-64` | 20 | Outer |
| `3.6@` | `51-46-54-64` | 20 | Double |
| `4.0@` | `52-46-48-64` | 0 | Double Bull |
| `4.2@` | `52-46-50-64` | 15 | Double |
| `4.3@` | `52-46-51-64` | 10 | Double |
| `4.4@` | `52-46-52-64` | 6 | Double |
| `4.5@` | `52-46-53-64` | 13 | Double |
| `4.6@` | `52-46-54-64` | 5 | Double |
| `5.0@` | `53-46-48-64` | 12 | Inner |
| `5.1@` | `53-46-49-64` | 5 | Inner |
| `5.2@` | `53-46-50-64` | 5 | Triple |
| `5.3@` | `53-46-51-64` | 12 | Triple |
| `5.4@` | `53-46-52-64` | 5 | Outer |
| `5.5@` | `53-46-53-64` | 12 | Outer |
| `5.6@` | `53-46-54-64` | 12 | Double |
| `6.0@` | `54-46-48-64` | 19 | Triple |
| `6.1@` | `54-46-49-64` | 19 | Inner |
| `6.2@` | `54-46-50-64` | 8 | Inner |
| `6.3@` | `54-46-51-64` | 19 | Outer |
| `6.4@` | `54-46-52-64` | 8 | Triple |
| `6.5@` | `54-46-53-64` | 8 | Outer |
| `6.6@` | `54-46-54-64` | 8 | Double |
| `10.0@` | `49-48-46-48-64` | 17 | Triple |
| `10.1@` | `49-48-46-49-64` | 17 | Inner |
| `10.2@` | `49-48-46-50-64` | 17 | Outer |
| `10.3@` | `49-48-46-51-64` | 14 | Inner |
| `10.4@` | `49-48-46-52-64` | 14 | Triple |
| `10.5@` | `49-48-46-53-64` | 14 | Outer |
| `10.6@` | `49-48-46-54-64` | 14 | Double |
| `11.0@` | `49-49-46-48-64` | 16 | Inner |
| `11.1@` | `49-49-46-49-64` | 7 | Inner |
| `11.2@` | `49-49-46-50-64` | 7 | Triple |
| `11.3@` | `49-49-46-51-64` | 16 | Triple |
| `11.4@` | `49-49-46-52-64` | 7 | Outer |
| `11.5@` | `49-49-46-53-64` | 16 | Outer |
| `11.6@` | `49-49-46-54-64` | 16 | Double |
| `BTN@` | `66-84-78-64` | -- | Reset Button |
| `OUT@` | `79-85-84-64` | -- | Miss |
| `U.0@` | `55-46-48-64` | 3 | Triple |
| `U.1@` | `55-46-49-64` | 3 | Inner |
| `U.2@` | `55-46-50-64` | 3 | Outer |
| `U.3@` | `55-46-51-64` | 11 | Inner |
| `U.4@` | `55-46-52-64` | 11 | Triple |
| `U.5@` | `55-46-53-64` | 11 | Outer |
| `U.6@` | `55-46-54-64` | 11 | Double |
| `V.0@` | `56-46-48-64` | 0 | Bull |
| `V.2@` | `56-46-50-64` | 2 | Double |
| `V.3@` | `56-46-51-64` | 17 | Double |
| `V.4@` | `56-46-52-64` | 3 | Double |
| `V.5@` | `56-46-53-64` | 19 | Double |
| `V.6@` | `56-46-54-64` | 7 | Double |
| `W.0@` | `57-46-48-64` | 2 | Triple |
| `W.1@` | `57-46-49-64` | 2 | Inner |
| `W.2@` | `57-46-50-64` | 2 | Outer |
| `W.3@` | `57-46-51-64` | 9 | Inner |
| `W.4@` | `57-46-52-64` | 9 | Triple |
| `W.5@` | `57-46-53-64` | 9 | Outer |
| `W.6@` | `57-46-54-64` | 9 | Double |

### Hit Detection Notes

- The byte `64` (ASCII `@`) appears as the last byte in every segment code and acts as a terminator.
- Double segments for some numbers (2, 3, 5, 6, 7, 10, 13, 15, 17, 19) use a different ASCII prefix pattern than their inner/triple/outer counterparts. This appears to be an internal wiring artifact of the board rather than a logical pattern.
- The **RESET_BUTTON** (`BTN@`) fires when the physical button on the board is pressed.
- **MISS** (`OUT@`) fires when the board detects impact outside any scoring segment.

---

## LED Command Protocol

Commands are written to the **write characteristic** of the BLE service. There are two command formats: **16-byte** for animations and effects, and **20-byte** for persistent number state.

### 16-Byte Command Format

Used for hit highlights, blink effects, wave animations, and ring lighting.

```
Byte:   0     1     2     3     4     5     6     7     8     9     10    11    12    13    14    15
      ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
      │ CMD │  R  │  G  │  B  │ R2  │ G2  │ B2  │ 0x00│ 0x00│ 0x00│ POS │ 0x00│ DUR │ 0x00│ 0x00│ FLAG│
      └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

| Byte | Name | Description |
|---|---|---|
| **0** | CMD | Command type (see table below) |
| **1** | R | Primary color -- red channel (0-255) |
| **2** | G | Primary color -- green channel (0-255) |
| **3** | B | Primary color -- blue channel (0-255) |
| **4** | R2 | Secondary color -- red (animations only, else 0x00) |
| **5** | G2 | Secondary color -- green (animations only, else 0x00) |
| **6** | B2 | Secondary color -- blue (animations only, else 0x00) |
| **7-9** | -- | Padding (always 0x00) |
| **10** | POS | LED ring cell position (0-59) or 0x10 for full ring |
| **11** | -- | Padding (always 0x00) |
| **12** | DUR | Duration or speed (interpretation depends on command) |
| **13-14** | -- | Padding (always 0x00) |
| **15** | FLAG | 0x00 = temporary, 0x01 = persistent (stays lit) |

#### Command Types

| Value | Name | Description |
|---|---|---|
| `0x01` | Hit (Single) | Blink the segment once with a fadeout |
| `0x02` | Hit (Double) | Blink the segment twice with a fadeout |
| `0x03` | Hit (Triple) | Blink the segment three times with a fadeout |
| `0x11` | Wave | Two-color wave animation across the ring |
| `0x14` | Light Ring | Light the entire ring with one color |
| `0x17` | Blink | Blink the ring, then auto-off after duration |

### 20-Byte Command Format

Used for persistent number state -- lighting specific dart numbers on the ring without a timeout. Each byte position corresponds to a dart number.

```
Byte:   0     1     2     3     4     5     6     7     8     9     10    11    12    13    14    15    16    17    18    19
      ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
      │  1  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │
      └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

| Byte Index | Dart Number | Value |
|---|---|---|
| 0 | 1 | 0x00 = off, 0x01-0x07 = board color palette |
| 1 | 2 | " |
| 2 | 3 | " |
| ... | ... | " |
| 19 | 20 | " |

> **Note:** Bull is not addressable via the 20-byte format. Only dart numbers 1-20 can be controlled.

#### Known Color Palette Indices

| Value | Color |
|---|---|
| `0x00` | Off |
| `0x05` | Orange |

> The exact RGB values for palette indices 0x01-0x07 are determined by the board's firmware. Only 0x05 (orange) has been confirmed through testing.

### LED Ring Position Mapping

The LED ring has 60 cells (positions 0-59). Each dart number maps to a specific cell position. The mapping does not follow the standard dartboard number order -- it reflects the physical LED layout.

| Dart # | LED Position | Dart # | LED Position |
|---|---|---|---|
| Bull (0) | 0 | 11 | 10 |
| 1 | 28 | 12 | 19 |
| 2 | 49 | 13 | 37 |
| 3 | 55 | 14 | 13 |
| 4 | 34 | 15 | 46 |
| 5 | 22 | 16 | 4 |
| 6 | 40 | 17 | 52 |
| 7 | 1 | 18 | 31 |
| 8 | 7 | 19 | 58 |
| 9 | 16 | 20 | 25 |
| 10 | 43 | | |

The special position `0x10` (16 decimal) in the POS byte means "full ring" and is used by the wave command.

### Predefined Colors

Common RGB values used in commands:

| Color | R | G | B | Hex |
|---|---|---|---|---|
| Red | 255 | 0 | 0 | `FF 00 00` |
| Green | 0 | 255 | 0 | `00 FF 00` |
| Blue | 0 | 0 | 255 | `00 00 FF` |
| White | 255 | 255 | 255 | `FF FF FF` |
| Yellow | 255 | 200 | 0 | `FF C8 00` |
| Orange | 255 | 80 | 0 | `FF 50 00` |
| Light Blue | 0 | 200 | 255 | `00 C8 FF` |

### Command Examples

#### Light Dart 20 (Double, Red, 20 frames)

```
Position: LED_POSITIONS[20] = 25 (0x19)

 0x02  0xFF  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x19  0x00  0x14  0x00  0x00  0x00
 ^^^^  ^^^^^^^^^^^  ^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^        ^^^^
 CMD   Primary RGB  Secondary    Padding                    POS         Duration (20)
 (dbl) (red)        (unused)
```

#### Light Entire Ring (Green, Persistent)

```
 0x14  0x00  0xFF  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x14  0x00  0x00  0x01
 ^^^^  ^^^^^^^^^^^                                                        ^^^^              ^^^^
 CMD   Primary RGB                                                        Duration          FLAG
 (ring)(green)                                                                              (persistent)
```

#### Blink Ring (White, 30 frames)

```
 0x17  0xFF  0xFF  0xFF  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x1E  0x00  0x00  0x01
 ^^^^  ^^^^^^^^^^^                                                        ^^^^              ^^^^
 CMD   Primary RGB                                                        Duration (30)     FLAG
 (blink)(white)
```

#### Wave Animation (Red up, Blue down)

```
 0x11  0xFF  0x00  0x00  0x00  0x00  0xFF  0x00  0x00  0x00  0x10  0x00  0x05  0x00  0x00  0x00
 ^^^^  ^^^^^^^^^^^  ^^^^^^^^^^^                          ^^^^        ^^^^
 CMD   Primary RGB  Secondary RGB                        POS         Speed
 (wave)(red)        (blue)                               (full ring) (5)
```

#### Light Numbers 15, 16, 17 (Orange, Persistent)

```
 0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x05  0x05  0x05  0x00  0x00  0x00
                                                                                      ^^^^  ^^^^  ^^^^
                                                                                      #15   #16   #17
                                                                                      (orange)
```

#### Clear All LEDs

```
 0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00  0x00
```

Twenty zero bytes turns off all LEDs.

---

## LED Effect Patterns

Common animation patterns and recipes for the GranBoard LED ring.

### Hit Highlight

Blink a segment when a dart lands with a fadeout effect. The command type byte controls the number of blinks: 0x01 = once, 0x02 = twice, 0x03 = three times. Each blink fades out before the next.

Set byte 10 (POS) to the dart number's [LED ring position](#led-ring-position-mapping) and byte 12 (DUR) to approximately `0x14` (20 frames).

**Suggested color scheme:**

| Hit Type | Color | RGB |
|---|---|---|
| Single | Red | `255, 0, 0` |
| Double | Green | `0, 255, 0` |
| Triple | Yellow | `255, 200, 0` |
| Bull | Light Blue | `0, 200, 255` |

For bull hits, use a [Blink](#blink-effect) command instead since bull is a center target, not a ring segment.

### Blink Effect

Flash the entire ring with a color, then auto-off after a duration. Useful for bull hits, busts, or emphasis moments.

**Command:** 16-byte with CMD = `0x17`, FLAG = `0x01`

**Example durations:**

| Duration | Hex | Approximate Effect |
|---|---|---|
| 10 frames | `0x0A` | Quick flash |
| 20 frames | `0x14` | Standard |
| 30 frames | `0x1E` | Long flash |

### Wave Animation

A two-color wave that sweeps across the full ring. Uses both primary RGB (bytes 1-3) and secondary RGB (bytes 4-6).

**Command:** 16-byte with CMD = `0x11`, POS = `0x10` (full ring), DUR = speed factor (e.g., `0x05`)

Useful for button press acknowledgment or turn transitions. For example, a white-to-red wave signals the end of a turn.

### Persistent Number Display

Light specific dart numbers on the ring indefinitely using the 20-byte command format. Each byte index corresponds to a dart number (byte 0 = dart 1, byte 19 = dart 20). Set the byte to a board color palette index to light it, or `0x00` to leave it off.

Only confirmed palette index: `0x05` = orange.

Useful for showing open numbers in Cricket or highlighting target numbers during a game.

> **Note:** Bull cannot be addressed via the 20-byte format. Only numbers 1-20 are supported.

### Remove-Darts Countdown

A depleting ring animation that signals players to remove their darts. Start with all 20 numbers lit using the 20-byte persistent format, then on a timed interval, remove one number at a time.

**Removal order** (by LED ring position, highest first -- creates a counter-clockwise depletion):

```
19, 3, 17, 2, 15, 10, 6, 13, 4, 18, 1, 20, 5, 12, 9, 14, 11, 8, 16, 7
```

Divide the total countdown duration by 20 steps to get the interval between each removal. After the last number is removed, send a 20-byte clear command (all zeros).

### Sweep Animation

A startup or game-start effect that lights each dart number one at a time in clockwise ring order, with a color gradient transitioning from red to green.

**Clockwise ring order** (by LED position, lowest first):

```
7, 16, 8, 11, 14, 9, 12, 5, 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19
```

Send a hit command (CMD = `0x01`) for each number with approximately 60ms between steps. Interpolate the RGB color linearly from red (`255, 0, 0`) to green (`0, 255, 0`) based on the step index.

Finish with a green blink command (`0x17`, duration `0x14`) after the last segment.

### Clear All LEDs

Send a 20-byte command of all zeros to turn off the entire ring immediately.

### Light Entire Ring

Set the whole ring to a single solid color using a 16-byte command with CMD = `0x14` and FLAG = `0x01` (persistent). Stays lit until another command is sent.

### Timing Considerations

- The board processes commands sequentially. Sending commands too rapidly may cause them to be dropped or queued.
- A 60ms interval between commands works well for step-by-step animations (like the sweep).
- For instant effects (hit highlight, blink), a single command is sufficient.
- The DUR byte in 16-byte commands controls how long the board displays the effect before auto-clearing. The exact frame rate is determined by the board's firmware.

---

## Tested Models

This protocol has been tested with:

- GranBoard 3s

Other GranBoard models likely use the same protocol but have not been verified. If you test with a different model, please open an issue or PR.

---

## Contributing

Contributions are welcome! If you've discovered additional protocol details, tested with other board models, or found corrections, please open an issue or pull request.

## Disclaimer

This documentation is based on reverse engineering and may contain inaccuracies. It is not affiliated with or endorsed by GranDarts Co., Ltd. Use at your own risk.

## License

This documentation is released under the [MIT License](LICENSE).

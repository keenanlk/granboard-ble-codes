"""
GranBoard BLE Example — Python (bleak)

Connects to a GranBoard, listens for dart hits, and demonstrates
sending LED commands. Requires the `bleak` package: pip install bleak
"""

import asyncio
from bleak import BleakClient, BleakScanner

SERVICE_UUID = "442f1570-8a00-9a28-cbe1-e1d4212d53eb"

# --- Segment Mapping ---

SEGMENT_MAP: dict[str, str] = {
    "50-46-51-64": "INNER_1",  "50-46-52-64": "TRP_1",
    "50-46-53-64": "OUTER_1",  "50-46-54-64": "DBL_1",
    "57-46-49-64": "INNER_2",  "57-46-48-64": "TRP_2",
    "57-46-50-64": "OUTER_2",  "56-46-50-64": "DBL_2",
    "55-46-49-64": "INNER_3",  "55-46-48-64": "TRP_3",
    "55-46-50-64": "OUTER_3",  "56-46-52-64": "DBL_3",
    "48-46-49-64": "INNER_4",  "48-46-51-64": "TRP_4",
    "48-46-53-64": "OUTER_4",  "48-46-54-64": "DBL_4",
    "53-46-49-64": "INNER_5",  "53-46-50-64": "TRP_5",
    "53-46-52-64": "OUTER_5",  "52-46-54-64": "DBL_5",
    "49-46-48-64": "INNER_6",  "49-46-49-64": "TRP_6",
    "49-46-51-64": "OUTER_6",  "52-46-52-64": "DBL_6",
    "49-49-46-49-64": "INNER_7",  "49-49-46-50-64": "TRP_7",
    "49-49-46-52-64": "OUTER_7",  "56-46-54-64": "DBL_7",
    "54-46-50-64": "INNER_8",  "54-46-52-64": "TRP_8",
    "54-46-53-64": "OUTER_8",  "54-46-54-64": "DBL_8",
    "57-46-51-64": "INNER_9",  "57-46-52-64": "TRP_9",
    "57-46-53-64": "OUTER_9",  "57-46-54-64": "DBL_9",
    "50-46-48-64": "INNER_10", "50-46-49-64": "TRP_10",
    "50-46-50-64": "OUTER_10", "52-46-51-64": "DBL_10",
    "55-46-51-64": "INNER_11", "55-46-52-64": "TRP_11",
    "55-46-53-64": "OUTER_11", "55-46-54-64": "DBL_11",
    "53-46-48-64": "INNER_12", "53-46-51-64": "TRP_12",
    "53-46-53-64": "OUTER_12", "53-46-54-64": "DBL_12",
    "48-46-48-64": "INNER_13", "48-46-50-64": "TRP_13",
    "48-46-52-64": "OUTER_13", "52-46-53-64": "DBL_13",
    "49-48-46-51-64": "INNER_14", "49-48-46-52-64": "TRP_14",
    "49-48-46-53-64": "OUTER_14", "49-48-46-54-64": "DBL_14",
    "51-46-48-64": "INNER_15", "51-46-49-64": "TRP_15",
    "51-46-50-64": "OUTER_15", "52-46-50-64": "DBL_15",
    "49-49-46-48-64": "INNER_16", "49-49-46-51-64": "TRP_16",
    "49-49-46-53-64": "OUTER_16", "49-49-46-54-64": "DBL_16",
    "49-48-46-49-64": "INNER_17", "49-48-46-48-64": "TRP_17",
    "49-48-46-50-64": "OUTER_17", "56-46-51-64": "DBL_17",
    "49-46-50-64": "INNER_18", "49-46-52-64": "TRP_18",
    "49-46-53-64": "OUTER_18", "49-46-54-64": "DBL_18",
    "54-46-49-64": "INNER_19", "54-46-48-64": "TRP_19",
    "54-46-51-64": "OUTER_19", "56-46-53-64": "DBL_19",
    "51-46-51-64": "INNER_20", "51-46-52-64": "TRP_20",
    "51-46-53-64": "OUTER_20", "51-46-54-64": "DBL_20",
    "56-46-48-64": "BULL",     "52-46-48-64": "DBL_BULL",
    "66-84-78-64": "RESET_BUTTON", "79-85-84-64": "MISS",
}

# --- LED Positions (dart number -> ring cell) ---

LED_POSITIONS = [
    0,  28, 49, 55, 34, 22, 40, 1,  7,  16,
    43, 10, 19, 37, 13, 46, 4,  52, 31, 58, 25,
]

# --- LED Command Builders ---


def build_hit_command(dart_number: int, multiplier: int, r: int, g: int, b: int) -> bytearray:
    """Blink a segment (multiplier: 1=once, 2=twice, 3=three times with fadeout)."""
    cmd = bytearray(16)
    cmd[0] = multiplier
    cmd[1] = r
    cmd[2] = g
    cmd[3] = b
    cmd[10] = LED_POSITIONS[dart_number] if dart_number < len(LED_POSITIONS) else 0
    cmd[12] = 0x14
    return cmd


def build_blink_command(r: int, g: int, b: int, duration: int = 0x1E) -> bytearray:
    """Blink the entire ring then auto-off."""
    cmd = bytearray(16)
    cmd[0] = 0x17
    cmd[1] = r
    cmd[2] = g
    cmd[3] = b
    cmd[12] = duration
    cmd[15] = 0x01
    return cmd


def build_wave_command(
    r_up: int, g_up: int, b_up: int,
    r_down: int, g_down: int, b_down: int,
) -> bytearray:
    """Two-color wave animation across the full ring."""
    cmd = bytearray(16)
    cmd[0] = 0x11
    cmd[1] = r_up
    cmd[2] = g_up
    cmd[3] = b_up
    cmd[4] = r_down
    cmd[5] = g_down
    cmd[6] = b_down
    cmd[10] = 0x10
    cmd[12] = 0x05
    return cmd


def build_light_ring_command(r: int, g: int, b: int) -> bytearray:
    """Light the entire ring with one color (persistent)."""
    cmd = bytearray(16)
    cmd[0] = 0x14
    cmd[1] = r
    cmd[2] = g
    cmd[3] = b
    cmd[12] = 0x14
    cmd[15] = 0x01
    return cmd


def build_persistent_numbers_command(dart_numbers: list[int], color_byte: int) -> bytearray:
    """Light specific dart numbers using the 20-byte persistent format."""
    cmd = bytearray(20)
    for n in dart_numbers:
        if 1 <= n <= 20:
            cmd[n - 1] = color_byte
    return cmd


def build_clear_command() -> bytearray:
    """Turn off all LEDs."""
    return bytearray(20)


# --- Connection & Usage ---


async def connect_and_run():
    print("Scanning for GranBoard...")
    device = await BleakScanner.find_device_by_filter(
        lambda d, ad: SERVICE_UUID.lower() in [s.lower() for s in (ad.service_uuids or [])]
    )

    if device is None:
        print("GranBoard not found.")
        return

    print(f"Found: {device.name} ({device.address})")

    async with BleakClient(device) as client:
        services = client.services
        service = services.get_service(SERVICE_UUID)
        if service is None:
            print("GranBoard service not found.")
            return

        # Find characteristics by properties
        notify_char = None
        write_char = None
        for char in service.characteristics:
            if "notify" in char.properties:
                notify_char = char
            if "write" in char.properties or "write-without-response" in char.properties:
                write_char = char

        if notify_char is None or write_char is None:
            print("Required characteristics not found.")
            return

        # Subscribe to hit notifications
        def on_hit(_sender, data: bytearray):
            uid = "-".join(str(b) for b in data)
            segment = SEGMENT_MAP.get(uid, f"UNKNOWN({uid})")
            print(f"Hit: {segment}")

        await client.start_notify(notify_char, on_hit)
        print("Listening for hits... (Ctrl+C to stop)")

        # Demo: light ring red, blink white, then clear
        await client.write_gatt_char(write_char, build_light_ring_command(255, 0, 0))
        await asyncio.sleep(2)
        await client.write_gatt_char(write_char, build_blink_command(255, 255, 255))
        await asyncio.sleep(2)
        await client.write_gatt_char(write_char, build_clear_command())

        # Keep listening for hits
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            pass

        await client.stop_notify(notify_char)
        print("Disconnected.")


if __name__ == "__main__":
    asyncio.run(connect_and_run())

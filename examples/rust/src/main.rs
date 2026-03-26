use btleplug::api::{
    Central, CharPropFlags, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::{Adapter, Manager, Peripheral};
use futures::StreamExt;
use std::collections::HashMap;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_UUID: &str = "442f1570-8a00-9a28-cbe1-e1d4212d53eb";

/// LED position indices for numbers 0-20 (index 0 = bull, 1-20 = number).
const LED_POSITIONS: [u8; 21] = [
    0, 28, 49, 55, 34, 22, 40, 1, 7, 16, 43, 10, 19, 37, 13, 46, 4, 52, 31, 58, 25,
];

// ---------------------------------------------------------------------------
// Segment mapping
// ---------------------------------------------------------------------------

fn build_segment_map() -> HashMap<&'static str, &'static str> {
    let mut m = HashMap::new();

    // 1
    m.insert("50-46-51-64", "INNER_1");
    m.insert("50-46-52-64", "TRP_1");
    m.insert("50-46-53-64", "OUTER_1");
    m.insert("50-46-54-64", "DBL_1");

    // 2
    m.insert("57-46-49-64", "INNER_2");
    m.insert("57-46-48-64", "TRP_2");
    m.insert("57-46-50-64", "OUTER_2");
    m.insert("56-46-50-64", "DBL_2");

    // 3
    m.insert("55-46-49-64", "INNER_3");
    m.insert("55-46-48-64", "TRP_3");
    m.insert("55-46-50-64", "OUTER_3");
    m.insert("56-46-52-64", "DBL_3");

    // 4
    m.insert("48-46-49-64", "INNER_4");
    m.insert("48-46-51-64", "TRP_4");
    m.insert("48-46-53-64", "OUTER_4");
    m.insert("48-46-54-64", "DBL_4");

    // 5
    m.insert("53-46-49-64", "INNER_5");
    m.insert("53-46-50-64", "TRP_5");
    m.insert("53-46-52-64", "OUTER_5");
    m.insert("52-46-54-64", "DBL_5");

    // 6
    m.insert("49-46-48-64", "INNER_6");
    m.insert("49-46-49-64", "TRP_6");
    m.insert("49-46-51-64", "OUTER_6");
    m.insert("52-46-52-64", "DBL_6");

    // 7
    m.insert("49-49-46-49-64", "INNER_7");
    m.insert("49-49-46-50-64", "TRP_7");
    m.insert("49-49-46-52-64", "OUTER_7");
    m.insert("56-46-54-64", "DBL_7");

    // 8
    m.insert("54-46-50-64", "INNER_8");
    m.insert("54-46-52-64", "TRP_8");
    m.insert("54-46-53-64", "OUTER_8");
    m.insert("54-46-54-64", "DBL_8");

    // 9
    m.insert("57-46-51-64", "INNER_9");
    m.insert("57-46-52-64", "TRP_9");
    m.insert("57-46-53-64", "OUTER_9");
    m.insert("57-46-54-64", "DBL_9");

    // 10
    m.insert("50-46-48-64", "INNER_10");
    m.insert("50-46-49-64", "TRP_10");
    m.insert("50-46-50-64", "OUTER_10");
    m.insert("52-46-51-64", "DBL_10");

    // 11
    m.insert("55-46-51-64", "INNER_11");
    m.insert("55-46-52-64", "TRP_11");
    m.insert("55-46-53-64", "OUTER_11");
    m.insert("55-46-54-64", "DBL_11");

    // 12
    m.insert("53-46-48-64", "INNER_12");
    m.insert("53-46-51-64", "TRP_12");
    m.insert("53-46-53-64", "OUTER_12");
    m.insert("53-46-54-64", "DBL_12");

    // 13
    m.insert("48-46-48-64", "INNER_13");
    m.insert("48-46-50-64", "TRP_13");
    m.insert("48-46-52-64", "OUTER_13");
    m.insert("52-46-53-64", "DBL_13");

    // 14
    m.insert("49-48-46-51-64", "INNER_14");
    m.insert("49-48-46-52-64", "TRP_14");
    m.insert("49-48-46-53-64", "OUTER_14");
    m.insert("49-48-46-54-64", "DBL_14");

    // 15
    m.insert("51-46-48-64", "INNER_15");
    m.insert("51-46-49-64", "TRP_15");
    m.insert("51-46-50-64", "OUTER_15");
    m.insert("52-46-50-64", "DBL_15");

    // 16
    m.insert("49-49-46-48-64", "INNER_16");
    m.insert("49-49-46-51-64", "TRP_16");
    m.insert("49-49-46-53-64", "OUTER_16");
    m.insert("49-49-46-54-64", "DBL_16");

    // 17
    m.insert("49-48-46-49-64", "INNER_17");
    m.insert("49-48-46-48-64", "TRP_17");
    m.insert("49-48-46-50-64", "OUTER_17");
    m.insert("56-46-51-64", "DBL_17");

    // 18
    m.insert("49-46-50-64", "INNER_18");
    m.insert("49-46-52-64", "TRP_18");
    m.insert("49-46-53-64", "OUTER_18");
    m.insert("49-46-54-64", "DBL_18");

    // 19
    m.insert("54-46-49-64", "INNER_19");
    m.insert("54-46-48-64", "TRP_19");
    m.insert("54-46-51-64", "OUTER_19");
    m.insert("56-46-53-64", "DBL_19");

    // 20
    m.insert("51-46-51-64", "INNER_20");
    m.insert("51-46-52-64", "TRP_20");
    m.insert("51-46-53-64", "OUTER_20");
    m.insert("51-46-54-64", "DBL_20");

    // Bull / Double Bull
    m.insert("56-46-48-64", "BULL");
    m.insert("52-46-48-64", "DBL_BULL");

    // Special
    m.insert("66-84-78-64", "RESET_BUTTON");
    m.insert("79-85-84-64", "MISS");

    m
}

// ---------------------------------------------------------------------------
// Hit decoding
// ---------------------------------------------------------------------------

/// Decode raw BLE notification bytes into a human-readable segment name.
fn decode_hit(data: &[u8]) -> String {
    let key = data
        .iter()
        .map(|b| b.to_string())
        .collect::<Vec<_>>()
        .join("-");

    let map = build_segment_map();
    match map.get(key.as_str()) {
        Some(name) => name.to_string(),
        None => format!("UNKNOWN ({})", key),
    }
}

// ---------------------------------------------------------------------------
// LED command builders
// ---------------------------------------------------------------------------

/// Build a "hit" LED command that lights the segment for a given board number
/// with the specified RGB colour.
fn build_hit_command(number: u8, r: u8, g: u8, b: u8) -> Vec<u8> {
    if number > 20 {
        return vec![];
    }
    let pos = LED_POSITIONS[number as usize];
    vec![0x00, pos, r, g, b, 0x00, 0x00, 0x00, 0x00, 0x00]
}

/// Build a "blink" command: all LEDs flash the given colour.
fn build_blink_command(r: u8, g: u8, b: u8) -> Vec<u8> {
    vec![0x01, r, g, b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
}

/// Build a "wave" command that creates a rotating animation.
fn build_wave_command(r: u8, g: u8, b: u8) -> Vec<u8> {
    vec![0x02, r, g, b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
}

/// Build a "light ring" command: light the full ring with a solid colour.
fn build_light_ring_command(r: u8, g: u8, b: u8) -> Vec<u8> {
    vec![0x03, r, g, b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
}

/// Build a command that persistently lights specific number segments.
fn build_persistent_numbers_command(numbers: &[u8], r: u8, g: u8, b: u8) -> Vec<u8> {
    let mut cmd = vec![0x04, r, g, b];
    for &n in numbers {
        if n <= 20 {
            cmd.push(LED_POSITIONS[n as usize]);
        }
    }
    // Pad to at least 10 bytes.
    while cmd.len() < 10 {
        cmd.push(0x00);
    }
    cmd
}

/// Build a "clear" command that turns off all LEDs.
fn build_clear_command() -> Vec<u8> {
    vec![0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
}

// ---------------------------------------------------------------------------
// BLE helpers
// ---------------------------------------------------------------------------

async fn find_granboard(adapter: &Adapter) -> Option<Peripheral> {
    let service_uuid = Uuid::parse_str(SERVICE_UUID).unwrap();

    println!("Scanning for GranBoard...");
    adapter
        .start_scan(ScanFilter {
            services: vec![service_uuid],
        })
        .await
        .ok()?;

    // Poll peripherals for up to 15 seconds.
    for _ in 0..30 {
        sleep(Duration::from_millis(500)).await;
        let peripherals = adapter.peripherals().await.ok()?;
        for p in peripherals {
            if let Ok(Some(props)) = p.properties().await {
                if props
                    .services
                    .iter()
                    .any(|s| *s == service_uuid)
                {
                    adapter.stop_scan().await.ok();
                    return Some(p);
                }
            }
        }
    }

    adapter.stop_scan().await.ok();
    None
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let service_uuid = Uuid::parse_str(SERVICE_UUID)?;
    let manager = Manager::new().await?;
    let adapters = manager.adapters().await?;
    let adapter = adapters
        .into_iter()
        .next()
        .ok_or("No Bluetooth adapter found")?;

    // --- Find and connect ---
    let device = find_granboard(&adapter)
        .await
        .ok_or("GranBoard not found")?;

    println!("Found GranBoard — connecting...");
    device.connect().await?;
    println!("Connected!");

    device.discover_services().await?;
    let chars = device.characteristics();

    // Find the write and notify characteristics under the GranBoard service.
    let write_char = chars
        .iter()
        .find(|c| {
            c.service_uuid == service_uuid
                && c.properties.contains(CharPropFlags::WRITE | CharPropFlags::WRITE_WITHOUT_RESPONSE)
        })
        .or_else(|| {
            chars.iter().find(|c| {
                c.service_uuid == service_uuid
                    && c.properties.contains(CharPropFlags::WRITE_WITHOUT_RESPONSE)
            })
        })
        .cloned()
        .ok_or("Write characteristic not found")?;

    let notify_char = chars
        .iter()
        .find(|c| {
            c.service_uuid == service_uuid
                && c.properties.contains(CharPropFlags::NOTIFY)
        })
        .cloned()
        .ok_or("Notify characteristic not found")?;

    // --- Subscribe to hit notifications ---
    device.subscribe(&notify_char).await?;
    println!("Subscribed to hit notifications.");

    // --- LED demo ---
    println!("LED demo: light ring red...");
    let cmd = build_light_ring_command(0xFF, 0x00, 0x00);
    device
        .write(&write_char, &cmd, WriteType::WithoutResponse)
        .await?;
    sleep(Duration::from_secs(2)).await;

    println!("LED demo: blink white...");
    let cmd = build_blink_command(0xFF, 0xFF, 0xFF);
    device
        .write(&write_char, &cmd, WriteType::WithoutResponse)
        .await?;
    sleep(Duration::from_secs(2)).await;

    println!("LED demo: clear.");
    let cmd = build_clear_command();
    device
        .write(&write_char, &cmd, WriteType::WithoutResponse)
        .await?;

    // --- Listen for hits ---
    println!("Listening for dart hits (Ctrl+C to quit)...");

    let mut notification_stream = device.notifications().await?;
    while let Some(notification) = notification_stream.next().await {
        let segment = decode_hit(&notification.value);
        println!("Hit: {}", segment);
    }

    Ok(())
}

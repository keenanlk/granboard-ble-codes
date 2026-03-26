/**
 * GranBoard BLE Example — CoreBluetooth (Swift)
 *
 * Connects to a GranBoard dartboard over BLE, listens for dart hits,
 * and demonstrates sending LED commands. Runs as a macOS command-line tool.
 */

import CoreBluetooth
import Foundation

// MARK: - Constants

let SERVICE_UUID = CBUUID(string: "442f1570-8a00-9a28-cbe1-e1d4212d53eb")

// MARK: - Segment Mapping

let SEGMENT_MAP: [String: String] = [
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
]

// MARK: - LED Positions (dart number -> ring cell)

let LED_POSITIONS: [UInt8] = [
    0, 28, 49, 55, 34, 22, 40, 1, 7, 16,
    43, 10, 19, 37, 13, 46, 4, 52, 31, 58, 25,
]

// MARK: - RGB Helper

struct RGB {
    let r: UInt8
    let g: UInt8
    let b: UInt8
}

// MARK: - LED Command Builders

func buildHitCommand(dartNumber: Int, multiplier: UInt8, color: RGB) -> Data {
    var cmd = [UInt8](repeating: 0, count: 16)
    cmd[0]  = multiplier
    cmd[1]  = color.r
    cmd[2]  = color.g
    cmd[3]  = color.b
    cmd[10] = (dartNumber >= 0 && dartNumber < LED_POSITIONS.count) ? LED_POSITIONS[dartNumber] : 0
    cmd[12] = 0x14
    return Data(cmd)
}

func buildBlinkCommand(color: RGB, duration: UInt8 = 0x1e) -> Data {
    var cmd = [UInt8](repeating: 0, count: 16)
    cmd[0]  = 0x17
    cmd[1]  = color.r
    cmd[2]  = color.g
    cmd[3]  = color.b
    cmd[12] = duration
    cmd[15] = 0x01
    return Data(cmd)
}

func buildWaveCommand(colorUp: RGB, colorDown: RGB) -> Data {
    var cmd = [UInt8](repeating: 0, count: 16)
    cmd[0]  = 0x11
    cmd[1]  = colorUp.r
    cmd[2]  = colorUp.g
    cmd[3]  = colorUp.b
    cmd[4]  = colorDown.r
    cmd[5]  = colorDown.g
    cmd[6]  = colorDown.b
    cmd[10] = 0x10
    cmd[12] = 0x05
    return Data(cmd)
}

func buildLightRingCommand(color: RGB) -> Data {
    var cmd = [UInt8](repeating: 0, count: 16)
    cmd[0]  = 0x14
    cmd[1]  = color.r
    cmd[2]  = color.g
    cmd[3]  = color.b
    cmd[12] = 0x14
    cmd[15] = 0x01
    return Data(cmd)
}

func buildPersistentNumbersCommand(dartNumbers: [Int], colorByte: UInt8) -> Data {
    var cmd = [UInt8](repeating: 0, count: 20)
    for n in dartNumbers {
        if n >= 1 && n <= 20 {
            cmd[n - 1] = colorByte
        }
    }
    return Data(cmd)
}

func buildClearCommand() -> Data {
    return Data([UInt8](repeating: 0, count: 20))
}

// MARK: - GranBoard BLE Manager

class GranboardManager: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var writeCharacteristic: CBCharacteristic?
    private var notifyCharacteristic: CBCharacteristic?

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    // MARK: - Send Command

    func sendCommand(_ data: Data) {
        guard let peripheral = peripheral, let characteristic = writeCharacteristic else {
            print("[GranBoard] Not connected, cannot send command.")
            return
        }
        let writeType: CBCharacteristicWriteType =
            characteristic.properties.contains(.writeWithoutResponse)
            ? .withoutResponse : .withResponse
        peripheral.writeValue(data, for: characteristic, type: writeType)
    }

    // MARK: - CBCentralManagerDelegate

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("[GranBoard] Bluetooth powered on. Scanning for GranBoard...")
            central.scanForPeripherals(withServices: [SERVICE_UUID], options: nil)
        case .poweredOff:
            print("[GranBoard] Bluetooth is powered off.")
        case .unauthorized:
            print("[GranBoard] Bluetooth unauthorized. Check System Settings > Privacy & Security > Bluetooth.")
        case .unsupported:
            print("[GranBoard] Bluetooth LE is not supported on this device.")
        default:
            print("[GranBoard] Bluetooth state: \(central.state.rawValue)")
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        let name = peripheral.name ?? "Unknown"
        print("[GranBoard] Found device: \(name) (RSSI: \(RSSI))")
        self.peripheral = peripheral
        peripheral.delegate = self
        central.stopScan()
        central.connect(peripheral, options: nil)
        print("[GranBoard] Connecting...")
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[GranBoard] Connected to \(peripheral.name ?? "GranBoard")!")
        peripheral.discoverServices([SERVICE_UUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("[GranBoard] Failed to connect: \(error?.localizedDescription ?? "unknown error")")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("[GranBoard] Disconnected. Rescanning...")
        self.peripheral = nil
        self.writeCharacteristic = nil
        self.notifyCharacteristic = nil
        central.scanForPeripherals(withServices: [SERVICE_UUID], options: nil)
    }

    // MARK: - CBPeripheralDelegate

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            print("[GranBoard] Service discovery error: \(error.localizedDescription)")
            return
        }
        guard let services = peripheral.services else { return }
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        if let error = error {
            print("[GranBoard] Characteristic discovery error: \(error.localizedDescription)")
            return
        }
        guard let characteristics = service.characteristics else { return }

        for characteristic in characteristics {
            if characteristic.properties.contains(.notify) {
                notifyCharacteristic = characteristic
                peripheral.setNotifyValue(true, for: characteristic)
                print("[GranBoard] Subscribed to notify characteristic: \(characteristic.uuid)")
            }
            if characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                writeCharacteristic = characteristic
                print("[GranBoard] Found write characteristic: \(characteristic.uuid)")
            }
        }

        // If no separate write characteristic, use the notify one
        if writeCharacteristic == nil, let notify = notifyCharacteristic {
            writeCharacteristic = notify
        }

        // Run demo after discovery
        runDemo()
    }

    func peripheral(
        _ peripheral: CBPeripheral,
        didUpdateValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        if let error = error {
            print("[GranBoard] Notification error: \(error.localizedDescription)")
            return
        }
        guard let data = characteristic.value else { return }

        let uid = data.map { String($0) }.joined(separator: "-")
        let segment = SEGMENT_MAP[uid] ?? "UNKNOWN(\(uid))"
        print("[GranBoard] Hit: \(segment)")
    }

    // MARK: - Demo

    private func runDemo() {
        print("[GranBoard] Running LED demo...")

        // Light the ring red
        sendCommand(buildLightRingCommand(color: RGB(r: 255, g: 0, b: 0)))
        print("[GranBoard] LED ring set to red.")

        // Blink white after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.sendCommand(buildBlinkCommand(color: RGB(r: 255, g: 255, b: 255)))
            print("[GranBoard] Blinking white.")
        }

        // Clear after 4 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak self] in
            self?.sendCommand(buildClearCommand())
            print("[GranBoard] LEDs cleared.")
            print("[GranBoard] Listening for dart hits. Press Ctrl+C to exit.")
        }
    }
}

// MARK: - Main

print("GranBoard BLE Example (Swift / CoreBluetooth)")
print("----------------------------------------------")

let manager = GranboardManager()
withExtendedLifetime(manager) {
    RunLoop.main.run()
}

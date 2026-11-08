import { useEffect, useRef, useState } from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Colors, GranboardClient, type Hit } from "granboard";
import { blePlxTransport, findAndConnect, requestBlePermissions } from "./blePlxTransport";

// Create one BleManager for the whole app.
const manager = new BleManager();

export function GranboardScreen() {
  const [board, setBoard] = useState<GranboardClient | null>(null);
  const [status, setStatus] = useState("Not connected");
  const [hits, setHits] = useState<Hit[]>([]);
  const boardRef = useRef<GranboardClient | null>(null);

  async function connect() {
    try {
      if (!(await requestBlePermissions())) return setStatus("Bluetooth permission denied");
      setStatus("Scanning...");
      const device = await findAndConnect(manager);
      setStatus("Connecting...");
      const client = await GranboardClient.create(await blePlxTransport(device), { minWriteIntervalMs: 20 });

      client.onHit((hit) => {
        setHits((prev) => [hit, ...prev].slice(0, 50));
        void client.highlightHit(hit); // flash the segment that was hit
      });
      client.onDisconnect(() => {
        setStatus("Disconnected");
        setBoard(null);
        boardRef.current = null;
      });

      boardRef.current = client;
      setBoard(client);
      setStatus(`Connected to ${device.name ?? device.id}`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    }
  }

  // Disconnect when the screen unmounts.
  useEffect(() => () => void boardRef.current?.disconnect(), []);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>

      {board ? (
        <View style={styles.row}>
          <Button title="Ring" onPress={() => board.lightRing(Colors.GREEN)} />
          <Button title="Sweep" onPress={() => board.sweep()} />
          <Button title="Clear" onPress={() => board.clear()} />
          <Button title="Disconnect" onPress={() => board.disconnect()} />
        </View>
      ) : (
        <Button title="Connect" onPress={connect} />
      )}

      <FlatList
        data={hits}
        keyExtractor={(_, i) => String(hits.length - i)}
        renderItem={({ item }) => (
          <Text style={styles.hit}>
            {item.id} ({item.score})
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 64, gap: 12 },
  status: { fontSize: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hit: { fontFamily: "Courier", fontSize: 16, paddingVertical: 2 },
});

import { useEffect, useState } from "react";
import { getInfo } from "./api";
import type { PreparedDoc, ServerInfo, Settings } from "./api";
import Landing from "./screens/Landing";
import Setup from "./screens/Setup";
import Preparing from "./screens/Preparing";
import Chat from "./screens/Chat";
import "./App.css";

// Экраны как маленький state machine: landing → setup → preparing → chat
type Screen =
  | { name: "landing" }
  | { name: "setup" }
  | { name: "preparing"; file: File }
  | { name: "chat"; doc: PreparedDoc };

const DEFAULT_SETTINGS: Settings = { tone: "neutral", length: "short", strictness: "strict", use_lora: false };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "landing" });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [info, setInfo] = useState<ServerInfo | null>(null);

  // Будим Space заранее: пока человек читает лендинг и выбирает настройки, модели уже грузятся
  useEffect(() => {
    getInfo()
      .then(setInfo)
      .catch((err: unknown) => console.warn("Backend is not reachable yet:", err));
  }, []);

  switch (screen.name) {
    case "landing":
      return <Landing onStart={() => setScreen({ name: "setup" })} />;
    case "setup":
      return (
        <Setup
          settings={settings}
          loraAvailable={info?.lora_available ?? false}
          onChange={setSettings}
          onSubmit={(file) => setScreen({ name: "preparing", file })}
        />
      );
    case "preparing":
      return (
        <Preparing
          file={screen.file}
          settings={settings}
          onReady={(doc) => setScreen({ name: "chat", doc })}
          onBack={() => setScreen({ name: "setup" })}
        />
      );
    case "chat":
      return (
        <Chat
          doc={screen.doc}
          settings={settings}
          onSettingsChange={setSettings}
          onNewDocument={() => setScreen({ name: "setup" })}
        />
      );
  }
}

export default App;

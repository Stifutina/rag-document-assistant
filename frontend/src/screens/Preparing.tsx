import { useEffect, useRef, useState } from "react";
import { errorMessage, prepareDocument } from "../api";
import type { IndexProgress, PreparedDoc, Settings } from "../api";
import Stepper from "../components/Stepper";

type Props = {
  file: File;
  settings: Settings;
  onReady: (doc: PreparedDoc) => void;
  onBack: () => void;
};

// Каждый этап — реальная работа на сервере (yield в index_document), а не анимация для вида
type StageKey = "upload" | "reading" | "chunking" | "indexing";
const STAGES: { key: StageKey; label: string }[] = [
  { key: "upload", label: "Connecting to the model server and uploading the file" },
  { key: "reading", label: "Reading the text" },
  { key: "chunking", label: "Splitting it into passages" },
  { key: "indexing", label: "Building the search index and writing an overview (bge-m3 + Qwen3-4B)" },
];

function Preparing({ file, settings, onReady, onBack }: Props) {
  const [stage, setStage] = useState<StageKey>("upload");
  const [details, setDetails] = useState<Partial<Record<StageKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode в dev вызывает эффект дважды — не отправляем документ на сервер два раза
    if (started.current) return;
    started.current = true;

    function handleProgress(progress: IndexProgress) {
      setStage(progress.stage);
      if (progress.stage === "chunking") {
        setDetails((d) => ({
          ...d,
          reading: `${progress.pages} pages, ${progress.words.toLocaleString("en")} words, ${LANGUAGE[progress.language]}`,
        }));
      }
      if (progress.stage === "indexing") {
        setDetails((d) => ({ ...d, chunking: `${progress.chunks} passages` }));
      }
    }

    prepareDocument(file, settings, handleProgress)
      .then(onReady)
      .catch((err: unknown) => setError(errorMessage(err)));
    // Подготовка запускается один раз на этот файл — зависимости намеренно не отслеживаем
  }, []);

  const currentIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <main className="screen">
      <Stepper current={1} />
      <section className="preparing">
        <h2>Preparing your assistant</h2>
        <p className="muted">{file.name}</p>
        <ol className="stages">
          {STAGES.map((s, i) => {
            const state = i < currentIndex ? "done" : i === currentIndex ? (error ? "failed" : "active") : "pending";
            return (
              <li key={s.key} className={state} aria-current={state === "active" ? "step" : undefined}>
                <span className="stage-mark" aria-hidden="true" />
                <span>
                  {s.label}
                  {details[s.key] && <small>{details[s.key]}</small>}
                </span>
              </li>
            );
          })}
        </ol>
        {!error && stage === "upload" && (
          <p className="hint">If the server was asleep, this step can take a few minutes.</p>
        )}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button type="button" className="secondary" onClick={onBack}>
              Back to settings
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

const LANGUAGE = { en: "English", ru: "Russian", uk: "Ukrainian" } as const;

export default Preparing;

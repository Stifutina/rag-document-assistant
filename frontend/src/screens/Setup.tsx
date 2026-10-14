import { useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import type { Settings } from "../api";
import Segmented from "../components/Segmented";
import Stepper from "../components/Stepper";
import { LENGTH_OPTIONS, STRICTNESS_OPTIONS, TONE_OPTIONS } from "../settingsOptions";

type Props = {
  settings: Settings;
  loraAvailable: boolean;
  onChange: (settings: Settings) => void;
  onSubmit: (file: File) => void;
};

const ACCEPTED = [".pdf", ".txt"];
const MAX_MB = 20;

function validate(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED.includes(ext)) return "Choose a .pdf or .txt file.";
  if (file.size > MAX_MB * 1024 * 1024) return `This file is larger than ${MAX_MB} MB. Choose a smaller one.`;
  return null;
}

function Setup({ settings, loraAvailable, onChange, onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function pick(candidate: File | undefined) {
    if (!candidate) return;
    const error = validate(candidate);
    setFileError(error);
    setFile(error ? null : candidate);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (file) onSubmit(file);
  }

  // Частичное обновление настроек — как setState(prev => ({...prev, ...patch}))
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  return (
    <main className="screen">
      <Stepper current={0} />
      <form className="setup" onSubmit={handleSubmit}>
        <section>
          <h2>Your document</h2>
          <label
            className={`dropzone${dragging ? " dragging" : ""}${file ? " has-file" : ""}`}
            onDragOver={(e: DragEvent<HTMLLabelElement>) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={ACCEPTED.join(",")}
              onChange={(e: ChangeEvent<HTMLInputElement>) => pick(e.target.files?.[0])}
            />
            {file ? (
              <>
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(1)} MB. Click to choose another file.</span>
              </>
            ) : (
              <>
                <strong>Drop a PDF or TXT file here</strong>
                <span>or click to choose one, up to {MAX_MB} MB</span>
              </>
            )}
          </label>
          {fileError && <p className="error">{fileError}</p>}
          <p className="hint">The assistant answers in the language of the document: English, Ukrainian or Russian.</p>
        </section>

        <section>
          <h2>Assistant</h2>
          <Segmented label="Tone" options={TONE_OPTIONS} value={settings.tone} onChange={(tone) => update({ tone })} />
          <Segmented
            label="Answer length"
            options={LENGTH_OPTIONS}
            value={settings.length}
            onChange={(length) => update({ length })}
          />
          <Segmented
            label="Sources"
            hint="Document only: refuses when the answer isn't in the document. Explain terms: may add short background, marked as such."
            options={STRICTNESS_OPTIONS}
            value={settings.strictness}
            onChange={(strictness) => update({ strictness })}
          />
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.use_lora}
              disabled={!loraAvailable}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update({ use_lora: e.target.checked })}
            />
            <span>
              Use the fine-tuned LoRA adapter
              <small>
                {loraAvailable
                  ? "Experimental: trained on 40 Russian and Ukrainian examples to refuse when the answer is missing."
                  : "Not available on the server right now."}
              </small>
            </span>
          </label>
        </section>

        <div className="setup-actions">
          <button type="submit" className="primary" disabled={!file}>
            Prepare assistant
          </button>
        </div>
      </form>
    </main>
  );
}

export default Setup;

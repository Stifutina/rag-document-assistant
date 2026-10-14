import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { errorMessage, sendMessage } from "../api";
import type { ChatTurn, Feedback, PreparedDoc, Settings, Source } from "../api";
import Stepper from "../components/Stepper";
import { describeSettings } from "../settingsOptions";

type Props = {
  doc: PreparedDoc;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onNewDocument: () => void;
};

type Rating = "up" | "down";

type Message =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "assistant";
      text: string;
      question?: string; // на какой вопрос это ответ — нужно для примеров из 👍/👎
      sources?: Source[];
      model?: "base" | "lora";
      seconds?: number;
      rating?: Rating;
    };

let nextId = 1;

function Chat({ doc, settings, onSettingsChange, onNewDocument }: Props) {
  // Первое сообщение — обзор документа, который модель написала на этапе подготовки
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId++, role: "assistant", text: doc.overview.summary },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  // История для модели: только настоящие вопросы и ответы, без обзора
  function historyForModel(): ChatTurn[] {
    return messages
      .filter((m) => m.role === "user" || !!m.question)
      .map((m) => ({ role: m.role, content: m.text }));
  }

  // 👍/👎 превращаются в примеры, которые сервер кладёт в системный промпт
  function feedbackForModel(): Feedback {
    const rated = messages.filter(
      (m): m is Extract<Message, { role: "assistant" }> => m.role === "assistant" && !!m.rating && !!m.question,
    );
    const toExample = (m: (typeof rated)[number]) => ({ question: m.question ?? "", answer: m.text });
    return {
      liked: rated.filter((m) => m.rating === "up").map(toExample),
      disliked: rated.filter((m) => m.rating === "down").map(toExample),
    };
  }

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    setError(null);
    setDraft("");
    const history = historyForModel();
    const feedback = feedbackForModel();
    setMessages((prev) => [...prev, { id: nextId++, role: "user", text }]);
    setPending(true);
    try {
      const reply = await sendMessage(doc.doc_id, text, history, settings, feedback);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "assistant",
          text: reply.answer,
          question: text,
          sources: reply.sources,
          model: reply.model,
          seconds: reply.seconds,
        },
      ]);
    } catch (err) {
      setError(errorMessage(err));
      setDraft(text); // вернём вопрос в поле, чтобы можно было отправить ещё раз
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setPending(false);
    }
  }

  function rate(id: number, rating: Rating) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.role === "assistant" ? { ...m, rating: m.rating === rating ? undefined : rating } : m,
      ),
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  // Enter — отправить, Shift+Enter — новая строка
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(draft);
    }
  }

  const ratedCount = messages.filter((m) => m.role === "assistant" && m.rating).length;
  const documentMissing = error?.includes("Document not found") ?? false;

  return (
    <main className="screen chat-screen">
      <Stepper current={2} />
      <header className="chat-header">
        <div>
          <h2>{doc.filename}</h2>
          <p className="muted">
            {doc.pages} pages in {doc.language_name}. {describeSettings(settings)}.
          </p>
        </div>
        <div className="chat-header-actions">
          <select
            aria-label="Answer length"
            value={settings.length}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onSettingsChange({ ...settings, length: e.target.value as Settings["length"] })
            }
          >
            <option value="short">Short answers</option>
            <option value="detailed">Detailed answers</option>
          </select>
          <button type="button" className="secondary" onClick={onNewDocument}>
            New document
          </button>
        </div>
      </header>

      <div className="messages" aria-live="polite">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} className="msg user">
              {m.text}
            </div>
          ) : (
            <article key={m.id} className="msg assistant">
              <p className="answer">{m.text}</p>

              {i === 0 && doc.overview.questions.length > 0 && (
                <div className="suggestions">
                  {doc.overview.questions.map((q) => (
                    <button key={q} type="button" className="chip" disabled={pending} onClick={() => void ask(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {m.sources && m.sources.length > 0 && (
                <details className="sources">
                  <summary>
                    Found in {m.sources.length} passages, pages{" "}
                    {[...new Set(m.sources.map((s) => s.page))].sort((a, b) => a - b).join(", ")}
                  </summary>
                  <ol>
                    {m.sources.map((s, j) => (
                      <li key={j}>
                        <span className="muted">
                          Page {s.page}, similarity {s.score.toFixed(2)}
                        </span>
                        <p>{s.text}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {m.question && (
                <div className="msg-meta">
                  <span className="muted">
                    {m.model === "lora" ? "Qwen3-4B with LoRA" : "Qwen3-4B"}, {m.seconds} s
                  </span>
                  <span className="rating" role="group" aria-label="Rate this answer">
                    <button
                      type="button"
                      aria-pressed={m.rating === "up"}
                      title="Good answer: use it as an example"
                      onClick={() => rate(m.id, "up")}
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      aria-pressed={m.rating === "down"}
                      title="Bad answer: avoid answering like this"
                      onClick={() => rate(m.id, "down")}
                    >
                      👎
                    </button>
                  </span>
                </div>
              )}
            </article>
          ),
        )}
        {pending && (
          <div className="msg assistant thinking" aria-label="The assistant is answering">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="error">
          <p>{error}</p>
          {documentMissing && (
            <button type="button" className="secondary" onClick={onNewDocument}>
              Upload the document again
            </button>
          )}
        </div>
      )}

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          rows={2}
          placeholder="Ask about the document"
          value={draft}
          disabled={pending || documentMissing}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="primary" disabled={!draft.trim() || pending || documentMissing}>
          Send
        </button>
      </form>
      <p className="hint feedback-note">
        {ratedCount === 0
          ? "Rate answers with 👍 or 👎. Rated answers are sent back to the model as examples of what to do and what to avoid."
          : `Adapting to your feedback: ${ratedCount} rated ${ratedCount === 1 ? "answer is" : "answers are"} used as examples. The model weights don't change.`}
      </p>
    </main>
  );
}

export default Chat;

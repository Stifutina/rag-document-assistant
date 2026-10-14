import { Client, handle_file } from "@gradio/client";

// ---------- Типы — зеркало словарей, которые возвращает space/app.py ----------
export type Lang = "en" | "ru" | "uk";

export type Settings = {
  tone: "friendly" | "neutral" | "formal";
  length: "short" | "detailed";
  strictness: "strict" | "explain";
  use_lora: boolean;
};

export type ServerInfo = { model: string; embedder: string; lora_available: boolean };

// Промежуточные статусы генератора index_document()
export type IndexProgress =
  | { stage: "reading" }
  | { stage: "chunking"; pages: number; words: number; language: Lang }
  | { stage: "indexing"; chunks: number }; // эмбеддинги + обзор документа — один запуск GPU

export type PreparedDoc = {
  stage: "done";
  doc_id: string;
  filename: string;
  pages: number;
  chunks: number;
  words: number;
  language: Lang;
  language_name: string;
  lora_available: boolean;
  overview: { summary: string; questions: string[] };
};

export type Source = { text: string; page: number; score: number };
export type ChatTurn = { role: "user" | "assistant"; content: string };
export type FeedbackExample = { question: string; answer: string };
export type Feedback = { liked: FeedbackExample[]; disliked: FeedbackExample[] };
export type ChatAnswer = { answer: string; sources: Source[]; model: "base" | "lora"; seconds: number };

// ---------- Подключение ----------
// "username/space-name" или полный URL (например, ссылка gradio.live при запуске в Colab)
const SPACE = import.meta.env.VITE_SPACE_ID as string | undefined;

// ТОЛЬКО для локальной разработки (.env.local): запросы идут от твоего аккаунта HF,
// и GPU-квота списывается с него, а не из общего лимита анонимных посетителей.
// Никогда не задавай эту переменную на Vercel: всё с префиксом VITE_ попадает в JS-бандл,
// и токен увидит любой посетитель сайта.
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN as `hf_${string}` | undefined;

// Одно подключение на всё приложение — как singleton-инстанс axios
let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!SPACE) {
    return Promise.reject(new Error("VITE_SPACE_ID is not set. See frontend/.env.example."));
  }
  // "status" нужен, чтобы получать ошибки (gr.Error) из submit()
  clientPromise ??= Client.connect(SPACE, {
    events: ["data", "status"],
    ...(HF_TOKEN ? { token: HF_TOKEN } : {}),
  }).catch((err: unknown) => {
    clientPromise = null; // неудачное подключение не кэшируем
    throw err;
  });
  return clientPromise;
}

// ---------- Эндпоинты ----------
export async function getInfo(): Promise<ServerInfo> {
  const client = await getClient();
  const result = await client.predict<[ServerInfo]>("/info", []);
  return result.data[0];
}

// index_document — генератор на сервере: читаем поток событий, как async-итератор из fetch-стрима
export async function prepareDocument(
  file: File,
  settings: Settings,
  onProgress: (progress: IndexProgress) => void,
): Promise<PreparedDoc> {
  const client = await getClient();
  const job = client.submit("/index_document", [handle_file(file), settings]);

  for await (const message of job) {
    if (message.type === "data") {
      const payload = (message.data as [IndexProgress | PreparedDoc])[0];
      if (payload.stage === "done") return payload;
      onProgress(payload);
    }
    if (message.type === "status" && message.stage === "error") {
      throw new Error(typeof message.message === "string" ? message.message : "Document preparation failed.");
    }
  }
  throw new Error("The server closed the connection before the document was ready.");
}

export async function sendMessage(
  docId: string,
  message: string,
  history: ChatTurn[],
  settings: Settings,
  feedback: Feedback,
): Promise<ChatAnswer> {
  const client = await getClient();
  const result = await client.predict<[ChatAnswer]>("/chat", [docId, message, history, settings, feedback]);
  return result.data[0];
}

// gr.Error на бэкенде приходит сюда: в новых версиях клиента как Error, в старых — как объект с message
export function errorMessage(err: unknown): string {
  let message = "Something went wrong. Details are in the browser console.";
  if (err instanceof Error) message = err.message;
  else if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    message = err.message;
  }
  // Лимит бесплатной GPU-квоты Hugging Face — объясняем по-человечески, что произошло и что делать
  if (/zerogpu|gpu quota/i.test(message)) {
    return (
      "The free GPU limit on Hugging Face has run out for now. Anonymous visitors get only a few GPU runs " +
      "per day: preparing a document takes one, and each question takes one. Try again later, " +
      "or run the app locally with your own Hugging Face token."
    );
  }
  return message;
}

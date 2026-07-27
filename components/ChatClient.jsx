"use client";

import { useState, useRef, useEffect } from "react";

const QUICK_QUESTIONS = [
  "Які у вас послуги?",
  "Які ціни?",
  "Години роботи?",
  "Як записатися?",
];

export default function ChatClient({ salonName }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Вітаю! Я асистент "${salonName}". Запитайте про послуги, ціни або запишіться на візит.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const userText = text ?? input;
    if (!userText.trim() || loading) return;

    const nextMessages = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Помилка: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 flex flex-col h-[70vh]">
      <div className="px-5 py-4 border-b border-ink/10 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-ink text-cream flex items-center justify-center text-xs font-medium">
          AI
        </span>
        <div>
          <div className="font-medium text-sm">Асистент {salonName}</div>
          <div className="text-xs text-ink/50">Завжди на зв'язку</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              m.role === "user" ? "bg-ink text-cream ml-auto" : "bg-cream border border-ink/10"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-ink/40">Асистент друкує...</div>}
      </div>

      {messages.length === 1 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs rounded-full border border-ink/15 px-3 py-1.5 hover:border-clay"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-ink/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Напишіть повідомлення..."
          className="flex-1 rounded-full border border-ink/15 px-4 py-2 text-sm bg-white"
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="rounded-full bg-ink text-cream w-10 h-10 flex items-center justify-center disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}

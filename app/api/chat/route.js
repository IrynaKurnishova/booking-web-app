import { NextResponse } from "next/server";
import { loadSalonConfig } from "../../../lib/config.js";
import { runChat } from "../../../lib/llmAgent.js";

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не задан на сервере (.env.local)" },
      { status: 500 }
    );
  }

  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages обязателен и не должен быть пустым" }, { status: 400 });
  }

  const config = loadSalonConfig();
  try {
    const reply = await runChat({ messages, config });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка ассистента, попробуйте ещё раз" }, { status: 500 });
  }
}

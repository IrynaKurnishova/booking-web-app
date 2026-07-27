import Anthropic from "@anthropic-ai/sdk";
import { getAvailableSlots, createBooking } from "./db.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Актуальные названия моделей: docs.claude.com/en/docs/about-claude/models
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const tools = [
  {
    name: "get_available_slots",
    description: "Вернуть свободные слоты для услуги и мастера на дату. Вызывать перед тем как предлагать время.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: { type: "string" },
        specialistId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["serviceId", "specialistId", "date"],
    },
  },
  {
    name: "book_appointment",
    description: "Создать запись. Вызывать только после подтверждения клиентом услуги, мастера, даты, времени и имени.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: { type: "string" },
        specialistId: { type: "string" },
        date: { type: "string" },
        time: { type: "string", description: "HH:mm, один из ранее показанных свободных слотов" },
        clientName: { type: "string" },
      },
      required: ["serviceId", "specialistId", "date", "time", "clientName"],
    },
  },
];

function buildSystemPrompt(config) {
  const servicesList = config.services
    .map((s) => `- ${s.id}: "${s.name}", ${s.durationMinutes} мин, ${s.price} ${config.currency}`)
    .join("\n");

  const specialistsList = config.specialists
    .map((s) => `- ${s.id}: ${s.name}, услуги: ${s.serviceIds.join(", ")}`)
    .join("\n");

  const hoursList = Object.entries(config.workingHours)
    .map(([day, h]) => (h.closed ? `${day}: выходной` : `${day}: ${h.open}–${h.close}`))
    .join(", ");

  const faqList = config.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  return `Ты — ИИ-ассистент "${config.salonName}" (${config.location}). Отвечай по-русски, кратко и дружелюбно, как в чате на сайте.

Услуги:
${servicesList}

Мастера:
${specialistsList}

Часы работы: ${hoursList}
Часовой пояс: ${config.timezone}

Частые вопросы:
${faqList}

Правила:
1. Если клиент хочет записаться — уточни услугу, мастера (или предложи любого подходящего) и желаемую дату, затем вызови get_available_slots и покажи 3-5 вариантов.
2. Никогда не придумывай свободное время сам — только из get_available_slots.
3. Перед book_appointment обязательно подтверди услугу, мастера, дату, время и спроси имя, если не назвал.
4. После записи — коротко подтверди детали.
5. На вопросы не по записи отвечай строго по данным выше, не выдумывай факты о салоне.`;
}

/**
 * messages: [{ role: "user" | "assistant", content: string }, ...] — простая история для чата на сайте.
 * Каждый вызов — новый запрос к Anthropic; внутренний tool-loop не персистится между HTTP-запросами,
 * только финальные текстовые реплики (этого достаточно для диалога).
 */
export async function runChat({ messages, config }) {
  const history = messages.map((m) => ({ role: m.role, content: m.content }));
  const system = buildSystemPrompt(config);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: history,
      tools,
    });

    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock ? textBlock.text : "Извините, не получилось сформировать ответ.";
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result;
      try {
        if (block.name === "get_available_slots") {
          const slots = await getAvailableSlots(config, block.input);
          result = { slots };
        } else if (block.name === "book_appointment") {
          const booking = await createBooking(config, {
            serviceId: block.input.serviceId,
            specialistId: block.input.specialistId,
            date: block.input.date,
            time: block.input.time,
            clientName: block.input.clientName,
          });
          result = { success: true, booking };
        } else {
          result = { error: `Неизвестный инструмент: ${block.name}` };
        }
      } catch (err) {
        result = { error: err.message };
      }

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    history.push({ role: "user", content: toolResults });
  }
}

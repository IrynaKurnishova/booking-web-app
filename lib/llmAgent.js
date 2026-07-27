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
    .map((s) => `- ${s.id}: "${s.name}", ${s.durationMinutes} хв, ${s.price} ${config.currency}`)
    .join("\n");

  const specialistsList = config.specialists
    .map((s) => `- ${s.id}: ${s.name}, послуги: ${s.serviceIds.join(", ")}`)
    .join("\n");

  const hoursList = Object.entries(config.workingHours)
    .map(([day, h]) => (h.closed ? `${day}: вихідний` : `${day}: ${h.open}–${h.close}`))
    .join(", ");

  const faqList = config.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  return `Ти — ІІ-асистент "${config.salonName}" (${config.location}). Відповідай українською мовою, коротко і привітно, як у чаті на сайті.

Послуги:
${servicesList}

Майстри:
${specialistsList}

Години роботи: ${hoursList}
Часовий пояс: ${config.timezone}

Часті запитання:
${faqList}

Правила:
1. Якщо клієнт хоче записатися — уточни послугу, майстра (або запропонуй будь-якого відповідного) і бажану дату, потім виклич get_available_slots і покажи 3-5 варіантів.
2. Ніколи не вигадуй вільний час сам — тільки з get_available_slots.
3. Перед book_appointment обов'язково підтверди послугу, майстра, дату, час і запитай ім'я, якщо не назвав.
4. Після запису — коротко підтверди деталі.
5. На запитання не про запис відповідай строго за даними вище, не вигадуй факти про салон.`;
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
          result = { error: `Невідомий інструмент: ${block.name}` };
        }
      } catch (err) {
        result = { error: err.message };
      }

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }

    history.push({ role: "user", content: toolResults });
  }
}

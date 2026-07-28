// Уведомление владельцу салона в Telegram о новой брони.
// Нужны две переменные окружения:
//   TELEGRAM_BOT_TOKEN     — токен бота (получить у @BotFather в Telegram)
//   TELEGRAM_OWNER_CHAT_ID — chat_id владельца (см. инструкцию в README)
//
// Если переменные не заданы — просто ничего не отправляет, бронь при этом
// всё равно создаётся штатно (уведомление не критично для основной логики).

export async function notifyOwnerAboutBooking(booking) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!token || !chatId) return;

  const text = [
    "🆕 Нова бронь!",
    `Послуга: ${booking.serviceName}`,
    `Майстер: ${booking.specialistName}`,
    `Клієнт: ${booking.clientName}${booking.clientContact ? ` (${booking.clientContact})` : ""}`,
    `Дата: ${booking.date} о ${booking.startTime}`,
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error("Telegram notify: HTTP", res.status, await res.text());
    }
  } catch (err) {
    // Не бросаем ошибку дальше — бронь уже создана, отсутствие уведомления
    // не должно ломать ответ клиенту.
    console.error("Не вдалося надіслати сповіщення в Telegram:", err.message);
  }
}

import { Pool } from "pg";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Брони хранятся в Postgres (раньше — в JSON-файле рядом с проектом).
// Причина: на serverless-деплое (Vercel/Netlify) файловая система эфемерна
// и запись в JSON не переживала следующий запрос — на реальном хостинге это
// приводило бы к потере всех броней.
//
// Нужна переменная окружения DATABASE_URL — строка подключения к Postgres.
// Быстрый бесплатный вариант: Supabase (supabase.com) или Neon (neon.tech) —
// создать проект → скопировать "Connection string" (режим pooling/URI) →
// вставить в .env.local. Таблица создаётся автоматически при первом обращении,
// вручную мигрировать не нужно.

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL не задан. Добавьте строку подключения к Postgres в .env.local (см. .env.example)."
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

let schemaReady = null;

function ensureSchema() {
  if (!schemaReady) {
    // date хранится как TEXT в формате YYYY-MM-DD (не DATE) — чтобы избежать
    // сдвига даты из-за парсинга часового пояса драйвером, и чтобы формат
    // совпадал 1-в-1 с тем, что было в JSON-версии.
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        specialist_id TEXT NOT NULL,
        specialist_name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_contact TEXT DEFAULT '',
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS bookings_date_specialist_idx ON bookings (date, specialist_id);
    `);
  }
  return schemaReady;
}

function rowToBooking(row) {
  return {
    id: row.id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    clientName: row.client_name,
    clientContact: row.client_contact || "",
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function weekdayKeyForDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return WEEKDAYS[d.getDay()];
}

/**
 * Свободные слоты для услуги + мастера на конкретную дату.
 * У каждого мастера свой независимый календарь.
 */
export async function getAvailableSlots(config, { serviceId, specialistId, date }) {
  const service = config.services.find((s) => s.id === serviceId);
  const specialist = config.specialists.find((s) => s.id === specialistId);
  if (!service || !specialist) return [];
  if (!specialist.serviceIds.includes(serviceId)) return [];

  const dayKey = weekdayKeyForDate(date);
  const hours = config.workingHours[dayKey];
  if (!hours || hours.closed) return [];

  const openMin = timeToMinutes(hours.open);
  const closeMin = timeToMinutes(hours.close);
  const duration = service.durationMinutes;
  const step = 30;

  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT start_time, end_time FROM bookings WHERE date = $1 AND specialist_id = $2 AND status = 'confirmed'`,
    [date, specialistId]
  );
  const existing = rows.map((r) => ({ start: timeToMinutes(r.start_time), end: timeToMinutes(r.end_time) }));

  const slots = [];
  for (let start = openMin; start + duration <= closeMin; start += step) {
    const end = start + duration;
    const overlaps = existing.some((b) => start < b.end && end > b.start);
    if (!overlaps) slots.push(minutesToTime(start));
  }
  return slots;
}

export async function createBooking(config, { serviceId, specialistId, date, time, clientName, clientContact }) {
  const service = config.services.find((s) => s.id === serviceId);
  const specialist = config.specialists.find((s) => s.id === specialistId);
  if (!service) throw new Error(`Невідома послуга: ${serviceId}`);
  if (!specialist) throw new Error(`Невідомий майстер: ${specialistId}`);

  const startMin = timeToMinutes(time);
  const endTime = minutesToTime(startMin + service.durationMinutes);

  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();

  // Проверка конфликта и вставка — в одной транзакции (в JSON-версии этой защиты
  // не было вовсе). Примечание на будущее: при заметной нагрузке от нескольких
  // салонов одновременно стоит заменить на EXCLUDE-констрейнт на уровне БД —
  // для пилотного масштаба текущей защиты достаточно.
  try {
    await client.query("BEGIN");
    const { rows: conflicts } = await client.query(
      `SELECT id FROM bookings
       WHERE date = $1 AND specialist_id = $2 AND status = 'confirmed'
         AND start_time < $3 AND end_time > $4`,
      [date, specialistId, endTime, time]
    );
    if (conflicts.length > 0) {
      await client.query("ROLLBACK");
      throw new Error("Цей час вже зайнятий, оберіть інший");
    }

    const { rows } = await client.query(
      `INSERT INTO bookings
         (service_id, service_name, specialist_id, specialist_name, client_name, client_contact, date, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
       RETURNING *`,
      [serviceId, service.name, specialistId, specialist.name, clientName, clientContact || "", date, time, endTime]
    );
    await client.query("COMMIT");
    return rowToBooking(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

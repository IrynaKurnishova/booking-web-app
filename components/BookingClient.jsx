"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthDays(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
}

export default function BookingClient({ config, initialServiceId }) {
  const [serviceId, setServiceId] = useState(initialServiceId);
  const service = config.services.find((s) => s.id === serviceId) || config.services[0];

  const eligibleSpecialists = useMemo(
    () => config.specialists.filter((sp) => sp.serviceIds.includes(service.id)),
    [config.specialists, service.id]
  );

  const [specialistId, setSpecialistId] = useState(eligibleSpecialists[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const today = new Date();
  const monthDays = useMemo(() => buildMonthDays(today.getFullYear(), today.getMonth()), []);

  useEffect(() => {
    if (!eligibleSpecialists.find((sp) => sp.id === specialistId)) {
      setSpecialistId(eligibleSpecialists[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id]);

  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime(null);
    setSlots([]);
  }, [service.id, specialistId]);

  async function pickDate(date) {
    const key = toDateKey(date);
    setSelectedDate(key);
    setSelectedTime(null);
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/availability?serviceId=${service.id}&specialistId=${specialistId}&date=${key}`
      );
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function confirmBooking() {
    if (!selectedDate || !selectedTime || !clientName) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          specialistId,
          date: selectedDate,
          time: selectedTime,
          clientName,
          clientContact,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не вдалося створити запис");
      setConfirmedBooking(data.booking);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  if (status === "success" && confirmedBooking) {
    return (
      <div className="rounded-2xl border border-clay bg-white/70 p-6">
        <div className="text-clay font-medium mb-2">Запис підтверджено</div>
        <p className="text-ink/80">
          {confirmedBooking.serviceName} у майстра {confirmedBooking.specialistName}
          <br />
          {confirmedBooking.date} о {confirmedBooking.startTime}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <label className="text-sm uppercase tracking-widest text-ink/50 block mb-3">Послуга</label>
        <div className="flex flex-wrap gap-2">
          {config.services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`rounded-full px-4 py-2 text-sm border transition ${
                s.id === service.id
                  ? "bg-ink text-cream border-ink"
                  : "border-ink/20 hover:border-clay"
              }`}
            >
              {s.name} · {s.durationMinutes} хв
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm uppercase tracking-widest text-ink/50 block mb-3">Майстер</label>
        <div className="flex gap-3">
          {eligibleSpecialists.map((sp) => (
            <button
              key={sp.id}
              onClick={() => setSpecialistId(sp.id)}
              className="flex flex-col items-center gap-1"
              title={sp.name}
            >
              <span
                className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium border-2 transition ${
                  sp.id === specialistId ? "border-clay bg-clay/10" : "border-ink/15"
                }`}
              >
                {sp.name[0]}
              </span>
              <span className="text-xs text-ink/60">{sp.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm uppercase tracking-widest text-ink/50 block mb-3">
          Дата · {today.toLocaleString("uk-UA", { month: "long", year: "numeric" })}
        </label>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-ink/40">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((d) => {
            const key = toDateKey(d);
            const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const dayKey = WEEKDAY_KEYS[d.getDay()];
            const closed = config.workingHours[dayKey]?.closed;
            const disabled = isPast || closed;
            const selected = key === selectedDate;
            return (
              <button
                key={key}
                disabled={disabled}
                onClick={() => pickDate(d)}
                className={`aspect-square rounded-lg text-sm flex items-center justify-center transition ${
                  disabled
                    ? "text-ink/20 cursor-not-allowed"
                    : selected
                    ? "bg-ink text-cream"
                    : "hover:bg-clay/10"
                }`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <label className="text-sm uppercase tracking-widest text-ink/50 block mb-3">Вільний час</label>
          {loadingSlots && <p className="text-sm text-ink/50">Завантаження...</p>}
          {!loadingSlots && slots.length === 0 && (
            <p className="text-sm text-ink/50">На цю дату вільних слотів немає — оберіть інший день.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {slots.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`rounded-full px-4 py-2 text-sm border transition ${
                  t === selectedTime ? "bg-ink text-cream border-ink" : "border-ink/20 hover:border-clay"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTime && (
        <div className="space-y-3 rounded-2xl border border-ink/10 bg-white/60 p-5">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ваше ім'я"
            className="w-full rounded-lg border border-ink/15 px-4 py-2 bg-white"
          />
          <input
            value={clientContact}
            onChange={(e) => setClientContact(e.target.value)}
            placeholder="Телефон або Telegram (необов'язково)"
            className="w-full rounded-lg border border-ink/15 px-4 py-2 bg-white"
          />
          {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
          <button
            onClick={confirmBooking}
            disabled={!clientName || status === "submitting"}
            className="w-full rounded-full bg-ink text-cream px-6 py-3 disabled:opacity-40"
          >
            {status === "submitting" ? "Записуємо..." : "Підтвердити запис"}
          </button>
        </div>
      )}
    </div>
  );
}

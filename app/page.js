import Link from "next/link";
import { loadSalonConfig } from "../lib/config.js";

export default function HomePage() {
  const config = loadSalonConfig();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-clay mb-3">Est. 2026</p>
      <h1 className="font-serif text-4xl mb-3">{config.salonName}</h1>
      <p className="text-lg text-ink/70 mb-1">{config.tagline}</p>
      <p className="text-sm text-ink/50 mb-10">Beauty · {config.location}</p>

      <h2 className="text-sm uppercase tracking-widest text-ink/50 mb-4">Наши услуги</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {config.services.map((s) => (
          <Link
            key={s.id}
            href={`/booking?service=${s.id}`}
            className="rounded-2xl border border-ink/10 bg-white/60 p-5 hover:border-clay hover:shadow-sm transition"
          >
            <div className="font-medium">{s.name}</div>
            <div className="text-sm text-ink/50">
              от {s.price} {config.currency}
            </div>
          </Link>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/booking"
          className="rounded-full bg-ink text-cream px-6 py-3 text-center hover:opacity-90 transition"
        >
          Записаться
        </Link>
        <Link
          href="/chat"
          className="rounded-full border border-ink px-6 py-3 text-center hover:bg-ink hover:text-cream transition"
        >
          Спросить ИИ-ассистента
        </Link>
      </div>
    </div>
  );
}

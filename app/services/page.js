import Link from "next/link";
import { loadSalonConfig } from "../../lib/config.js";

export default function ServicesPage() {
  const config = loadSalonConfig();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl mb-8">Послуги</h1>
      <div className="space-y-3">
        {config.services.map((s) => {
          const specialists = config.specialists.filter((sp) => sp.serviceIds.includes(s.id));
          return (
            <Link
              key={s.id}
              href={`/booking?service=${s.id}`}
              className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white/60 p-5 hover:border-clay transition"
            >
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-ink/50">
                  {s.durationMinutes} хв · {specialists.map((sp) => sp.name).join(", ")}
                </div>
              </div>
              <div className="text-clay font-medium">
                {s.price} {config.currency}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

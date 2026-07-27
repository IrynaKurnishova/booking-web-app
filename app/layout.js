import "./globals.css";
import Link from "next/link";
import { loadSalonConfig } from "../lib/config.js";

export const metadata = {
  title: "Salon Demo",
  description: "Booking + AI assistant demo",
};

export default function RootLayout({ children }) {
  const config = loadSalonConfig();

  return (
    <html lang="ru">
      <body className="bg-cream text-ink min-h-screen flex flex-col">
        <header className="border-b border-ink/10">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/" className="font-serif text-lg tracking-wide">
              {config.salonName}
            </Link>
            <nav className="flex gap-5 text-sm">
              <Link href="/" className="hover:text-clay">
                Главная
              </Link>
              <Link href="/services" className="hover:text-clay">
                Услуги
              </Link>
              <Link href="/booking" className="hover:text-clay">
                Запись
              </Link>
              <Link href="/chat" className="hover:text-clay">
                Чат
              </Link>
              <Link href="/profile" className="hover:text-clay">
                Профиль
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-ink/10 py-6 text-center text-xs text-ink/50">
          Демо-прототип · {config.location}
        </footer>
      </body>
    </html>
  );
}

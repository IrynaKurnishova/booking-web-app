import { loadSalonConfig } from "../../lib/config.js";
import BookingClient from "../../components/BookingClient.jsx";

export default async function BookingPage({ searchParams }) {
  const params = await searchParams;
  const config = loadSalonConfig();
  const initialServiceId = params?.service || config.services[0]?.id;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl mb-8">Забронировать визит</h1>
      <BookingClient config={config} initialServiceId={initialServiceId} />
    </div>
  );
}

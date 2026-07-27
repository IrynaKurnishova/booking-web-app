import { NextResponse } from "next/server";
import { loadSalonConfig } from "../../../lib/config.js";
import { getAvailableSlots } from "../../../lib/db.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const specialistId = searchParams.get("specialistId");
  const date = searchParams.get("date");

  if (!serviceId || !specialistId || !date) {
    return NextResponse.json({ error: "serviceId, specialistId и date обязательны" }, { status: 400 });
  }

  const config = loadSalonConfig();
  const slots = await getAvailableSlots(config, { serviceId, specialistId, date });
  return NextResponse.json({ slots });
}

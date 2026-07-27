import { NextResponse } from "next/server";
import { loadSalonConfig } from "../../../lib/config.js";
import { createBooking } from "../../../lib/db.js";

export async function POST(request) {
  const body = await request.json();
  const { serviceId, specialistId, date, time, clientName, clientContact } = body;

  if (!serviceId || !specialistId || !date || !time || !clientName) {
    return NextResponse.json({ error: "Не хватает обязательных полей" }, { status: 400 });
  }

  const config = loadSalonConfig();
  try {
    const booking = await createBooking(config, { serviceId, specialistId, date, time, clientName, clientContact });
    return NextResponse.json({ booking });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
}

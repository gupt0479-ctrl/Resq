import { NextRequest, NextResponse } from "next/server";
import {
  getAppointments,
  bookAppointment,
} from "@/lib/services/appointment.service";
import type { BookAppointmentRequest } from "@/lib/types";

export async function GET() {
  const result = await getAppointments();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ reservations: result.data });
}

export async function POST(req: NextRequest) {
  const body: BookAppointmentRequest = await req.json();

  if (!body.customer_id || !body.starts_at || !body.ends_at) {
    return NextResponse.json(
      { error: "customer_id, starts_at, and ends_at are required." },
      { status: 400 }
    );
  }

  const result = await bookAppointment(body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ reservation: result.data }, { status: 201 });
}
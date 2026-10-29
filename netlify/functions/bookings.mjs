
import { neon } from "@neondatabase/serverless";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export default async (request) => {
  if (request.method !== "POST") {
    return respond(
      { ok: false, error: "POST method required" },
      405
    );
  }

  try {
    if (!process.env.DATABASE_URL) {
      return respond(
        { ok: false, error: "Server configuration error" },
        500
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return respond(
        { ok: false, error: "Invalid JSON request" },
        400
      );
    }

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    const payment =
      typeof body.payment_method === "string"
        ? body.payment_method
        : "";

    const transactionId =
      typeof body.transaction_id === "string"
        ? body.transaction_id.trim()
        : "";

    const seats = body.seats;

    if (name.length < 2 || name.length > 120) {
      return respond(
        { ok: false, error: "নাম ২ থেকে ১২০ অক্ষরের মধ্যে দিন।" },
        400
      );
    }

    if (phone.length < 8 || phone.length > 25) {
      return respond(
        { ok: false, error: "সঠিক মোবাইল নম্বর দিন।" },
        400
      );
    }

    if (message.length > 500 || transactionId.length > 120) {
      return respond(
        { ok: false, error: "তথ্যের দৈর্ঘ্য সীমা অতিক্রম করেছে।" },
        400
      );
    }

    if (!["later", "online"].includes(payment)) {
      return respond(
        { ok: false, error: "পেমেন্ট পদ্ধতি সঠিক নয়।" },
        400
      );
    }

    if (
      !Array.isArray(seats) ||
      seats.length < 1 ||
      seats.length > 8 ||
      seats.some(
        n => !Number.isInteger(n) || n < 1 || n > 40
      ) ||
      new Set(seats).size !== seats.length
    ) {
      return respond(
        { ok: false, error: "১ থেকে ৮টি বৈধ সিট নির্বাচন করুন।" },
        400
      );
    }

    const sql = neon(process.env.DATABASE_URL);

    // Fare and trip date are read from the database,
    // never trusted from the visitor's browser.
    const settings = await sql`
      SELECT trip_date, fare
      FROM trip_settings
      WHERE id = 1
    `;

    if (
      !settings.length ||
      !settings[0].trip_date ||
      Number(settings[0].fare) < 0
    ) {
      return respond(
        { ok: false, error: "ভ্রমণের তারিখ এখনো নির্ধারণ করা হয়নি।" },
        409
      );
    }

    const tripDate = settings[0].trip_date;
    const fare = Number(settings[0].fare);

    // The database function handles seat conflicts.
    const result = await sql`
      SELECT create_booking(
        ${name},
        ${phone},
        ${message},
        ${payment},
        ${transactionId},
        ARRAY(
          SELECT jsonb_array_elements_text(
            ${JSON.stringify(seats)}::jsonb
          )::integer
        ),
        ${tripDate},
        ${fare}
      ) AS result
    `;

    const booking = result[0].result;

    if (!booking.ok) {
      return respond(
        { ok: false, error: booking.error },
        409
      );
    }

    return respond({
      ok: true,
      message: "বুকিং অনুরোধ গ্রহণ করা হয়েছে।",
      booking_id: booking.booking_id,
      status: "pending"
    }, 201);

  } catch (error) {
    console.error("Booking API error:", error.message);

    return respond(
      { ok: false, error: "বুকিং জমা দেওয়া যায়নি। পরে আবার চেষ্টা করুন।" },
      500
    );
  }
};

export const config = {
  path: "/api/bookings"
};

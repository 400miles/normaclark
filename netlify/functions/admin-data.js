// netlify/functions/admin-data.js
// Returns the full guest list and media upload log for the admin dashboard.
// Protected by a simple password check (env: ADMIN_PASSWORD).

const { google } = require("googleapis");

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Simple password auth via query param
  const pw = event.queryStringParameters?.pw;
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = process.env.SHEET_NAME || "RSVPs";
    const mediaSheet = process.env.MEDIA_SHEET_NAME || "Media_Uploads";

    const [rsvpRes, mediaRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:K1000`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${mediaSheet}!A2:F1000`,
      }),
    ]);

    const guests = (rsvpRes.data.values || []).map((row) => ({
      id: row[0],
      category: row[1],
      displayName: row[2],
      lastName: row[3],
      email: row[4],
      phone: row[5],
      rsvpStatus: row[6] || "No Status",
      guestCount: parseInt(row[7] || "1", 10),
      notes: row[8],
      invitationSent: row[9],
      submittedAt: row[10],
    }));

    const media = (mediaRes.data.values || []).map((row) => ({
      name: row[0],
      email: row[1],
      fileName: row[2],
      mimeType: row[3],
      message: row[4],
      uploadedAt: row[5],
    }));

    // Summary tallies
    const attending = guests.filter((g) => g.rsvpStatus === "Attending");
    const declined = guests.filter((g) => g.rsvpStatus === "Declined");
    const pending = guests.filter((g) => g.rsvpStatus === "No Status");
    const totalAttending = attending.reduce((sum, g) => sum + (g.guestCount || 1), 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          totalGuests: guests.length,
          attending: attending.length,
          declined: declined.length,
          pending: pending.length,
          totalAttendingCount: totalAttending,
        },
        guests,
        media,
      }),
    };
  } catch (err) {
    console.error("admin-data error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to load data." }),
    };
  }
};

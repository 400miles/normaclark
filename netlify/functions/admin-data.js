// netlify/functions/admin-data.js
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

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

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
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A2:L1000` }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${mediaSheet}!A2:F1000` }),
    ]);

    // Sheet columns:
    // A=ID[0], B=Category[1], C=DisplayName[2], D=LastName[3],
    // E=Email[4], F=Phone[5], G=MailingAddress[6], H=InvitationSent[7],
    // I=RSVPStatus[8], J=GuestCount[9], K=Notes[10], L=SubmittedAt[11]

    const guests = (rsvpRes.data.values || [])
      .filter(row => row[2]) // skip blank DisplayName rows
      .map((row) => ({
        id: row[0],
        category: row[1],
        displayName: row[2],
        lastName: row[3],
        email: row[4],
        phone: row[5],
        mailingAddress: row[6],
        invitationSent: row[7],
        rsvpStatus: row[8] || "No Status",
        guestCount: parseInt(row[9] || "1", 10),
        notes: row[10],
        submittedAt: row[11],
      }));

    const media = (mediaRes.data.values || []).map((row) => ({
      name: row[0], email: row[1], fileName: row[2],
      mimeType: row[3], message: row[4], uploadedAt: row[5],
    }));

    const attending = guests.filter((g) => g.rsvpStatus === "Attending");
    const declined = guests.filter((g) => g.rsvpStatus === "Declined");
    const pending = guests.filter((g) => g.rsvpStatus === "No Status");
    const totalAttending = attending.reduce((sum, g) => sum + (g.guestCount || 1), 0);

    return {
      statusCode: 200, headers,
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
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to load data." }) };
  }
};

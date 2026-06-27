// netlify/functions/guest-lookup.js
// Searches the RSVP sheet for guests matching a name query.
// Returns sanitized list (no sensitive fields) for the client to pick from.

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

  const query = (event.queryStringParameters?.q || "").toLowerCase().trim();
  if (!query || query.length < 2) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Query must be at least 2 characters." }),
    };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = process.env.SHEET_NAME || "RSVPs";

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetName}!A2:K1000`,
    });

    const rows = res.data.values || [];

    // Columns: A=ID, B=Category, C=DisplayName, D=LastName, E=Email,
    //          F=Phone, G=RSVPStatus, H=GuestCount, I=Notes,
    //          J=InvitationSent, K=SubmittedAt
    const matches = rows
      .map((row, index) => ({
        rowIndex: index + 2, // 1-based, accounting for header row
        id: row[0] || `row-${index + 2}`,
        category: row[1] || "",
        displayName: row[2] || "",
        lastName: row[3] || "",
        rsvpStatus: row[6] || "No Status",
        guestCount: row[7] || "1",
      }))
      .filter((g) => {
        const searchable = `${g.displayName} ${g.lastName}`.toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 10); // cap results

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ guests: matches }),
    };
  } catch (err) {
    console.error("guest-lookup error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unable to search guest list." }),
    };
  }
};

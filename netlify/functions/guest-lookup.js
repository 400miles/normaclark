// netlify/functions/guest-lookup.js
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

  const query = (event.queryStringParameters?.q || "").toLowerCase().trim();
  if (!query || query.length < 2) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Query must be at least 2 characters." }) };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = process.env.SHEET_NAME || "RSVPs";

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetName}!A2:L1000`,
    });

    const rows = res.data.values || [];

    // Sheet columns:
    // A=ID[0], B=Category[1], C=DisplayName[2], D=LastName[3],
    // E=Email[4], F=Phone[5], G=MailingAddress[6], H=InvitationSent[7],
    // I=RSVPStatus[8], J=GuestCount[9], K=Notes[10], L=SubmittedAt[11]

    const matches = rows
      .map((row, index) => ({
        rowIndex: index + 2,
        id: row[0] || `row-${index + 2}`,
        category: row[1] || "",
        displayName: row[2] || "",
        lastName: row[3] || "",
        rsvpStatus: row[8] || "No Status",
        guestCount: row[9] || "1",
      }))
      .filter((g) => {
        if (!g.displayName && !g.lastName) return false;
        const searchable = `${g.displayName} ${g.lastName}`.toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 10);

    return { statusCode: 200, headers, body: JSON.stringify({ guests: matches }) };
  } catch (err) {
    console.error("guest-lookup error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Unable to search guest list." }) };
  }
};

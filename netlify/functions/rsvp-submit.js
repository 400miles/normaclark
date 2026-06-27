// netlify/functions/rsvp-submit.js
// Updates an existing guest row's RSVP status, or appends a new row
// if the guest self-identified (not found in list).

const { google } = require("googleapis");

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
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
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const {
    rowIndex,       // null if self-identified (new row)
    displayName,
    lastName,
    email,
    phone,
    rsvpStatus,    // "Attending" | "Declined"
    guestCount,
    notes,
    category,      // "Self-Identified" for new guests
  } = body;

  if (!displayName || !rsvpStatus) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "displayName and rsvpStatus are required." }),
    };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = process.env.SHEET_NAME || "RSVPs";
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const submittedAt = new Date().toISOString();

    if (rowIndex) {
      // Update existing row
      // Columns: G=RSVPStatus, H=GuestCount, I=Notes, K=SubmittedAt
      // We update E=Email, F=Phone too in case they're filling those in
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!E${rowIndex}:K${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            email || "",
            phone || "",
            rsvpStatus,
            guestCount || "1",
            notes || "",
            "", // J: InvitationSent — leave as-is; we're only setting K
            submittedAt,
          ]],
        },
      });
    } else {
      // Append new row (guest not found in list)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:K`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[
            `new-${Date.now()}`,
            category || "Self-Identified",
            displayName,
            lastName || "",
            email || "",
            phone || "",
            rsvpStatus,
            guestCount || "1",
            notes || "",
            "N/A",
            submittedAt,
          ]],
        },
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("rsvp-submit error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to save RSVP." }),
    };
  }
};

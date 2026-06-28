// netlify/functions/rsvp-submit.js
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

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { rowIndex, displayName, lastName, email, phone, rsvpStatus, guestCount, notes, category } = body;

  if (!displayName || !rsvpStatus) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "displayName and rsvpStatus are required." }) };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = process.env.SHEET_NAME || "RSVPs";
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const submittedAt = new Date().toISOString();

    // Sheet columns:
    // A=ID, B=Category, C=DisplayName, D=LastName,
    // E=Email, F=Phone, G=MailingAddress, H=InvitationSent,
    // I=RSVPStatus, J=GuestCount, K=Notes, L=SubmittedAt

    if (rowIndex) {
      // Update existing row — write E through L
      // Leave G (MailingAddress) and H (InvitationSent) as-is by reading current values first
      const current = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!G${rowIndex}:H${rowIndex}`,
      });
      const currentRow = (current.data.values || [[]])[0];
      const mailingAddress = currentRow[0] || "";
      const invitationSent = currentRow[1] || "Not Sent";

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!E${rowIndex}:L${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            email || "",          // E
            phone || "",          // F
            mailingAddress,       // G — preserve existing
            invitationSent,       // H — preserve existing
            rsvpStatus,           // I
            guestCount || "1",    // J
            notes || "",          // K
            submittedAt,          // L
          ]],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:L`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[
            `new-${Date.now()}`,        // A
            category || "Self-Identified", // B
            displayName,                // C
            lastName || "",             // D
            email || "",                // E
            phone || "",                // F
            "",                         // G MailingAddress
            "Not Sent",                 // H InvitationSent
            rsvpStatus,                 // I
            guestCount || "1",          // J
            notes || "",                // K
            submittedAt,                // L
          ]],
        },
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("rsvp-submit error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to save RSVP." }) };
  }
};

// netlify/functions/get-upload-url.js
// Returns a Google Drive resumable upload URL so the client can upload
// directly to Drive without routing large files through Netlify Functions.
// Also logs the upload intent to the Media_Uploads sheet.

const { google } = require("googleapis");

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
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

  const { fileName, mimeType, uploaderName, uploaderEmail, message } = body;

  if (!fileName || !mimeType) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "fileName and mimeType are required." }),
    };
  }

  // Block non-image/video types
  const allowed = ["image/", "video/"];
  if (!allowed.some((prefix) => mimeType.startsWith(prefix))) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Only images and videos are accepted." }),
    };
  }

  try {
    const auth = getAuth();
    const authClient = await auth.getClient();
    const token = await authClient.getAccessToken();

    const folderId = process.env.DRIVE_FOLDER_ID;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, "_");

    // Request a resumable upload session from Drive
    const initRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": mimeType,
        },
        body: JSON.stringify({
          name: safeFileName,
          parents: [folderId],
        }),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error("Drive init error:", errText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to initialize upload." }),
      };
    }

    const uploadUrl = initRes.headers.get("Location");

    // Log upload intent to Media_Uploads sheet
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const mediaSheet = process.env.MEDIA_SHEET_NAME || "Media_Uploads";

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${mediaSheet}!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          uploaderName || "Anonymous",
          uploaderEmail || "",
          safeFileName,
          mimeType,
          message || "",
          new Date().toISOString(),
        ]],
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ uploadUrl }),
    };
  } catch (err) {
    console.error("get-upload-url error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error." }),
    };
  }
};

# Norma Clark — Celebration of Life RSVP Site

## Tech Stack
- React (CRA) — frontend
- Netlify Functions — serverless backend
- Google Sheets API — RSVP data store
- Google Drive API — photo/video uploads

---

## 1. Google Cloud Setup (~30 min, one-time)

### Create a service account
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. `norma-memorial`)
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **IAM & Admin → Service Accounts → Create Service Account**
5. Name it (e.g. `memorial-bot`), skip role assignment, click Done
6. Click the service account → **Keys → Add Key → JSON**
7. Save the downloaded JSON file — you'll paste it into Netlify env vars

### Share the spreadsheet with the service account
1. Open the [RSVP spreadsheet](https://docs.google.com/spreadsheets/d/1IvpxCjieYC8gqlzsyom3ICLYhGhdoeaABYyY30hnXoo)
2. Click Share → paste the service account email (looks like `memorial-bot@norma-memorial.iam.gserviceaccount.com`)
3. Give it **Editor** access

### Restructure the spreadsheet
Create two sheets:
- **RSVPs** with headers in row 1:
  `ID | Category | DisplayName | LastName | Email | Phone | RSVPStatus | GuestCount | Notes | InvitationSent | SubmittedAt`
- **Media_Uploads** with headers:
  `Name | Email | FileName | MimeType | Message | UploadedAt`

Migrate existing guest data into the RSVPs sheet. RSVP Status values: `Attending`, `Declined`, `No Status`.

### Create a Drive folder for uploads
1. Create a folder in Google Drive (e.g. `Norma Memorial — Memories`)
2. Share it with the service account email (Editor)
3. Copy the folder ID from the URL: `drive.google.com/drive/folders/FOLDER_ID_HERE`

---

## 2. Local Development

```bash
# Install dependencies
npm install
cd netlify/functions && npm install && cd ../..

# Copy env file
cp .env.example .env

# Edit .env — fill in all values (see below)
# Then:
npm run netlify:dev
```

### Required environment variables (`.env` for local, Netlify dashboard for production):

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Entire contents of the service account JSON, on one line |
| `SPREADSHEET_ID` | `1IvpxCjieYC8gqlzsyom3ICLYhGhdoeaABYyY30hnXoo` |
| `SHEET_NAME` | `RSVPs` |
| `MEDIA_SHEET_NAME` | `Media_Uploads` |
| `DRIVE_FOLDER_ID` | Your Drive folder ID |
| `ADMIN_PASSWORD` | A strong password of your choosing |

---

## 3. Deploy to GitHub + Netlify

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
gh repo create norma-memorial --private --source=. --push
# or create repo on github.com and follow their instructions
```

Then in [Netlify](https://app.netlify.com):
1. New site → Import from Git → select your repo
2. Build command: `npm run build`
3. Publish directory: `build`
4. Functions directory: `netlify/functions`
5. **Site configuration → Environment variables** → add all vars from the table above
6. Deploy

---

## 4. Site URLs

| Page | URL |
|---|---|
| RSVP | `https://your-site.netlify.app/` |
| Share a Memory | `https://your-site.netlify.app/share` |
| Admin Dashboard | `https://your-site.netlify.app/admin` |

Share the RSVP link in your invitation email/text. Keep the admin URL private.

---

## 5. Customizing Event Details

Edit `src/pages/RSVPPage.js` — the hero section near the top contains:
- Date/location text (currently placeholder — add your actual event details)
- Norma's years (update if needed)

---

## Architecture Notes

**Why resumable uploads?** Netlify Functions have a 10s timeout and 6MB body limit. For photos and video, the client gets a Google Drive resumable upload URL from our function, then uploads directly to Drive. This supports files up to 500MB with real progress tracking.

**Admin auth** is intentionally simple (single password via query param). For a 2-week event with private URL sharing, this is sufficient. Don't use this pattern for anything requiring real security.

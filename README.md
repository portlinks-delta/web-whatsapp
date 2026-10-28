# Run locally

Use Node.js 24 and two PowerShell terminals.

Backend:

```powershell
cd C:\Users\ayush\Desktop\WhatsApp-develop\server
npm install
$env:SERVER_PORT = '5001'
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run dev
```

Frontend:

```powershell
cd C:\Users\ayush\Desktop\WhatsApp-develop\whatsapp-webjs-client
npm install
$env:REACT_APP_SERVER_PORT = '5001'
npm run dev
```

Open http://localhost:3000. The frontend must receive the backend port through
`REACT_APP_SERVER_PORT`. Stop each process with Ctrl+C. `npm start` also works
in either folder. Restart the frontend after changing its environment because
Create React App reads environment variables when it starts.

The backend reads `server/.env` if that file exists, so the variables above can
live there instead of in the shell. Environment variables already set in the
shell win over `.env`. A missing `.env` is fine: `SERVER_PORT` falls back to
`5001`, and `MONGO_URI`/`CHROME_PATH` stay unset. Copy `server/.env.example` to
`server/.env` to start from the supported keys. Set the frontend port explicitly
as shown above, since the client has no default.

The backend stores WhatsApp sessions locally in `server/.wwebjs_auth` by
default. It uses the browser downloaded during dependency installation.
To use an existing Chrome installation, set `$env:CHROME_PATH` to its full
executable path before starting the backend. The command above uses the
installed Chrome path verified on this machine; omit it to use the downloaded
browser instead. If installation fails downloading the unused headless shell,
set `$env:PUPPETEER_SKIP_CHROME_HEADLESS_SHELL_DOWNLOAD = 'true'` and retry
`npm install`.

To use MongoDB session storage instead, set `$env:MONGO_URI` to your own
MongoDB connection string before starting the backend. Do not put credentials
in source files. Previously embedded database credentials should be rotated
by their owner.

The frontend production build command is `npm run build` in its folder.
WhatsApp login requires creating a session in the UI and scanning its QR code.

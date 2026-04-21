import express from 'express';
import { initBot } from './src/bot';
import fs from 'fs';

// Ensure required directories exist
const dirs = ['./data', './data/audio', './data/clips', './output'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start the bot polling
  initBot();

  // Pure Express backend routes
  app.get('/', (req, res) => {
    res.send(`
      <html>
        <body style="background: #111; color: #fff; font-family: monospace; padding: 2rem;">
          <h1>✅ Node.js / Express Backend Running</h1>
          <p>The Telegram Video Automator is active.</p>
          <p>Check the terminal logs or use the bot in Telegram.</p>
        </body>
      </html>
    `);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Telegram Bot & Express Server running perfectly.' });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Telegram Bot listening on polling...`);
  });
}

startServer();

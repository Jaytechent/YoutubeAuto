import TelegramBot from 'node-telegram-bot-api';
import { generateScript } from './groq';
import { segmentScenes } from './scenes';
import { generateAudioChunked } from './tts';
import { fetchSceneMedia } from './pexels';
import { composeVideo } from './ffmpeg';
import fs from 'fs';
import path from 'path';

export function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("TELEGRAM_BOT_TOKEN is missing. Bot won't start.");
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  console.log("Telegram bot initialized and polling.");

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome! Send me a topic, and I'll generate a full storytelling video for you. E.g., 'Why space exploration is important'.");
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands
    if (!text || text.startsWith('/')) return;

    bot.sendMessage(chatId, `🎬 Starting video generation pipeline for: "${text}"\n\nThis will take several minutes. I'll keep you updated.`);

    try {
      // 1. Script Generation
      bot.sendMessage(chatId, "✍️ 1/5: Generating script...");
      const script = await generateScript(text);
      fs.writeFileSync('./data/script.txt', script);

      // 2. Scene Segmentation
      bot.sendMessage(chatId, "🎬 2/5: Segmenting scenes...");
      const scenes = await segmentScenes(script);
      fs.writeFileSync('./data/scenes.json', JSON.stringify(scenes, null, 2));

      // 3. Audio Generation
      bot.sendMessage(chatId, "🎙️ 3/5: Generating voiceover (this might take a bit)...");
      const audioPath = await generateAudioChunked(scenes);

      // 4. Media Fetching
      bot.sendMessage(chatId, "🎥 4/5: Fetching stock videos...");
      const downloadedScenes = await fetchSceneMedia(scenes);

      // 5. Video Composition
      bot.sendMessage(chatId, "🎞️ 5/5: Rendering final video (this will take the longest)...");
      const finalVideoPath = await composeVideo(downloadedScenes, audioPath);

      // 6. Delivery
      bot.sendMessage(chatId, "✅ Render complete! Uploading to Telegram...");
      await bot.sendVideo(chatId, finalVideoPath, {
        caption: `Here is your video on: ${text}`
      });

      bot.sendMessage(chatId, "🎉 Done! Feel free to send another topic.");
      
      // Cleanup
      cleanupFiles(downloadedScenes, audioPath, finalVideoPath);

    } catch (error: any) {
      console.error(error);
      bot.sendMessage(chatId, `❌ An error occurred during generation: ${error.message}`);
    }
  });
}

function cleanupFiles(scenes: any[], audioPath: string, finalPath: string) {
  try {
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    scenes.forEach(s => {
      if (s.videoPath && fs.existsSync(s.videoPath)) {
        fs.unlinkSync(s.videoPath);
      }
    });
    console.log("Cleanup complete.");
  } catch(e) {
    console.error("Cleanup error:", e);
  }
}

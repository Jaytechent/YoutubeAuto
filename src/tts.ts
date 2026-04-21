import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Scene } from './scenes';
import { promises as fsPromises } from 'fs';

// Helper to wait
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function generateAudioChunked(scenes: Scene[]): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is missing");

  const voiceId = "pNInz6obpgDQGcFmaJgB"; // Example voice ID (Adam)
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  const chunkPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.narration || scene.narration.trim() === '') continue;

    console.log(`Generating audio for scene ${scene.id}...`);

    try {
      const response = await axios.post(url, {
        text: scene.narration,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }, {
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      const chunkPath = path.join('./data/audio', `chunk_${i}.mp3`);
      fs.writeFileSync(chunkPath, response.data);
      chunkPaths.push(chunkPath);
      
      // Delay to respect rate limits if free tier
      await delay(500);
      
    } catch (error: any) {
      console.error(`Error generating audio for scene ${scene.id}:`, error?.response?.data?.toString() || error.message);
      // Fallback: create silent audio or skip? We throw to abort.
      throw new Error(`Failed TTS on scene ${scene.id}. Check ElevenLabs quota.`);
    }
  }

  // If we had a robust local system we'd concat mp3s here using ffmpeg.
  // We'll concat them in ffmpeg step, but actually fluent-ffmpeg can concat easily.
  // Alternatively, just append buffers since MP3 can be concatenated bitwise.
  // For safety and perfectly smooth playback, we'll bitwise concatenate for now:
  
  const combinedBuffer = Buffer.concat(
    chunkPaths.map(p => fs.readFileSync(p))
  );
  const finalAudioPath = path.join('./data/audio', 'full_audio.mp3');
  fs.writeFileSync(finalAudioPath, combinedBuffer);

  // Clean chunks
  chunkPaths.forEach(p => fs.unlinkSync(p));

  return finalAudioPath;
}

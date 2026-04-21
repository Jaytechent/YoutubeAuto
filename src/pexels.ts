import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Scene } from './scenes';

export interface SceneWithMedia extends Scene {
  videoPath?: string;
}

export async function fetchSceneMedia(scenes: Scene[]): Promise<SceneWithMedia[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY is missing");

  const results: SceneWithMedia[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const query = scene.keywords.slice(0, 2).join(' ') || 'abstract';
    
    console.log(`Fetching media for scene ${scene.id} (query: ${query})...`);

    try {
      const response = await axios.get('https://api.pexels.com/videos/search', {
        params: { query, per_page: 3, orientation: 'landscape' },
        headers: {
          Authorization: apiKey
        }
      });

      const videos = response.data.videos;
      if (videos && videos.length > 0) {
        // Find best HD file
        const videoFiles = videos[0].video_files.sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height));
        const hdFile = videoFiles.find((f: any) => f.quality === 'hd' || f.quality === 'sd') || videoFiles[0];

        const videoUrl = hdFile.link;

        // Download
        const videoPath = path.join('./data/clips', `scene_${scene.id}.mp4`);
        const downloaded = await downloadFile(videoUrl, videoPath);
        
        if (downloaded) {
          results.push({ ...scene, videoPath: videoPath });
        } else {
          results.push({ ...scene });
        }
      } else {
        // No video found
        results.push({ ...scene });
      }

    } catch (e: any) {
      console.error(`Pexels API error for scene ${scene.id}:`, e.message);
      results.push({ ...scene });
    }

    // Rate limiting
    await new Promise(res => setTimeout(res, 500));
  }

  // Handle missing videos (loop previous or default)
  for (let i = 0; i < results.length; i++) {
    if (!results[i].videoPath) {
       // fallback to abstract empty somehow, or duplicate previous
       if (i > 0 && results[i-1].videoPath) {
         results[i].videoPath = results[i-1].videoPath; // repeat video
       }
    }
  }

  return results;
}

async function downloadFile(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', () => resolve(false));
    });
  } catch (e) {
    return false;
  }
}

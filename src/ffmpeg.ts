import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { SceneWithMedia } from './pexels';
import fs from 'fs';
import path from 'path';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

export async function composeVideo(scenes: SceneWithMedia[], audioPath: string): Promise<string> {
  const finalOutput = path.resolve('./output/final.mp4');
  
  // We will build a complex filtergraph, but a simpler way is to concatenate clips visually
  // Then overlay the audio.
  
  // Actually, wait, generating a file with multiple videos can be finicky if resolutions differ.
  // Best approach: normalize all videos to 1920x1080 immediately, or use complex filter.
  // To avoid extremely complex filtergraphs, we will write a quick text file for the concat demuxer
  // but concat demuxer requires identical codecs/resolutions.
  // So we use standard complex filter for scaling.

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    const validScenes = scenes.filter(s => !!s.videoPath);
    if (validScenes.length === 0) return reject(new Error("No valid video scenes to compile"));

    validScenes.forEach(scene => {
      cmd.input(scene.videoPath!);
    });

    // Add audio track
    cmd.input(audioPath);

    // Build filtergraph
    let filterString = '';
    validScenes.forEach((_, i) => {
      // Scale and crop to 1920x1080
      filterString += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=30[v${i}];`;
    });

    // Concat videos
    filterString += validScenes.map((_, i) => `[v${i}]`).join('') + `concat=n=${validScenes.length}:v=1:a=0[outv]`;

    cmd.complexFilter(filterString, ['outv']);
    
    // Map final video and the audio input
    // The audio is the LAST input index
    const audioIndex = validScenes.length;

    cmd.outputOptions([
      '-map', '[outv]',
      '-map', `${audioIndex}:a`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest' // End video when shortest stream ends (usually audio ends, and video loops? no we concat, so we trim at shortest)
    ]);

    cmd.save(finalOutput)
      .on('start', commandLine => {
        console.log('FFmpeg spawned with command: ' + commandLine);
      })
      .on('progress', progress => {
        if (progress.percent) {
           console.log(`Processing: ${Math.floor(progress.percent)}% done`);
        }
      })
      .on('end', () => {
        console.log('FFmpeg processing finished.');
        resolve(finalOutput);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg compile error:', err.message);
        reject(err);
      });
  });
}

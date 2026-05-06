const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { getFfmpegPath: resolveFfmpegPath, getFfprobePath: resolveFfprobePath } = require('../utils/ffmpegHelper');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const COVERS_DIR = path.join(__dirname, '..', 'assets', 'covers');

function getFfmpegPath() {
  return resolveFfmpegPath();
}

function getFfprobePath() {
  return resolveFfprobePath();
}

function initFfmpeg() {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);
}

initFfmpeg();

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

function rgbaToAss(color, alphaPercent) {
  let r = 255, g = 255, b = 255, a = 0;

  if (!color) return '&H00FFFFFF';

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    if (hex.length === 8) {
      a = Math.round((1 - parseInt(hex.substring(6, 8), 16) / 255) * 255);
    }
  } else if (color.startsWith('rgba')) {
    const parts = color.match(/[\d.]+/g);
    if (parts && parts.length >= 4) {
      r = parseInt(parts[0]);
      g = parseInt(parts[1]);
      b = parseInt(parts[2]);
      a = Math.round((1 - parseFloat(parts[3])) * 255);
    }
  } else if (color.startsWith('rgb')) {
    const parts = color.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      r = parseInt(parts[0]);
      g = parseInt(parts[1]);
      b = parseInt(parts[2]);
    }
  }

  if (alphaPercent !== undefined) {
    a = Math.round((1 - alphaPercent / 100) * 255);
  }

  return `&H${a.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}`;
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs.toFixed(2)).padStart(5, '0')}`;
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    const { execFile } = require('child_process');
    execFile(ffmpegPath, ['-i', videoPath], (err, stdout, stderr) => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const duration = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
        resolve(duration);
      } else {
        reject(new Error('无法获取视频时长'));
      }
    });
  });
}

async function addSubtitle(videoPath, subtitles, style = {}) {
  const outputPath = path.join(OUTPUT_DIR, `subtitled_${Date.now()}.mp4`);

  const srtContent = subtitles.map((sub, index) => {
    const startTime = formatTime(sub.start);
    const endTime = formatTime(sub.end);
    return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}`;
  }).join('\n\n');

  const srtPath = path.join(OUTPUT_DIR, `subtitle_${Date.now()}.srt`);
  fs.writeFileSync(srtPath, srtContent, 'utf8');

  const fontSize = style.fontSize || 20;
  const fontName = style.fontName || 'PingFang SC';
  const fontColor = style.fontColor ? rgbaToAss(style.fontColor) : '&HFFFFFF&';
  const outlineColor = style.outlineColor ? rgbaToAss(style.outlineColor) : '&H000000&';
  const outlineWidth = style.outlineWidth || 2;

  let alignment = 2;
  let marginV = 30;
  let marginL = 10;
  let marginR = 10;

  if (style.posX !== undefined && style.posY !== undefined) {
    if (style.posY < 33) {
      alignment = 8;
      marginV = Math.round((1 - style.posY / 100) * 100);
    } else if (style.posY > 66) {
      alignment = 2;
      marginV = Math.round((1 - style.posY / 100) * 200);
    } else {
      alignment = 5;
      marginV = 0;
    }
    if (style.posX < 40) {
      marginL = 10;
      marginR = Math.round((1 - style.posX / 100) * 200);
    } else if (style.posX > 60) {
      marginL = Math.round((style.posX / 100) * 200);
      marginR = 10;
    } else {
      marginL = 10;
      marginR = 10;
    }
  } else {
    const position = style.position || 'bottom';
    if (position === 'top') {
      alignment = 8;
      marginV = 50;
    }
  }

  let styleParts = `FontName=${fontName},FontSize=${fontSize},PrimaryColour=${fontColor},OutlineColour=${outlineColor},Outline=${outlineWidth},Alignment=${alignment},MarginL=${marginL},MarginR=${marginR},MarginV=${marginV}`;

  if (style.backColor) {
    const backColour = rgbaToAss(style.backColor, style.backAlpha !== undefined ? style.backAlpha : 50);
    styleParts += `,BackColour=${backColour},BorderStyle=4`;
  }

  const forceStyle = styleParts;
  const escapedSrtPath = srtPath.replace(/'/g, "'\\''").replace(/:/g, '\\:').replace(/\\/g, '/');

  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();
    const { execFile } = require('child_process');
    const args = [
      '-y',
      '-i', videoPath,
      '-vf', `subtitles='${escapedSrtPath}':force_style='${forceStyle}'`,
      '-c:a', 'copy',
      outputPath
    ];
    execFile(ffmpegPath, args, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        try { fs.unlinkSync(srtPath); } catch (e) {}
        reject(new Error(`ffmpeg error: ${stderr || err.message}`));
      } else {
        try { fs.unlinkSync(srtPath); } catch (e) {}
        resolve({ videoPath: outputPath, success: true });
      }
    });
  });
}

async function addCover(videoPath, coverImagePath, duration = 2) {
  const outputPath = path.join(OUTPUT_DIR, `covered_${Date.now()}.mp4`);

  const ffmpegPath = getFfmpegPath();
  let width = 720;
  let height = 1280;
  try {
    const { exec } = require('child_process');
    const info = await new Promise((resolve, reject) => {
      exec(`"${ffmpegPath}" -i "${videoPath}"`, { encoding: 'utf8', timeout: 10000 }, (err, stdout, stderr) => {
        if (stderr) resolve(stderr);
        else if (stdout) resolve(stdout);
        else reject(err || new Error('No output'));
      });
    });
    const match = info.match(/Stream\s+#\d+:\d+.*Video:.*?\s(\d{2,5})x(\d{2,5})\s/);
    if (match) {
      width = parseInt(match[1]);
      height = parseInt(match[2]);
      if (width > 0 && height > 0 && width <= 10000 && height <= 10000) {
        console.log(`📐 Video resolution detected: ${width}x${height}`);
      } else {
        console.warn('⚠️ Invalid video resolution detected, using defaults');
        width = 720;
        height = 1280;
      }
    }
  } catch (e) {
    console.warn('⚠️ Failed to detect video resolution:', e.message);
  }

  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const delayMs = Math.round(duration * 1000);
    const args = [
      '-y',
      '-loop', '1',
      '-t', String(duration),
      '-i', coverImagePath,
      '-i', videoPath,
      '-filter_complex', `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p[cover];[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,format=yuv420p[video];[1:a]adelay=${delayMs}|${delayMs}[audio];[cover][video]concat=n=2:v=1:a=0[outv]`,
      '-map', '[outv]',
      '-map', '[audio]?',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      outputPath
    ];
    console.log(`🎬 addCover command: both streams to ${width}x${height}, delay audio ${delayMs}ms`);
    execFile(ffmpegPath, args, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`ffmpeg addCover error: ${stderr || err.message}`));
      } else {
        resolve({ videoPath: outputPath, success: true });
      }
    });
  });
}

async function addBgm(videoPath, bgmPath, volume = 0.3) {
  const outputPath = path.join(OUTPUT_DIR, `bgm_${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(bgmPath)
      .complexFilter([
        `[1:a]volume=${volume}[bgm]`,
        `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]`
      ])
      .outputOptions([
        '-map', '0:v',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest'
      ])
      .output(outputPath)
      .on('end', () => {
        resolve({ videoPath: outputPath, success: true });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

async function compose({ videoPath, subtitles, subtitleStyle, coverImagePath, coverDuration, bgmPath, bgmVolume }) {
  let currentPath = videoPath;
  let tempFiles = [];

  try {
    if (subtitles && subtitles.length > 0) {
      const result = await addSubtitle(currentPath, subtitles, subtitleStyle || {});
      if (currentPath !== videoPath) tempFiles.push(currentPath);
      currentPath = result.videoPath;
    }

    if (coverImagePath) {
      const result = await addCover(currentPath, coverImagePath, coverDuration || 2);
      if (currentPath !== videoPath) tempFiles.push(currentPath);
      currentPath = result.videoPath;
    }

    if (bgmPath) {
      const result = await addBgm(currentPath, bgmPath, bgmVolume || 0.3);
      if (currentPath !== videoPath) tempFiles.push(currentPath);
      currentPath = result.videoPath;
    }

    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (e) {}
    }

    return { videoPath: currentPath, success: true };
  } catch (err) {
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
    throw err;
  }
}

async function trimVideo(videoPath, startTime, endTime) {
  const outputPath = path.join(OUTPUT_DIR, `trimmed_${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputPath)
      .on('end', () => {
        resolve({ videoPath: outputPath, success: true });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

async function mergeVideos(videoPaths) {
  const outputPath = path.join(OUTPUT_DIR, `merged_${Date.now()}.mp4`);
  const listPath = path.join(OUTPUT_DIR, `list_${Date.now()}.txt`);

  const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .output(outputPath)
      .on('end', () => {
        try { fs.unlinkSync(listPath); } catch (e) {}
        resolve({ videoPath: outputPath, success: true });
      })
      .on('error', (err) => {
        try { fs.unlinkSync(listPath); } catch (e) {}
        reject(err);
      })
      .run();
  });
}

async function alignSubtitles(videoPath, subtitleLines) {
  const duration = await getVideoDuration(videoPath);
  if (!duration || duration <= 0) {
    throw new Error('无法获取视频时长');
  }

  const lines = subtitleLines.filter(l => l.trim());
  if (lines.length === 0) return [];

  const totalChars = lines.reduce((sum, l) => sum + l.length, 0);
  let currentTime = 0;

  return lines.map((text) => {
    const ratio = text.length / totalChars;
    const lineDuration = duration * ratio;
    const start = Math.round(currentTime * 100) / 100;
    const end = Math.round((currentTime + lineDuration) * 100) / 100;
    currentTime += lineDuration;
    return { start, end, text: text.trim() };
  });
}

async function previewSubtitle(videoPath, text, style = {}) {
  const frameDir = path.join(OUTPUT_DIR, 'previews');
  if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

  const framePath = path.join(frameDir, `frame_${Date.now()}.png`);
  const outputPath = path.join(frameDir, `preview_${Date.now()}.png`);

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(framePath)
      .outputOptions(['-ss', '0', '-vframes', '1', '-y'])
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  if (!fs.existsSync(framePath)) {
    throw new Error('无法提取视频帧');
  }

  let videoWidth = 720;
  let videoHeight = 1280;
  try {
    const ffmpegPath = getFfmpegPath();
    const { exec } = require('child_process');
    const info = await new Promise((resolve, reject) => {
      exec(`"${ffmpegPath}" -i "${videoPath}"`, { encoding: 'utf8', timeout: 10000 }, (err, stdout, stderr) => {
        if (stderr) resolve(stderr);
        else if (stdout) resolve(stdout);
        else reject(err || new Error('No output'));
      });
    });
    const match = info.match(/Stream\s+#\d+:\d+.*Video:.*?\s(\d{2,5})x(\d{2,5})\s/);
    if (match) {
      videoWidth = parseInt(match[1]);
      videoHeight = parseInt(match[2]);
    }
  } catch (e) {
    console.warn('⚠️ Failed to detect video resolution for preview:', e.message);
  }

  const displayWidth = style.displayWidth || 400;
  const scale = displayWidth / videoWidth;

  const fontSize = style.fontSize || 20;
  const fontName = style.fontName || 'PingFang SC';
  const fontColor = style.fontColor || '#FFFFFF';
  const position = style.position || 'bottom';

  function toFfmpegColor(color) {
    if (!color) return '0xFFFFFF';
    if (color.startsWith('rgba')) {
      const parts = color.match(/[\d.]+/g);
      if (parts && parts.length >= 3) {
        return `0x${parseInt(parts[0]).toString(16).padStart(2, '0')}${parseInt(parts[1]).toString(16).padStart(2, '0')}${parseInt(parts[2]).toString(16).padStart(2, '0')}`;
      }
    } else if (color.startsWith('rgb')) {
      const parts = color.match(/[\d.]+/g);
      if (parts && parts.length >= 3) {
        return `0x${parseInt(parts[0]).toString(16).padStart(2, '0')}${parseInt(parts[1]).toString(16).padStart(2, '0')}${parseInt(parts[2]).toString(16).padStart(2, '0')}`;
      }
    } else if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length >= 6) return '0x' + hex.substring(0, 6);
    }
    return '0xFFFFFF';
  }

  const hexColor = toFfmpegColor(fontColor);

  const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:').replace(/%/g, '%%');

  const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
  const FONT_MAP = {
    'PingFang SC': path.join(FONTS_DIR, 'STHeiti.ttc'),
    'STHeiti': path.join(FONTS_DIR, 'STHeiti.ttc'),
    'STSong': path.join(FONTS_DIR, 'Songti.ttc'),
    'STKaiti': path.join(FONTS_DIR, 'STHeiti.ttc'),
    'STZhongsong': path.join(FONTS_DIR, 'Songti.ttc'),
    'STFangsong': path.join(FONTS_DIR, 'Songti.ttc'),
    'Hiragino Sans GB': path.join(FONTS_DIR, 'Hiragino.ttc'),
    'Arial': path.join(FONTS_DIR, 'ArialUnicode.ttf'),
    'Microsoft YaHei': path.join(FONTS_DIR, 'STHeiti.ttc')
  };
  const fontFile = FONT_MAP[fontName] || path.join(FONTS_DIR, 'STHeiti.ttc');

  const outlineWidth = style.outlineWidth !== undefined ? style.outlineWidth * 2 : 4;
  const outlineColor = style.outlineColor ? toFfmpegColor(style.outlineColor) : '0x000000';

  let drawText = `drawtext=text='${escapedText}':fontfile=${fontFile}:fontsize=${Math.round(fontSize * scale * 2)}:fontcolor=${hexColor}:borderw=${Math.round(outlineWidth * scale)}:bordercolor=${outlineColor}:x=(w-text_w)/2`;

  if (position === 'bottom') {
    drawText += ':y=h-text_h-60';
  } else {
    drawText += ':y=60';
  }

  if (style.backColor) {
    const backHex = toFfmpegColor(style.backColor);
    const alpha = style.backAlpha !== undefined ? (1 - style.backAlpha / 100) : 0.5;
    drawText += `:box=1:boxcolor=${backHex}@${alpha.toFixed(2)}:boxborderw=10`;
  }

  await new Promise((resolve, reject) => {
    ffmpeg(framePath)
      .output(outputPath)
      .outputOptions(['-vf', drawText, '-y'])
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  try { fs.unlinkSync(framePath); } catch (e) {}

  return { previewPath: outputPath, success: true };
}

async function extractFrames(videoPath, count = 5) {
  const duration = await getVideoDuration(videoPath);
  if (!duration || duration <= 0) {
    throw new Error('无法获取视频时长');
  }

  const frameDir = path.join(OUTPUT_DIR, 'frames');
  if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });

  const interval = duration / (count + 1);
  const timestamps = [];
  for (let i = 1; i <= count; i++) {
    timestamps.push(Math.round(interval * i * 100) / 100);
  }

  const results = [];
  for (let i = 0; i < timestamps.length; i++) {
    const framePath = path.join(frameDir, `frame_${Date.now()}_${i}.png`);
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(framePath)
        .outputOptions(['-ss', String(timestamps[i]), '-vframes', '1', '-y'])
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    if (fs.existsSync(framePath)) {
      const url = framePath.replace(/.*\/output/, '/output');
      results.push({ url, time: timestamps[i] });
    }
  }

  return results;
}

async function generateCover(framePath, text, style = {}) {
  const coverDir = path.join(OUTPUT_DIR, 'covers');
  if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

  const outputPath = path.join(coverDir, `cover_${Date.now()}.png`);

  const fontSize = style.fontSize || 20;
  const fontName = style.fontName || 'PingFang SC';
  const fontColor = style.fontColor || '#FFFFFF';
  const position = style.position || 'bottom';

  function toFfmpegColor(color) {
    if (!color) return '0xFFFFFF';
    if (color.startsWith('rgba')) {
      const parts = color.match(/[\d.]+/g);
      if (parts && parts.length >= 3) {
        return `0x${parseInt(parts[0]).toString(16).padStart(2, '0')}${parseInt(parts[1]).toString(16).padStart(2, '0')}${parseInt(parts[2]).toString(16).padStart(2, '0')}`;
      }
    } else if (color.startsWith('rgb')) {
      const parts = color.match(/[\d.]+/g);
      if (parts && parts.length >= 3) {
        return `0x${parseInt(parts[0]).toString(16).padStart(2, '0')}${parseInt(parts[1]).toString(16).padStart(2, '0')}${parseInt(parts[2]).toString(16).padStart(2, '0')}`;
      }
    } else if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length >= 6) return '0x' + hex.substring(0, 6);
    }
    return '0xFFFFFF';
  }

  const hexColor = toFfmpegColor(fontColor);

  const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:').replace(/%/g, '%%');

  const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
  const FONT_MAP = {
    'PingFang SC': path.join(FONTS_DIR, 'STHeiti.ttc'),
    'STHeiti': path.join(FONTS_DIR, 'STHeiti.ttc'),
    'STSong': path.join(FONTS_DIR, 'Songti.ttc'),
    'STKaiti': path.join(FONTS_DIR, 'STHeiti.ttc'),
    'STZhongsong': path.join(FONTS_DIR, 'Songti.ttc'),
    'STFangsong': path.join(FONTS_DIR, 'Songti.ttc'),
    'Hiragino Sans GB': path.join(FONTS_DIR, 'Hiragino.ttc'),
    'Arial': path.join(FONTS_DIR, 'ArialUnicode.ttf'),
    'Microsoft YaHei': path.join(FONTS_DIR, 'STHeiti.ttc')
  };
  const fontFile = FONT_MAP[fontName] || path.join(FONTS_DIR, 'STHeiti.ttc');

  const outlineWidth = style.outlineWidth !== undefined ? style.outlineWidth * 2 : 4;
  const outlineColor = style.outlineColor ? toFfmpegColor(style.outlineColor) : '0x000000';

  let drawText;
  if (style.posX !== undefined && style.posY !== undefined) {
    const px = (style.posX / 100).toFixed(4);
    const py = (style.posY / 100).toFixed(4);
    drawText = `drawtext=text='${escapedText}':fontfile=${fontFile}:fontsize=${fontSize * 2}:fontcolor=${hexColor}:borderw=${outlineWidth}:bordercolor=${outlineColor}:x=w*${px}-text_w/2:y=h*${py}-text_h/2`;
  } else {
    drawText = `drawtext=text='${escapedText}':fontfile=${fontFile}:fontsize=${fontSize * 2}:fontcolor=${hexColor}:borderw=${outlineWidth}:bordercolor=${outlineColor}:x=(w-text_w)/2`;

    if (position === 'bottom') {
      drawText += ':y=h-text_h-60';
    } else if (position === 'top') {
      drawText += ':y=60';
    } else {
      drawText += ':y=(h-text_h)/2';
    }
  }

  if (style.backColor) {
    const backHex = toFfmpegColor(style.backColor);
    const alpha = style.backAlpha !== undefined ? (1 - style.backAlpha / 100) : 0.5;
    drawText += `:box=1:boxcolor=${backHex}@${alpha.toFixed(2)}:boxborderw=10`;
  }

  await new Promise((resolve, reject) => {
    ffmpeg(framePath)
      .output(outputPath)
      .outputOptions(['-vf', drawText, '-y'])
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  return { coverPath: outputPath, success: true };
}

module.exports = { addSubtitle, addCover, addBgm, compose, trimVideo, mergeVideos, getVideoDuration, alignSubtitles, previewSubtitle, extractFrames, generateCover };

const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('./fileService');

const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const API_HEADERS = {
  'User-Agent': PC_UA,
  'Referer': 'https://www.bilibili.com/',
  'Accept': 'application/json',
};

function extractVideoId(url) {
  const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  if (bvMatch) return { type: 'bvid', id: bvMatch[1] };

  const avMatch = url.match(/\/video\/av(\d+)/);
  if (avMatch) return { type: 'aid', id: avMatch[1] };

  return null;
}

async function parseBilibiliVideo(url) {
  console.log('\n' + '═'.repeat(60));
  console.log('📱 开始解析哔哩哔哩视频');
  console.log('═'.repeat(60));
  console.log('请求 URL:', url);

  if (!url) {
    throw new Error('URL is required');
  }

  console.log('📄 跟随重定向...');
  let finalUrl = url;
  try {
    const redirectResp = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { 'User-Agent': MOBILE_UA },
    });
    finalUrl = redirectResp.request?.res?.responseUrl || redirectResp.config?.url || url;
    console.log('🔗 最终 URL:', finalUrl);
  } catch (redirectErr) {
    if (redirectErr.response) {
      finalUrl = redirectErr.request?.res?.responseUrl || url;
      console.log('🔗 最终 URL (from error):', finalUrl);
    } else {
      console.warn('⚠️ 重定向失败:', redirectErr.message);
    }
  }

  const videoIdInfo = extractVideoId(finalUrl);
  if (!videoIdInfo) {
    throw new Error('无法从链接中提取视频ID，请确认链接格式正确（如 https://b23.tv/xxx 或 https://www.bilibili.com/video/BVxxx）');
  }

  console.log('🔑 视频ID:', videoIdInfo.type, '=', videoIdInfo.id);

  console.log('📄 获取视频信息...');
  const viewParams = {};
  viewParams[videoIdInfo.type] = videoIdInfo.id;

  let viewData;
  try {
    const viewResp = await axios.get('https://api.bilibili.com/x/web-interface/view', {
      params: viewParams,
      headers: API_HEADERS,
      timeout: 15000,
    });
    viewData = viewResp.data;
  } catch (apiErr) {
    throw new Error('B站 API 调用失败: ' + apiErr.message);
  }

  if (viewData.code !== 0) {
    throw new Error('B站 API 返回错误: ' + (viewData.message || '未知错误'));
  }

  const info = viewData.data;
  const aid = info.aid;
  const cid = info.cid;

  const videoInfo = {
    title: info.title || '未知标题',
    videoId: info.bvid || videoIdInfo.id,
    author: info.owner?.name || '未知',
    authorId: info.owner?.mid || '',
    authorAvatar: info.owner?.face || null,
    likes: info.stat?.like || 0,
    views: info.stat?.view || 0,
    comments: info.stat?.reply || 0,
    shares: info.stat?.share || 0,
    favorites: info.stat?.favorite || 0,
    duration: info.duration || 0,
    desc: info.desc || '',
    coverUrl: info.pic || null,
    videoUrls: [],
    aid,
    cid,
  };

  console.log('✅ 成功提取视频元数据');
  console.log('  BVID:', videoInfo.videoId);
  console.log('  title:', videoInfo.title);
  console.log('  author:', videoInfo.author);
  console.log('  duration:', videoInfo.duration, 's');

  console.log('📄 获取视频播放地址...');
  const qualityLevels = [
    { qn: 80, label: '1080P' },
    { qn: 64, label: '720P' },
    { qn: 32, label: '480P' },
    { qn: 16, label: '360P' },
  ];

  for (const q of qualityLevels) {
    try {
      const playResp = await axios.get('https://api.bilibili.com/x/player/playurl', {
        params: {
          avid: aid,
          cid: cid,
          qn: q.qn,
          fnval: 0,
        },
        headers: API_HEADERS,
        timeout: 15000,
      });

      const playData = playResp.data;
      if (playData.code !== 0) {
        console.log(`  ⚠️ ${q.label} 不可用: ${playData.message}`);
        continue;
      }

      const durl = playData.data?.durl || [];
      if (durl.length === 0) {
        console.log(`  ⚠️ ${q.label} 无 durl 数据`);
        continue;
      }

      console.log(`  ✅ ${q.label} 可用, ${durl.length} 个片段`);

      for (const segment of durl) {
        if (segment.url) {
          videoInfo.videoUrls.push({
            url: segment.url,
            quality: q.label,
            qn: q.qn,
            size: segment.size || 0,
            backupUrls: segment.backup_url || [],
          });
        }
      }

      break;
    } catch (playErr) {
      console.log(`  ⚠️ ${q.label} 请求失败:`, playErr.message);
    }
  }

  if (videoInfo.videoUrls.length === 0) {
    const err = new Error('未获取到视频下载链接，可能是由于B站反爬虫限制');
    err.videoInfo = videoInfo;
    throw err;
  }

  console.log('🔗 视频链接数量:', videoInfo.videoUrls.length);

  let localVideoPath = null;
  let downloadSuccess = false;

  const outputDir = './output';
  fileService.ensureDir(outputDir);

  const bvid = videoInfo.videoId;
  const segments = videoInfo.videoUrls.filter(s => !s.quality || s.quality === videoInfo.videoUrls[0].quality);

  if (segments.length === 1) {
    const videoUrl = segments[0].url;
    console.log('📥 下载单段视频:', videoUrl.substring(0, 80) + '...');

    try {
      const savePath = path.join(outputDir, `bilibili_${bvid}.mp4`);
      const absSavePath = path.resolve(savePath);

      execSync(
        `curl -L -o "${absSavePath}" ` +
        `-H "User-Agent: ${PC_UA}" -H "Referer: https://www.bilibili.com/" "${videoUrl}"`,
        { encoding: 'utf-8', timeout: 180000 }
      );

      const stats = fileService.fileStats(savePath);
      if (stats.size > 10000) {
        downloadSuccess = true;
        localVideoPath = `./output/bilibili_${bvid}.mp4`;
        console.log('✅ 视频下载成功:', localVideoPath, `(${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      } else {
        console.log('⚠️ 下载文件太小');
        try { fileService.deleteFile(savePath); } catch (e) {}
      }
    } catch (downloadErr) {
      console.log('⚠️ 下载失败:', downloadErr.message);
    }
  } else {
    console.log('📥 下载多段视频，共', segments.length, '段...');
    const tempFiles = [];
    let allSuccess = true;

    for (let i = 0; i < segments.length; i++) {
      const videoUrl = segments[i].url;
      const tempPath = path.join(outputDir, `bilibili_${bvid}_part${i}.mp4`);
      const absTempPath = path.resolve(tempPath);

      console.log(`  📥 下载第 ${i + 1}/${segments.length} 段...`);

      try {
        execSync(
          `curl -L -o "${absTempPath}" ` +
          `-H "User-Agent: ${PC_UA}" -H "Referer: https://www.bilibili.com/" "${videoUrl}"`,
          { encoding: 'utf-8', timeout: 180000 }
        );

        const stats = fileService.fileStats(tempPath);
        if (stats.size > 1000) {
          tempFiles.push(absTempPath);
        } else {
          console.log(`  ⚠️ 第 ${i + 1} 段下载失败`);
          allSuccess = false;
          break;
        }
      } catch (segErr) {
        console.log(`  ⚠️ 第 ${i + 1} 段下载失败:`, segErr.message);
        allSuccess = false;
        break;
      }
    }

    if (allSuccess && tempFiles.length > 0) {
      const finalPath = path.join(outputDir, `bilibili_${bvid}.mp4`);
      const absFinalPath = path.resolve(finalPath);

      if (tempFiles.length === 1) {
        const fs = require('fs');
        fs.renameSync(tempFiles[0], absFinalPath);
      } else {
        try {
          const ffmpegPath = require('../utils/ffmpegHelper').getFfmpegPath();
          if (ffmpegPath) {
            const concatList = tempFiles.map(f => `file '${f}'`).join('\n');
            const concatFilePath = path.join(outputDir, `bilibili_${bvid}_concat.txt`);
            require('fs').writeFileSync(concatFilePath, concatList);

            execSync(`"${ffmpegPath}" -y -f concat -safe 0 -i "${concatFilePath}" -c copy "${absFinalPath}"`, {
              encoding: 'utf-8',
              timeout: 120000,
            });

            for (const tf of tempFiles) {
              try { require('fs').unlinkSync(tf); } catch (e) {}
            }
            try { require('fs').unlinkSync(concatFilePath); } catch (e) {}
          } else {
            const fs = require('fs');
            if (tempFiles.length > 0) {
              fs.renameSync(tempFiles[0], absFinalPath);
              for (let i = 1; i < tempFiles.length; i++) {
                try { fs.unlinkSync(tempFiles[i]); } catch (e) {}
              }
            }
          }
        } catch (mergeErr) {
          console.log('⚠️ 合并失败，使用第一段:', mergeErr.message);
          const fs = require('fs');
          fs.renameSync(tempFiles[0], absFinalPath);
          for (let i = 1; i < tempFiles.length; i++) {
            try { fs.unlinkSync(tempFiles[i]); } catch (e) {}
          }
        }
      }

      const stats = fileService.fileStats(finalPath);
      if (stats.size > 10000) {
        downloadSuccess = true;
        localVideoPath = `./output/bilibili_${bvid}.mp4`;
        console.log('✅ 视频下载成功:', localVideoPath, `(${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      }
    }

    if (!allSuccess) {
      for (const tf of tempFiles) {
        try { require('fs').unlinkSync(tf); } catch (e) {}
      }
    }
  }

  if (!downloadSuccess) {
    const err = new Error('哔哩哔哩视频下载失败');
    err.videoInfo = videoInfo;
    throw err;
  }

  console.log('═'.repeat(60) + '\n');

  return {
    success: true,
    data: videoInfo,
    localVideoPath
  };
}

module.exports = { parseBilibiliVideo };

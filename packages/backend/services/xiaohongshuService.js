const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('./fileService');

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function extractNoteId(url) {
  const patterns = [
    /xiaohongshu\.com\/discovery\/item\/([a-f0-9]+)/,
    /xiaohongshu\.com\/explore\/([a-f0-9]+)/,
    /xiaohongshu\.com\/note\/([a-f0-9]+)/,
    /xhslink\.com\/([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function decodeUnicodeEscapes(str) {
  return str.replace(/\\u002F/g, '/').replace(/\\u0026/g, '&').replace(/\\u003F/g, '?');
}

async function parseXiaohongshuVideo(url) {
  console.log('\n' + '═'.repeat(60));
  console.log('📱 开始解析小红书视频');
  console.log('═'.repeat(60));
  console.log('请求 URL:', url);

  if (!url) {
    throw new Error('URL is required');
  }

  console.log('📄 跟随重定向...');
  let pageResp;
  try {
    pageResp = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    });
  } catch (pageErr) {
    throw new Error('无法访问小红书链接: ' + pageErr.message);
  }

  const finalUrl = pageResp.request?.res?.responseUrl || pageResp.config?.url || url;
  const html = pageResp.data;
  console.log('🔗 最终 URL:', finalUrl);
  console.log('📄 页面长度:', html.length);

  const noteId = extractNoteId(finalUrl) || 'unknown_' + Date.now();
  console.log('🔑 noteId:', noteId);

  const stateMatch = html.match(/window\.__SETUP_SERVER_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/);
  if (!stateMatch) {
    throw new Error('页面数据结构变化，无法解析（未找到 __SETUP_SERVER_STATE__）');
  }

  let stateData;
  try {
    const rawJson = stateMatch[1].replace(/\bundefined\b/g, 'null');
    stateData = JSON.parse(rawJson);
  } catch (parseErr) {
    throw new Error('解析页面数据失败: ' + parseErr.message);
  }

  const noteData = stateData?.LAUNCHER_SSR_STORE_PAGE_DATA?.noteData;
  if (!noteData) {
    throw new Error('未找到笔记数据');
  }

  if (noteData.type !== 'video') {
    const err = new Error('该链接不是视频类型，而是「' + (noteData.type || '未知') + '」类型');
    err.videoInfo = {
      title: noteData.desc || noteData.title || '',
      videoId: noteData.noteId,
      author: noteData.user?.nickName || '未知',
      type: noteData.type,
      videoUrls: [],
    };
    throw err;
  }

  const videoObj = noteData.video || {};
  const media = videoObj.media || {};
  const videoMeta = media.video || {};
  const stream = media.stream || {};

  const videoInfo = {
    title: noteData.desc || noteData.title || '未知标题',
    videoId: noteData.noteId || noteId,
    author: noteData.user?.nickName || '未知',
    authorId: noteData.user?.userId || '',
    authorAvatar: decodeUnicodeEscapes(noteData.user?.avatar || ''),
    likes: noteData.interactInfo?.likedCount || '0',
    comments: noteData.interactInfo?.commentCount || '0',
    shares: noteData.interactInfo?.shareCount || '0',
    favorites: noteData.interactInfo?.collectedCount || '0',
    duration: videoMeta.duration || 0,
    coverUrl: noteData.imageList?.[0]?.url ? decodeUnicodeEscapes(noteData.imageList[0].url) : null,
    videoUrls: [],
  };

  const codecPriority = ['h264', 'h265', 'av1', 'h266'];
  for (const codec of codecPriority) {
    const streams = stream[codec] || [];
    for (const s of streams) {
      if (s.masterUrl) {
        const masterUrl = decodeUnicodeEscapes(s.masterUrl);
        if (!videoInfo.videoUrls.includes(masterUrl)) {
          videoInfo.videoUrls.push(masterUrl);
        }
      }
      if (s.backupUrls && Array.isArray(s.backupUrls)) {
        for (const bu of s.backupUrls) {
          const backupUrl = decodeUnicodeEscapes(bu);
          if (!videoInfo.videoUrls.includes(backupUrl)) {
            videoInfo.videoUrls.push(backupUrl);
          }
        }
      }
    }
  }

  console.log('✅ 成功提取视频元数据');
  console.log('  noteId:', videoInfo.videoId);
  console.log('  desc:', videoInfo.title.substring(0, 50));
  console.log('  author:', videoInfo.author);
  console.log('  duration:', videoInfo.duration, 's');
  console.log('  视频链接数量:', videoInfo.videoUrls.length);

  if (videoInfo.videoUrls.length === 0) {
    const err = new Error('未找到视频下载链接');
    err.videoInfo = videoInfo;
    throw err;
  }

  let localVideoPath = null;
  let downloadSuccess = false;

  const outputDir = './output';
  fileService.ensureDir(outputDir);

  for (const videoUrl of videoInfo.videoUrls) {
    console.log('📥 尝试下载:', videoUrl.substring(0, 80) + '...');

    try {
      const checkResult = execSync(
        `curl -L -s -o /dev/null -w "%{http_code} %{size_download} %{content_type}" ` +
        `-H "User-Agent: ${MOBILE_UA}" -H "Referer: https://www.xiaohongshu.com/" "${videoUrl}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );

      const [statusCode, sizeStr, contentType] = checkResult.trim().split(' ');
      const size = parseInt(sizeStr || '0');

      console.log(`  检查结果: status=${statusCode}, size=${size}, type=${contentType}`);

      if (statusCode === '200' && size > 10000) {
        const savePath = path.join(outputDir, `xiaohongshu_${videoInfo.videoId}.mp4`);
        const absSavePath = path.resolve(savePath);

        execSync(
          `curl -L -o "${absSavePath}" ` +
          `-H "User-Agent: ${MOBILE_UA}" -H "Referer: https://www.xiaohongshu.com/" "${videoUrl}"`,
          { encoding: 'utf-8', timeout: 120000 }
        );

        const stats = fileService.fileStats(savePath);
        if (stats.size > 10000) {
          downloadSuccess = true;
          localVideoPath = `./output/xiaohongshu_${videoInfo.videoId}.mp4`;
          console.log('✅ 视频下载成功:', localVideoPath, `(${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
          break;
        } else {
          console.log('⚠️ 下载文件太小，尝试下一个 URL');
          try { fileService.deleteFile(savePath); } catch (e) {}
        }
      } else {
        console.log('⚠️ URL 无效或文件太小');
      }
    } catch (downloadErr) {
      console.log('⚠️ 下载失败:', downloadErr.message);
    }
  }

  if (!downloadSuccess) {
    const err = new Error('小红书视频下载失败，可能是由于视频链接已过期');
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

module.exports = { parseXiaohongshuVideo };

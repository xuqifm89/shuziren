const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('./fileService');

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function parseKuaishouVideo(url) {
  console.log('\n' + '═'.repeat(60));
  console.log('📱 开始解析快手视频');
  console.log('═'.repeat(60));
  console.log('请求 URL:', url);

  if (!url) {
    throw new Error('URL is required');
  }

  let realUrl = url;
  try {
    const redirectResp = await axios.get(url, {
      maxRedirects: 5,
      timeout: 15000,
      headers: {
        'User-Agent': MOBILE_UA,
        'Referer': 'https://www.kuaishou.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
    realUrl = redirectResp.request?.res?.responseUrl || redirectResp.config?.url || url;
    console.log('🔗 最终 URL:', realUrl);
  } catch (redirectErr) {
    if (redirectErr.response) {
      realUrl = redirectErr.request?.res?.responseUrl || url;
      console.log('🔗 最终 URL (from error):', realUrl);
    } else {
      console.warn('⚠️ 获取页面失败:', redirectErr.message);
      throw new Error('无法访问快手链接: ' + redirectErr.message);
    }
  }

  let html;
  try {
    const pageResp = await axios.get(realUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.kuaishou.com/'
      }
    });
    html = pageResp.data;
  } catch (pageErr) {
    throw new Error('无法访问快手页面: ' + pageErr.message);
  }

  console.log('📄 页面长度:', html.length);

  const videoIdMatch = realUrl.match(/\/([a-zA-Z0-9_-]+)(?:\?|$)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown_' + Date.now();

  const videoUrls = [];

  const mp4UrlPattern = /"url"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/g;
  let match;
  while ((match = mp4UrlPattern.exec(html)) !== null) {
    const mp4Url = match[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
    if (!videoUrls.includes(mp4Url)) {
      videoUrls.push(mp4Url);
    }
  }

  const playUrlPattern = /"playUrl"\s*:\s*"(https?:\/\/[^"]+)"/g;
  while ((match = playUrlPattern.exec(html)) !== null) {
    const playUrl = match[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
    if (!videoUrls.includes(playUrl)) {
      videoUrls.push(playUrl);
    }
  }

  const srcNoMarkPattern = /"srcNoMark"\s*:\s*"(https?:\/\/[^"]+)"/g;
  while ((match = srcNoMarkPattern.exec(html)) !== null) {
    const srcUrl = match[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
    if (!videoUrls.includes(srcUrl)) {
      videoUrls.push(srcUrl);
    }
  }

  const photoUrlPattern = /"photoUrl"\s*:\s*"(https?:\/\/[^"]+\.mp4[^"]*)"/g;
  while ((match = photoUrlPattern.exec(html)) !== null) {
    const photoUrl = match[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
    if (!videoUrls.includes(photoUrl)) {
      videoUrls.push(photoUrl);
    }
  }

  if (videoUrls.length === 0) {
    throw new Error('页面数据结构变化，无法提取视频链接');
  }

  console.log('🔗 视频链接数量:', videoUrls.length);

  const hdUrls = videoUrls.filter(u => u.includes('tt=hd') || u.includes('_hd'));
  const basicUrls = videoUrls.filter(u => !u.includes('tt=hd') && !u.includes('_hd'));
  const sortedUrls = [...hdUrls, ...basicUrls];

  let title = '未知标题';
  let author = '未知';
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
  if (titleMatch) {
    title = titleMatch[1].replace(/ - 快手$/, '').trim();
  }

  const authorMatch = html.match(/"userName"\s*:\s*"([^"]+)"/);
  if (authorMatch) {
    author = authorMatch[1];
  } else {
    const authorMatch2 = html.match(/"name"\s*:\s*"([^"]+)"/);
    if (authorMatch2) {
      author = authorMatch2[1];
    }
  }

  const videoInfo = {
    title,
    videoId,
    author,
    videoUrls: sortedUrls,
    coverUrl: null
  };

  const coverMatch = html.match(/"poster"\s*:\s*"(https?:\/\/[^"]+)"/);
  if (coverMatch) {
    videoInfo.coverUrl = coverMatch[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&');
  }

  console.log('✅ 成功提取视频元数据');
  console.log('  videoId:', videoInfo.videoId);
  console.log('  title:', videoInfo.title);
  console.log('  author:', videoInfo.author);

  let localVideoPath = null;
  let downloadSuccess = false;

  const outputDir = './output';
  fileService.ensureDir(outputDir);

  for (const videoUrl of sortedUrls) {
    console.log('📥 尝试下载:', videoUrl.substring(0, 80) + '...');

    try {
      const checkResult = execSync(
        `curl -L -s -o /dev/null -w "%{http_code} %{size_download} %{content_type}" ` +
        `-H "User-Agent: ${MOBILE_UA}" -H "Referer: https://www.kuaishou.com/" "${videoUrl}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );

      const [statusCode, sizeStr, contentType] = checkResult.trim().split(' ');
      const size = parseInt(sizeStr || '0');

      console.log(`  检查结果: status=${statusCode}, size=${size}, type=${contentType}`);

      if (statusCode === '200' && size > 10000) {
        const savePath = path.join(outputDir, `kuaishou_${videoId}.mp4`);
        const absSavePath = path.resolve(savePath);

        execSync(
          `curl -L -o "${absSavePath}" ` +
          `-H "User-Agent: ${MOBILE_UA}" -H "Referer: https://www.kuaishou.com/" "${videoUrl}"`,
          { encoding: 'utf-8', timeout: 120000 }
        );

        const stats = fileService.fileStats(savePath);
        if (stats.size > 10000) {
          downloadSuccess = true;
          localVideoPath = `./output/kuaishou_${videoId}.mp4`;
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
    const err = new Error('快手视频下载失败，可能是由于视频链接已过期或快手的反爬虫机制');
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

module.exports = { parseKuaishouVideo };

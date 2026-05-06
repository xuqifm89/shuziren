const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('./fileService');

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

async function parseDouyinVideo(url) {
  console.log('\n' + '═'.repeat(60));
  console.log('📱 开始解析抖音视频');
  console.log('═'.repeat(60));
  console.log('请求 URL:', url);

  if (!url) {
    throw new Error('URL is required');
  }

  let realUrl = url;
  try {
    const redirectResp = await axios.get(url, {
      maxRedirects: 0,
      timeout: 10000,
      headers: { 'User-Agent': MOBILE_UA, 'Referer': 'https://www.douyin.com/' },
      validateStatus: (status) => status >= 200 && status < 400
    });
    realUrl = redirectResp.headers.location || url;
    console.log('🔗 重定向 URL:', realUrl);
  } catch (redirectErr) {
    if (redirectErr.response?.headers?.location) {
      realUrl = redirectErr.response.headers.location;
      console.log('🔗 重定向 URL (from error):', realUrl);
    } else {
      console.warn('⚠️ 获取重定向失败:', redirectErr.message);
    }
  }

  console.log('📄 访问分享页面...');
  const pageResp = await axios.get(realUrl, {
    timeout: 15000,
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.douyin.com/'
    }
  });

  const html = pageResp.data;
  console.log('📄 页面长度:', html.length);

  const routerDataMatch = html.match(/window\._ROUTER_DATA\s*=\s*({[\s\S]*?});?\s*<\/script>/);
  if (!routerDataMatch) {
    throw new Error('页面数据结构变化，无法解析');
  }

  const routerData = JSON.parse(routerDataMatch[1]);
  const item = routerData.loaderData?.['video_(id)/page']?.videoInfoRes?.item_list?.[0];

  if (!item) {
    throw new Error('视频数据为空');
  }

  console.log('✅ 成功提取视频元数据');
  console.log('  aweme_id:', item.aweme_id);
  console.log('  desc:', item.desc);
  console.log('  author:', item.author?.nickname);

  const videoInfo = {
    title: item.desc || '未知标题',
    videoId: item.aweme_id,
    author: item.author?.nickname || '未知',
    authorId: item.author?.uid || '未知',
    likes: item.statistics?.digg_count || 0,
    comments: item.statistics?.comment_count || 0,
    shares: item.statistics?.share_count || 0,
    duration: item.video?.duration || 0,
    width: item.video?.width || 0,
    height: item.video?.height || 0,
    videoUrls: [],
    coverUrl: null
  };

  if (item.video?.cover?.url_list?.[0]) {
    videoInfo.coverUrl = item.video.cover.url_list[0];
  }

  const playUrl = item.video?.play_addr?.url_list?.[0];
  if (playUrl) {
    const noWmUrl = playUrl.replace('playwm', 'play');
    videoInfo.videoUrls.push(noWmUrl);
    videoInfo.videoUrls.push(playUrl);
  }

  if (item.video?.download_addr?.url_list) {
    for (const dlUrl of item.video.download_addr.url_list) {
      const noWmUrl = dlUrl.replace('playwm', 'play');
      if (!videoInfo.videoUrls.includes(noWmUrl)) videoInfo.videoUrls.push(noWmUrl);
      if (!videoInfo.videoUrls.includes(dlUrl)) videoInfo.videoUrls.push(dlUrl);
    }
  }

  if (item.video?.bit_rate && Array.isArray(item.video.bit_rate)) {
    for (const rate of item.video.bit_rate) {
      if (rate.play_addr?.url_list?.[0]) {
        const rateUrl = rate.play_addr.url_list[0].replace('playwm', 'play');
        if (!videoInfo.videoUrls.includes(rateUrl)) {
          videoInfo.videoUrls.push(rateUrl);
        }
      }
    }
  }

  console.log('🔗 视频链接数量:', videoInfo.videoUrls.length);

  let localVideoPath = null;
  let downloadSuccess = false;

  const outputDir = './output';
  fileService.ensureDir(outputDir);

  for (const videoUrl of videoInfo.videoUrls) {
    console.log('📥 尝试下载:', videoUrl.substring(0, 80) + '...');

    try {
      const checkResult = execSync(
        `curl -L -s -o /dev/null -w "%{http_code} %{size_download} %{content_type}" ` +
        `-H "User-Agent: ${MOBILE_UA}" -H "Referer: https://www.douyin.com/" "${videoUrl}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );

      const [statusCode, sizeStr, contentType] = checkResult.trim().split(' ');
      const size = parseInt(sizeStr || '0');

      console.log(`  检查结果: status=${statusCode}, size=${size}, type=${contentType}`);

      if (statusCode === '200' && size > 10000) {
        const savePath = path.join(outputDir, `douyin_${videoInfo.videoId}.mp4`);
        const absSavePath = path.resolve(savePath);

        execSync(
          `curl -L -o "${absSavePath}" ` +
          `-H "User-Agent: ${MOBILE_UA}" -H "Referer: https://www.douyin.com/" "${videoUrl}"`,
          { encoding: 'utf-8', timeout: 120000 }
        );

        const stats = fileService.fileStats(savePath);
        if (stats.size > 10000) {
          downloadSuccess = true;
          localVideoPath = `./output/douyin_${videoInfo.videoId}.mp4`;
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
    const err = new Error('抖音视频下载失败，可能是由于视频链接已过期或抖音的反爬虫机制');
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

module.exports = { parseDouyinVideo };

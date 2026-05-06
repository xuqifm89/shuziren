// 临时模拟方案，先提供一些测试文案
// 后面我们可以换用其他 ASR 服务

const mockTranscriptions = [
  "你走过的路，遇见的人，好的坏的，都在教你成长，过往皆是因，当下皆是果，一切都是该经历的，别想太多，很多烦恼都是自己想出来的，本来就不存在。",
  "大家好，今天我来分享一下我的学习心得。首先，我们要确立明确的目标，然后制定合理的计划，最后持续不断地努力。",
  "欢迎来到这个美丽的地方，这里风景如画，气候宜人，是一个非常适合旅游和度假的好地方。"
];

function getMockTranscription(fileName) {
  // 使用文件名的哈希值选择一个固定的结果
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    const char = fileName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % mockTranscriptions.length;
  return mockTranscriptions[index];
}

module.exports = { getMockTranscription };

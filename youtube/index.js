"use strict";
const axios = require("axios");

function formatMusicItem(item) {
  var _a, _b, _c, _d, _e, _f, _g;
  return {
    id: item.videoId,
    title: (_b = (_a = item.title.runs) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text,
    artist: (_d = (_c = item.ownerText.runs) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text,
    artwork: (_g = (_f = (_e = item === null || item === void 0 ? void 0 : item.thumbnail) === null || _e === void 0 ? void 0 : _e.thumbnails) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.url,
  };
}

let lastQuery;
let musicContinToken;

async function searchMusic(query, page) {
  if (query !== lastQuery || page === 1) {
    musicContinToken = undefined;
  }
  lastQuery = query;

  let data = JSON.stringify({
    context: {
      client: {
        hl: "zh-CN",
        gl: "US",
        deviceMake: "",
        deviceModel: "",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0,gzip(gfe)",
        clientName: "WEB",
        clientVersion: "2.20231121.08.00",
        osName: "Windows",
        osVersion: "10.0",
        platform: "DESKTOP",
        userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
        browserName: "Edge Chromium",
        browserVersion: "119.0.0.0",
        acceptHeader:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        screenWidthPoints: 1358,
        screenHeightPoints: 1012,
        screenPixelDensity: 1,
        screenDensityFloat: 1.2395833730697632,
        utcOffsetMinutes: 480,
        memoryTotalKbytes: "8000000",
        mainAppWebInfo: {
          pwaInstallabilityStatus: "PWA_INSTALLABILITY_STATUS_UNKNOWN",
          webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
          isWebNativeShareAvailable: true,
        },
        timeZone: "Asia/Shanghai",
      },
      user: {
        lockedSafetyMode: false,
      },
      request: {
        useSsl: true,
        internalExperimentFlags: [],
      },
    },
    query: musicContinToken ? undefined : query,
    continuation: musicContinToken || undefined,
  });

  var config = {
    method: "post",
    url: "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
    headers: {
      "Content-Type": "text/plain",
    },
    data: data,
  };

  const response = (await axios(config)).data;

  const contents = response.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;

  const isEndItem = contents.find((it) => {
    var _a, _b, _c;
    return (
      ((_c = (_b = (_a = it.continuationItemRenderer) === null || _a === void 0 ? void 0 : _a.continuationEndpoint) === null || _b === void 0 ? void 0 : _b.continuationCommand) === null || _c === void 0
        ? void 0
        : _c.request) === "CONTINUATION_REQUEST_TYPE_SEARCH"
    );
  });

  if (isEndItem) {
    musicContinToken = isEndItem.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
  }

  const musicData = contents.find((it) => it.itemSectionRenderer).itemSectionRenderer.contents;

  let resultMusicData = [];

  for (let i = 0; i < musicData.length; ++i) {
    if (musicData[i].videoRenderer) {
      resultMusicData.push(formatMusicItem(musicData[i].videoRenderer));
    }
  }

  return {
    isEnd: !isEndItem,
    data: resultMusicData,
  };
}

async function search(query, page, type) {
  if (type === "music") {
    return await searchMusic(query, page);
  }
}

// 缓存播放源
let cacheMediaSource = {
  id: null,
  urls: {},
};

function getQuality(label) {
  if (label === "small") {
    return "standard";
  } else if (label === "tiny") {
    return "low";
  } else if (label === "medium") {
    return "high";
  } else if (label === "large") {
    return "super";
  } else {
    return "standard";
  }
}

async function getMediaSource(musicItem, quality) {
  if (musicItem.id === cacheMediaSource.id) {
    return {
      url: cacheMediaSource.urls[quality],
    };
  }

  cacheMediaSource = {
    id: null,
    urls: {},
  };

  const data = {
    context: {
      client: {
        screenWidthPoints: 689,
        screenHeightPoints: 963,
        screenPixelDensity: 1,
        utcOffsetMinutes: 120,
        hl: "en",
        gl: "GB",
        remoteHost: "1.1.1.1",
        deviceMake: "",
        deviceModel: "",
        userAgent: "com.google.android.apps.youtube.music/6.14.50 (Linux; U; Android 13; GB) gzip",
        clientName: "ANDROID_MUSIC",
        clientVersion: "6.14.50",
        osName: "Android",
        osVersion: "13",
        originalUrl: "https://www.youtube.com/tv?is_account_switch=1&hrld=1&fltor=1",
        theme: "CLASSIC",
        platform: "MOBILE",
        clientFormFactor: "UNKNOWN_FORM_FACTOR",
        webpSupport: false,
        timeZone: "Europe/Amsterdam",
        acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      user: { enableSafetyMode: false },
      request: {
        internalExperimentFlags: [],
        consistencyTokenJars: [],
      },
    },
    contentCheckOk: true,
    racyCheckOk: true,
    video_id: musicItem.id,
  };

  var config = {
    method: "post",
    url: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  const result = (await axios(config)).data;

  const formats = result.streamingData.formats ?? [];
  const adaptiveFormats = result.streamingData.adaptiveFormats ?? [];

  [...formats, ...adaptiveFormats].forEach((it) => {
    const q = getQuality(it.quality);
    if (q && it.url && !cacheMediaSource.urls[q]) {
      cacheMediaSource.urls[q] = it.url;
    }
  });

  cacheMediaSource.id = musicItem.id;

  return {
    url: cacheMediaSource.urls[quality],
  };
}

// 补充接口示例

// 获取音乐详情（简单版）
async function getMusicInfo(musicItem) {
  // 返回更详细的音乐信息（可根据需要丰富）
  return {
    id: musicItem.id,
    title: musicItem.title,
    artist: musicItem.artist,
    artwork: musicItem.artwork,
    album: null,
    duration: null,
  };
}

// 获取歌词（示例：此处用空返回，YouTube 不直接提供歌词）
async function getLyric(musicItem) {
  return {
    lyric: "",
    tlyric: "", // 翻译歌词
  };
}

// 导入单曲（示例：从URL中提取id并调用search）
async function importMusicItem(urlLike) {
  // 假设urlLike形如 https://www.youtube.com/watch?v=VIDEO_ID
  const idMatch = urlLike.match(/v=([a-zA-Z0-9_-]+)/);
  if (!idMatch) {
    throw new Error("URL格式错误，无法提取视频ID");
  }
  const videoId = idMatch[1];

  // 直接搜索 id 得到数据，或调用 getMusicInfo
  return {
    id: videoId,
    title: "未知标题",
    artist: "未知艺术家",
    artwork: null,
  };
}

module.exports = {
  platform: "Youtube",
  author: "猫头猫",
  version: "0.0.2",
  srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/youtube/index.js",
  cacheControl: "no-cache",
  supportedSearchType: ["music"],
  hints: {
    importMusicItem: ["请输入正确的YouTube视频链接，格式如：https://www.youtube.com/watch?v=视频ID"],
  },

  search,
  getMediaSource,
  getMusicInfo,
  getLyric,
  importMusicItem,
};

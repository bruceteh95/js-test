import axios from "axios";

// function to format video info to simple structure
function formatMusicItem(item) {
  return {
    id: item.videoId,
    title: item.title?.runs?.[0]?.text || "未知标题",
    artist: item.ownerText?.runs?.[0]?.text || "未知艺术家",
    artwork: item.thumbnail?.thumbnails?.[0]?.url || "",
  };
}

let lastQuery;
let musicContinToken;

// 搜索音乐，支持分页和容错结构解析
async function searchMusic(query, page) {
  try {
    const isNewSearch = query !== lastQuery || page === 1;
    if (isNewSearch) {
      musicContinToken = undefined;
    }
    lastQuery = query;

    const requestData = {
      context: {
        client: {
          hl: "zh-CN",
          gl: "US",
          deviceMake: "",
          deviceModel: "",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
          clientName: "WEB",
          clientVersion: "2.20231121.08.00",
          osName: "Windows",
          osVersion: "10.0",
          platform: "DESKTOP",
          screenWidthPoints: 1358,
          screenHeightPoints: 1012,
          screenPixelDensity: 1,
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
    };

    if (musicContinToken) {
      requestData.continuation = musicContinToken;
    } else {
      requestData.query = query;
    }

    const config = {
      method: "post",
      url: "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(requestData),
    };

    const response = await axios(config);
    const data = response?.data;

    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents ?? [];

    const continuationItem = contents.find(
      (item) =>
        item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand
          ?.request === "CONTINUATION_REQUEST_TYPE_SEARCH"
    );

    if (continuationItem) {
      musicContinToken =
        continuationItem?.continuationItemRenderer?.continuationEndpoint
          ?.continuationCommand?.token;
    }

    const musicSection = contents.find((item) => item?.itemSectionRenderer);
    const musicItems =
      musicSection?.itemSectionRenderer?.contents ?? [];

    const resultMusicData = musicItems
      .filter((item) => item?.videoRenderer)
      .map((item) => formatMusicItem(item.videoRenderer));

    return {
      isEnd: !continuationItem,
      data: resultMusicData,
    };
  } catch (err) {
    console.error("❌ searchMusic 出错：", err.message);
    return {
      isEnd: true,
      data: [],
    };
  }
}

// 支持多类型（目前仅 music）
async function search(query, page, type) {
  if (type === "music") {
    return await searchMusic(query, page);
  }
  return { isEnd: true, data: [] };
}

// 缓存机制
let cacheMediaSource = {
  id: null,
  urls: {},
};

// 画质映射
function getQuality(label) {
  if (label === "small") return "standard";
  if (label === "tiny") return "low";
  if (label === "medium") return "high";
  if (label === "large") return "super";
  return "standard";
}

// 获取媒体播放链接（音频）
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
        userAgent:
          "com.google.android.apps.youtube.music/6.14.50 (Linux; U; Android 13; GB) gzip",
        clientName: "ANDROID_MUSIC",
        clientVersion: "6.14.50",
        osName: "Android",
        osVersion: "13",
        originalUrl:
          "https://www.youtube.com/tv?is_account_switch=1&hrld=1&fltor=1",
        theme: "CLASSIC",
        platform: "MOBILE",
        clientFormFactor: "UNKNOWN_FORM_FACTOR",
        webpSupport: false,
        timeZone: "Europe/Amsterdam",
        acceptHeader:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
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

  const config = {
    method: "post",
    url: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  const result = (await axios(config)).data;
  const formats = result.streamingData?.formats ?? [];
  const adaptiveFormats = result.streamingData?.adaptiveFormats ?? [];

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

// 导出插件信息和功能方法
module.exports = {
  platform: "Youtube01",
  author: "韩雨泽",
  version: "0.0.1",
  supportedSearchType: ["music"],
  cacheControl: "no-cache",
  search,
  getMediaSource,
};

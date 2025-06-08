import YTMusic from "ytmusic-api";
import axios from "axios";

let ytmusic = null;

async function initYTMusic() {
  if (!ytmusic) {
    ytmusic = new YTMusic();
    await ytmusic.initialize();
  }
}

async function searchMusic(query, page) {
  await initYTMusic();

  const limit = 20; // 每页条数
  const offset = (page - 1) * limit;

  // 使用 ytmusic-api 搜索
  const allResults = await ytmusic.search(query);

  // 过滤歌曲类型
  const musicResults = allResults.filter((item) => item.type === "song");

  // 分页取数据
  const pageResults = musicResults.slice(offset, offset + limit);

  // 格式化结果
  const results = pageResults.map((item) => ({
    id: item.videoId,
    title: item.title,
    artist: item.artist ? item.artist.name : "",
    artwork: item.thumbnails?.[0]?.url || "",
  }));

  const isEnd = offset + limit >= musicResults.length;

  return {
    isEnd,
    data: results,
  };
}

function getQuality(label) {
  switch (label) {
    case "tiny":
      return "low";
    case "small":
      return "standard";
    case "medium":
      return "high";
    case "large":
      return "super";
    default:
      return "standard";
  }
}

let cacheMediaSource = {
  id: null,
  urls: {},
};

async function getMediaSource(musicItem, quality = "high") {
  if (musicItem.id === cacheMediaSource.id) {
    return {
      url: cacheMediaSource.urls[quality] || null,
    };
  }

  cacheMediaSource = {
    id: null,
    urls: {},
  };

  const postData = {
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
        originalUrl: "https://www.youtube.com/tv?is_account_switch=1&hrld=1&fltor=1",
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
    data: JSON.stringify(postData),
  };

  const result = (await axios(config)).data;
  const formats = result.streamingData.formats ?? [];
  const adaptiveFormats = result.streamingData.adaptiveFormats ?? [];

  [...formats, ...adaptiveFormats].forEach((format) => {
    const q = getQuality(format.quality);
    if (q && format.url && !cacheMediaSource.urls[q]) {
      cacheMediaSource.urls[q] = format.url;
    }
  });

  cacheMediaSource.id = musicItem.id;

  return {
    url: cacheMediaSource.urls[quality] || null,
  };
}

async function search(query, page, type) {
  if (type === "music") {
    return await searchMusic(query, page);
  }
  return { isEnd: true, data: [] };
}

export default {
  platform: "Youtube",
  author: "猫头猫",
  version: "0.0.2",
  supportedSearchType: ["music"],
  cacheControl: "no-cache",
  search,
  getMediaSource,
};

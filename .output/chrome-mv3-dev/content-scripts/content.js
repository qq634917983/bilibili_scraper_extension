var content = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function defineContentScript(definition2) {
    return definition2;
  }
  class VideoDataScraper {
    constructor() {
      this.init();
    }
    /**
     * 初始化抓取器
     */
    init() {
      this.setupMessageListener();
      console.log("[DEBUG] Content script 初始化完成");
    }
    /**
     * 设置消息监听器
     */
    setupMessageListener() {
      browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("[DEBUG] Content script 收到消息:", message);
        if (message.type === "REQUEST_SCRAPER_DATA") {
          this.scrapeVideoData().then((data) => {
            sendResponse({
              type: "BV_SCRAPER_DATA",
              data
            });
          }).catch((error) => {
            console.error("[ERROR] Content script 抓取数据失败:", error);
            sendResponse({
              type: "BV_SCRAPER_DATA",
              error: error.message
            });
          });
          return true;
        }
        if (message.type === "REQUEST_CURRENT_VIDEO_INFO") {
          const currentInfo = this.getCurrentVideoInfo();
          sendResponse({
            type: "CURRENT_VIDEO_INFO",
            data: currentInfo
          });
          return true;
        }
      });
    }
    /**
     * 抓取视频数据
     */
    async scrapeVideoData() {
      console.log("[DEBUG] Content script 开始抓取视频数据");
      if (!window.location.hostname.includes("bilibili.com")) {
        throw new Error("请在Bilibili视频页面上使用此扩展");
      }
      await this.waitForPageLoad();
      const videoInfo = this.getVideoInfo();
      if (!videoInfo) {
        throw new Error("无法获取视频信息");
      }
      const playlist = await this.getPlaylist();
      const allVideos = [videoInfo, ...playlist];
      console.log(`[DEBUG] Content script 抓取完成，共 ${allVideos.length} 个视频`);
      return allVideos;
    }
    /**
     * 等待页面加载
     */
    async waitForPageLoad() {
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          window.addEventListener("load", () => resolve());
        }
      });
    }
    /**
     * 获取当前视频信息
     */
    getVideoInfo() {
      var _a2, _b2;
      try {
        const titleElement = document.querySelector("h1.video-title") || document.querySelector(".video-info-title") || document.querySelector("title");
        const title = titleElement ? (_a2 = titleElement.textContent) == null ? void 0 : _a2.trim() : "未知视频";
        const url = window.location.href;
        const bvMatch = url.match(/BV\w+/);
        const avMatch = url.match(/av(\d+)/);
        let videoId = "";
        if (bvMatch) {
          videoId = bvMatch[0];
        } else if (avMatch) {
          videoId = `av${avMatch[1]}`;
        } else {
          videoId = "unknown";
        }
        const durationElement = document.querySelector(".duration") || document.querySelector(".bpx-player-ctrl-time-duration");
        let duration = 0;
        if (durationElement) {
          const durationText = (_b2 = durationElement.textContent) == null ? void 0 : _b2.trim();
          duration = this.parseDuration(durationText || "");
        }
        return {
          id: videoId,
          name: title,
          url,
          stayTime: duration * 1e3
          // 转换为毫秒
        };
      } catch (error) {
        console.error("[ERROR] 获取当前视频信息失败:", error);
        return null;
      }
    }
    /**
     * 获取播放列表
     */
    async getPlaylist() {
      var _a2, _b2;
      try {
        const playlist = [];
        const playlistSelectors = [
          ".video-pod__item",
          // 新版播放列表
          ".pod-item",
          // 新版播放列表项
          ".list-item",
          // 旧版播放列表
          ".ep-item",
          // 番剧播放列表
          ".episode-item"
          // 其他播放列表格式
        ];
        let playlistElements = null;
        for (const selector of playlistSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            playlistElements = elements;
            console.log(`[DEBUG] 使用选择器 "${selector}" 找到 ${elements.length} 个播放列表项`);
            break;
          }
        }
        if (!playlistElements || playlistElements.length === 0) {
          console.log("[DEBUG] 未找到播放列表元素，尝试其他方法");
          const bvElements = document.querySelectorAll('[data-key*="BV"]');
          if (bvElements.length > 0) {
            playlistElements = bvElements;
            console.log(`[DEBUG] 通过BV号找到 ${bvElements.length} 个视频元素`);
          }
        }
        if (!playlistElements || playlistElements.length === 0) {
          console.log("[DEBUG] 未找到播放列表元素");
          return playlist;
        }
        console.log(`[DEBUG] 开始解析 ${playlistElements.length} 个播放列表项`);
        for (let i = 0; i < playlistElements.length; i++) {
          const element = playlistElements[i];
          try {
            let videoId = element.getAttribute("data-key") || "";
            if (!videoId) {
              const linkElement = element.querySelector("a");
              if (linkElement && linkElement.href) {
                const url2 = linkElement.href;
                const bvMatch = url2.match(/BV\w+/);
                const avMatch = url2.match(/av(\d+)/);
                if (bvMatch) {
                  videoId = bvMatch[0];
                } else if (avMatch) {
                  videoId = `av${avMatch[1]}`;
                }
              }
            }
            if (!videoId) {
              videoId = `video_${i + 1}`;
            }
            const titleSelectors = [
              ".title-txt",
              // 新版标题
              ".title",
              // 通用标题
              ".ep-title",
              // 番剧标题
              ".episode-title",
              // 其他标题
              "a[title]"
              // 链接的title属性
            ];
            let title = "";
            for (const selector of titleSelectors) {
              const titleElement = element.querySelector(selector);
              if (titleElement) {
                title = ((_a2 = titleElement.textContent) == null ? void 0 : _a2.trim()) || titleElement.getAttribute("title") || "";
                if (title) break;
              }
            }
            if (!title) {
              title = `视频 ${i + 1}`;
            }
            const durationSelectors = [
              ".duration",
              // 新版时长
              ".stat-item.duration",
              // 新版时长（带类名）
              ".ep-duration",
              // 番剧时长
              ".time",
              // 通用时长
              '[class*="duration"]'
              // 包含duration的类名
            ];
            let duration = 0;
            for (const selector of durationSelectors) {
              const durationElement = element.querySelector(selector);
              if (durationElement) {
                const durationText = (_b2 = durationElement.textContent) == null ? void 0 : _b2.trim();
                duration = this.parseDuration(durationText || "");
                if (duration > 0) break;
              }
            }
            let url = "";
            if (videoId.startsWith("BV")) {
              url = `https://www.bilibili.com/video/${videoId}`;
            } else if (videoId.startsWith("av")) {
              url = `https://www.bilibili.com/video/${videoId}`;
            } else {
              const linkElement = element.querySelector("a");
              if (linkElement && linkElement.href) {
                url = linkElement.href;
              }
            }
            if (!url) {
              console.log(`[DEBUG] 跳过第 ${i + 1} 个项目：无法获取URL`);
              continue;
            }
            playlist.push({
              id: videoId,
              name: title,
              url,
              stayTime: duration * 1e3
              // 转换为毫秒
            });
            console.log(`[DEBUG] 解析第 ${i + 1} 个视频: ${videoId} - ${title}`);
          } catch (error) {
            console.error(`[ERROR] 处理播放列表项 ${i + 1} 时出错:`, error);
            continue;
          }
        }
        console.log(`[DEBUG] 成功解析 ${playlist.length} 个播放列表项`);
        return playlist;
      } catch (error) {
        console.error("[ERROR] 获取播放列表失败:", error);
        return [];
      }
    }
    /**
     * 解析时长字符串
     */
    parseDuration(durationText) {
      try {
        if (!durationText) return 0;
        const cleanText = durationText.replace(/\s+/g, "");
        const timeMatch = cleanText.match(/(?:(\d+):)?(\d+):(\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]) || 0;
          const minutes = parseInt(timeMatch[2]) || 0;
          const seconds = parseInt(timeMatch[3]) || 0;
          return hours * 3600 + minutes * 60 + seconds;
        }
        const secondsMatch = cleanText.match(/^(\d+)$/);
        if (secondsMatch) {
          return parseInt(secondsMatch[1]);
        }
        return 0;
      } catch (error) {
        console.error("[ERROR] 解析时长失败:", error);
        return 0;
      }
    }
    /**
     * 获取当前播放视频的实时信息
     */
    getCurrentVideoInfo() {
      var _a2, _b2, _c;
      try {
        console.log("[DEBUG] Content script getCurrentVideoInfo 被调用");
        const currentTimeElement = document.querySelector(".bpx-player-ctrl-time-current");
        let currentTime = 0;
        if (currentTimeElement) {
          const currentTimeText = (_a2 = currentTimeElement.textContent) == null ? void 0 : _a2.trim();
          currentTime = this.parseDuration(currentTimeText || "");
          console.log("[DEBUG] Content script 当前播放时间元素:", currentTimeElement.textContent);
        } else {
          console.log("[DEBUG] Content script 未找到当前播放时间元素");
        }
        const totalTimeElement = document.querySelector(".bpx-player-ctrl-time-duration");
        let totalTime = 0;
        if (totalTimeElement) {
          const totalTimeText = (_b2 = totalTimeElement.textContent) == null ? void 0 : _b2.trim();
          totalTime = this.parseDuration(totalTimeText || "");
          console.log("[DEBUG] Content script 总时长元素:", totalTimeElement.textContent);
        } else {
          console.log("[DEBUG] Content script 未找到总时长元素");
        }
        const remainingTime = Math.max(0, totalTime - currentTime);
        console.log(`[DEBUG] Content script 时间计算: 当前=${currentTime}秒, 总时长=${totalTime}秒, 剩余=${remainingTime}秒`);
        const titleElement = document.querySelector("h1.video-title") || document.querySelector(".video-info-title") || document.querySelector("title");
        const title = titleElement ? (_c = titleElement.textContent) == null ? void 0 : _c.trim() : "未知视频";
        const url = window.location.href;
        const bvMatch = url.match(/BV\w+/);
        const avMatch = url.match(/av(\d+)/);
        let videoId = "";
        if (bvMatch) {
          videoId = bvMatch[0];
        } else if (avMatch) {
          videoId = `av${avMatch[1]}`;
        } else {
          videoId = "unknown";
        }
        const result2 = {
          id: videoId,
          name: title,
          url,
          currentTime,
          totalTime,
          remainingSeconds: remainingTime,
          // ← 这里是 remainingSeconds
          progress: totalTime > 0 ? currentTime / totalTime * 100 : 0
        };
        console.log("[DEBUG] Content script 返回视频信息:", result2);
        return result2;
      } catch (error) {
        console.error("[ERROR] 获取当前视频实时信息失败:", error);
        return null;
      }
    }
  }
  const definition = defineContentScript({
    matches: ["*://*.bilibili.com/*"],
    main() {
      console.log("[DEBUG] Content script 已加载");
      const videoScraper = new VideoDataScraper();
      window.videoScraper = videoScraper;
      console.log("[DEBUG] Content script 初始化完成");
    }
  });
  content;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a2.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
content;

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
      // 添加防抖相关属性
      __publicField(this, "lastResumeAttempt", 0);
      __publicField(this, "resumeAttemptCooldown", 3e3);
      // 3秒冷却时间
      __publicField(this, "consecutiveResumeAttempts", 0);
      __publicField(this, "maxConsecutiveAttempts", 3);
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
     * 检测并关闭登录弹窗
     */
    checkAndCloseLoginModal() {
      try {
        const loginModal = document.querySelector(".bili-mini-mask");
        if (loginModal) {
          console.log("[DEBUG] Content script 检测到登录弹窗");
          const closeButton = loginModal.querySelector(".bili-mini-close-icon");
          if (closeButton) {
            closeButton.click();
            console.log("[DEBUG] Content script 已关闭登录弹窗");
            return true;
          }
          const mask = loginModal.querySelector(".bili-mini-mask");
          if (mask) {
            mask.click();
            console.log("[DEBUG] Content script 通过遮罩层关闭登录弹窗");
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error("[ERROR] Content script 关闭登录弹窗失败:", error);
        return false;
      }
    }
    /**
     * 检测视频播放状态
     */
    checkVideoPlayingStatus() {
      try {
        const playButton = document.querySelector(".bpx-player-ctrl-play");
        const pauseButton = document.querySelector(".bpx-player-ctrl-pause");
        const videoElement = document.querySelector("video");
        let isPlaying = false;
        let isPaused = false;
        if (videoElement) {
          isPlaying = !videoElement.paused && !videoElement.ended && videoElement.readyState > 2;
          isPaused = videoElement.paused;
        }
        if (pauseButton && pauseButton.style.display !== "none") {
          isPlaying = true;
          isPaused = false;
        } else if (playButton && playButton.style.display !== "none") {
          isPlaying = false;
          isPaused = true;
        }
        console.log(`[DEBUG] Content script 播放状态: isPlaying=${isPlaying}, isPaused=${isPaused}`);
        return { isPlaying, isPaused };
      } catch (error) {
        console.error("[ERROR] Content script 检测播放状态失败:", error);
        return { isPlaying: false, isPaused: false };
      }
    }
    /**
     * 恢复视频播放（增强版 - 添加防抖机制）
     */
    resumeVideoPlayback() {
      try {
        const now = Date.now();
        if (now - this.lastResumeAttempt < this.resumeAttemptCooldown) {
          console.log("[DEBUG] Content script 恢复播放冷却中，跳过本次尝试");
          return false;
        }
        if (this.consecutiveResumeAttempts >= this.maxConsecutiveAttempts) {
          console.log("[DEBUG] Content script 连续恢复播放次数过多，暂停尝试");
          this.consecutiveResumeAttempts = 0;
          this.lastResumeAttempt = now + this.resumeAttemptCooldown;
          return false;
        }
        const videoElement = document.querySelector("video");
        const playButton = document.querySelector(".bpx-player-ctrl-play");
        if (videoElement) {
          if (!videoElement.paused && !videoElement.ended) {
            console.log("[DEBUG] Content script 视频已在播放，无需恢复");
            this.consecutiveResumeAttempts = 0;
            return false;
          }
          if (videoElement.paused) {
            videoElement.play().then(() => {
              console.log("[DEBUG] Content script 通过video元素恢复播放成功");
              this.lastResumeAttempt = now;
              this.consecutiveResumeAttempts++;
            }).catch((error) => {
              console.error("[ERROR] Content script video.play()失败:", error);
            });
            return true;
          }
        }
        if (playButton && playButton.style.display !== "none") {
          playButton.click();
          console.log("[DEBUG] Content script 通过播放按钮恢复播放");
          this.lastResumeAttempt = now;
          this.consecutiveResumeAttempts++;
          return true;
        }
        return false;
      } catch (error) {
        console.error("[ERROR] Content script 恢复播放失败:", error);
        return false;
      }
    }
    /**
     * 循环播放时的状态检测和处理（优化版）
     */
    handleLoopingStateCheck() {
      try {
        const modalClosed = this.checkAndCloseLoginModal();
        const playingStatus = this.checkVideoPlayingStatus();
        let resumeAttempted = false;
        if (playingStatus.isPaused) {
          const now = Date.now();
          const shouldAttemptResume = now - this.lastResumeAttempt >= this.resumeAttemptCooldown && this.consecutiveResumeAttempts < this.maxConsecutiveAttempts;
          if (shouldAttemptResume) {
            resumeAttempted = this.resumeVideoPlayback();
          } else {
            console.log("[DEBUG] Content script 跳过恢复播放（防抖保护）");
          }
        } else if (playingStatus.isPlaying) {
          this.consecutiveResumeAttempts = 0;
        }
        const currentVideoInfo = this.getCurrentVideoInfo();
        return {
          modalClosed,
          playingStatus,
          resumeAttempted,
          videoInfo: currentVideoInfo,
          timestamp: Date.now(),
          resumeStats: {
            lastAttempt: this.lastResumeAttempt,
            consecutiveAttempts: this.consecutiveResumeAttempts,
            cooldownRemaining: Math.max(0, this.resumeAttemptCooldown - (Date.now() - this.lastResumeAttempt))
          }
        };
      } catch (error) {
        console.error("[ERROR] Content script 循环状态检测失败:", error);
        return null;
      }
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
        if (message.type === "REQUEST_LOOPING_STATE_CHECK") {
          const stateInfo = this.handleLoopingStateCheck();
          sendResponse({
            type: "LOOPING_STATE_CHECK_RESULT",
            data: stateInfo
          });
          return true;
        }
      });
    }
    /**
     * 抓取视频数据（增强版）
     */
    async scrapeVideoData() {
      console.log("[DEBUG] ========== 开始抓取视频数据 ==========");
      if (!window.location.hostname.includes("bilibili.com")) {
        throw new Error("请在Bilibili视频页面上使用此扩展");
      }
      await this.waitForPageLoad();
      const currentVideoInfo = this.getVideoInfo();
      if (!currentVideoInfo) {
        throw new Error("无法获取当前视频信息");
      }
      const playlist = await this.getPlaylist();
      const filteredPlaylist = playlist.filter((video) => video.id !== currentVideoInfo.id);
      console.log(`[DEBUG] 过滤重复项后，播放列表剩余 ${filteredPlaylist.length} 个视频`);
      filteredPlaylist.forEach((video, index) => {
        video.originalIndex = index + 2;
      });
      currentVideoInfo.originalIndex = 1;
      const allVideos = [currentVideoInfo, ...filteredPlaylist];
      console.log(`[DEBUG] ========== 最终视频数据汇总 ==========`);
      console.log(`[DEBUG] 总共获取到 ${allVideos.length} 个视频`);
      console.table(allVideos.map((video) => ({
        "原始序号": video.originalIndex,
        "视频ID": video.id,
        "视频名称": video.name.length > 30 ? video.name.substring(0, 30) + "..." : video.name,
        "时长": video.duration,
        "状态": video.status,
        "播放时长": video.playedTime + "秒"
      })));
      console.log("[DEBUG] ========== 视频数据抓取完成 ==========");
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
     * 获取当前视频信息（增强版）
     */
    getVideoInfo() {
      var _a2, _b2, _c;
      try {
        console.log("[DEBUG] ========== 获取当前视频信息 ==========");
        const titleElement = document.querySelector("h1.video-title") || document.querySelector(".video-info-title") || document.querySelector("title");
        const title = titleElement ? (_a2 = titleElement.textContent) == null ? void 0 : _a2.trim() : "未知视频";
        console.log(`[DEBUG] 当前视频标题: ${title}`);
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
        console.log(`[DEBUG] 当前视频ID: ${videoId}`);
        const durationElement = document.querySelector(".bpx-player-ctrl-time-duration");
        let duration = 0;
        let durationText = "";
        if (durationElement) {
          durationText = ((_b2 = durationElement.textContent) == null ? void 0 : _b2.trim()) || "";
          duration = this.parseDuration(durationText);
        }
        console.log(`[DEBUG] 当前视频时长: ${durationText} (${duration}秒)`);
        const currentTimeElement = document.querySelector(".bpx-player-ctrl-time-current");
        let currentTime = 0;
        let currentTimeText = "";
        if (currentTimeElement) {
          currentTimeText = ((_c = currentTimeElement.textContent) == null ? void 0 : _c.trim()) || "";
          currentTime = this.parseDuration(currentTimeText);
        }
        console.log(`[DEBUG] 当前播放时间: ${currentTimeText} (${currentTime}秒)`);
        const videoData = {
          originalIndex: 0,
          // 当前视频的原始序号设为0
          id: videoId,
          // 视频ID
          name: title,
          // 视频名称
          duration: durationText,
          // 时长（原始文本）
          durationSeconds: duration,
          // 时长（秒数）
          status: "current",
          // 状态：当前播放
          playedTime: currentTime,
          // 播放时长（秒）
          url,
          // 视频URL
          stayTime: duration * 1e3
          // 停留时间（毫秒）
        };
        console.log("[DEBUG] 当前视频完整数据:", {
          "原始序号": videoData.originalIndex,
          "视频ID": videoData.id,
          "视频名称": videoData.name,
          "时长": videoData.duration,
          "时长秒数": videoData.durationSeconds,
          "状态": videoData.status,
          "播放时长": videoData.playedTime,
          "URL": videoData.url
        });
        return videoData;
      } catch (error) {
        console.error("[ERROR] 获取当前视频信息失败:", error);
        return null;
      }
    }
    /**
     * 获取播放列表（根据真实HTML结构优化）
     */
    async getPlaylist() {
      var _a2, _b2, _c;
      try {
        const playlist = [];
        console.log("[DEBUG] ========== 开始获取播放列表数据 ==========");
        const playlistContainer = document.querySelector(".video-pod__list.section");
        if (!playlistContainer) {
          console.log("[DEBUG] 未找到播放列表容器 .video-pod__list.section");
          return playlist;
        }
        const playlistElements = playlistContainer.querySelectorAll(".pod-item.video-pod__item");
        console.log(`[DEBUG] 找到 ${playlistElements.length} 个播放列表项`);
        if (playlistElements.length === 0) {
          console.log("[DEBUG] 播放列表为空");
          return playlist;
        }
        for (let i = 0; i < playlistElements.length; i++) {
          const element = playlistElements[i];
          try {
            console.log(`[DEBUG] ========== 解析第 ${i + 1} 个视频 ==========`);
            const originalIndex = i + 1;
            console.log(`[DEBUG] 原始序号: ${originalIndex}`);
            const videoId = element.getAttribute("data-key") || "";
            console.log(`[DEBUG] 视频ID: ${videoId}`);
            if (!videoId) {
              console.log(`[DEBUG] 第 ${originalIndex} 个视频缺少data-key属性，跳过`);
              continue;
            }
            const titleElement = element.querySelector(".title-txt");
            const videoName = titleElement ? ((_a2 = titleElement.textContent) == null ? void 0 : _a2.trim()) || "" : "";
            console.log(`[DEBUG] 视频名称: ${videoName}`);
            if (!videoName) {
              console.log(`[DEBUG] 第 ${originalIndex} 个视频缺少标题，跳过`);
              continue;
            }
            const durationElement = element.querySelector(".stat-item.duration");
            let durationText = "";
            let durationSeconds = 0;
            if (durationElement) {
              durationText = ((_b2 = durationElement.textContent) == null ? void 0 : _b2.trim()) || "";
              durationSeconds = this.parseDuration(durationText);
            }
            console.log(`[DEBUG] 时长文本: "${durationText}", 解析后秒数: ${durationSeconds}`);
            let status = "normal";
            const baseItem = element.querySelector(".simple-base-item");
            if (baseItem) {
              if (baseItem.classList.contains("active")) {
                status = "playing";
              } else if (baseItem.classList.contains("watched")) {
                status = "watched";
              }
            }
            const playingGif = element.querySelector(".playing-gif");
            if (playingGif) {
              const gifDisplay = window.getComputedStyle(playingGif).display;
              if (gifDisplay !== "none") {
                status = "playing";
              }
            }
            console.log(`[DEBUG] 视频状态: ${status}`);
            let playedTime = 0;
            if (status === "playing") {
              const currentTimeElement = document.querySelector(".bpx-player-ctrl-time-current");
              if (currentTimeElement) {
                const currentTimeText = ((_c = currentTimeElement.textContent) == null ? void 0 : _c.trim()) || "";
                playedTime = this.parseDuration(currentTimeText);
              }
            }
            console.log(`[DEBUG] 播放时长: ${playedTime}秒`);
            const videoUrl = `https://www.bilibili.com/video/${videoId}`;
            console.log(`[DEBUG] 视频URL: ${videoUrl}`);
            const videoData = {
              originalIndex,
              // 原始序号
              id: videoId,
              // 视频ID
              name: videoName,
              // 视频名称
              duration: durationText,
              // 时长（原始文本）
              durationSeconds,
              // 时长（秒数）
              status,
              // 状态
              playedTime,
              // 播放时长（秒）
              url: videoUrl,
              // 视频URL
              stayTime: durationSeconds * 1e3
              // 停留时间（毫秒，兼容原有逻辑）
            };
            playlist.push(videoData);
            console.log(`[DEBUG] 第 ${originalIndex} 个视频数据:`, {
              "原始序号": videoData.originalIndex,
              "视频ID": videoData.id,
              "视频名称": videoData.name,
              "时长": videoData.duration,
              "时长秒数": videoData.durationSeconds,
              "状态": videoData.status,
              "播放时长": videoData.playedTime,
              "URL": videoData.url
            });
          } catch (error) {
            console.error(`[ERROR] 处理第 ${i + 1} 个播放列表项时出错:`, error);
            continue;
          }
        }
        console.log(`[DEBUG] ========== 播放列表解析完成 ==========`);
        console.log(`[DEBUG] 总共解析了 ${playlist.length} 个有效视频`);
        console.log("[DEBUG] 最终播放列表数据:", playlist.map((video, index) => ({
          序号: index + 1,
          原始序号: video.originalIndex,
          视频ID: video.id,
          视频名称: video.name,
          时长: video.duration,
          状态: video.status,
          播放时长: video.playedTime + "秒"
        })));
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

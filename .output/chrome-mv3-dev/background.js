var background = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  class LoopManager {
    constructor() {
      __publicField(this, "videoData", []);
      __publicField(this, "currentIndex", 0);
      __publicField(this, "isLooping", false);
      __publicField(this, "countdownTime", 0);
      __publicField(this, "countdownStartTime", 0);
      __publicField(this, "countdownDuration", 0);
      __publicField(this, "randomRange", 5);
      // 新增：时间百分比属性
      __publicField(this, "timePercentage", 100);
      __publicField(this, "loopInterval", null);
      __publicField(this, "countdownInterval", null);
      __publicField(this, "progressInterval", null);
      __publicField(this, "loopCount", 0);
      __publicField(this, "currentLoopCount", 0);
      this.init();
    }
    /**
     * 初始化循环管理器
     */
    init() {
      this.loadState();
      this.setupMessageListener();
    }
    /**
     * 设置消息监听器
     */
    setupMessageListener() {
      browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("[DEBUG] Background 收到消息:", message);
        try {
          switch (message.type) {
            case "START_LOOP":
              this.startLoop(message.data);
              sendResponse({ success: true });
              break;
            case "STOP_LOOP":
              this.stopLoop();
              sendResponse({ success: true });
              break;
            case "UPDATE_DATA":
              this.updateVideoData(message.data);
              sendResponse({ success: true });
              break;
            case "SHUFFLE_DATA":
              this.shuffleVideoData();
              sendResponse({ success: true });
              break;
            case "GET_STATE":
              sendResponse(this.getState());
              break;
            case "UPDATE_RANDOM_RANGE":
              this.randomRange = message.randomRange;
              sendResponse({ success: true });
              break;
            default:
              sendResponse({ success: false, error: "Unknown message type" });
          }
        } catch (error) {
          console.error("[ERROR] Background 处理消息时出错:", error);
          sendResponse({ success: false, error: error.message });
        }
        return true;
      });
    }
    /**
     * 开始循环播放 - 支持时间百分比
     */
    startLoop(data) {
      console.log("[DEBUG] Background 开始循环播放，数据:", data);
      this.videoData = data.videoData || [];
      this.currentIndex = data.currentIndex || 0;
      this.randomRange = data.randomRange || 5;
      this.loopCount = data.loopCount || 0;
      this.timePercentage = data.timePercentage || 100;
      this.currentLoopCount = 0;
      if (this.videoData.length === 0) {
        return { success: false, message: "没有视频数据" };
      }
      this.isLooping = true;
      this.saveState();
      console.log(`[DEBUG] Background 循环参数: 随机范围=${this.randomRange}秒, 循环次数=${this.loopCount}, 时间百分比=${this.timePercentage}%`);
      this.playVideo();
      return { success: true, message: "循环播放已开始" };
    }
    /**
     * 处理视频进度逻辑（修改版 - 支持时间百分比）
     */
    async processVideoProgress(videoInfo) {
      const remainingSeconds = videoInfo.remainingSeconds || 0;
      const currentTime = videoInfo.currentTime || 0;
      const totalTime = videoInfo.totalTime || 0;
      console.log(`[DEBUG] Background 视频信息: 当前时间=${currentTime}秒, 总时长=${totalTime}秒, 剩余时间=${remainingSeconds}秒`);
      if (totalTime === 0) {
        console.log("[DEBUG] Background 视频总时长为0，跳过检查");
        return;
      }
      const currentVideo = this.videoData[this.currentIndex];
      const specifiedPlayTime = (currentVideo == null ? void 0 : currentVideo.videoTime) || 0;
      if (specifiedPlayTime > 0) {
        const adjustedPlayTime = Math.floor(specifiedPlayTime * (this.timePercentage / 100));
        const remainingSpecifiedTime = adjustedPlayTime - currentTime;
        console.log(`[DEBUG] Background 指定播放时长: ${specifiedPlayTime}秒, 调整后播放时长: ${adjustedPlayTime}秒 (${this.timePercentage}%), 剩余指定时长: ${remainingSpecifiedTime}秒`);
        if (remainingSpecifiedTime <= 0) {
          console.log(`[DEBUG] Background 达到调整后的指定播放时长，直接跳转到下一个视频`);
          if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
          }
          this.moveToNextVideo();
          return;
        }
      }
      let randomWaitTime = 1;
      if (this.randomRange > 0) {
        randomWaitTime = Math.max(1, Math.floor(Math.random() * this.randomRange) + 1);
      }
      const adjustedRandomWaitTime = Math.floor(randomWaitTime * (this.timePercentage / 100));
      const minPlayTime = 5;
      const actualRemainingTime = Math.max(remainingSeconds, minPlayTime);
      const adjustedRemainingTime = Math.floor(actualRemainingTime * (this.timePercentage / 100));
      console.log(`[DEBUG] Background 原始剩余时间: ${remainingSeconds}秒, 调整后剩余时间: ${adjustedRemainingTime}秒, 原始随机等待: ${randomWaitTime}秒, 调整后随机等待: ${adjustedRandomWaitTime}秒, 时间百分比: ${this.timePercentage}%`);
      if (adjustedRemainingTime - adjustedRandomWaitTime <= 0) {
        console.log(`[DEBUG] Background 视频即将结束（按百分比计算），准备跳转到下一个视频`);
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
        this.moveToNextVideo();
      } else {
        this.countdownTime = Math.max(0, adjustedRemainingTime - adjustedRandomWaitTime);
        this.saveState();
      }
    }
    /**
     * 获取当前状态 - 包含时间百分比
     */
    getState() {
      return {
        videoData: this.videoData,
        currentIndex: this.currentIndex,
        isLooping: this.isLooping,
        countdownTime: this.countdownTime,
        countdownStartTime: this.countdownStartTime,
        countdownDuration: this.countdownDuration,
        randomRange: this.randomRange,
        timePercentage: this.timePercentage,
        // 新增时间百分比状态
        loopCount: this.loopCount,
        currentLoopCount: this.currentLoopCount
      };
    }
    /**
     * 保存状态到storage - 包含时间百分比
     */
    async saveState() {
      const state = {
        videoData: this.videoData,
        currentIndex: this.currentIndex,
        isLooping: this.isLooping,
        randomRange: this.randomRange,
        timePercentage: this.timePercentage,
        // 新增时间百分比状态
        countdownStartTime: this.countdownStartTime,
        countdownDuration: this.countdownDuration,
        loopCount: this.loopCount,
        currentLoopCount: this.currentLoopCount,
        lastSaved: Date.now()
      };
      try {
        await browser.storage.local.set({ "bilibiliScraperState": state });
        console.log("[DEBUG] Background 状态已保存");
      } catch (error) {
        console.error("[ERROR] Background 保存状态异常:", error);
      }
    }
    /**
     * 从storage恢复状态 - 包含时间百分比
     */
    async loadState() {
      try {
        const result2 = await browser.storage.local.get(["bilibiliScraperState"]);
        if (result2.bilibiliScraperState) {
          const state = result2.bilibiliScraperState;
          this.videoData = state.videoData || [];
          this.currentIndex = state.currentIndex || 0;
          this.isLooping = state.isLooping || false;
          this.randomRange = state.randomRange || 5;
          this.timePercentage = state.timePercentage || 100;
          this.countdownStartTime = state.countdownStartTime || 0;
          this.countdownDuration = state.countdownDuration || 0;
          this.loopCount = state.loopCount || 0;
          this.currentLoopCount = state.currentLoopCount || 0;
          console.log("[DEBUG] Background 恢复状态:", state);
          this.countdownTime = 0;
          this.countdownStartTime = 0;
          this.countdownDuration = 0;
          if (this.isLooping && this.videoData.length > 0) {
            console.log("[DEBUG] Background 检测到之前的循环状态，继续循环");
            setTimeout(() => {
              this.playVideo();
            }, 1e3);
          }
        }
      } catch (error) {
        console.error("[ERROR] Background 加载状态失败:", error);
      }
    }
    /**
     * 播放视频
     */
    async playVideo() {
      if (!this.isLooping || this.videoData.length === 0) {
        console.log("[DEBUG] Background 循环已停止或无视频数据");
        return;
      }
      if (this.currentIndex >= this.videoData.length) {
        this.currentIndex = 0;
        console.log("[DEBUG] Background 索引重置，重新开始循环");
      }
      const currentVideo = this.videoData[this.currentIndex];
      console.log(`[DEBUG] Background 正在播放第 ${this.currentIndex + 1} 个视频: ${currentVideo.name}`);
      if (!currentVideo.url) {
        console.error(`[ERROR] 第 ${this.currentIndex + 1} 个视频没有有效的URL`);
        this.currentIndex++;
        setTimeout(() => this.playVideo(), 1e3);
        return;
      }
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await browser.tabs.update(tabs[0].id, { url: currentVideo.url });
          console.log(`[SUCCESS] Background 成功跳转到: ${currentVideo.name}`);
          this.saveState();
          setTimeout(() => {
            this.startVideoProgressMonitoring();
          }, 5e3);
        } else {
          console.error("[ERROR] 无法获取当前标签页");
          setTimeout(() => this.playVideo(), 2e3);
        }
      } catch (error) {
        console.error("[ERROR] 跳转失败:", error);
        this.currentIndex++;
        setTimeout(() => this.playVideo(), 2e3);
      }
    }
    /**
     * 开始监控视频播放进度
     */
    startVideoProgressMonitoring() {
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
      this.progressInterval = setInterval(() => {
        this.checkVideoProgress();
      }, 1e3);
    }
    /**
     * 检查视频进度（增强版 - 包含弹窗检测和播放状态检测）
     */
    async checkVideoProgress() {
      console.log("[DEBUG] Background checkVideoProgress 被调用");
      if (!this.isLooping) {
        console.log("[DEBUG] Background 循环未开启，停止检查");
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
        return;
      }
      console.log("[DEBUG] Background 开始检查视频进度");
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          console.log("[DEBUG] Background 发送消息到标签页:", tabs[0].id);
          const loopingStateResponse = await browser.tabs.sendMessage(tabs[0].id, {
            type: "REQUEST_LOOPING_STATE_CHECK"
          });
          if (loopingStateResponse && loopingStateResponse.type === "LOOPING_STATE_CHECK_RESULT") {
            const stateData = loopingStateResponse.data;
            if (stateData) {
              console.log("[DEBUG] Background 循环状态检测结果:", stateData);
              if (stateData.modalClosed) {
                console.log("[DEBUG] Background 检测到弹窗已被关闭");
              }
              if (stateData.playingStatus) {
                const { isPlaying, isPaused } = stateData.playingStatus;
                if (isPaused && stateData.resumeAttempted) {
                  console.log("[DEBUG] Background 检测到视频暂停，已尝试恢复播放");
                  await new Promise((resolve) => setTimeout(resolve, 1e3));
                }
                if (!isPlaying && !stateData.resumeAttempted) {
                  console.log("[DEBUG] Background 视频未在播放且未尝试恢复，跳过本次检查");
                  return;
                }
              }
              if (stateData.videoInfo) {
                await this.processVideoProgress(stateData.videoInfo);
              }
            }
          }
          if (!loopingStateResponse || !loopingStateResponse.data || !loopingStateResponse.data.videoInfo) {
            console.log("[DEBUG] Background 循环状态检测失败，使用备用方法获取视频信息");
            const response = await browser.tabs.sendMessage(tabs[0].id, { type: "REQUEST_CURRENT_VIDEO_INFO" });
            if (response && response.type === "CURRENT_VIDEO_INFO" && response.data) {
              await this.processVideoProgress(response.data);
            }
          }
        } else {
          console.log("[DEBUG] Background 未找到活动标签页");
        }
      } catch (error) {
        console.log("[DEBUG] Background 获取视频信息失败:", error);
      }
    }
    /**
     * 移动到下一个视频 - 使用while循环逻辑
     */
    moveToNextVideo() {
      this.currentIndex++;
      while (this.currentIndex >= this.videoData.length) {
        this.currentIndex = 0;
        this.currentLoopCount++;
        console.log(`[DEBUG] Background 完成第 ${this.currentLoopCount} 轮循环`);
        if (this.loopCount > 0 && this.currentLoopCount >= this.loopCount) {
          console.log(`[DEBUG] Background 达到指定循环次数 ${this.loopCount}，停止循环`);
          this.stopLoop();
          return;
        }
        console.log("[DEBUG] Background 索引重置，重新开始循环");
      }
      this.saveState();
      browser.runtime.sendMessage({
        type: "UPDATE_CURRENT_INDEX",
        data: { currentIndex: this.currentIndex }
      });
      setTimeout(() => this.playVideo(), 1e3);
    }
    /**
     * 清除定时器
     */
    clearTimers() {
      if (this.loopInterval) {
        clearTimeout(this.loopInterval);
        this.loopInterval = null;
      }
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
    }
  }
  const definition = defineBackground(() => {
    console.log("[DEBUG] Background script 已加载");
    new LoopManager();
    console.log("[DEBUG] Background script 初始化完成");
  });
  background;
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
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
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "http://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;

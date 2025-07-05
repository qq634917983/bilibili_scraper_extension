// Background script - 负责循环播放逻辑
console.log("[DEBUG] Background script 已加载");

// 循环播放管理器
class LoopManager {
    constructor() {
        this.videoData = [];
        this.currentIndex = 0;
        this.isLooping = false;
        this.countdownTime = 0;
        this.countdownStartTime = 0;
        this.countdownDuration = 0;
        this.randomRange = 5;
        this.loopInterval = null;
        this.countdownInterval = null;
        this.progressInterval = null;

        // 新增循环次数相关属性
        this.loopCount = 0; // 总循环次数，0表示无限循环
        this.currentLoopCount = 0; // 当前已完成的循环次数

        this.init();
    }

    init() {
        this.loadState();
        this.setupMessageListener();
    }

    // 设置消息监听器
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

    // 开始循环播放
    startLoop(data) {
        console.log("[DEBUG] Background 开始循环播放");

        if (data) {
            this.videoData = data.videoData || [];
            this.currentIndex = data.currentIndex || 0;
            this.randomRange = data.randomRange || 5;
            this.loopCount = data.loopCount || 0; // 设置循环次数
            this.currentLoopCount = 0; // 重置当前循环计数
        }

        if (this.videoData.length === 0) {
            console.log("[ERROR] 无视频数据可循环");
            return;
        }

        this.isLooping = true;
        this.currentIndex = 0;

        this.clearTimers();
        this.playVideo();
        this.saveState();
    }

    // 停止循环播放
    stopLoop() {
        console.log("[DEBUG] Background 停止循环播放");

        this.isLooping = false;
        this.clearTimers();
        this.countdownTime = 0;
        this.countdownStartTime = 0;
        this.countdownDuration = 0;

        this.saveState();
    }

    // 更新视频数据
    updateVideoData(data) {
        this.videoData = data.videoData || [];
        this.currentIndex = data.currentIndex || 0;
        this.isLooping = data.isLooping || false;
        this.randomRange = data.randomRange || 5;

        console.log("[DEBUG] Background 更新视频数据，数量:", this.videoData.length);
        this.saveState();
    }

    // 乱序排列视频数据
    shuffleVideoData() {
        if (this.videoData.length === 0) {
            console.log("[ERROR] 无视频数据可乱序");
            return;
        }

        console.log("[DEBUG] Background 开始乱序排列");

        // 使用Fisher-Yates洗牌算法
        const shuffledData = [...this.videoData];
        for (let i = shuffledData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledData[i], shuffledData[j]] = [shuffledData[j], shuffledData[i]];
        }

        this.videoData = shuffledData;

        // 如果正在循环，重置索引并重新开始
        if (this.isLooping) {
            this.currentIndex = 0;
            this.clearTimers();

            setTimeout(() => {
                this.playVideo();
            }, 1000);
        }

        console.log("[DEBUG] Background 乱序排列完成");
        this.saveState();
    }

    // 播放视频
    playVideo() {
        if (!this.isLooping || this.videoData.length === 0) {
            console.log("[DEBUG] Background 循环已停止或无视频数据");
            return;
        }

        // 检查索引边界
        if (this.currentIndex >= this.videoData.length) {
            this.currentIndex = 0;
            console.log("[DEBUG] Background 索引重置，重新开始循环");
        }

        const currentVideo = this.videoData[this.currentIndex];
        console.log(`[DEBUG] Background 正在播放第 ${this.currentIndex + 1} 个视频: ${currentVideo.name}`);

        // 检查URL是否有效
        if (!currentVideo.url) {
            console.error(`[ERROR] 第 ${this.currentIndex + 1} 个视频没有有效的URL`);
            this.currentIndex++;
            setTimeout(() => this.playVideo(), 1000);
            return;
        }

        // 跳转到视频
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.update(tabs[0].id, { url: currentVideo.url }, (tab) => {
                    if (chrome.runtime.lastError) {
                        console.error("[ERROR] 跳转失败:", chrome.runtime.lastError.message);
                        this.currentIndex++;
                        setTimeout(() => this.playVideo(), 2000);
                        return;
                    }

                    console.log(`[SUCCESS] Background 成功跳转到: ${currentVideo.name}`);

                    this.saveState();

                    // 延迟5秒后开始监控视频播放进度，确保视频加载完成
                    setTimeout(() => {
                        this.startVideoProgressMonitoring();
                    }, 5000);
                });
            } else {
                console.error("[ERROR] 无法获取当前标签页");
                setTimeout(() => this.playVideo(), 2000);
            }
        });
    }

    // 开始监控视频播放进度
    startVideoProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        this.progressInterval = setInterval(() => {
            this.checkVideoProgress();
        }, 1000); // 每秒检查一次
    }

    // 检查视频播放进度
    checkVideoProgress() {
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

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                console.log("[DEBUG] Background 发送消息到标签页:", tabs[0].id);
                chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_CURRENT_VIDEO_INFO" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("[DEBUG] Background 获取视频信息失败:", chrome.runtime.lastError.message);
                        return; // 静默处理错误
                    }

                    console.log("[DEBUG] Background 收到响应:", response);

                    if (response && response.type === "CURRENT_VIDEO_INFO" && response.data) {
                        const videoInfo = response.data;
                        const remainingSeconds = videoInfo.remainingSeconds || 0;
                        const currentTime = videoInfo.currentTime || 0;
                        const totalTime = videoInfo.totalTime || 0;

                        console.log(`[DEBUG] Background 视频信息: 当前时间=${currentTime}秒, 总时长=${totalTime}秒, 剩余时间=${remainingSeconds}秒`);

                        // 检查数据有效性
                        if (totalTime === 0) {
                            console.log("[DEBUG] Background 视频总时长为0，跳过检查");
                            return;
                        }

                        // 获取当前视频的指定播放时长
                        const currentVideo = this.videoData[this.currentIndex];
                        const specifiedPlayTime = currentVideo?.videoTime || 0;
                        
                        // 新增判断：如果设置了指定播放时长，检查是否达到指定时长
                        if (specifiedPlayTime > 0) {
                            const remainingSpecifiedTime = specifiedPlayTime - currentTime;
                            console.log(`[DEBUG] Background 指定播放时长: ${specifiedPlayTime}秒, 剩余指定时长: ${remainingSpecifiedTime}秒`);
                            
                            if (remainingSpecifiedTime <= 0) {
                                console.log(`[DEBUG] Background 达到指定播放时长，直接跳转到下一个视频`);
                                
                                // 清除进度监控
                                if (this.progressInterval) {
                                    clearInterval(this.progressInterval);
                                    this.progressInterval = null;
                                }
                                
                                // 跳转到下一个视频
                                this.moveToNextVideo();
                                return;
                            }
                        }

                        // 计算随机等待时间，确保至少等待1秒
                        let randomWaitTime = 1; // 最小等待时间
                        if (this.randomRange > 0) {
                            randomWaitTime = Math.max(1, Math.floor(Math.random() * this.randomRange) + 1);
                        }

                        // 添加最短间隔保护：至少播放5秒
                        const minPlayTime = 5;
                        const actualRemainingTime = Math.max(remainingSeconds, minPlayTime);

                        console.log(`[DEBUG] Background 视频剩余时间: ${remainingSeconds}秒, 随机等待: ${randomWaitTime}秒, 实际剩余: ${actualRemainingTime}秒`);

                        // 判断是否应该跳转：实际剩余时间 - 随机等待时间 <= 0
                        if (actualRemainingTime - randomWaitTime <= 0) {
                            console.log(`[DEBUG] Background 视频即将结束，准备跳转到下一个视频`);

                            // 清除进度监控
                            if (this.progressInterval) {
                                clearInterval(this.progressInterval);
                                this.progressInterval = null;
                            }

                            // 跳转到下一个视频 - 使用while循环逻辑
                            this.moveToNextVideo();
                        } else {
                            // 更新倒计时显示
                            this.countdownTime = Math.max(0, actualRemainingTime - randomWaitTime);
                            this.saveState();
                        }
                    } else {
                        console.log("[DEBUG] Background 未收到有效的视频信息");
                    }
                });
            } else {
                console.log("[DEBUG] Background 未找到活动标签页");
            }
        });
    }

    // 移动到下一个视频 - 使用while循环逻辑
    moveToNextVideo() {
        // 索引递增
        this.currentIndex++;
        
        // 检查是否需要重置循环（while循环的边界条件）
        while (this.currentIndex >= this.videoData.length) {
            this.currentIndex = 0;
            this.currentLoopCount++; // 完成一轮循环
            
            console.log(`[DEBUG] Background 完成第 ${this.currentLoopCount} 轮循环`);
            
            // 检查是否达到指定循环次数
            if (this.loopCount > 0 && this.currentLoopCount >= this.loopCount) {
                console.log(`[DEBUG] Background 达到指定循环次数 ${this.loopCount}，停止循环`);
                this.stopLoop();
                return;
            }
            
            console.log("[DEBUG] Background 索引重置，重新开始循环");
        }
        
        this.saveState();
        
        // 通知popup更新高亮
        chrome.runtime.sendMessage({
            type: "UPDATE_CURRENT_INDEX",
            data: { currentIndex: this.currentIndex }
        });
        
        // 播放下一个视频
        setTimeout(() => this.playVideo(), 1000);
    }

    // 清除定时器
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

    // 获取当前状态
    getState() {
        return {
            videoData: this.videoData,
            currentIndex: this.currentIndex,
            isLooping: this.isLooping,
            countdownTime: this.countdownTime,
            countdownStartTime: this.countdownStartTime,
            countdownDuration: this.countdownDuration,
            randomRange: this.randomRange,
            loopCount: this.loopCount,
            currentLoopCount: this.currentLoopCount
        };
    }

    // 保存状态到chrome.storage
    saveState() {
        const state = {
            videoData: this.videoData,
            currentIndex: this.currentIndex,
            isLooping: this.isLooping,
            randomRange: this.randomRange,
            countdownStartTime: this.countdownStartTime,
            countdownDuration: this.countdownDuration,
            loopCount: this.loopCount,
            currentLoopCount: this.currentLoopCount,
            lastSaved: Date.now()
        };

        try {
            chrome.storage.local.set({ 'bilibiliScraperState': state }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[ERROR] Background 保存状态失败:', chrome.runtime.lastError.message);
                } else {
                    console.log('[DEBUG] Background 状态已保存');
                }
            });
        } catch (error) {
            console.error('[ERROR] Background 保存状态异常:', error);
        }
    }

    // 从chrome.storage恢复状态
    loadState() {
        chrome.storage.local.get(['bilibiliScraperState'], (result) => {
            if (result.bilibiliScraperState) {
                const state = result.bilibiliScraperState;
                this.videoData = state.videoData || [];
                this.currentIndex = state.currentIndex || 0;
                this.isLooping = state.isLooping || false;
                this.randomRange = state.randomRange || 5;
                this.countdownStartTime = state.countdownStartTime || 0;
                this.countdownDuration = state.countdownDuration || 0;
                this.loopCount = state.loopCount || 0;
                this.currentLoopCount = state.currentLoopCount || 0;
                console.log("[DEBUG] Background 恢复状态:", state);

                this.videoData = state.videoData || [];
                this.currentIndex = state.currentIndex || 0;
                this.isLooping = state.isLooping || false;
                this.randomRange = parseInt(state.randomRange) || 5;

                // 重置倒计时相关状态（新逻辑不需要这些）
                this.countdownTime = 0;
                this.countdownStartTime = 0;
                this.countdownDuration = 0;

                // 如果之前正在循环，继续循环
                if (this.isLooping && this.videoData.length > 0) {
                    console.log("[DEBUG] Background 检测到之前的循环状态，继续循环");
                    setTimeout(() => {
                        this.playVideo();
                    }, 1000);
                }
            }
        });
    }
}

// 初始化循环管理器
const loopManager = new LoopManager();

console.log("[DEBUG] Background script 初始化完成");
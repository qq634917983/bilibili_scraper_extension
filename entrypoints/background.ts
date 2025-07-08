/**
 * Bilibili视频循环播放器 - 后台脚本
 * 负责循环播放逻辑的核心功能
 */

// 循环播放管理器类
class LoopManager {
  private videoData: any[] = [];
  private currentIndex: number = 0;
  private isLooping: boolean = false;
  private countdownTime: number = 0;
  private countdownStartTime: number = 0;
  private countdownDuration: number = 0;
  private randomRange: number = 5;
  // 新增：时间百分比属性
  private timePercentage: number = 100;
  private loopInterval: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;
  private progressInterval: NodeJS.Timeout | null = null;
  private loopCount: number = 0;
  private currentLoopCount: number = 0;

  constructor() {
    this.init();
  }

  /**
   * 初始化循环管理器
   */
  private init(): void {
    this.loadState();
    this.setupMessageListener();
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[DEBUG] Background 收到消息:', message);

      try {
        switch (message.type) {
          case 'START_LOOP':
            this.startLoop(message.data);
            sendResponse({ success: true });
            break;

          case 'STOP_LOOP':
            this.stopLoop();
            sendResponse({ success: true });
            break;

          case 'UPDATE_DATA':
            this.updateVideoData(message.data);
            sendResponse({ success: true });
            break;

          case 'SHUFFLE_DATA':
            this.shuffleVideoData();
            sendResponse({ success: true });
            break;

          case 'GET_STATE':
            sendResponse(this.getState());
            break;

          case 'UPDATE_RANDOM_RANGE':
            this.randomRange = message.randomRange;
            sendResponse({ success: true });
            break;

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('[ERROR] Background 处理消息时出错:', error);
        sendResponse({ success: false, error: (error as Error).message });
      }

      return true;
    });
  }

  /**
   * 开始循环播放 - 支持时间百分比
   */
  private startLoop(data: any): any {
    console.log('[DEBUG] Background 开始循环播放，数据:', data);
    
    this.videoData = data.videoData || [];
    this.currentIndex = data.currentIndex || 0;
    this.randomRange = data.randomRange || 5;
    this.loopCount = data.loopCount || 0;
    this.timePercentage = data.timePercentage || 100; // 新增时间百分比
    this.currentLoopCount = 0;
    
    if (this.videoData.length === 0) {
      return { success: false, message: '没有视频数据' };
    }
    
    this.isLooping = true;
    this.saveState();
    
    console.log(`[DEBUG] Background 循环参数: 随机范围=${this.randomRange}秒, 循环次数=${this.loopCount}, 时间百分比=${this.timePercentage}%`);
    
    // 开始播放当前视频
    this.playVideo();
    
    return { success: true, message: '循环播放已开始' };
  }

  /**
   * 处理视频进度逻辑（修改版 - 支持时间百分比）
   */
  private async processVideoProgress(videoInfo: any): Promise<void> {
    const remainingSeconds = videoInfo.remainingSeconds || 0;
    const currentTime = videoInfo.currentTime || 0;
    const totalTime = videoInfo.totalTime || 0;

    console.log(`[DEBUG] Background 视频信息: 当前时间=${currentTime}秒, 总时长=${totalTime}秒, 剩余时间=${remainingSeconds}秒`);

    // 检查数据有效性
    if (totalTime === 0) {
      console.log('[DEBUG] Background 视频总时长为0，跳过检查');
      return;
    }

    // 获取当前视频的指定播放时长
    const currentVideo = this.videoData[this.currentIndex];
    const specifiedPlayTime = currentVideo?.videoTime || 0;
    
    // 新增判断：如果设置了指定播放时长，检查是否达到指定时长
    if (specifiedPlayTime > 0) {
      // 应用时间百分比到指定播放时长
      const adjustedPlayTime = Math.floor(specifiedPlayTime * (this.timePercentage / 100));
      const remainingSpecifiedTime = adjustedPlayTime - currentTime;
      console.log(`[DEBUG] Background 指定播放时长: ${specifiedPlayTime}秒, 调整后播放时长: ${adjustedPlayTime}秒 (${this.timePercentage}%), 剩余指定时长: ${remainingSpecifiedTime}秒`);
      
      if (remainingSpecifiedTime <= 0) {
        console.log(`[DEBUG] Background 达到调整后的指定播放时长，直接跳转到下一个视频`);
        
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

    // 应用时间百分比到随机等待时间
    const adjustedRandomWaitTime = Math.floor(randomWaitTime * (this.timePercentage / 100));
    
    // 添加最短间隔保护：至少播放5秒
    const minPlayTime = 5;
    const actualRemainingTime = Math.max(remainingSeconds, minPlayTime);
    
    // 应用时间百分比到实际剩余时间
    const adjustedRemainingTime = Math.floor(actualRemainingTime * (this.timePercentage / 100));

    console.log(`[DEBUG] Background 原始剩余时间: ${remainingSeconds}秒, 调整后剩余时间: ${adjustedRemainingTime}秒, 原始随机等待: ${randomWaitTime}秒, 调整后随机等待: ${adjustedRandomWaitTime}秒, 时间百分比: ${this.timePercentage}%`);

    // 判断是否应该跳转：调整后的剩余时间 - 调整后的随机等待时间 <= 0
    if (adjustedRemainingTime - adjustedRandomWaitTime <= 0) {
      console.log(`[DEBUG] Background 视频即将结束（按百分比计算），准备跳转到下一个视频`);

      // 清除进度监控
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }

      // 跳转到下一个视频
      this.moveToNextVideo();
    } else {
      // 更新倒计时显示（使用调整后的时间）
      this.countdownTime = Math.max(0, adjustedRemainingTime - adjustedRandomWaitTime);
      this.saveState();
    }
  }

  /**
   * 获取当前状态 - 包含时间百分比
   */
  private getState(): any {
    return {
      videoData: this.videoData,
      currentIndex: this.currentIndex,
      isLooping: this.isLooping,
      countdownTime: this.countdownTime,
      countdownStartTime: this.countdownStartTime,
      countdownDuration: this.countdownDuration,
      randomRange: this.randomRange,
      timePercentage: this.timePercentage, // 新增时间百分比状态
      loopCount: this.loopCount,
      currentLoopCount: this.currentLoopCount
    };
  }

  /**
   * 保存状态到storage - 包含时间百分比
   */
  private async saveState(): Promise<void> {
    const state = {
      videoData: this.videoData,
      currentIndex: this.currentIndex,
      isLooping: this.isLooping,
      randomRange: this.randomRange,
      timePercentage: this.timePercentage, // 新增时间百分比状态
      countdownStartTime: this.countdownStartTime,
      countdownDuration: this.countdownDuration,
      loopCount: this.loopCount,
      currentLoopCount: this.currentLoopCount,
      lastSaved: Date.now()
    };

    try {
      await browser.storage.local.set({ 'bilibiliScraperState': state });
      console.log('[DEBUG] Background 状态已保存');
    } catch (error) {
      console.error('[ERROR] Background 保存状态异常:', error);
    }
  }

  /**
   * 从storage恢复状态 - 包含时间百分比
   */
  private async loadState(): Promise<void> {
    try {
      const result = await browser.storage.local.get(['bilibiliScraperState']);
      if (result.bilibiliScraperState) {
        const state = result.bilibiliScraperState;
        this.videoData = state.videoData || [];
        this.currentIndex = state.currentIndex || 0;
        this.isLooping = state.isLooping || false;
        this.randomRange = state.randomRange || 5;
        this.timePercentage = state.timePercentage || 100; // 新增时间百分比状态恢复
        this.countdownStartTime = state.countdownStartTime || 0;
        this.countdownDuration = state.countdownDuration || 0;
        this.loopCount = state.loopCount || 0;
        this.currentLoopCount = state.currentLoopCount || 0;
        console.log('[DEBUG] Background 恢复状态:', state);

        // 重置倒计时相关状态（新逻辑不需要这些）
        this.countdownTime = 0;
        this.countdownStartTime = 0;
        this.countdownDuration = 0;

        // 如果之前正在循环，继续循环
        if (this.isLooping && this.videoData.length > 0) {
          console.log('[DEBUG] Background 检测到之前的循环状态，继续循环');
          setTimeout(() => {
            this.playVideo();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('[ERROR] Background 加载状态失败:', error);
    }
  }

  /**
   * 播放视频
   */
  private async playVideo(): Promise<void> {
    if (!this.isLooping || this.videoData.length === 0) {
      console.log('[DEBUG] Background 循环已停止或无视频数据');
      return;
    }

    // 检查索引边界
    if (this.currentIndex >= this.videoData.length) {
      this.currentIndex = 0;
      console.log('[DEBUG] Background 索引重置，重新开始循环');
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

    try {
      // 跳转到视频
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await browser.tabs.update(tabs[0].id!, { url: currentVideo.url });
        console.log(`[SUCCESS] Background 成功跳转到: ${currentVideo.name}`);

        this.saveState();

        // 延迟5秒后开始监控视频播放进度，确保视频加载完成
        setTimeout(() => {
          this.startVideoProgressMonitoring();
        }, 5000);
      } else {
        console.error('[ERROR] 无法获取当前标签页');
        setTimeout(() => this.playVideo(), 2000);
      }
    } catch (error) {
      console.error('[ERROR] 跳转失败:', error);
      this.currentIndex++;
      setTimeout(() => this.playVideo(), 2000);
    }
  }

  /**
   * 开始监控视频播放进度
   */
  private startVideoProgressMonitoring(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      this.checkVideoProgress();
    }, 1000); // 每秒检查一次
  }

  /**
   * 检查视频进度（增强版 - 包含弹窗检测和播放状态检测）
   */
  private async checkVideoProgress(): Promise<void> {
    console.log('[DEBUG] Background checkVideoProgress 被调用');

    if (!this.isLooping) {
      console.log('[DEBUG] Background 循环未开启，停止检查');
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
      return;
    }

    console.log('[DEBUG] Background 开始检查视频进度');

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        console.log('[DEBUG] Background 发送消息到标签页:', tabs[0].id);
        
        // 1. 首先进行循环状态检测（包含弹窗检测和播放状态检测）
        const loopingStateResponse = await browser.tabs.sendMessage(tabs[0].id!, { 
          type: 'REQUEST_LOOPING_STATE_CHECK' 
        });
        
        if (loopingStateResponse && loopingStateResponse.type === 'LOOPING_STATE_CHECK_RESULT') {
          const stateData = loopingStateResponse.data;
          
          if (stateData) {
            console.log('[DEBUG] Background 循环状态检测结果:', stateData);
            
            // 处理弹窗关闭结果
            if (stateData.modalClosed) {
              console.log('[DEBUG] Background 检测到弹窗已被关闭');
            }
            
            // 处理播放状态
            if (stateData.playingStatus) {
              const { isPlaying, isPaused } = stateData.playingStatus;
              
              if (isPaused && stateData.resumeAttempted) {
                console.log('[DEBUG] Background 检测到视频暂停，已尝试恢复播放');
                // 给恢复播放一些时间
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              if (!isPlaying && !stateData.resumeAttempted) {
                console.log('[DEBUG] Background 视频未在播放且未尝试恢复，跳过本次检查');
                return;
              }
            }
            
            // 使用状态检测中获取的视频信息
            if (stateData.videoInfo) {
              await this.processVideoProgress(stateData.videoInfo);
            }
          }
        }
        
        // 2. 如果循环状态检测失败，回退到原有的视频信息获取方式
        if (!loopingStateResponse || !loopingStateResponse.data || !loopingStateResponse.data.videoInfo) {
          console.log('[DEBUG] Background 循环状态检测失败，使用备用方法获取视频信息');
          const response = await browser.tabs.sendMessage(tabs[0].id!, { type: 'REQUEST_CURRENT_VIDEO_INFO' });
          
          if (response && response.type === 'CURRENT_VIDEO_INFO' && response.data) {
            await this.processVideoProgress(response.data);
          }
        }
        
      } else {
        console.log('[DEBUG] Background 未找到活动标签页');
      }
    } catch (error) {
      console.log('[DEBUG] Background 获取视频信息失败:', error);
    }
  }

  /**
   * 移动到下一个视频 - 使用while循环逻辑
   */
  private moveToNextVideo(): void {
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
      
      console.log('[DEBUG] Background 索引重置，重新开始循环');
    }
    
    this.saveState();
    
    // 通知popup更新高亮
    browser.runtime.sendMessage({
      type: 'UPDATE_CURRENT_INDEX',
      data: { currentIndex: this.currentIndex }
    });
    
    // 播放下一个视频
    setTimeout(() => this.playVideo(), 1000);
  }

  /**
   * 清除定时器
   */
  private clearTimers(): void {
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

export default defineBackground(() => {
  console.log('[DEBUG] Background script 已加载');
  
  // 初始化循环管理器
  const loopManager = new LoopManager();
  
  console.log('[DEBUG] Background script 初始化完成');
});

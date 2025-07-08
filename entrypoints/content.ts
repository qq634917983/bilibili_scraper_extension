/**
 * Bilibili视频数据抓取器 - 内容脚本
 * 负责从Bilibili页面抓取视频数据
 */

// 视频数据抓取器类
class VideoDataScraper {
  // 添加防抖相关属性
  private lastResumeAttempt: number = 0;
  private resumeAttemptCooldown: number = 3000; // 3秒冷却时间
  private consecutiveResumeAttempts: number = 0;
  private maxConsecutiveAttempts: number = 3;
  constructor() {
    this.init();
  }
  
  /**
   * 初始化抓取器
   */
  private init(): void {
    this.setupMessageListener();
    console.log('[DEBUG] Content script 初始化完成');
  }
  
  /**
   * 检测并关闭登录弹窗
   */
  private checkAndCloseLoginModal(): boolean {
    try {
      // 检测登录弹窗
      const loginModal = document.querySelector('.bili-mini-mask');
      if (loginModal) {
        console.log('[DEBUG] Content script 检测到登录弹窗');
        
        // 查找关闭按钮
        const closeButton = loginModal.querySelector('.bili-mini-close-icon');
        if (closeButton) {
          (closeButton as HTMLElement).click();
          console.log('[DEBUG] Content script 已关闭登录弹窗');
          return true;
        }
        
        // 如果没有找到关闭按钮，尝试点击遮罩层关闭
        const mask = loginModal.querySelector('.bili-mini-mask');
        if (mask) {
          (mask as HTMLElement).click();
          console.log('[DEBUG] Content script 通过遮罩层关闭登录弹窗');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[ERROR] Content script 关闭登录弹窗失败:', error);
      return false;
    }
  }

  /**
   * 检测视频播放状态
   */
  private checkVideoPlayingStatus(): { isPlaying: boolean; isPaused: boolean } {
    try {
      // 获取播放控制按钮（添加类型断言）
      const playButton = document.querySelector('.bpx-player-ctrl-play') as HTMLElement;
      const pauseButton = document.querySelector('.bpx-player-ctrl-pause') as HTMLElement;
      
      // 检查视频元素的播放状态
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      
      let isPlaying = false;
      let isPaused = false;
      
      if (videoElement) {
        isPlaying = !videoElement.paused && !videoElement.ended && videoElement.readyState > 2;
        isPaused = videoElement.paused;
      }
      
      // 通过按钮状态辅助判断
      if (pauseButton && pauseButton.style.display !== 'none') {
        isPlaying = true;
        isPaused = false;
      } else if (playButton && playButton.style.display !== 'none') {
        isPlaying = false;
        isPaused = true;
      }
      
      console.log(`[DEBUG] Content script 播放状态: isPlaying=${isPlaying}, isPaused=${isPaused}`);
      
      return { isPlaying, isPaused };
    } catch (error) {
      console.error('[ERROR] Content script 检测播放状态失败:', error);
      return { isPlaying: false, isPaused: false };
    }
  }

  /**
   * 恢复视频播放（增强版 - 添加防抖机制）
   */
  private resumeVideoPlayback(): boolean {
    try {
      const now = Date.now();
      
      // 检查冷却时间
      if (now - this.lastResumeAttempt < this.resumeAttemptCooldown) {
        console.log('[DEBUG] Content script 恢复播放冷却中，跳过本次尝试');
        return false;
      }
      
      // 检查连续尝试次数
      if (this.consecutiveResumeAttempts >= this.maxConsecutiveAttempts) {
        console.log('[DEBUG] Content script 连续恢复播放次数过多，暂停尝试');
        // 重置计数器，但延长冷却时间
        this.consecutiveResumeAttempts = 0;
        this.lastResumeAttempt = now + this.resumeAttemptCooldown;
        return false;
      }
      
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      const playButton = document.querySelector('.bpx-player-ctrl-play') as HTMLElement;
      
      // 先检查视频元素状态
      if (videoElement) {
        // 如果视频正在播放，不需要恢复
        if (!videoElement.paused && !videoElement.ended) {
          console.log('[DEBUG] Content script 视频已在播放，无需恢复');
          this.consecutiveResumeAttempts = 0; // 重置计数器
          return false;
        }
        
        // 尝试通过video元素恢复播放
        if (videoElement.paused) {
          videoElement.play().then(() => {
            console.log('[DEBUG] Content script 通过video元素恢复播放成功');
            this.lastResumeAttempt = now;
            this.consecutiveResumeAttempts++;
          }).catch(error => {
            console.error('[ERROR] Content script video.play()失败:', error);
          });
          return true;
        }
      }
      
      // 备用方案：通过播放按钮恢复
      if (playButton && playButton.style.display !== 'none') {
        playButton.click();
        console.log('[DEBUG] Content script 通过播放按钮恢复播放');
        this.lastResumeAttempt = now;
        this.consecutiveResumeAttempts++;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[ERROR] Content script 恢复播放失败:', error);
      return false;
    }
  }

  /**
   * 循环播放时的状态检测和处理（优化版）
   */
  private handleLoopingStateCheck(): any {
    try {
      // 1. 检测并关闭弹窗
      const modalClosed = this.checkAndCloseLoginModal();
      
      // 2. 检测播放状态
      const playingStatus = this.checkVideoPlayingStatus();
      
      // 3. 智能恢复播放逻辑
      let resumeAttempted = false;
      if (playingStatus.isPaused) {
        // 只有在确实需要且满足条件时才尝试恢复
        const now = Date.now();
        const shouldAttemptResume = (
          now - this.lastResumeAttempt >= this.resumeAttemptCooldown &&
          this.consecutiveResumeAttempts < this.maxConsecutiveAttempts
        );
        
        if (shouldAttemptResume) {
          resumeAttempted = this.resumeVideoPlayback();
        } else {
          console.log('[DEBUG] Content script 跳过恢复播放（防抖保护）');
        }
      } else if (playingStatus.isPlaying) {
        // 如果视频正在播放，重置恢复尝试计数器
        this.consecutiveResumeAttempts = 0;
      }
      
      // 4. 获取当前视频信息
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
      console.error('[ERROR] Content script 循环状态检测失败:', error);
      return null;
    }
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[DEBUG] Content script 收到消息:', message);
      
      if (message.type === 'REQUEST_SCRAPER_DATA') {
        this.scrapeVideoData().then(data => {
          sendResponse({
            type: 'BV_SCRAPER_DATA',
            data: data
          });
        }).catch(error => {
          console.error('[ERROR] Content script 抓取数据失败:', error);
          sendResponse({
            type: 'BV_SCRAPER_DATA',
            error: error.message
          });
        });
        
        return true;
      }
      
      if (message.type === 'REQUEST_CURRENT_VIDEO_INFO') {
        const currentInfo = this.getCurrentVideoInfo();
        sendResponse({
          type: 'CURRENT_VIDEO_INFO',
          data: currentInfo
        });
        
        return true;
      }
      
      // 新增：循环播放时的状态检测
      if (message.type === 'REQUEST_LOOPING_STATE_CHECK') {
        const stateInfo = this.handleLoopingStateCheck();
        sendResponse({
          type: 'LOOPING_STATE_CHECK_RESULT',
          data: stateInfo
        });
        
        return true;
      }
    });
  }
  
  /**
   * 抓取视频数据（增强版）
   */
  private async scrapeVideoData(): Promise<any[]> {
    console.log('[DEBUG] ========== 开始抓取视频数据 ==========');
    
    // 检查是否在Bilibili页面
    if (!window.location.hostname.includes('bilibili.com')) {
      throw new Error('请在Bilibili视频页面上使用此扩展');
    }
    
    // 等待页面加载完成
    await this.waitForPageLoad();
    
    // 获取当前视频信息
    const currentVideoInfo = this.getVideoInfo();
    if (!currentVideoInfo) {
      throw new Error('无法获取当前视频信息');
    }
    
    // 获取播放列表
    const playlist = await this.getPlaylist();
    
    // 过滤掉播放列表中与当前视频重复的项
    const filteredPlaylist = playlist.filter(video => video.id !== currentVideoInfo.id);
    console.log(`[DEBUG] 过滤重复项后，播放列表剩余 ${filteredPlaylist.length} 个视频`);
    
    // 为播放列表中的视频重新分配原始序号（从当前视频后开始）
    filteredPlaylist.forEach((video, index) => {
      video.originalIndex = index + 2; // 从2开始，因为当前视频是1
    });
    
    // 合并数据（当前视频放在第一位）
    currentVideoInfo.originalIndex = 1; // 当前视频的原始序号设为1
    const allVideos = [currentVideoInfo, ...filteredPlaylist];
    
    console.log(`[DEBUG] ========== 最终视频数据汇总 ==========`);
    console.log(`[DEBUG] 总共获取到 ${allVideos.length} 个视频`);
    
    // 打印最终的视频数据表格
    console.table(allVideos.map(video => ({
      '原始序号': video.originalIndex,
      '视频ID': video.id,
      '视频名称': video.name.length > 30 ? video.name.substring(0, 30) + '...' : video.name,
      '时长': video.duration,
      '状态': video.status,
      '播放时长': video.playedTime + '秒'
    })));
    
    console.log('[DEBUG] ========== 视频数据抓取完成 ==========');
    return allVideos;
  }
  
  /**
   * 等待页面加载
   */
  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  }
  
  /**
   * 获取当前视频信息（增强版）
   */
  private getVideoInfo(): any | null {
    try {
      console.log('[DEBUG] ========== 获取当前视频信息 ==========');
      
      // 获取视频标题
      const titleElement = document.querySelector('h1.video-title') || 
                         document.querySelector('.video-info-title') ||
                         document.querySelector('title');
      
      const title = titleElement ? titleElement.textContent?.trim() : '未知视频';
      console.log(`[DEBUG] 当前视频标题: ${title}`);
      
      // 获取视频ID
      const url = window.location.href;
      const bvMatch = url.match(/BV\w+/);
      const avMatch = url.match(/av(\d+)/);
      
      let videoId = '';
      if (bvMatch) {
        videoId = bvMatch[0];
      } else if (avMatch) {
        videoId = `av${avMatch[1]}`;
      } else {
        videoId = 'unknown';
      }
      console.log(`[DEBUG] 当前视频ID: ${videoId}`);
      
      // 获取视频总时长
      const durationElement = document.querySelector('.bpx-player-ctrl-time-duration');
      let duration = 0;
      let durationText = '';
      
      if (durationElement) {
        durationText = durationElement.textContent?.trim() || '';
        duration = this.parseDuration(durationText);
      }
      console.log(`[DEBUG] 当前视频时长: ${durationText} (${duration}秒)`);
      
      // 获取当前播放时间
      const currentTimeElement = document.querySelector('.bpx-player-ctrl-time-current');
      let currentTime = 0;
      let currentTimeText = '';
      
      if (currentTimeElement) {
        currentTimeText = currentTimeElement.textContent?.trim() || '';
        currentTime = this.parseDuration(currentTimeText);
      }
      console.log(`[DEBUG] 当前播放时间: ${currentTimeText} (${currentTime}秒)`);
      
      const videoData = {
        originalIndex: 0,                    // 当前视频的原始序号设为0
        id: videoId,                        // 视频ID
        name: title,                        // 视频名称
        duration: durationText,             // 时长（原始文本）
        durationSeconds: duration,          // 时长（秒数）
        status: 'current',                  // 状态：当前播放
        playedTime: currentTime,           // 播放时长（秒）
        url: url,                          // 视频URL
        stayTime: duration * 1000          // 停留时间（毫秒）
      };
      
      console.log('[DEBUG] 当前视频完整数据:', {
        '原始序号': videoData.originalIndex,
        '视频ID': videoData.id,
        '视频名称': videoData.name,
        '时长': videoData.duration,
        '时长秒数': videoData.durationSeconds,
        '状态': videoData.status,
        '播放时长': videoData.playedTime,
        'URL': videoData.url
      });
      
      return videoData;
      
    } catch (error) {
      console.error('[ERROR] 获取当前视频信息失败:', error);
      return null;
    }
  }
  
  /**
   * 获取播放列表（根据真实HTML结构优化）
   */
  private async getPlaylist(): Promise<any[]> {
    try {
      const playlist: any[] = [];
      
      console.log('[DEBUG] ========== 开始获取播放列表数据 ==========');
      
      // 根据用户提供的HTML结构，使用精确的选择器
      const playlistContainer = document.querySelector('.video-pod__list.section');
      if (!playlistContainer) {
        console.log('[DEBUG] 未找到播放列表容器 .video-pod__list.section');
        return playlist;
      }
      
      // 获取所有播放列表项
      const playlistElements = playlistContainer.querySelectorAll('.pod-item.video-pod__item');
      console.log(`[DEBUG] 找到 ${playlistElements.length} 个播放列表项`);
      
      if (playlistElements.length === 0) {
        console.log('[DEBUG] 播放列表为空');
        return playlist;
      }
      
      // 遍历播放列表项
      for (let i = 0; i < playlistElements.length; i++) {
        const element = playlistElements[i];
        
        try {
          console.log(`[DEBUG] ========== 解析第 ${i + 1} 个视频 ==========`);
          
          // 1. 获取原始序号（从1开始）
          const originalIndex = i + 1;
          console.log(`[DEBUG] 原始序号: ${originalIndex}`);
          
          // 2. 获取视频ID - 从data-key属性获取
          const videoId = element.getAttribute('data-key') || '';
          console.log(`[DEBUG] 视频ID: ${videoId}`);
          
          if (!videoId) {
            console.log(`[DEBUG] 第 ${originalIndex} 个视频缺少data-key属性，跳过`);
            continue;
          }
          
          // 3. 获取视频名称 - 从.title-txt元素获取
          const titleElement = element.querySelector('.title-txt');
          const videoName = titleElement ? titleElement.textContent?.trim() || '' : '';
          console.log(`[DEBUG] 视频名称: ${videoName}`);
          
          if (!videoName) {
            console.log(`[DEBUG] 第 ${originalIndex} 个视频缺少标题，跳过`);
            continue;
          }
          
          // 4. 获取时长 - 从.stat-item.duration元素获取
          const durationElement = element.querySelector('.stat-item.duration');
          let durationText = '';
          let durationSeconds = 0;
          
          if (durationElement) {
            durationText = durationElement.textContent?.trim() || '';
            durationSeconds = this.parseDuration(durationText);
          }
          console.log(`[DEBUG] 时长文本: "${durationText}", 解析后秒数: ${durationSeconds}`);
          
          // 5. 检测视频状态 - 根据CSS类判断
          let status = 'normal'; // 默认状态
          const baseItem = element.querySelector('.simple-base-item');
          
          if (baseItem) {
            if (baseItem.classList.contains('active')) {
              status = 'playing'; // 正在播放
            } else if (baseItem.classList.contains('watched')) {
              status = 'watched'; // 已观看
            }
          }
          
          // 检查播放gif显示状态
          const playingGif = element.querySelector('.playing-gif');
          if (playingGif) {
            const gifDisplay = window.getComputedStyle(playingGif).display;
            if (gifDisplay !== 'none') {
              status = 'playing';
            }
          }
          
          console.log(`[DEBUG] 视频状态: ${status}`);
          
          // 6. 获取播放时长（如果是当前播放的视频）
          let playedTime = 0;
          if (status === 'playing') {
            // 尝试获取当前播放时间
            const currentTimeElement = document.querySelector('.bpx-player-ctrl-time-current');
            if (currentTimeElement) {
              const currentTimeText = currentTimeElement.textContent?.trim() || '';
              playedTime = this.parseDuration(currentTimeText);
            }
          }
          console.log(`[DEBUG] 播放时长: ${playedTime}秒`);
          
          // 7. 构建视频URL
          const videoUrl = `https://www.bilibili.com/video/${videoId}`;
          console.log(`[DEBUG] 视频URL: ${videoUrl}`);
          
          // 8. 构建视频数据对象
          const videoData = {
            originalIndex: originalIndex,           // 原始序号
            id: videoId,                          // 视频ID
            name: videoName,                      // 视频名称
            duration: durationText,               // 时长（原始文本）
            durationSeconds: durationSeconds,     // 时长（秒数）
            status: status,                       // 状态
            playedTime: playedTime,              // 播放时长（秒）
            url: videoUrl,                       // 视频URL
            stayTime: durationSeconds * 1000     // 停留时间（毫秒，兼容原有逻辑）
          };
          
          playlist.push(videoData);
          
          // 9. 打印完整的视频数据
          console.log(`[DEBUG] 第 ${originalIndex} 个视频数据:`, {
            '原始序号': videoData.originalIndex,
            '视频ID': videoData.id,
            '视频名称': videoData.name,
            '时长': videoData.duration,
            '时长秒数': videoData.durationSeconds,
            '状态': videoData.status,
            '播放时长': videoData.playedTime,
            'URL': videoData.url
          });
          
        } catch (error) {
          console.error(`[ERROR] 处理第 ${i + 1} 个播放列表项时出错:`, error);
          continue;
        }
      }
      
      console.log(`[DEBUG] ========== 播放列表解析完成 ==========`);
      console.log(`[DEBUG] 总共解析了 ${playlist.length} 个有效视频`);
      
      // 打印最终的播放列表数据
      console.log('[DEBUG] 最终播放列表数据:', playlist.map((video, index) => ({
        序号: index + 1,
        原始序号: video.originalIndex,
        视频ID: video.id,
        视频名称: video.name,
        时长: video.duration,
        状态: video.status,
        播放时长: video.playedTime + '秒'
      })));
      
      return playlist;
      
    } catch (error) {
      console.error('[ERROR] 获取播放列表失败:', error);
      return [];
    }
  }
  
  /**
   * 解析时长字符串
   */
  private parseDuration(durationText: string): number {
    try {
      if (!durationText) return 0;
      
      // 移除空格和特殊字符
      const cleanText = durationText.replace(/\s+/g, '');
      
      // 匹配 HH:MM:SS 或 MM:SS 格式
      const timeMatch = cleanText.match(/(?:(\d+):)?(\d+):(\d+)/);
      
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]) || 0;
        const minutes = parseInt(timeMatch[2]) || 0;
        const seconds = parseInt(timeMatch[3]) || 0;
        
        return hours * 3600 + minutes * 60 + seconds;
      }
      
      // 尝试匹配纯数字（秒）
      const secondsMatch = cleanText.match(/^(\d+)$/);
      if (secondsMatch) {
        return parseInt(secondsMatch[1]);
      }
      
      return 0;
      
    } catch (error) {
      console.error('[ERROR] 解析时长失败:', error);
      return 0;
    }
  }
  
  /**
   * 获取当前播放视频的实时信息
   */
  private getCurrentVideoInfo(): any | null {
    try {
      console.log('[DEBUG] Content script getCurrentVideoInfo 被调用');
      
      // 获取当前播放时间
      const currentTimeElement = document.querySelector('.bpx-player-ctrl-time-current');
      let currentTime = 0;
      if (currentTimeElement) {
        const currentTimeText = currentTimeElement.textContent?.trim();
        currentTime = this.parseDuration(currentTimeText || '');
        console.log('[DEBUG] Content script 当前播放时间元素:', currentTimeElement.textContent);
      } else {
        console.log('[DEBUG] Content script 未找到当前播放时间元素');
      }
      
      // 获取总时长
      const totalTimeElement = document.querySelector('.bpx-player-ctrl-time-duration');
      let totalTime = 0;
      if (totalTimeElement) {
        const totalTimeText = totalTimeElement.textContent?.trim();
        totalTime = this.parseDuration(totalTimeText || '');
        console.log('[DEBUG] Content script 总时长元素:', totalTimeElement.textContent);
      } else {
        console.log('[DEBUG] Content script 未找到总时长元素');
      }
      
      // 计算剩余时间
      const remainingTime = Math.max(0, totalTime - currentTime);
      console.log(`[DEBUG] Content script 时间计算: 当前=${currentTime}秒, 总时长=${totalTime}秒, 剩余=${remainingTime}秒`);
      
      // 获取视频标题
      const titleElement = document.querySelector('h1.video-title') || 
                         document.querySelector('.video-info-title') ||
                         document.querySelector('title');
      const title = titleElement ? titleElement.textContent?.trim() : '未知视频';
      
      // 获取视频ID
      const url = window.location.href;
      const bvMatch = url.match(/BV\w+/);
      const avMatch = url.match(/av(\d+)/);
      
      let videoId = '';
      if (bvMatch) {
        videoId = bvMatch[0];
      } else if (avMatch) {
        videoId = `av${avMatch[1]}`;
      } else {
        videoId = 'unknown';
      }
      
      const result = {
        id: videoId,
        name: title,
        url: url,
        currentTime: currentTime,
        totalTime: totalTime,
        remainingSeconds: remainingTime,  // ← 这里是 remainingSeconds
        progress: totalTime > 0 ? (currentTime / totalTime) * 100 : 0
      };
      
      console.log('[DEBUG] Content script 返回视频信息:', result);
      return result;
      
    } catch (error) {
      console.error('[ERROR] 获取当前视频实时信息失败:', error);
      return null;
    }
  }
}

export default defineContentScript({
  matches: ['*://*.bilibili.com/*'],
  main() {
    console.log('[DEBUG] Content script 已加载');
    
    // 初始化视频数据抓取器
    const videoScraper = new VideoDataScraper();
    
    // 确保挂载到window对象，方便调试
    (window as any).videoScraper = videoScraper;
    
    console.log('[DEBUG] Content script 初始化完成');
  },
});

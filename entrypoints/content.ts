/**
 * Bilibili视频数据抓取器 - 内容脚本
 * 负责从Bilibili页面抓取视频数据
 */

// 视频数据抓取器类
class VideoDataScraper {
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
        
        return true; // 保持消息通道开放
      }
      
      if (message.type === 'REQUEST_CURRENT_VIDEO_INFO') {
        const currentInfo = this.getCurrentVideoInfo();
        sendResponse({
          type: 'CURRENT_VIDEO_INFO',
          data: currentInfo
        });
        
        return true; // 保持消息通道开放
      }
    });
  }
  
  /**
   * 抓取视频数据
   */
  private async scrapeVideoData(): Promise<any[]> {
    console.log('[DEBUG] Content script 开始抓取视频数据');
    
    // 检查是否在Bilibili页面
    if (!window.location.hostname.includes('bilibili.com')) {
      throw new Error('请在Bilibili视频页面上使用此扩展');
    }
    
    // 等待页面加载完成
    await this.waitForPageLoad();
    
    // 获取视频信息
    const videoInfo = this.getVideoInfo();
    if (!videoInfo) {
      throw new Error('无法获取视频信息');
    }
    
    // 获取播放列表
    const playlist = await this.getPlaylist();
    
    // 合并数据
    const allVideos = [videoInfo, ...playlist];
    
    console.log(`[DEBUG] Content script 抓取完成，共 ${allVideos.length} 个视频`);
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
   * 获取当前视频信息
   */
  private getVideoInfo(): any | null {
    try {
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
      
      // 获取视频时长
      const durationElement = document.querySelector('.duration') ||
                            document.querySelector('.bpx-player-ctrl-time-duration');
      
      let duration = 0;
      if (durationElement) {
        const durationText = durationElement.textContent?.trim();
        duration = this.parseDuration(durationText || '');
      }
      
      return {
        id: videoId,
        name: title,
        url: url,
        stayTime: duration * 1000 // 转换为毫秒
      };
      
    } catch (error) {
      console.error('[ERROR] 获取当前视频信息失败:', error);
      return null;
    }
  }
  
  /**
   * 获取播放列表
   */
  private async getPlaylist(): Promise<any[]> {
    try {
      const playlist: any[] = [];
      
      // 查找播放列表元素 - 支持多种B站页面格式
      const playlistSelectors = [
        '.video-pod__item', // 新版播放列表
        '.pod-item', // 新版播放列表项
        '.list-item', // 旧版播放列表
        '.ep-item', // 番剧播放列表
        '.episode-item' // 其他播放列表格式
      ];
      
      let playlistElements: NodeListOf<Element> | null = null;
      for (const selector of playlistSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          playlistElements = elements;
          console.log(`[DEBUG] 使用选择器 "${selector}" 找到 ${elements.length} 个播放列表项`);
          break;
        }
      }
      
      if (!playlistElements || playlistElements.length === 0) {
        console.log('[DEBUG] 未找到播放列表元素，尝试其他方法');
        
        // 尝试查找包含BV号的元素
        const bvElements = document.querySelectorAll('[data-key*="BV"]');
        if (bvElements.length > 0) {
          playlistElements = bvElements;
          console.log(`[DEBUG] 通过BV号找到 ${bvElements.length} 个视频元素`);
        }
      }
      
      if (!playlistElements || playlistElements.length === 0) {
        console.log('[DEBUG] 未找到播放列表元素');
        return playlist;
      }
      
      console.log(`[DEBUG] 开始解析 ${playlistElements.length} 个播放列表项`);
      
      // 遍历播放列表项
      for (let i = 0; i < playlistElements.length; i++) {
        const element = playlistElements[i];
        
        try {
          // 获取视频ID - 优先从data-key属性获取
          let videoId = element.getAttribute('data-key') || '';
          
          // 如果没有data-key，尝试从链接获取
          if (!videoId) {
            const linkElement = element.querySelector('a') as HTMLAnchorElement;
            if (linkElement && linkElement.href) {
              const url = linkElement.href;
              const bvMatch = url.match(/BV\w+/);
              const avMatch = url.match(/av(\d+)/);
              
              if (bvMatch) {
                videoId = bvMatch[0];
              } else if (avMatch) {
                videoId = `av${avMatch[1]}`;
              }
            }
          }
          
          // 如果还是没有，生成一个ID
          if (!videoId) {
            videoId = `video_${i + 1}`;
          }
          
          // 获取标题 - 支持多种选择器
          const titleSelectors = [
            '.title-txt', // 新版标题
            '.title', // 通用标题
            '.ep-title', // 番剧标题
            '.episode-title', // 其他标题
            'a[title]' // 链接的title属性
          ];
          
          let title = '';
          for (const selector of titleSelectors) {
            const titleElement = element.querySelector(selector);
            if (titleElement) {
              title = titleElement.textContent?.trim() || titleElement.getAttribute('title') || '';
              if (title) break;
            }
          }
          
          // 如果还是没有标题，使用默认值
          if (!title) {
            title = `视频 ${i + 1}`;
          }
          
          // 获取时长 - 支持多种选择器
          const durationSelectors = [
            '.duration', // 新版时长
            '.stat-item.duration', // 新版时长（带类名）
            '.ep-duration', // 番剧时长
            '.time', // 通用时长
            '[class*="duration"]' // 包含duration的类名
          ];
          
          let duration = 0;
          for (const selector of durationSelectors) {
            const durationElement = element.querySelector(selector);
            if (durationElement) {
              const durationText = durationElement.textContent?.trim();
              duration = this.parseDuration(durationText || '');
              if (duration > 0) break;
            }
          }
          
          // 构建URL - 如果有BV号，构建标准URL
          let url = '';
          if (videoId.startsWith('BV')) {
            url = `https://www.bilibili.com/video/${videoId}`;
          } else if (videoId.startsWith('av')) {
            url = `https://www.bilibili.com/video/${videoId}`;
          } else {
            // 尝试从链接获取URL
            const linkElement = element.querySelector('a') as HTMLAnchorElement;
            if (linkElement && linkElement.href) {
              url = linkElement.href;
            }
          }
          
          // 如果URL为空，跳过这个项目
          if (!url) {
            console.log(`[DEBUG] 跳过第 ${i + 1} 个项目：无法获取URL`);
            continue;
          }
          
          playlist.push({
            id: videoId,
            name: title,
            url: url,
            stayTime: duration * 1000 // 转换为毫秒
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

/**
 * 视频数据管理组合式函数
 * 负责视频数据的获取、更新、状态管理
 */
import { ref, computed } from 'vue';
import type { VideoData, CurrentVideoInfo } from '../types';
import { sendMessage, sendMessageToTab } from '../utils/messaging';

export function useVideoData() {
  // 响应式数据
  const videoData = ref<VideoData[]>([]);
  const currentIndex = ref(0);
  const isLooping = ref(false);
  const isRefreshing = ref(false);
  const currentVideoInfo = ref<CurrentVideoInfo | null>(null);
  const outputMessage = ref('✅ 扩展已加载，请在Bilibili视频页面上使用');

  /**
   * 刷新视频数据
   */
  const refreshData = async (): Promise<void> => {
    console.log('[SUCCESS] 刷新数据按钮被点击 - 初始化插件');

    isRefreshing.value = true;
    outputMessage.value = '🔄 正在初始化插件数据...';

    try {
      // 先停止任何正在进行的循环
      await sendMessage({ type: 'STOP_LOOP' });

      // 请求新数据
      const response = await sendMessageToTab({ type: 'REQUEST_SCRAPER_DATA' });

      if (response && response.type === 'BV_SCRAPER_DATA') {
        if (response.error) {
          outputMessage.value = `❌ ${response.error}`;
          videoData.value = [];
        } else {
          console.log('[DEBUG] 初始化成功，收到视频数据，数量:', response.data.length);

          // 为每个视频添加原始索引
          const dataWithOriginalIndex = response.data.map((video: any, index: number) => ({
            ...video,
            originalIndex: index
          }));

          // 更新background中的数据
          await sendMessage({
            type: 'UPDATE_DATA',
            data: {
              videoData: dataWithOriginalIndex,
              currentIndex: 0,
              isLooping: false
            }
          });

          videoData.value = dataWithOriginalIndex;
          currentIndex.value = 0;
          isLooping.value = false;

          outputMessage.value = `✅ 成功获取 ${dataWithOriginalIndex.length} 个视频数据`;
        }
      } else {
        outputMessage.value = '❌ 无法获取视频数据';
      }
    } catch (error) {
      console.error('[ERROR] 刷新数据失败:', error);
      outputMessage.value = '❌ 刷新数据失败';
    } finally {
      isRefreshing.value = false;
    }
  };

  /**
   * 乱序排列视频数据
   */
  const shuffleData = async (): Promise<void> => {
    if (videoData.value.length === 0) {
      outputMessage.value = '❌ 没有可乱序的数据，请先刷新数据';
      return;
    }

    try {
      const response = await sendMessage({ type: 'SHUFFLE_DATA' });
      if (response && response.success) {
        console.log('[DEBUG] Background script 乱序完成');
        
        // 获取更新后的数据
        const stateResponse = await sendMessage({ type: 'GET_STATE' });
        if (stateResponse && stateResponse.videoData) {
          videoData.value = stateResponse.videoData;
          currentIndex.value = stateResponse.currentIndex || 0;
          isLooping.value = stateResponse.isLooping || false;
          
          outputMessage.value = '✅ 乱序排列完成';
        }
      }
    } catch (error) {
      console.error('[ERROR] 乱序排列失败:', error);
      outputMessage.value = '❌ 乱序排列失败';
    }
  };

  /**
   * 加载状态
   */
  const loadState = async (): Promise<void> => {
    try {
      const response = await sendMessage({ type: 'GET_STATE' });
      if (response) {
        videoData.value = response.videoData || [];
        currentIndex.value = response.currentIndex || 0;
        isLooping.value = response.isLooping || false;
      }
    } catch (error) {
      console.error('[ERROR] 加载状态失败:', error);
    }
  };

  /**
   * 跳转到指定视频
   */
  const jumpToVideo = (index: number): void => {
    if (index < 0 || index >= videoData.value.length) return;

    const video = videoData.value[index];
    if (!video.url) {
      outputMessage.value = '❌ 该视频没有有效的URL';
      return;
    }

    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browser.tabs.update(tabs[0].id!, { url: video.url });
        currentIndex.value = index;
        outputMessage.value = `🎬 正在跳转到: ${video.name}`;
      }
    });
  };

  /**
   * 更新视频播放时长
   */
  const updateVideoTime = async (index: number, totalSeconds: number): Promise<void> => {
    if (index >= 0 && index < videoData.value.length) {
      videoData.value[index].videoTime = totalSeconds;

      // 更新background中的数据
      await sendMessage({
        type: 'UPDATE_DATA',
        data: {
          videoData: videoData.value,
          currentIndex: currentIndex.value,
          isLooping: isLooping.value
        }
      });
    }
  };

  return {
    // 响应式数据
    videoData,
    currentIndex,
    isLooping,
    isRefreshing,
    currentVideoInfo,
    outputMessage,
    
    // 方法
    refreshData,
    shuffleData,
    loadState,
    jumpToVideo,
    updateVideoTime
  };
}
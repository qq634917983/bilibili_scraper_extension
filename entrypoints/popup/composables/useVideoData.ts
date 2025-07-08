import { ref, computed } from 'vue';
import type { VideoData, CurrentVideoInfo } from '../types';
import { sendMessage, sendMessageToTab } from '../utils/messaging';

/**
 * 视频数据管理组合式函数
 */
export function useVideoData() {
  const videoData = ref<VideoData[]>([]);
  const currentIndex = ref(0);
  const currentVideoInfo = ref<CurrentVideoInfo | null>(null);
  const isRefreshing = ref(false);
  const outputMessage = ref('✅ 扩展已加载，请在Bilibili视频页面上使用');

  /**
   * 处理刷新数据
   */
  const handleRefreshData = async () => {
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

          videoData.value = dataWithOriginalIndex;
          currentIndex.value = 0;

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
   * 处理乱序排列
   */
  const handleShuffleData = async () => {
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
          
          outputMessage.value = '✅ 乱序排列完成';
        }
      }
    } catch (error) {
      console.error('[ERROR] 乱序排列失败:', error);
      outputMessage.value = '❌ 乱序排列失败';
    }
  };

  /**
   * 跳转到指定视频
   */
  const jumpToVideo = (index: number) => {
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

  return {
    videoData,
    currentIndex,
    currentVideoInfo,
    isRefreshing,
    outputMessage,
    handleRefreshData,
    handleShuffleData,
    jumpToVideo
  };
}
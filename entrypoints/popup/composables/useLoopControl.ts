/**
 * 循环控制组合式函数
 * 负责循环播放的开始、停止、状态监控
 */
import { ref, onMounted, onUnmounted } from 'vue';
import type { VideoData, CurrentVideoInfo } from '../types';
import { sendMessage, sendMessageToTab } from '../utils/messaging';

export function useLoopControl() {
  // 响应式数据
  const randomRange = ref(5);
  const loopCount = ref(1);
  const currentVideoInfo = ref<CurrentVideoInfo | null>(null);
  
  // 定时器
  let countdownInterval: number | null = null;
  let currentVideoUpdateInterval: number | null = null;

  /**
   * 开始循环播放
   */
  const startLoop = async (videoData: VideoData[], currentIndex: number): Promise<{ success: boolean; message: string }> => {
    if (videoData.length === 0) {
      return { success: false, message: '❌ 请先点击\'刷新数据\'获取视频列表' };
    }

    try {
      const data = {
        videoData: videoData,
        currentIndex: currentIndex,
        randomRange: randomRange.value,
        loopCount: loopCount.value
      };

      const response = await sendMessage({
        type: 'START_LOOP',
        data: data
      });

      if (response && response.success) {
        const loopText = loopCount.value === 0 ? '无限' : loopCount.value;
        return {
          success: true,
          message: `🔄 自动循环已开始！循环次数: ${loopText}，等待时间: ${randomRange.value}秒，从第 ${currentIndex + 1} 个视频开始`
        };
      } else {
        return { success: false, message: '❌ 开始循环失败' };
      }
    } catch (error) {
      console.error('[ERROR] 开始循环失败:', error);
      return { success: false, message: '❌ 开始循环失败' };
    }
  };

  /**
   * 停止循环播放
   */
  const stopLoop = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await sendMessage({ type: 'STOP_LOOP' });
      if (response && response.success) {
        return { success: true, message: '⏹️ 循环已停止' };
      } else {
        return { success: false, message: '❌ 停止循环失败' };
      }
    } catch (error) {
      console.error('[ERROR] 停止循环失败:', error);
      return { success: false, message: '❌ 停止循环失败' };
    }
  };

  /**
   * 启动倒计时更新
   */
  const startCountdownUpdate = (): void => {
    countdownInterval = window.setInterval(async () => {
      try {
        const response = await sendMessage({ type: 'GET_STATE' });
        if (response) {
          // 这里可以更新一些全局状态
        }
      } catch (error) {
        console.error('[ERROR] 更新状态失败:', error);
      }
    }, 1000);
  };

  /**
   * 启动当前视频信息更新
   */
  const startCurrentVideoUpdate = (): void => {
    currentVideoUpdateInterval = window.setInterval(async () => {
      try {
        const response = await sendMessageToTab({ type: 'REQUEST_CURRENT_VIDEO_INFO' });
        if (response && response.type === 'CURRENT_VIDEO_INFO' && response.data) {
          currentVideoInfo.value = {
            name: response.data.name,
            remainingTime: response.data.remainingSeconds || 0
          };
        }
      } catch (error) {
        // 静默处理错误
      }
    }, 2000);
  };

  /**
   * 清理定时器
   */
  const cleanup = (): void => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (currentVideoUpdateInterval) {
      clearInterval(currentVideoUpdateInterval);
      currentVideoUpdateInterval = null;
    }
  };

  // 生命周期管理
  onMounted(() => {
    startCountdownUpdate();
    startCurrentVideoUpdate();
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    // 响应式数据
    randomRange,
    loopCount,
    currentVideoInfo,
    
    // 方法
    startLoop,
    stopLoop,
    cleanup
  };
}
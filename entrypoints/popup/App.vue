<template>
  <div class="w-full max-w-full min-h-[800px] bg-gray-50 p-6 box-border overflow-hidden">
    <h1 class="text-xl font-bold text-center mb-4 text-gray-800">🎬 Bilibili 视频循环播放器</h1>

    <!-- 顶部控制区域 -->
    <div class="flex flex-wrap items-center gap-4 p-3 bg-white rounded-lg shadow-sm border mb-4">
      <div class="flex items-center gap-2">
        <label for="randomRange" class="text-sm font-medium text-gray-700">随机范围 (秒):</label>
        <input 
          type="number" 
          id="randomRange" 
          v-model="randomRange" 
          min="0" 
          max="60" 
          placeholder="随机范围"
          class="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
      </div>
      <div class="flex items-center gap-2">
        <label for="loopCount" class="text-sm font-medium text-gray-700">循环次数:</label>
        <input 
          type="number" 
          id="loopCount" 
          v-model="loopCount" 
          min="0" 
          placeholder="0=无限"
          class="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
      </div>
      <!-- 新增：时间百分比输入框 -->
      <div class="flex items-center gap-2">
        <label for="timePercentage" class="text-sm font-medium text-gray-700">时间百分比 (%):</label>
        <input 
          type="number" 
          id="timePercentage" 
          v-model="timePercentage" 
          min="1" 
          max="100" 
          placeholder="100"
          class="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
        <span class="text-xs text-gray-500">缩短播放时间</span>
      </div>
    </div>

    <!-- 输出信息 -->
    <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-4">
      {{ outputMessage }}
    </div>

    <!-- 当前视频信息 -->
    <div v-if="currentVideoInfo" class="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
      <h3 class="font-semibold text-green-800 text-sm mb-1">当前播放：{{ currentVideoInfo.name }}</h3>
      <p class="text-green-700 text-xs">剩余时间：{{ currentVideoInfo.remainingTime }}秒</p>
      <p class="text-orange-700 text-xs font-semibold">
        真实跳转时间：{{ realJumpTime }}秒 
        <span v-if="realJumpTime <= 0" class="text-red-600 animate-pulse">⚡ 即将跳转</span>
      </p>
    </div>

    <!-- 表格操作按钮 - 靠右对齐 -->
    <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border mb-2">
 
      <div class="flex items-center gap-2">
        <button @click="handleShuffleData" class="btn-small bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500">
          🔀 乱序
        </button>
        <button @click="handleExportData" class="btn-small bg-blue-600 text-white hover:bg-      </button> 这些按钮宽度设置blue-700 focus:ring-blue-500">
          📤 导出
        </button>
        <button @click="handleImportData" class="btn-small bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
          📥 导入
        </button>

           <button 
        @click="handleRefreshData" 
        class="btn-success" 
        :disabled="isRefreshing"
        :class="{ 'opacity-50 cursor-not-allowed': isRefreshing }"
      >
        {{ isRefreshing ? '🔄 初始化中...' : '🔄 刷新数据' }}
      </button>
      <button @click="handleStartLoop" class="btn-primary">
        ▶️ 开始循环
      </button>
      <button @click="handleStopLoop" class="btn-secondary">
        ⏹️ 停止循环
      </button>
      </div>
    </div>

    <!-- 表格容器 -->
    <div class="flex flex-col rounded-lg overflow-hidden shadow-md mb-4 h-80 bg-white">
      <div class="flex-1 overflow-y-auto hide-scrollbar">
        <table class="w-full border-collapse table-fixed">
          <thead class="sticky top-0 z-10">
            <tr class="bg-blue-600 text-white">
              <th class="w-[10%] px-2 py-1.5 text-left text-xs font-semibold">原始序号</th>
              <th class="w-[15%] px-2 py-1.5 text-left text-xs font-semibold">视频ID</th>
              <th class="w-[35%] px-2 py-1.5 text-left text-xs font-semibold">视频名称</th>
              <th class="w-[15%] px-2 py-1.5 text-left text-xs font-semibold">时长</th>
              <th class="w-[15%] px-2 py-1.5 text-left text-xs font-semibold">状态</th>
              <th class="w-[10%] px-2 py-1.5 text-left text-xs font-semibold">播放时长</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="videoData.length === 0">
              <td colspan="6" class="text-center text-gray-500 italic py-8 text-sm">
                请点击"刷新数据"按钮获取视频列表
              </td>
            </tr>
            <tr 
              v-for="(video, index) in videoData" 
              :key="video.id" 
              :class="{
                'bg-blue-50 border-l-4 border-blue-600': index === currentIndex,
                'bg-gray-50': index % 2 === 1 && index !== currentIndex
              }"
              class="transition-all duration-300 cursor-pointer hover:bg-blue-100"
              @click="jumpToVideo(index)"
            >
              <td class="px-2 py-2 border-b border-gray-200 text-xs font-semibold text-green-600 text-center">
                {{ video.originalIndex + 1 }}
              </td>
              <td class="px-2 py-2 border-b border-gray-200 text-xs font-semibold text-blue-600 truncate">
                {{ video.id }}
              </td>
              <td class="px-2 py-2 border-b border-gray-200 text-xs truncate" :title="video.name">
                {{ video.name }}
              </td>
              <td class="px-2 py-2 border-b border-gray-200 text-xs">
                {{ formatDuration(video.stayTime) }}
              </td>
              <td class="px-2 py-2 border-b border-gray-200 text-xs">
                <span v-if="index === currentIndex && isLooping" class="text-green-600 font-semibold">
                  ▶️ 播放中
                </span>
                <span v-else-if="index === currentIndex" class="text-blue-600 font-semibold">
                  📍 当前
                </span>
                <span v-else class="text-gray-500">
                  ⏸️ 等待
                </span>
              </td>
              <td class="px-2 py-2 border-b border-gray-200">
                <input 
                  type="text" 
                  :value="formatDuration(video.videoTime || 0)" 
                  @click.stop 
                  @focus="startTimeEdit(index)"
                  placeholder="点击设置" 
                  readonly
                  class="w-full px-1 py-1 text-xs text-center bg-gray-50 border border-gray-300 rounded cursor-pointer hover:bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
     

    <!-- 时间选择器弹窗 -->
    <div 
      v-if="showTimePicker" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="hideTimePicker"
    >
      <div class="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4" @click.stop>
        <div class="text-lg font-semibold text-gray-800 mb-4 text-center">
          设置播放时长
        </div>
        <div class="flex items-center justify-center gap-2 mb-6">
          <div class="text-center">
            <div class="text-xs text-gray-600 mb-1">时</div>
            <input 
              type="number" 
              v-model="timeHours" 
              min="0" 
              max="23"
              class="w-16 px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          <div class="text-xl text-gray-400 mt-5">:</div>
          <div class="text-center">
            <div class="text-xs text-gray-600 mb-1">分</div>
            <input 
              type="number" 
              v-model="timeMinutes" 
              min="0" 
              max="59"
              class="w-16 px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          <div class="text-xl text-gray-400 mt-5">:</div>
          <div class="text-center">
            <div class="text-xs text-gray-600 mb-1">秒</div>
            <input 
              type="number" 
              v-model="timeSeconds" 
              min="0" 
              max="59"
              class="w-16 px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
        </div>
        <div class="flex gap-3 justify-center">
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
            @click="confirmTime"
          >
            确认
          </button>
          <button 
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2" 
            @click="hideTimePicker"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input type="file" ref="fileInput" accept=".json" class="hidden" @change="handleFileSelect">
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';

// 响应式数据定义
const videoData = ref<any[]>([]);
const currentIndex = ref(0);
const isLooping = ref(false);
const randomRange = ref(5);
// 新增：时间百分比
const timePercentage = ref(100);
const outputMessage = ref('✅ 扩展已加载，请在Bilibili视频页面上使用');
const isRefreshing = ref(false);
const currentVideoInfo = ref<any>(null);

// 弹窗控制
const showTimePicker = ref(false);
const loopCount = ref(1);
const currentEditingIndex = ref(-1);

// 时间选择器
const timeHours = ref(0);
const timeMinutes = ref(0);
const timeSeconds = ref(0);

// 定时器
let countdownInterval: number | null = null;
let currentVideoUpdateInterval: number | null = null;

// 引用
const fileInput = ref<HTMLInputElement>();

/**
 * 发送消息到background script
 */
const sendMessage = (message: any): Promise<any> => {
  return new Promise((resolve) => {
    browser.runtime.sendMessage(message, (response) => {
      if (browser.runtime.lastError) {
        console.error('[ERROR] 消息发送失败:', browser.runtime.lastError.message);
        resolve({ success: false, error: browser.runtime.lastError.message });
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * 发送消息到content script
 */
const sendMessageToTab = (message: any): Promise<any> => {
  return new Promise((resolve) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id!, message, (response) => {
          if (browser.runtime.lastError) {
            console.error('[ERROR] 向标签页发送消息失败:', browser.runtime.lastError.message);
            resolve({ success: false, error: browser.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      } else {
        resolve({ success: false, error: '未找到活动标签页' });
      }
    });
  });
};

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

        // 更新background中的数据
        await sendMessage({
          type: 'UPDATE_DATA',
          data: {
            videoData: dataWithOriginalIndex,
            currentIndex: 0,
            isLooping: false,
            randomRange: randomRange.value
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
        isLooping.value = stateResponse.isLooping || false;
        randomRange.value = stateResponse.randomRange || 5;
        
        outputMessage.value = '✅ 乱序排列完成';
      }
    }
  } catch (error) {
    console.error('[ERROR] 乱序排列失败:', error);
    outputMessage.value = '❌ 乱序排列失败';
  }
};

/**
 * 处理开始循环 - 包含时间百分比参数
 */
const handleStartLoop = async () => {
  if (videoData.value.length === 0) {
    outputMessage.value = '❌ 请先点击\'刷新数据\'获取视频列表';
    return;
  }

  // 验证时间百分比
  if (timePercentage.value < 1 || timePercentage.value > 100) {
    outputMessage.value = '❌ 时间百分比必须在1-100之间';
    return;
  }

  try {
    const data = {
      videoData: videoData.value,
      currentIndex: currentIndex.value,
      randomRange: randomRange.value,
      loopCount: loopCount.value,
      timePercentage: timePercentage.value // 新增时间百分比参数
    };

    const response = await sendMessage({
      type: 'START_LOOP',
      data: data
    });

    if (response && response.success) {
      isLooping.value = true;
      const loopText = loopCount.value === 0 ? '无限' : loopCount.value;
      outputMessage.value = `🔄 自动循环已开始！循环次数: ${loopText}，时间百分比: ${timePercentage.value}%，从第 ${currentIndex.value + 1} 个视频开始`;
    } else {
      outputMessage.value = '❌ 开始循环失败';
    }
  } catch (error) {
    console.error('[ERROR] 开始循环失败:', error);
    outputMessage.value = '❌ 开始循环失败';
  }
};

/**
 * 加载状态 - 包含时间百分比
 */
const loadState = async () => {
  try {
    const response = await sendMessage({ type: 'GET_STATE' });
    if (response) {
      videoData.value = response.videoData || [];
      currentIndex.value = response.currentIndex || 0;
      isLooping.value = response.isLooping || false;
      randomRange.value = response.randomRange || 5;
      timePercentage.value = response.timePercentage || 100; // 新增时间百分比状态
    }
  } catch (error) {
    console.error('[ERROR] 加载状态失败:', error);
  }
};

/**
 * 处理停止循环
 */
const handleStopLoop = async () => {
  try {
    const response = await sendMessage({ type: 'STOP_LOOP' });
    if (response && response.success) {
      isLooping.value = false;
      outputMessage.value = '⏹️ 循环已停止';
    }
  } catch (error) {
    console.error('[ERROR] 停止循环失败:', error);
    outputMessage.value = '❌ 停止循环失败';
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

/**
 * 开始时间编辑
 */
const startTimeEdit = (index: number) => {
  currentEditingIndex.value = index;
  const video = videoData.value[index];
  const totalSeconds = video.videoTime || 0;

  timeHours.value = Math.floor(totalSeconds / 3600);
  timeMinutes.value = Math.floor((totalSeconds % 3600) / 60);
  timeSeconds.value = totalSeconds % 60;

  showTimePicker.value = true;
};

/**
 * 隐藏时间选择器
 */
const hideTimePicker = () => {
  showTimePicker.value = false;
  currentEditingIndex.value = -1;
};

/**
 * 确认时间设置
 */
const confirmTime = async () => {
  if (currentEditingIndex.value >= 0) {
    const totalSeconds = timeHours.value * 3600 + timeMinutes.value * 60 + timeSeconds.value;
    videoData.value[currentEditingIndex.value].videoTime = totalSeconds;

    // 更新background中的数据
    await sendMessage({
      type: 'UPDATE_DATA',
      data: {
        videoData: videoData.value,
        currentIndex: currentIndex.value,
        isLooping: isLooping.value,
        randomRange: randomRange.value
      }
    });

    // 强制更新UI显示
    nextTick(() => {
      // 触发响应式更新
      const updatedData = [...videoData.value];
      videoData.value = updatedData;
    });
  }

  hideTimePicker();
};

/**
 * 处理导出数据
 */
const handleExportData = async () => {
  if (videoData.value.length === 0) {
    outputMessage.value = '❌ 没有可导出的数据，请先刷新数据';
    return;
  }

  try {
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      videoData: videoData.value,
      totalCount: videoData.value.length
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `bilibili_video_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    outputMessage.value = `✅ 已导出 ${videoData.value.length} 个视频数据`;
  } catch (error) {
    console.error('[ERROR] 导出数据失败:', error);
    outputMessage.value = '❌ 导出数据失败';
  }
};

/**
 * 处理导入数据
 */
const handleImportData = () => {
  fileInput.value?.click();
};

/**
 * 处理文件选择
 */
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.type !== 'application/json') {
    outputMessage.value = '❌ 请选择JSON格式的文件';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importData = JSON.parse(e.target?.result as string);

      if (!importData.videoData || !Array.isArray(importData.videoData)) {
        throw new Error('无效的数据格式');
      }

      // 验证数据结构
      const validData = importData.videoData.filter((item: any) =>
        item && item.name && item.url && typeof item.stayTime === 'number'
      );

      if (validData.length === 0) {
        throw new Error('没有找到有效的视频数据');
      }

      // 为导入的数据添加原始索引（如果没有的话）
      const dataWithOriginalIndex = validData.map((video: any, index: number) => ({
        ...video,
        originalIndex: video.originalIndex !== undefined ? video.originalIndex : index
      }));

      // 更新数据
      await sendMessage({
        type: 'UPDATE_DATA',
        data: {
          videoData: dataWithOriginalIndex,
          currentIndex: 0,
          isLooping: false,
          randomRange: randomRange.value
        }
      });

      videoData.value = dataWithOriginalIndex;
      currentIndex.value = 0;
      isLooping.value = false;

      outputMessage.value = `✅ 成功导入 ${dataWithOriginalIndex.length} 个视频数据`;
    } catch (error: any) {
      console.error('[ERROR] 导入数据失败:', error);
      outputMessage.value = `❌ 导入数据失败: ${error.message}`;
    }
  };

  reader.readAsText(file);
  target.value = ''; // 清空文件输入
};

/**
 * 格式化时长显示
 */
const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

 
/**
 * 启动倒计时更新
 */
const startCountdownUpdate = () => {
  countdownInterval = window.setInterval(async () => {
    if (isLooping.value) {
      try {
        const response = await sendMessage({ type: 'GET_STATE' });
        if (response) {
          currentIndex.value = response.currentIndex || 0;
          isLooping.value = response.isLooping || false;
        }
      } catch (error) {
        console.error('[ERROR] 更新状态失败:', error);
      }
    }
  }, 1000);
};

/**
 * 启动当前视频信息更新
 */
const startCurrentVideoUpdate = () => {
  currentVideoUpdateInterval = window.setInterval(async () => {
    if (isLooping.value) {
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
    } else {
      currentVideoInfo.value = null;
    }
  }, 2000);
};

// 生命周期钩子
onMounted(() => {
  loadState();
  startCountdownUpdate();
  startCurrentVideoUpdate();
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  if (currentVideoUpdateInterval) {
    clearInterval(currentVideoUpdateInterval);
  }
});
</script>

/**
 * 计算真实跳转时间的响应式计算属性
 * 公式：(剩余时间 - 随机等待时间) * timePercentage / 100
 */
const realJumpTime = computed((): number => {
  if (!currentVideoInfo.value) return 0;
  
  const remainingTime = currentVideoInfo.value.remainingTime || 0;
  
  // 计算随机等待时间（与background.ts中的逻辑保持一致）
  let randomWaitTime = 1; // 最小等待时间
  if (randomRange.value > 0) {
    randomWaitTime = Math.max(1, Math.floor(Math.random() * randomRange.value) + 1);
  }
  
  // 添加最短间隔保护：至少播放5秒
  const minPlayTime = 5;
  const actualRemainingTime = Math.max(remainingTime, minPlayTime);
  
  // 应用时间百分比
  const adjustedRemainingTime = Math.floor(actualRemainingTime * (timePercentage.value / 100));
  const adjustedRandomWaitTime = Math.floor(randomWaitTime * (timePercentage.value / 100));
  
  // 计算真实跳转时间
  const jumpTime = adjustedRemainingTime - adjustedRandomWaitTime;
  
  return Math.max(0, jumpTime);
});
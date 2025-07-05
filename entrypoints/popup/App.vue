<template>
  <div class="container">
    <h1>🎬 Bilibili 视频循环播放器</h1>

    <!-- 顶部控制区域 - 随机范围和开始循环 -->
    <div class="top-controls">
      <div class="control-row">
        <label for="randomRange">随机范围 (秒):</label>
        <input type="number" id="randomRange" v-model="randomRange" min="0" max="60" placeholder="随机范围">
        <label for="loopCount" style="margin-left: 20px;">循环次数:</label>
        <input type="number" id="loopCount" v-model="loopCount" min="0" placeholder="0=无限" style="width: 80px;">



      </div>

  
    </div>

    <div class="output">{{ outputMessage }}</div>

    <!-- 当前视频信息显示区域 -->
    <div v-if="currentVideoInfo" class="current-video-display">
      <h3>当前播放：{{ currentVideoInfo.name }}</h3>
      <p>剩余时间：{{ currentVideoInfo.remainingTime }}秒</p>
    </div>

    <!-- 可滚动的表格容器 -->
    <div class="scrollable-table-container">

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="video-id-column">视频ID</th>
              <th class="table-wrapper-name">视频名称 
                
                  <button @click="handleShuffleData" class="btn-warning">🔀 乱序</button>

                  <button @click="handleExportData" class="btn-primary">📤 导出</button>
                  <button @click="handleImportData" class="btn-primary">📥 导入</button>
                
                 
                </th>
      
      <th class="duration-column">时长</th>
      <th class="status-column">状态</th>
      <th class="video-time-column">播放时长</th>
      </tr>
      </thead>
      <tbody>
        <tr v-if="videoData.length === 0">
          <td colspan="5" class="loading">请点击"刷新数据"按钮获取视频列表</td>
        </tr>
        <tr v-for="(video, index) in videoData" :key="video.id" :class="{ 'current-playing': index === currentIndex }"
          @click="jumpToVideo(index)">
          <td>{{ video.id }}</td>
          <td>{{ video.name }}</td>
          <td>{{ formatDuration(video.stayTime) }}</td>
          <td>
            <span v-if="index === currentIndex && isLooping" class="status-playing">▶️ 播放中</span>
            <span v-else-if="index === currentIndex" class="status-current">📍 当前</span>
            <span v-else class="status-waiting">⏸️ 等待</span>
          </td>
          <td>
            <input type="text" :value="formatDuration(video.videoTime || 0)" @click.stop @focus="startTimeEdit(index)"
              placeholder="点击设置" readonly>
          </td>
        </tr>
      </tbody>
      </table>
    </div>
  </div>

  <!-- 底部按钮区域 -->
  <div class="bottom-controls">
    <button @click="handleRefreshData" class="btn-success" :disabled="isRefreshing">
      {{ isRefreshing ? '🔄 初始化中...' : '🔄 刷新数据' }}
    </button>
    <button @click="handleStartLoop" class="btn-primary" style="margin-left: 10px;">▶️ 开始循环</button>

    <button @click="handleStopLoop" class="btn-secondary">⏹️ 停止循环</button>
  </div>

  <!-- 时间选择器弹窗 -->
  <div v-if="showTimePicker" class="time-picker-overlay" @click="hideTimePicker">
    <div class="time-picker-modal" @click.stop>
      <div class="time-picker-title">设置播放时长</div>
      <div class="time-inputs">
        <div class="time-input-group">
          <div class="time-input-label">时</div>
          <input type="number" class="time-input" v-model="timeHours" min="0" max="23">
        </div>
        <div class="time-separator">:</div>
        <div class="time-input-group">
          <div class="time-input-label">分</div>
          <input type="number" class="time-input" v-model="timeMinutes" min="0" max="59">
        </div>
        <div class="time-separator">:</div>
        <div class="time-input-group">
          <div class="time-input-label">秒</div>
          <input type="number" class="time-input" v-model="timeSeconds" min="0" max="59">
        </div>
      </div>
      <div class="time-picker-buttons">
        <button class="time-picker-btn confirm" @click="confirmTime">确认</button>
        <button class="time-picker-btn cancel" @click="hideTimePicker">取消</button>
      </div>
    </div>
  </div>

  <!-- 隐藏的文件输入 -->
  <input type="file" ref="fileInput" accept=".json" style="display: none" @change="handleFileSelect">
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

// 响应式数据定义
const videoData = ref<any[]>([]);
const currentIndex = ref(0);
const isLooping = ref(false);
const randomRange = ref(5);
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

        // 更新background中的数据
        await sendMessage({
          type: 'UPDATE_DATA',
          data: {
            videoData: response.data,
            currentIndex: 0,
            isLooping: false,
            randomRange: randomRange.value
          }
        });

        videoData.value = response.data;
        currentIndex.value = 0;
        isLooping.value = false;

        outputMessage.value = `✅ 成功获取 ${response.data.length} 个视频数据`;
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
      // 重新获取状态
      await loadState();
      outputMessage.value = '✅ 乱序排列完成';
    }
  } catch (error) {
    console.error('[ERROR] 乱序排列失败:', error);
    outputMessage.value = '❌ 乱序排列失败';
  }
};

/**
 * 处理开始循环 - 直接开始，无弹窗
 */
const handleStartLoop = async () => {
  if (videoData.value.length === 0) {
    outputMessage.value = '❌ 请先点击\'刷新数据\'获取视频列表';
    return;
  }

  try {
    const data = {
      videoData: videoData.value,
      currentIndex: currentIndex.value,
      randomRange: randomRange.value,
      loopCount: loopCount.value
    };

    const response = await sendMessage({
      type: 'START_LOOP',
      data: data
    });

    if (response && response.success) {
      isLooping.value = true;
      const loopText = loopCount.value === 0 ? '无限' : loopCount.value;
      outputMessage.value = `🔄 自动循环已开始！循环次数: ${loopText}，从第 ${currentIndex.value + 1} 个视频开始`;
    } else {
      outputMessage.value = '❌ 开始循环失败';
    }
  } catch (error) {
    console.error('[ERROR] 开始循环失败:', error);
    outputMessage.value = '❌ 开始循环失败';
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

      // 更新数据
      await sendMessage({
        type: 'UPDATE_DATA',
        data: {
          videoData: validData,
          currentIndex: 0,
          isLooping: false,
          randomRange: randomRange.value
        }
      });

      videoData.value = validData;
      currentIndex.value = 0;
      isLooping.value = false;

      outputMessage.value = `✅ 成功导入 ${validData.length} 个视频数据`;
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
 * 加载状态
 */
const loadState = async () => {
  try {
    const response = await sendMessage({ type: 'GET_STATE' });
    if (response) {
      videoData.value = response.videoData || [];
      currentIndex.value = response.currentIndex || 0;
      isLooping.value = response.isLooping || false;
      randomRange.value = response.randomRange || 5;
    }
  } catch (error) {
    console.error('[ERROR] 加载状态失败:', error);
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
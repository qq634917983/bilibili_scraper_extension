<template>
  <div class="w-full max-w-full min-h-[800px] bg-gray-50 p-6 box-border overflow-hidden">
    <h1 class="text-xl font-bold text-center mb-4 text-gray-800">🎬 Bilibili 视频循环播放器</h1>

    <!-- 控制面板组件 -->
    <ControlPanel 
      v-model:randomRange="randomRange"
      v-model:loopCount="loopCount"
      :outputMessage="outputMessage"
      :currentVideoInfo="currentVideoInfo"
      :realJumpTime="realJumpTime"
      :isRefreshing="isRefreshing"
      @refresh="handleRefresh"
      @shuffle="handleShuffle"
      @export="handleExport"
      @import="handleImport"
      @start-loop="handleStartLoop"
      @stop-loop="handleStopLoop"
    />

    <!-- 表格组件 -->
    <Table 
      :videoData="videoData"
      :currentIndex="currentIndex"
      :isLooping="isLooping"
      @jump-to-video="jumpToVideo"
      @edit-time="startTimeEdit"
    />

    <!-- 时间选择器组件 -->
    <TimePicker 
      v-model:show="showTimePicker"
      v-model:hours="timeHours"
      v-model:minutes="timeMinutes"
      v-model:seconds="timeSeconds"
      @confirm="confirmTime"
      @cancel="hideTimePicker"
    />

    <!-- 隐藏的文件输入 -->
    <input 
      ref="fileInput" 
      type="file" 
      accept=".json" 
      class="hidden" 
      @change="handleFileSelect"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVideoData } from './composables/useVideoData';
import { useLoopControl } from './composables/useLoopControl';
import { useFileOperations } from './composables/useFileOperations';
import ControlPanel from './components/ControlPanel.vue';
import Table from './components/Table.vue';
import TimePicker from './components/TimePicker.vue';

// 使用组合式函数
const {
  videoData,
  currentIndex,
  isLooping,
  outputMessage,
  isRefreshing,
  refreshData,
  shuffleData,
  loadState,
  jumpToVideo,
  updateVideoTime
} = useVideoData();

const {
  randomRange,
  loopCount,
  currentVideoInfo,
  startLoop,
  stopLoop
} = useLoopControl();

const {
  fileInput,
  exportData,
  triggerImport,
  handleFileImport
} = useFileOperations();

// 时间选择器相关状态
const showTimePicker = ref(false);
const currentEditingIndex = ref(-1);
const timeHours = ref(0);
const timeMinutes = ref(0);
const timeSeconds = ref(0);

/**
 * 处理刷新数据
 */
const handleRefresh = async () => {
  await refreshData();
};

/**
 * 处理乱序数据
 */
const handleShuffle = async () => {
  await shuffleData();
};

/**
 * 处理导出数据
 */
const handleExport = async () => {
  const result = await exportData(videoData.value);
  outputMessage.value = result.message;
};

/**
 * 处理导入数据
 */
const handleImport = () => {
  triggerImport();
};

/**
 * 处理开始循环
 */
const handleStartLoop = async () => {
  const result = await startLoop(videoData.value, currentIndex.value);
  outputMessage.value = result.message;
  if (result.success) {
    isLooping.value = true;
  }
};

/**
 * 处理停止循环
 */
const handleStopLoop = async () => {
  const result = await stopLoop();
  outputMessage.value = result.message;
  if (result.success) {
    isLooping.value = false;
  }
};

/**
 * 处理文件选择
 */
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const result = await handleFileImport(file);
  outputMessage.value = result.message;
  
  if (result.success && result.data) {
    videoData.value = result.data;
    currentIndex.value = 0;
    isLooping.value = false;
  }
  
  target.value = ''; // 清空文件输入
};

/**
 * 开始时间编辑
 * @param index 视频索引
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
    await updateVideoTime(currentEditingIndex.value, totalSeconds);
  }
  hideTimePicker();
};

/**
 * 计算真实跳转时间的响应式计算属性
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
  
  // 计算真实跳转时间
  const jumpTime = actualRemainingTime - randomWaitTime;
  
  return Math.max(0, jumpTime);
});

// 生命周期
onMounted(() => {
  loadState();
});
</script>

 
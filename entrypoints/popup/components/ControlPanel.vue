<template>
  <!-- 顶部控制区域 -->
  <div class="flex flex-wrap items-center gap-4 p-3 bg-white rounded-lg shadow-sm border mb-4">
    <div class="flex items-center gap-2">
      <label for="randomRange" class="text-sm font-medium text-gray-700">等待时间 (秒):</label>
      <input 
        type="number" 
        id="randomRange" 
        v-model="randomRange" 
        min="0" 
        placeholder="等待时间"
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

  <!-- 表格操作按钮 -->
  <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border mb-2">
    <div class="flex items-center gap-2">
      <button 
        @click="$emit('shuffle')" 
        class="btn-small bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500"
      >
        🔀 乱序
      </button>
      <button 
        @click="$emit('export')" 
        class="btn-small bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
      >
        📤 导出
      </button>
      <button 
        @click="$emit('import')" 
        class="btn-small bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
      >
        📥 导入
      </button>
      <button 
        @click="$emit('refresh')" 
        class="btn-success" 
        :disabled="isRefreshing"
        :class="{ 'opacity-50 cursor-not-allowed': isRefreshing }"
      >
        {{ isRefreshing ? '🔄 初始化中...' : '🔄 刷新数据' }}
      </button>
    </div>
    
    <div class="flex items-center gap-2">
      <button 
        @click="$emit('start-loop')" 
        class="btn-primary"
      >
        ▶️ 开始循环
      </button>
      <button 
        @click="$emit('stop-loop')" 
        class="btn-secondary"
      >
        ⏹️ 停止循环
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CurrentVideoInfo } from '../types';

// Props定义
interface Props {
  randomRange: number;
  loopCount: number;
  outputMessage: string;
  currentVideoInfo: CurrentVideoInfo | null;
  realJumpTime: number;
  isRefreshing: boolean;
}

const props = defineProps<Props>();

// Emits定义
interface Emits {
  'update:randomRange': [value: number];
  'update:loopCount': [value: number];
  shuffle: [];
  export: [];
  import: [];
  refresh: [];
  'start-loop': [];
  'stop-loop': [];
}

const emit = defineEmits<Emits>();

// 双向绑定的计算属性
const randomRange = computed({
  get: () => props.randomRange,
  set: (value) => emit('update:randomRange', value)
});

const loopCount = computed({
  get: () => props.loopCount,
  set: (value) => emit('update:loopCount', value)
});
</script>

<style scoped>
.btn-small {
  @apply px-3 py-1.5 text-xs font-medium rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium transition-colors duration-200;
}

.btn-secondary {
  @apply px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium transition-colors duration-200;
}

.btn-success {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors duration-200;
}
</style>
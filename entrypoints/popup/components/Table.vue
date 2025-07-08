<template>
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
            @click="$emit('jump-to-video', index)"
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
                @focus="$emit('edit-time', index)"
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
</template>

<script setup lang="ts">
import type { VideoData } from '../types';
import { formatDuration } from '../utils/formatters';

// Props定义
interface Props {
  videoData: VideoData[];
  currentIndex: number;
  isLooping: boolean;
}

const props = defineProps<Props>();

// Emits定义
interface Emits {
  'jump-to-video': [index: number];
  'edit-time': [index: number];
}

const emit = defineEmits<Emits>();
</script>

<style scoped>
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
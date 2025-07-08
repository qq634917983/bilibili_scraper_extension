<template>
  <!-- 时间选择器弹窗 -->
  <div 
    v-if="show" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="handleCancel"
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
            v-model="hours" 
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
            v-model="minutes" 
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
            v-model="seconds" 
            min="0" 
            max="59"
            class="w-16 px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
      </div>
      <div class="flex gap-3 justify-center">
        <button 
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
          @click="handleConfirm"
        >
          确认
        </button>
        <button 
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2" 
          @click="handleCancel"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// Props定义
interface Props {
  show: boolean;
  initialSeconds?: number;
}

const props = withDefaults(defineProps<Props>(), {
  initialSeconds: 0
});

// Emits定义
interface Emits {
  confirm: [totalSeconds: number];
  cancel: [];
}

const emit = defineEmits<Emits>();

// 响应式数据
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);

/**
 * 监听初始秒数变化，更新时分秒
 */
watch(() => props.initialSeconds, (newSeconds) => {
  if (newSeconds !== undefined) {
    hours.value = Math.floor(newSeconds / 3600);
    minutes.value = Math.floor((newSeconds % 3600) / 60);
    seconds.value = newSeconds % 60;
  }
}, { immediate: true });

/**
 * 确认时间设置
 */
const handleConfirm = (): void => {
  const totalSeconds = hours.value * 3600 + minutes.value * 60 + seconds.value;
  emit('confirm', totalSeconds);
};

/**
 * 取消时间设置
 */
const handleCancel = (): void => {
  emit('cancel');
};
</script>
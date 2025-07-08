/**
 * 文件操作组合式函数
 * 负责数据的导入导出功能
 */
import { ref } from 'vue';
import type { VideoData } from '../types';
import { sendMessage } from '../utils/messaging';

export function useFileOperations() {
  const fileInput = ref<HTMLInputElement>();

  /**
   * 导出数据
   */
  const exportData = async (videoData: VideoData[]): Promise<{ success: boolean; message: string }> => {
    if (videoData.length === 0) {
      return { success: false, message: '❌ 没有可导出的数据，请先刷新数据' };
    }

    try {
      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        videoData: videoData,
        totalCount: videoData.length
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

      return { success: true, message: `✅ 已导出 ${videoData.length} 个视频数据` };
    } catch (error) {
      console.error('[ERROR] 导出数据失败:', error);
      return { success: false, message: '❌ 导出数据失败' };
    }
  };

  /**
   * 触发文件选择
   */
  const triggerImport = (): void => {
    fileInput.value?.click();
  };

  /**
   * 处理文件导入
   */
  const handleFileImport = async (file: File): Promise<{ success: boolean; message: string; data?: VideoData[] }> => {
    if (file.type !== 'application/json') {
      return { success: false, message: '❌ 请选择JSON格式的文件' };
    }

    return new Promise((resolve) => {
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
              isLooping: false
            }
          });

          resolve({
            success: true,
            message: `✅ 成功导入 ${dataWithOriginalIndex.length} 个视频数据`,
            data: dataWithOriginalIndex
          });
        } catch (error: any) {
          console.error('[ERROR] 导入数据失败:', error);
          resolve({
            success: false,
            message: `❌ 导入数据失败: ${error.message}`
          });
        }
      };

      reader.readAsText(file);
    });
  };

  return {
    fileInput,
    exportData,
    triggerImport,
    handleFileImport
  };
}
import { defineConfig } from 'wxt';

// WXT配置文件 - 定义扩展权限和设置
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    permissions: [
      'activeTab',
      'storage',
      'tabs'
    ],
    host_permissions: [
      '*://*.bilibili.com/*'
    ],
    name: 'Bilibili视频循环播放器',
    description: '自动循环播放Bilibili视频列表，支持乱序播放和自定义等待时间',
    version: '1.0.0'
  }
});
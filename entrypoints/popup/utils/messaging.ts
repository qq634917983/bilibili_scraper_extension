/**
 * 发送消息到background script
 */
export const sendMessage = (message: any): Promise<any> => {
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
export const sendMessageToTab = (message: any): Promise<any> => {
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
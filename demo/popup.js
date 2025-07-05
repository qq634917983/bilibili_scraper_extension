// Popup script - 只负责UI和显示，通过消息与background script通信
console.log("[DEBUG] Popup script 已加载");

// 初始化UI管理器
document.addEventListener('DOMContentLoaded', function() {
    console.log("[DEBUG] Popup DOM 已加载");
    
    try {
        // 创建全局UI管理器实例
        window.uiManager = new UIManager();
        console.log("[DEBUG] UI管理器初始化成功");
    } catch (error) {
        console.error("[ERROR] UI管理器初始化失败:", error);
        
        // 显示错误信息
        const output = document.getElementById('output');
        if (output) {
            output.textContent = "❌ 初始化失败: " + error.message;
        }
        
        // 禁用所有按钮
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = true;
        });
    }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', function() {
    console.log("[DEBUG] Popup 页面即将卸载，清理资源");
    
    if (window.uiManager && window.uiManager.countdownUpdateInterval) {
        clearInterval(window.uiManager.countdownUpdateInterval);
        window.uiManager.countdownUpdateInterval = null;
    }
});
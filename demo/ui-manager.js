// UI管理器 - 负责所有UI相关的操作
class UIManager {
    constructor() {
        this.output = null;
        this.tableBody = null;
        this.randomRangeInput = null;
        this.startLoopButton = null;
        this.stopLoopButton = null;
        this.refreshDataButton = null;
        this.shuffleDataButton = null;
        this.quickStopButton = null;
        this.exportDataButton = null;
        this.importDataButton = null;
        this.fileInput = null;
        
        this.countdownUpdateInterval = null;
        this.currentVideoUpdateInterval = null;
        
        // 时间选择器相关属性
        this.currentEditingIndex = -1;
        this.timePickerOverlay = null;
        
        // 循环次数弹窗相关属性
        this.loopCountOverlay = null;
        this.loopCountInput = null;
        this.confirmLoopBtn = null;
        this.cancelLoopBtn = null;
        
        this.init();
    }
    
    /**
     * 初始化UI管理器
     */
    init() {
        this.getElements();
        this.setupEventListeners();
        this.loadState();
        this.updateButtonState();
        this.startCountdownUpdate();
        this.startCurrentVideoUpdate();
        this.initializeTimePicker();
    }
    
    /**
     * 获取DOM元素
     */
    getElements() {
        this.output = document.getElementById('output');
        this.tableBody = document.getElementById('tableBody');
        this.randomRangeInput = document.getElementById('randomRange');
        this.startLoopButton = document.getElementById('startLoop');
        this.stopLoopButton = document.getElementById('stopLoop');
        this.refreshDataButton = document.getElementById('refreshData');
        this.shuffleDataButton = document.getElementById('shuffleData');
        this.quickStopButton = document.getElementById('quickStop');
        this.exportDataButton = document.getElementById('exportData');
        this.importDataButton = document.getElementById('importData');
        this.fileInput = document.getElementById('fileInput');
        
        // 循环次数弹窗元素
        this.loopCountOverlay = document.getElementById('loopCountOverlay');
        this.loopCountInput = document.getElementById('loopCountInput');
        this.confirmLoopBtn = document.getElementById('confirmLoopBtn');
        this.cancelLoopBtn = document.getElementById('cancelLoopBtn');
        
        if (!this.startLoopButton || !this.stopLoopButton || !this.refreshDataButton || !this.shuffleDataButton) {
            console.error("[ERROR] 关键按钮元素未找到！");
            if (this.output) this.output.textContent = "错误：找不到按钮元素";
            throw new Error("关键按钮元素未找到");
        }
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.startLoopButton.addEventListener('click', () => this.showLoopCountDialog());
        this.stopLoopButton.addEventListener('click', () => this.handleStopLoop());
        this.refreshDataButton.addEventListener('click', () => this.handleRefreshData());
        this.shuffleDataButton.addEventListener('click', () => this.handleShuffleData());
        
        // 导出/导入按钮事件
        if (this.exportDataButton) {
            this.exportDataButton.addEventListener('click', () => this.handleExportData());
        }
        if (this.importDataButton) {
            this.importDataButton.addEventListener('click', () => this.handleImportData());
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        // 循环次数弹窗事件
        if (this.confirmLoopBtn) {
            this.confirmLoopBtn.addEventListener('click', () => this.confirmLoopCount());
        }
        if (this.cancelLoopBtn) {
            this.cancelLoopBtn.addEventListener('click', () => this.hideLoopCountDialog());
        }
        if (this.loopCountOverlay) {
            this.loopCountOverlay.addEventListener('click', (e) => {
                if (e.target === this.loopCountOverlay) {
                    this.hideLoopCountDialog();
                }
            });
        }
        
        // 随机范围输入框事件
        if (this.randomRangeInput) {
            this.randomRangeInput.addEventListener('input', () => this.handleRandomRangeChange());
        }
        
        // 快速停止按钮事件
        if (this.quickStopButton) {
            this.quickStopButton.addEventListener('click', () => this.handleStopLoop());
        }
    }
    
    /**
     * 显示循环次数输入弹窗
     */
    showLoopCountDialog() {
        const overlay = document.getElementById('loopCountOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            // 重置输入框
            const input = document.getElementById('loopCountInput');
            if (input) {
                input.value = '1';
                input.focus();
            }
        }
    }

    /**
     * 隐藏循环次数输入弹窗
     */
    hideLoopCountDialog() {
        const overlay = document.getElementById('loopCountOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * 确认循环次数并开始循环
     */
    confirmLoopCount() {
        const input = document.getElementById('loopCountInput');
        const loopCount = parseInt(input?.value) || 1;
        
        this.hideLoopCountDialog();
        
        console.log(`[SUCCESS] 设置循环次数: ${loopCount}`);
        
        // 检查是否有视频数据
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response && response.videoData && response.videoData.length > 0) {
                // 有视频数据，开始自动循环
                const data = {
                    videoData: response.videoData,
                    currentIndex: response.currentIndex || 0,
                    randomRange: this.randomRangeInput?.value || '0',
                    loopCount: loopCount
                };
                
                this.sendMessage({
                    type: "START_LOOP",
                    data: data
                }, (result) => {
                    if (result && result.success) {
                        console.log("[DEBUG] 自动循环开始成功");
                        this.updateButtonState();
                        if (this.output) {
                            const loopText = loopCount === 0 ? '无限' : loopCount;
                            this.output.textContent = `🔄 自动循环已开始！循环次数: ${loopText}，从第 ${data.currentIndex + 1} 个视频开始`;
                        }
                    } else {
                        console.error("[ERROR] 开始循环失败");
                        if (this.output) {
                            this.output.textContent = "❌ 开始循环失败";
                        }
                    }
                });
            } else {
                if (this.output) {
                    this.output.textContent = "❌ 请先点击'刷新数据'获取视频列表";
                }
            }
        });
    }

    /**
     * 处理数据导出
     */
    handleExportData() {
        console.log("[SUCCESS] 导出数据按钮被点击");
        
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response && response.videoData && response.videoData.length > 0) {
                try {
                    const exportData = {
                        version: "1.0",
                        exportTime: new Date().toISOString(),
                        videoData: response.videoData,
                        totalCount: response.videoData.length
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
                    
                    if (this.output) {
                        this.output.textContent = `✅ 已导出 ${response.videoData.length} 个视频数据`;
                    }
                    
                    console.log("[DEBUG] 数据导出成功");
                } catch (error) {
                    console.error("[ERROR] 导出数据失败:", error);
                    if (this.output) {
                        this.output.textContent = "❌ 导出数据失败";
                    }
                }
            } else {
                if (this.output) {
                    this.output.textContent = "❌ 没有可导出的数据，请先刷新数据";
                }
            }
        });
    }

    /**
     * 处理数据导入
     */
    handleImportData() {
        console.log("[SUCCESS] 导入数据按钮被点击");
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.type !== 'application/json') {
            if (this.output) {
                this.output.textContent = "❌ 请选择JSON格式的文件";
            }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.videoData || !Array.isArray(importData.videoData)) {
                    throw new Error("无效的数据格式");
                }
                
                // 验证数据结构
                const validData = importData.videoData.filter(item => 
                    item && item.name && item.url && typeof item.stayTime === 'number'
                );
                
                if (validData.length === 0) {
                    throw new Error("没有找到有效的视频数据");
                }
                
                // 更新background中的数据
                this.sendMessage({
                    type: "UPDATE_DATA",
                    data: {
                        videoData: validData,
                        currentIndex: 0,
                        isLooping: false,
                        randomRange: this.randomRangeInput?.value || '0'
                    }
                }, (result) => {
                    if (result && result.success) {
                        this.updateTable(validData);
                        this.updateButtonState();
                        
                        if (this.output) {
                            this.output.textContent = `✅ 成功导入 ${validData.length} 个视频数据`;
                        }
                        
                        console.log("[DEBUG] 数据导入成功");
                    } else {
                        throw new Error("更新数据失败");
                    }
                });
                
            } catch (error) {
                console.error("[ERROR] 导入数据失败:", error);
                if (this.output) {
                    this.output.textContent = `❌ 导入数据失败: ${error.message}`;
                }
            }
        };
        
        reader.readAsText(file);
        
        // 清空文件输入，允许重复选择同一文件
        event.target.value = '';
    }
    
    /**
     * 处理停止循环
     */
    handleStopLoop() {
        console.log("[SUCCESS] 停止循环按钮被点击");
        
        this.sendMessage({ type: "STOP_LOOP" }, (response) => {
            if (response && response.success) {
                console.log("[DEBUG] Background script 停止循环成功");
                this.updateButtonState();
                
                if (this.output) {
                    this.output.textContent = "⏹️ 循环已停止";
                }
            }
        });
    }
    
    /**
     * 处理刷新数据
     */
    handleRefreshData() {
        console.log("[SUCCESS] 刷新数据按钮被点击 - 初始化插件");
        
        // 禁用刷新按钮
        if (this.refreshDataButton) {
            this.refreshDataButton.disabled = true;
            this.refreshDataButton.textContent = "🔄 初始化中...";
        }
        
        if (this.output) {
            this.output.textContent = "🔄 正在初始化插件数据...";
        }
        
        if (this.tableBody) {
            this.tableBody.innerHTML = '<tr><td colspan="5">正在初始化...</td></tr>';
        }
        
        // 先停止任何正在进行的循环
        this.sendMessage({ type: "STOP_LOOP" }, (stopResponse) => {
            console.log("[DEBUG] 停止之前的循环状态");
            
            // 清除当前视频信息显示
            this.clearCurrentVideoInfo();
            
            // 主动请求新数据
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_SCRAPER_DATA" }, (response) => {
                        // 恢复刷新按钮状态
                        if (this.refreshDataButton) {
                            this.refreshDataButton.disabled = false;
                            this.refreshDataButton.textContent = "🔄 刷新数据";
                        }
                        
                        if (chrome.runtime.lastError) {
                            console.error("[DEBUG] 刷新时通信错误:", chrome.runtime.lastError.message);
                            if (this.output) {
                                this.output.textContent = "❌ 无法与页面通信，请确保在 Bilibili 视频页面上";
                            }
                            if (this.tableBody) {
                                this.tableBody.innerHTML = '<tr><td colspan="5">初始化失败</td></tr>';
                            }
                            return;
                        }
                        
                        if (response && response.type === "BV_SCRAPER_DATA") {
                            if (response.error) {
                                console.log("[DEBUG] 刷新时收到错误:", response.error);
                                if (this.output) this.output.textContent = `❌ ${response.error}`;
                                if (this.tableBody) this.tableBody.innerHTML = '<tr><td colspan="5">无数据</td></tr>';
                            } else {
                                console.log("[DEBUG] 初始化成功，收到视频数据，数量:", response.data.length);
                                
                                // 完全重置background中的数据
                                this.sendMessage({
                                    type: "UPDATE_DATA",
                                    data: {
                                        videoData: response.data,
                                        currentIndex: 0, // 重置为第一个视频
                                        isLooping: false, // 确保循环状态为false
                                        randomRange: this.randomRangeInput?.value || '0'
                                    }
                                }, (result) => {
                                    if (result && result.success) {
                                        // 更新表格
                                        this.updateTable(response.data);
                                        
                                        // 重置按钮状态
                                        this.updateButtonState();
                                        
                                        if (this.output) {
                                            this.output.textContent = `✅ 初始化完成！已获取 ${response.data.length} 个视频数据，循环已停止`;
                                        }
                                        
                                        console.log("[DEBUG] 插件初始化完成");
                                    }
                                });
                            }
                        } else {
                            console.log("[DEBUG] 刷新时未收到有效响应");
                            if (this.output) {
                                this.output.textContent = "❌ 初始化失败，未收到有效数据";
                            }
                            if (this.tableBody) {
                                this.tableBody.innerHTML = '<tr><td colspan="5">初始化失败</td></tr>';
                            }
                        }
                    });
                } else {
                    // 恢复刷新按钮状态
                    if (this.refreshDataButton) {
                        this.refreshDataButton.disabled = false;
                        this.refreshDataButton.textContent = "🔄 刷新数据";
                    }
                    
                    if (this.output) {
                        this.output.textContent = "❌ 无法获取当前标签页";
                    }
                    if (this.tableBody) {
                        this.tableBody.innerHTML = '<tr><td colspan="5">无法获取标签页</td></tr>';
                    }
                }
            });
        });
    }
    
    /**
     * 处理乱序排列
     */
    handleShuffleData() {
        console.log("[SUCCESS] 乱序排列按钮被点击");
        
        // 禁用乱序按钮
        if (this.shuffleDataButton) {
            this.shuffleDataButton.disabled = true;
            this.shuffleDataButton.textContent = "🔀 乱序中...";
        }
        
        if (this.output) {
            this.output.textContent = "🔀 正在乱序排列视频数据...";
        }
        
        this.sendMessage({ type: "SHUFFLE_DATA" }, (response) => {
            if (response && response.success) {
                console.log("[DEBUG] Background script 乱序完成");
                
                // 获取更新后的数据
                this.sendMessage({ type: "GET_STATE" }, (stateResponse) => {
                    if (stateResponse && stateResponse.videoData) {
                        this.updateTable(stateResponse.videoData);
                        
                        // 恢复乱序按钮状态
                        if (this.shuffleDataButton) {
                            this.shuffleDataButton.disabled = false;
                            this.shuffleDataButton.textContent = "🔀 乱序排列";
                        }
                        
                        // 更新状态显示
                        if (this.output) {
                            if (stateResponse.isLooping) {
                                this.output.textContent = `✅ 乱序排列完成！已重新排列 ${stateResponse.videoData.length} 个视频，循环播放将按新顺序进行`;
                            } else {
                                this.output.textContent = `✅ 乱序排列完成！已重新排列 ${stateResponse.videoData.length} 个视频`;
                            }
                        }
                        
                        console.log("[DEBUG] 乱序排列完成，数据量:", stateResponse.videoData.length);
                    }
                });
            } else {
                // 恢复乱序按钮状态
                if (this.shuffleDataButton) {
                    this.shuffleDataButton.disabled = false;
                    this.shuffleDataButton.textContent = "🔀 乱序排列";
                }
                
                if (this.output) {
                    this.output.textContent = "❌ 乱序排列失败";
                }
            }
        });
    }
    
    /**
     * 处理随机范围变化
     */
    handleRandomRangeChange() {
        const randomRange = this.randomRangeInput?.value || '0';
        
        this.sendMessage({
            type: "UPDATE_RANDOM_RANGE",
            randomRange: randomRange
        });
        
        // 更新表格显示
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response && response.videoData) {
                this.updateTable(response.videoData);
            }
        });
    }
    
    /**
     * 发送消息到background script
     */
    sendMessage(message, callback) {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[ERROR] 无法连接到background script:', chrome.runtime.lastError.message);
                if (callback) callback(null);
                return;
            }
            
            if (callback) callback(response);
        });
    }
    
    /**
     * 加载状态
     */
    loadState() {
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response) {
                console.log('[DEBUG] 从background获取状态:', response);
                
                // 恢复UI状态
                if (this.randomRangeInput && response.randomRange) {
                    this.randomRangeInput.value = response.randomRange;
                }
                
                // 更新表格
                if (response.videoData && response.videoData.length > 0) {
                    this.updateTable(response.videoData);
                    if (this.output && !response.isLooping) {
                        this.output.textContent = `✅ 已加载 ${response.videoData.length} 个视频数据`;
                    }
                }
                
                console.log(`[DEBUG] 状态恢复完成 - 视频数量: ${response.videoData?.length || 0}, 循环状态: ${response.isLooping}`);
            }
        });
    }
    
    /**
     * 更新按钮状态
     */
    updateButtonState() {
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response) {
                if (response.isLooping) {
                    this.startLoopButton.disabled = true;
                    this.stopLoopButton.disabled = false;
                    // 显示快速停止按钮
                    if (this.quickStopButton) {
                        this.quickStopButton.classList.add('show');
                    }
                    if (this.output) {
                        this.output.textContent = `🔄 循环进行中... (${response.currentIndex + 1}/${response.videoData.length})`;
                    }
                } else {
                    this.startLoopButton.disabled = false;
                    this.stopLoopButton.disabled = true;
                    // 隐藏快速停止按钮
                    if (this.quickStopButton) {
                        this.quickStopButton.classList.remove('show');
                    }
                }
                
                // 刷新和乱序按钮始终可用
                if (this.refreshDataButton) this.refreshDataButton.disabled = false;
                if (this.shuffleDataButton) this.shuffleDataButton.disabled = false;
            }
        });
    }
    
    /**
     * 开始倒计时更新
     */
    startCountdownUpdate() {
        if (this.countdownUpdateInterval) {
            clearInterval(this.countdownUpdateInterval);
        }
        
        this.countdownUpdateInterval = setInterval(() => {
            this.sendMessage({ type: "GET_STATE" }, (response) => {
                if (response && response.countdownTime !== undefined) {
                    this.updateCountdownDisplay(response.countdownTime, response.currentIndex);
                    
                    // 同时更新高亮显示
                    this.highlightCurrentVideo();
                    
                    if (response.countdownTime <= 0) {
                        clearInterval(this.countdownUpdateInterval);
                        this.countdownUpdateInterval = null;
                    }
                }
            });
        }, 1000);
    }
    
    /**
     * 更新倒计时显示
     */
    updateCountdownDisplay(countdownTime, currentIndex) {
        const countdownCell = document.querySelector(`#countdown-${currentIndex}`);
        if (countdownCell) {
            if (countdownTime > 0) {
                countdownCell.textContent = countdownTime;
                countdownCell.className = 'countdown active';
            } else {
                countdownCell.textContent = '-';
                countdownCell.className = 'countdown';
            }
        }
    }
    
    /**
     * 初始化时间选择器
     */
    initializeTimePicker() {
        this.timePickerOverlay = $('#timePickerOverlay');
        
        // 确认按钮事件
        $('#confirmTimeBtn').on('click', () => {
            this.confirmTimeSelection();
        });
        
        // 取消按钮事件
        $('#cancelTimeBtn').on('click', () => {
            this.closeTimePicker();
        });
        
        // 点击遮罩层关闭弹窗
        this.timePickerOverlay.on('click', (e) => {
            if (e.target === this.timePickerOverlay[0]) {
                this.closeTimePicker();
            }
        });
        
        // 输入框限制
        $('#hoursInput').on('input', function() {
            let val = parseInt($(this).val());
            if (val > 23) $(this).val(23);
            if (val < 0) $(this).val(0);
        });
        
        $('#minutesInput, #secondsInput').on('input', function() {
            let val = parseInt($(this).val());
            if (val > 59) $(this).val(59);
            if (val < 0) $(this).val(0);
        });
    }

    /**
     * 更新表格数据
     */
    updateTable(data) {
        console.log("[DEBUG] 更新表格，数据量:", data.length);
        if (!this.tableBody) return;
        
        const randomRange = parseInt(this.randomRangeInput?.value) || 0;
        this.tableBody.innerHTML = '';
        
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.id = `video-row-${index}`;
            row.className = 'video-row';
            row.style.cursor = 'pointer';
            
            // 格式化视频时长
            const formattedDuration = this.formatTime(item.stayTime || 0);
            
            // 格式化播放时长显示
            const playDurationDisplay = item.playDuration ? this.formatTime(item.playDuration) : '-';
            
            // 判断是否在随机范围内
            const isInRange = randomRange === 0 || index < randomRange;
            const rangeClass = isInRange ? 'in-range' : 'out-of-range';
            
            row.innerHTML = `
                <td class="${rangeClass}">${index + 1}</td>
                <td class="${rangeClass}">
                    <div class="display-content">
                        <span class="video-name" title="${item.name}">${item.name}</span>
                    </div>
                    <div class="edit-form" style="display: none;">
                        <input type="text" class="edit-input" value="${item.name}" />
                        <button class="save-btn" onclick="uiManager.saveEdit(${index})">保存</button>
                        <button class="cancel-btn" onclick="uiManager.cancelEdit(${index})">取消</button>
                    </div>
                </td>
                <td class="${rangeClass}">
                    <span class="duration-display" onclick="uiManager.openTimePicker(${index}, ${Math.floor((item.stayTime || 0) / 1000)})">
                        ${formattedDuration}
                    </span>
                </td>
                <td class="${rangeClass}">${playDurationDisplay}</td>
                <td class="${rangeClass}">
                    <span id="countdown-${index}" class="countdown">-</span>
                </td>
            `;
            
            // 添加点击事件
            row.addEventListener('click', (e) => {
                // 如果点击的是编辑相关元素，不触发跳转
                if (e.target.closest('.edit-form') || e.target.closest('.duration-display')) {
                    return;
                }
                this.jumpToVideo(item.url, item.name, index);
            });
            
            this.tableBody.appendChild(row);
        });
    }
    
    /**
     * 打开时间选择器
     */
    openTimePicker(index, currentSeconds = 0) {
        this.currentEditingIndex = index;
        
        // 计算时分秒
        const hours = Math.floor(currentSeconds / 3600);
        const minutes = Math.floor((currentSeconds % 3600) / 60);
        const seconds = currentSeconds % 60;
        
        // 设置输入框值
        $('#hoursInput').val(hours);
        $('#minutesInput').val(minutes);
        $('#secondsInput').val(seconds);
        
        // 显示弹窗
        this.timePickerOverlay.css('display', 'flex');
        
        // 聚焦到小时输入框
        setTimeout(() => {
            $('#hoursInput').focus().select();
        }, 100);
    }
    
    /**
     * 确认时间选择
     */
    confirmTimeSelection() {
        const hours = parseInt($('#hoursInput').val()) || 0;
        const minutes = parseInt($('#minutesInput').val()) || 0;
        const seconds = parseInt($('#secondsInput').val()) || 0;
        
        const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        
        if (totalMs <= 0) {
            alert('请输入有效的时间');
            return;
        }
        
        // 更新数据
        this.sendMessage({
            type: "UPDATE_VIDEO_DURATION",
            index: this.currentEditingIndex,
            duration: totalMs
        }, (response) => {
            if (response && response.success) {
                // 重新加载表格
                this.sendMessage({ type: "GET_STATE" }, (stateResponse) => {
                    if (stateResponse && stateResponse.videoData) {
                        this.updateTable(stateResponse.videoData);
                    }
                });
            }
        });
        
        this.closeTimePicker();
    }
    
    /**
     * 关闭时间选择器
     */
    closeTimePicker() {
        this.timePickerOverlay.css('display', 'none');
        this.currentEditingIndex = -1;
    }
    
    /**
     * 高亮当前播放的视频
     */
    highlightCurrentVideo() {
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response && response.isLooping) {
                // 移除所有高亮
                document.querySelectorAll('.video-row').forEach(row => {
                    row.classList.remove('current-playing');
                });
                
                // 高亮当前视频
                const currentRow = document.querySelector(`#video-row-${response.currentIndex}`);
                if (currentRow) {
                    currentRow.classList.add('current-playing');
                }
            } else {
                // 如果没有循环，移除所有高亮
                document.querySelectorAll('.video-row').forEach(row => {
                    row.classList.remove('current-playing');
                });
            }
        });
    }
    
    /**
     * 格式化时间显示
     */
    formatTime(ms) {
        if (!ms || ms <= 0) return '0:00';
        
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * 编辑视频名称
     */
    editVideo(index) {
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response && response.videoData && response.videoData[index]) {
                const video = response.videoData[index];
                const row = document.querySelector(`#video-row-${index}`);
                if (!row) return;
                
                // 隐藏显示内容，显示编辑表单
                const displayContent = row.querySelector('.display-content');
                const editForm = row.querySelector('.edit-form');
                
                if (displayContent && editForm) {
                    displayContent.style.display = 'none';
                    editForm.style.display = 'block';
                    
                    // 聚焦到输入框
                    const input = editForm.querySelector('.edit-input');
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }
            }
        });
    }
    
    /**
     * 保存编辑
     */
    saveEdit(index) {
        const row = document.querySelector(`#video-row-${index}`);
        if (!row) return;
        
        const input = row.querySelector('.edit-input');
        const newName = input?.value?.trim();
        
        if (!newName) {
            alert('视频名称不能为空');
            return;
        }
        
        // 更新数据
        this.sendMessage({
            type: "UPDATE_VIDEO_NAME",
            index: index,
            name: newName
        }, (response) => {
            if (response && response.success) {
                // 更新显示
                const displayContent = row.querySelector('.display-content');
                const editForm = row.querySelector('.edit-form');
                const videoName = row.querySelector('.video-name');
                
                if (displayContent && editForm && videoName) {
                    videoName.textContent = newName;
                    videoName.title = newName;
                    
                    displayContent.style.display = 'block';
                    editForm.style.display = 'none';
                }
            } else {
                alert('保存失败');
            }
        });
    }
    
    /**
     * 取消编辑
     */
    cancelEdit(index) {
        const row = document.querySelector(`#video-row-${index}`);
        if (!row) return;
        
        const displayContent = row.querySelector('.display-content');
        const editForm = row.querySelector('.edit-form');
        
        if (displayContent && editForm) {
            displayContent.style.display = 'block';
            editForm.style.display = 'none';
        }
    }
    
    /**
     * 开始当前视频信息更新
     */
    startCurrentVideoUpdate() {
        if (this.currentVideoUpdateInterval) {
            clearInterval(this.currentVideoUpdateInterval);
        }
        
        this.currentVideoUpdateInterval = setInterval(() => {
            this.updateCurrentVideoInfo();
        }, 2000);
        
        // 立即执行一次
        this.updateCurrentVideoInfo();
    }
    
    /**
     * 更新当前视频信息显示
     */
    updateCurrentVideoInfo() {
        this.sendMessage({ type: "GET_STATE" }, (response) => {
            if (response && response.isLooping && response.videoData && response.videoData.length > 0) {
                const currentVideo = response.videoData[response.currentIndex];
                if (currentVideo) {
                    this.displayCurrentVideoInfo(currentVideo, response.currentIndex, response.videoData.length, response.countdownTime);
                }
            } else {
                this.clearCurrentVideoInfo();
            }
        });
    }
    
    /**
     * 显示当前视频信息
     */
    displayCurrentVideoInfo(video, currentIndex, totalCount, countdownTime) {
        let currentVideoDisplay = document.getElementById('currentVideoDisplay');
        
        if (!currentVideoDisplay) {
            currentVideoDisplay = document.createElement('div');
            currentVideoDisplay.id = 'currentVideoDisplay';
            currentVideoDisplay.className = 'current-video-display';
            
            // 插入到controls和output之间
            const controls = document.querySelector('.controls');
            const output = document.getElementById('output');
            if (controls && output) {
                controls.parentNode.insertBefore(currentVideoDisplay, output);
            }
        }
        
        const countdownDisplay = countdownTime > 0 ? `${countdownTime}s` : '准备中...';
        
        currentVideoDisplay.innerHTML = `
            <div class="video-title">
                <span class="playing-indicator">▶</span>
                <span class="video-name">${video.name}</span>
            </div>
            <div class="video-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${countdownTime > 0 ? ((video.stayTime / 1000 - countdownTime) / (video.stayTime / 1000)) * 100 : 0}%"></div>
                </div>
                <div class="time-info">
                    <span class="countdown-time">${countdownDisplay}</span>
                    <span class="total-time">${this.formatTime(video.stayTime)}</span>
                </div>
            </div>
            <div class="video-id">${currentIndex + 1}/${totalCount}</div>
            <button class="quick-stop" onclick="uiManager.handleStopLoop()">快速停止</button>
        `;
    }
    
    /**
     * 清除当前视频信息显示
     */
    clearCurrentVideoInfo() {
        const currentVideoDisplay = document.getElementById('currentVideoDisplay');
        if (currentVideoDisplay) {
            currentVideoDisplay.remove();
        }
    }
    
    /**
     * 跳转到指定视频
     */
    jumpToVideo(url, videoName, index) {
        console.log(`[DEBUG] 手动跳转到视频: ${videoName} (${url})`);
        
        if (this.output) {
            this.output.textContent = `🔄 正在跳转到: ${videoName}`;
        }
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.update(tabs[0].id, { url: url }, (tab) => {
                    if (chrome.runtime.lastError) {
                        console.error('[ERROR] 跳转失败:', chrome.runtime.lastError.message);
                        if (this.output) {
                            this.output.textContent = `❌ 跳转失败: ${chrome.runtime.lastError.message}`;
                        }
                    } else {
                        console.log('[DEBUG] 跳转成功');
                        
                        // 更新当前索引
                        this.sendMessage({
                            type: "UPDATE_CURRENT_INDEX",
                            index: index
                        }, (response) => {
                            if (response && response.success) {
                                console.log(`[DEBUG] 当前索引已更新为: ${index}`);
                                
                                // 更新表格高亮
                                this.highlightCurrentVideo();
                                
                                if (this.output) {
                                    this.output.textContent = `✅ 已跳转到: ${videoName} (${index + 1}/${response.totalCount || '?'})`;
                                }
                            }
                        });
                    }
                });
            } else {
                if (this.output) {
                    this.output.textContent = "❌ 无法获取当前标签页";
                }
            }
        });
    }
}

// 全局UI管理器实例
let uiManager;
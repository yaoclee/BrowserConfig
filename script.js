class TimeFocusApp {
    constructor() {
        this.tasks = [];
        this.schedule = [];
        this.currentSessionType = 'work'; // 'work', 'short-break', 'long-break'
        this.completedSessions = 0;
        this.favoriteTasks = [];
        this.isRunning = false;
        this.isPaused = false;
        this.timeRemaining = 25 * 60; // 25 minutes in seconds
        this.timerInterval = null;
        this.isBreakTime = false;
        
        // Background support - track actual start time
        this.timerStartTime = null;
        this.timerDuration = 25 * 60; // Total duration in seconds
        this.pausedTime = 0; // Time spent paused
        
        // Default settings - will be loaded from localStorage or defaults
        this.settings = {
            workDuration: 25,      // minutes
            shortBreakDuration: 5, // minutes
            longBreakDuration: 15, // minutes
            longBreakInterval: 4,  // every nth break is long
            notificationsEnabled: true,
            soundEnabled: true
        };
        
        this.workDuration = this.settings.workDuration * 60; // convert to seconds
        this.breakDuration = this.settings.shortBreakDuration * 60;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.setDefaultStartTime();
        
        // Load timer state (must be after settings)
        this.loadTimerState();
        
        this.updateDisplay();
        this.updateToggleButton(); // Initialize button state
        this.updateSessionButtons(); // Initialize session buttons
        this.updateCurrentTask(); // Initialize current task display
        this.updateProgressRing(); // Initialize progress ring
        this.detectSafariAndInitializeControls(); // Initialize custom number input buttons only for Safari
        this.parsedTasks = []; // Store parsed tasks for preview
        
        // Add page visibility listener for background support
        this.addVisibilityListener();
    }

    initializeElements() {
        // Task input elements
        this.taskDescriptionInput = document.getElementById('taskDescription');
        this.taskCountInput = document.getElementById('taskCount');
        this.taskCountUpBtn = document.getElementById('taskCountUp');
        this.taskCountDownBtn = document.getElementById('taskCountDown');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.taskList = document.getElementById('taskList');
        this.startTimeInput = document.getElementById('startTime');
        this.startNowBtn = document.getElementById('startNowBtn');

        // Timer elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.timerLabel = document.getElementById('timerLabel');
        this.toggleBtn = document.getElementById('toggleBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.workBtn = document.getElementById('workBtn');
        this.shortBreakBtn = document.getElementById('shortBreakBtn');
        this.longBreakBtn = document.getElementById('longBreakBtn');
        this.autoStartBreak = document.getElementById('autoStartBreak');
        this.autoStartWork = document.getElementById('autoStartWork');
        this.currentTaskName = document.getElementById('currentTaskName');
        this.taskProgress = document.getElementById('taskProgress');
        this.progressRing = document.querySelector('.progress-ring-circle');


        // Bulk import elements
        this.bulkImportBtn = document.getElementById('bulkImportBtn');
        this.bulkImportModal = document.getElementById('bulkImportModal');
        this.closeModal = document.getElementById('closeModal');
        this.bulkTaskInput = document.getElementById('bulkTaskInput');
        this.taskPreview = document.getElementById('taskPreview');
        this.cancelImport = document.getElementById('cancelImport');
        this.confirmImport = document.getElementById('confirmImport');
        this.totalTimeDisplay = document.getElementById('totalTimeDisplay');

        // Settings elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.workDurationInput = document.getElementById('workDurationInput');
        this.shortBreakInput = document.getElementById('shortBreakInput');
        this.longBreakInput = document.getElementById('longBreakInput');
        this.longBreakIntervalInput = document.getElementById('longBreakIntervalInput');
        this.notificationsEnabled = document.getElementById('notificationsEnabled');
        this.soundEnabled = document.getElementById('soundEnabled');
        this.schedulePreview = document.getElementById('schedulePreview');
        this.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    }

    bindEvents() {
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskDescriptionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        // Custom number input controls (will only work in Safari)
        if (this.taskCountUpBtn && this.taskCountDownBtn) {
            this.taskCountUpBtn.addEventListener('click', () => this.incrementTaskCount());
            this.taskCountDownBtn.addEventListener('click', () => this.decrementTaskCount());
            
            // Update button states when input value changes (Safari only)
            this.taskCountInput.addEventListener('input', () => this.updateTaskCountButtons());
            this.taskCountInput.addEventListener('change', () => this.updateTaskCountButtons());
        }
        
        this.startNowBtn.addEventListener('click', () => this.startNow());
        this.startTimeInput.addEventListener('change', () => this.onStartTimeChange());
        this.toggleBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        
        // Session selector events
        this.workBtn.addEventListener('click', () => this.switchSession('work'));
        this.shortBreakBtn.addEventListener('click', () => this.switchSession('short-break'));
        this.longBreakBtn.addEventListener('click', () => this.switchSession('long-break'));

        // Bulk import events
        this.bulkImportBtn.addEventListener('click', () => this.openBulkImportModal());
        this.closeModal.addEventListener('click', () => this.closeBulkImportModal());
        this.cancelImport.addEventListener('click', () => this.closeBulkImportModal());
        this.confirmImport.addEventListener('click', () => this.importParsedTasks());
        this.bulkTaskInput.addEventListener('input', () => this.parseAndPreviewTasks());

        // Close modal when clicking outside
        this.bulkImportModal.addEventListener('click', (e) => {
            if (e.target === this.bulkImportModal) {
                this.closeBulkImportModal();
            }
        });


        // Settings events
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.closeSettingsModal.addEventListener('click', () => this.closeSettings());
        this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        
        // Settings input events for live preview
        [this.workDurationInput, this.shortBreakInput, this.longBreakInput, this.longBreakIntervalInput].forEach(input => {
            input.addEventListener('input', () => this.updateSettingsPreview());
        });

        // Close settings modal when clicking outside
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    setDefaultStartTime() {
        this.startTimeInput.value = this.getCurrentTimeString();
    }

    getCurrentTimeString() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    onStartTimeChange() {
        // Auto-regenerate schedule when start time changes, but only if we have tasks
        if (this.tasks.length > 0) {
            // Add a visual indicator that the schedule is updating
            this.generateSchedule();
            
            // Show a brief notification
            this.showNotification('Schedule updated for new start time', 'info');
        }
    }

    startNow() {
        // Set start time to current time
        const currentTime = this.getCurrentTimeString();
        this.startTimeInput.value = currentTime;
        
        // If we have tasks, regenerate the schedule
        if (this.tasks.length > 0) {
            // Add visual feedback
            this.generateSchedule();
            
            // Show success notification
            this.showNotification('🕐 Schedule updated to start now!', 'success');
        } else {
            // If no tasks, just show a helpful message
            this.showNotification('Add some tasks first, then click "Start Now" to schedule them!', 'info');
        }
        
        // Add a brief animation to the button
        this.startNowBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.startNowBtn.style.transform = 'scale(1)';
        }, 150);
    }

    addTask() {
        const description = this.taskDescriptionInput.value.trim();
        const count = parseInt(this.taskCountInput.value) || 1;

        if (!description) {
            alert('Please enter a task description');
            return;
        }

        // Create a single task instead of splitting into multiple parts
        const task = {
            id: Date.now(),
            description: description, // Keep original description without parts
            originalDescription: description,
            count: count, // Store the count for scheduling purposes
            completed: false
        };
        this.tasks.push(task);

        this.taskDescriptionInput.value = '';
        this.taskCountInput.value = '1';
        this.renderTasks();
    }

    incrementTaskCount() {
        // Only work in Safari
        if (!document.body.classList.contains('safari-browser')) {
            return;
        }
        
        const currentValue = parseInt(this.taskCountInput.value) || 1;
        const maxValue = parseInt(this.taskCountInput.getAttribute('max')) || 10;
        
        if (currentValue < maxValue) {
            this.taskCountInput.value = currentValue + 1;
            this.updateTaskCountButtons();
        }
    }

    decrementTaskCount() {
        // Only work in Safari
        if (!document.body.classList.contains('safari-browser')) {
            return;
        }
        
        const currentValue = parseInt(this.taskCountInput.value) || 1;
        const minValue = parseInt(this.taskCountInput.getAttribute('min')) || 1;
        
        if (currentValue > minValue) {
            this.taskCountInput.value = currentValue - 1;
            this.updateTaskCountButtons();
        }
    }

    detectSafariAndInitializeControls() {
        // Detect Safari browser
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                        /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isSafari) {
            // Add Safari class to body for CSS targeting
            document.body.classList.add('safari-browser');
            
            // Initialize custom controls for Safari
            this.updateTaskCountButtons();
        } else {
            // For non-Safari browsers, remove the custom controls completely
            const numberControls = document.querySelector('.number-controls');
            if (numberControls) {
                numberControls.style.display = 'none';
            }
            
            // Ensure non-Safari browsers use standard width and padding
            if (this.taskCountInput) {
                this.taskCountInput.style.paddingRight = '8px';
                this.taskCountInput.style.width = '50px';
                this.taskCountInput.style.minWidth = '50px';
                this.taskCountInput.style.maxWidth = '50px';
                this.taskCountInput.style.flex = '0 0 50px';
            }
        }
    }

    updateTaskCountButtons() {
        // Only update if we're in Safari
        if (!document.body.classList.contains('safari-browser')) {
            return;
        }
        
        const currentValue = parseInt(this.taskCountInput.value) || 1;
        const minValue = parseInt(this.taskCountInput.getAttribute('min')) || 1;
        const maxValue = parseInt(this.taskCountInput.getAttribute('max')) || 10;
        
        // Disable/enable buttons based on current value
        this.taskCountDownBtn.disabled = currentValue <= minValue;
        this.taskCountUpBtn.disabled = currentValue >= maxValue;
    }

    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.renderTasks();
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Close menu first
        this.closeAllTaskMenus();

        // Create edit modal or use prompt for now
        const newDescription = prompt('Edit task description:', task.description);
        if (newDescription !== null && newDescription.trim()) {
            const newCount = prompt('Edit session count:', task.count);
            const count = parseInt(newCount);
            
            if (count && count > 0 && count <= 10) {
                task.description = newDescription.trim();
                task.count = count;
                this.renderTasks();
                this.showNotification('Task updated successfully!', 'success');
            } else if (newCount !== null) {
                alert('Session count must be between 1 and 10');
            }
        }
    }

    deleteTask(taskId) {
        // Close menu first
        this.closeAllTaskMenus();
        
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.renderTasks();
        }
    }

    breakdownTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        
        // Close menu first
        this.closeAllTaskMenus();
        
        if (task.count <= 1) {
            alert('This task only has one session and cannot be broken down');
            return;
        }
        
        if (!confirm(`Break down "${task.description}" into ${task.count} separate sub-tasks?`)) {
            return;
        }
        
        // Create sub-tasks
        const subTasks = [];
        for (let i = 1; i <= task.count; i++) {
            const subTask = {
                id: Date.now() + Math.random() + i, // Ensure unique IDs
                description: `${task.description} (Part ${i})`,
                originalDescription: task.originalDescription,
                count: 1, // Each sub-task has only 1 session
                completed: false
            };
            subTasks.push(subTask);
        }
        
        // Replace the original task with sub-tasks
        this.tasks.splice(taskIndex, 1, ...subTasks);
        
        // Re-schedule all tasks
        this.rescheduleAllTasks();
        
        // Update UI
        this.renderTasks();
        
        // Show success notification
        this.showNotification(`✅ Task broken down into ${task.count} sub-tasks!`, 'success');
    }

    rescheduleAllTasks() {
        // This method will be called to re-schedule all tasks after breakdown
        // The schedule will be automatically updated when renderTasks() is called
        // because it calls calculateTaskSchedule() which handles the new task structure
    }

    toggleTaskMenu(taskId) {
        const menu = document.getElementById(`menu-${taskId}`);
        if (!menu) return;

        // Close all other menus first
        this.closeAllTaskMenus();

        // Toggle current menu
        if (menu.style.display === 'none') {
            menu.style.display = 'block';
            // Add click outside listener
            setTimeout(() => {
                this.clickOutsideHandler = (event) => this.handleClickOutside(taskId, event);
                document.addEventListener('click', this.clickOutsideHandler);
            }, 0);
        } else {
            menu.style.display = 'none';
        }
    }

    closeAllTaskMenus() {
        const menus = document.querySelectorAll('.task-menu');
        menus.forEach(menu => {
            menu.style.display = 'none';
        });
        // Remove all click outside listeners
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
    }

    handleClickOutside(taskId, event) {
        const menu = document.getElementById(`menu-${taskId}`);
        const menuBtn = event.target.closest('.menu-btn');
        
        if (!menu.contains(event.target) && !menuBtn) {
            menu.style.display = 'none';
            if (this.clickOutsideHandler) {
                document.removeEventListener('click', this.clickOutsideHandler);
                this.clickOutsideHandler = null;
            }
        }
    }

    // Favorite Tasks Management
    isTaskFavorite(taskDescription) {
        return this.favoriteTasks.includes(taskDescription);
    }

    toggleFavorite(taskDescription) {
        const index = this.favoriteTasks.indexOf(taskDescription);
        if (index > -1) {
            // Remove from favorites
            this.favoriteTasks.splice(index, 1);
            this.showNotification('💔 Removed from favorites', 'info');
        } else {
            // Add to favorites
            this.favoriteTasks.push(taskDescription);
            this.showNotification('❤️ Added to favorites', 'success');
        }
        
        // Save to localStorage
        localStorage.setItem('timefocus-favorites', JSON.stringify(this.favoriteTasks));
        
        // Update UI
        this.renderTasks();
        this.renderFavoriteTasks();
    }

    addFavoriteToTasks(taskDescription) {
        const task = {
            id: Date.now(),
            description: taskDescription,
            originalDescription: taskDescription,
            count: 1, // Default count
            completed: false
        };
        this.tasks.push(task);
        this.renderTasks();
        this.showNotification(`✅ Added "${taskDescription}" to task list`, 'success');
    }

    removeFavoriteTask(taskDescription) {
        const index = this.favoriteTasks.indexOf(taskDescription);
        if (index > -1) {
            this.favoriteTasks.splice(index, 1);
            localStorage.setItem('timefocus-favorites', JSON.stringify(this.favoriteTasks));
            this.renderFavoriteTasks();
            this.showNotification('🗑️ Removed from favorites', 'info');
        }
    }

    renderFavoriteTasks() {
        const favoriteList = document.getElementById('favoriteTasksList');
        if (!favoriteList) return;

        if (this.favoriteTasks.length === 0) {
            favoriteList.innerHTML = '<p class="no-favorites">No favorite tasks yet. Click the ❤️ button on any task to add it to favorites!</p>';
            return;
        }

        const favoritesHtml = this.favoriteTasks.map(taskDescription => `
            <div class="favorite-task-item">
                <span class="favorite-task-description">${taskDescription}</span>
                <div class="favorite-task-actions">
                    <button class="add-to-tasks-btn" onclick="app.addFavoriteToTasks('${taskDescription.replace(/'/g, "\\'")}')" title="Add to task list">➕</button>
                    <button class="remove-favorite-btn" onclick="app.removeFavoriteTask('${taskDescription.replace(/'/g, "\\'")}')" title="Remove from favorites">🗑️</button>
                </div>
            </div>
        `).join('');

        favoriteList.innerHTML = favoritesHtml;
    }

    renderTasks() {
        if (this.tasks.length === 0) {
            this.taskList.innerHTML = '<p class="no-tasks">No tasks added yet</p>';
            return;
        }
        
        // Calculate schedule times for each task
        const taskSchedule = this.calculateTaskSchedule();
        
        // Render tasks (now each task is already individual)
        const tasksHtml = this.tasks.map((task, index) => {
            const scheduleInfo = taskSchedule[task.id] || {};
            const timeSpan = scheduleInfo.timeSpan || 'Not scheduled';
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''}">
                    <div class="task-checkbox">
                        <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''} 
                               onchange="app.toggleTaskCompletion(${task.id})">
                        <label for="task-${task.id}" class="checkbox-label-task"></label>
                    </div>
                    <div class="task-info">
                        <div class="task-description">${task.description}</div>
                        <div class="task-details">
                            <span class="task-count">${task.count * this.settings.workDuration} min (${task.count} session${task.count > 1 ? 's' : ''})</span>
                            <span class="task-schedule">${timeSpan}</span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="favorite-btn ${this.isTaskFavorite(task.description) ? 'favorited' : ''}" 
                                onclick="app.toggleFavorite('${task.description.replace(/'/g, "\\'")}')" 
                                title="${this.isTaskFavorite(task.description) ? 'Remove from favorites' : 'Add to favorites'}">
                            ${this.isTaskFavorite(task.description) ? '❤️' : '🤍'}
                        </button>
                        <button class="menu-btn" onclick="app.toggleTaskMenu(${task.id})" title="Task options">⋯</button>
                        <div class="task-menu" id="menu-${task.id}" style="display: none;">
                            ${task.count > 1 ? `<button class="menu-item breakdown-item" onclick="app.breakdownTask(${task.id})" title="Break down into sub-tasks"><span class="menu-icon">🔧</span><span class="menu-text">Break Down</span></button>` : ''}
                            <button class="menu-item edit-item" onclick="app.editTask(${task.id})" title="Edit task"><span class="menu-icon">✏️</span><span class="menu-text">Edit</span></button>
                            <button class="menu-item delete-item" onclick="app.deleteTask(${task.id})" title="Delete task"><span class="menu-icon">🗑️</span><span class="menu-text">Delete</span></button>
                            <button class="menu-item move-top-item" onclick="app.moveTaskToTop(${index})" title="Move to top" ${index === 0 ? 'disabled' : ''}><span class="menu-icon">⤴️</span><span class="menu-text">Move to Top</span></button>
                            <button class="menu-item move-up-item" onclick="app.moveTaskUp(${index})" title="Move up" ${index === 0 ? 'disabled' : ''}><span class="menu-icon">↑</span><span class="menu-text">Move Up</span></button>
                            <button class="menu-item move-down-item" onclick="app.moveTaskDown(${index})" title="Move down" ${index === this.tasks.length - 1 ? 'disabled' : ''}><span class="menu-icon">↓</span><span class="menu-text">Move Down</span></button>
                            <button class="menu-item move-bottom-item" onclick="app.moveTaskToBottom(${index})" title="Move to bottom" ${index === this.tasks.length - 1 ? 'disabled' : ''}><span class="menu-icon">⤵️</span><span class="menu-text">Move to Bottom</span></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.taskList.innerHTML = tasksHtml;
        
        // Update total time display in the start time section
        this.updateTotalTimeDisplay();
    }

    updateTotalTimeDisplay() {
        const totalTimeInfo = this.calculateTotalTime();
        
        if (!this.totalTimeDisplay) {
            console.error('totalTimeDisplay element not found!');
            return;
        }
        
        if (totalTimeInfo) {
            this.totalTimeDisplay.innerHTML = `
                <div class="total-time-compact">
                    <div class="time-summary">
                        <span class="work-time">Work: ${totalTimeInfo.workTime}min</span>
                        <span class="total-time">Total: ${totalTimeInfo.totalTime}min</span>
                        <span class="completion-time">Finish At: ${totalTimeInfo.completionTime}</span>
                    </div>
                </div>
            `;
        } else {
            this.totalTimeDisplay.innerHTML = '';
        }
    }

    calculateTaskSchedule() {
        const taskSchedule = {};
        
        if (!this.startTimeInput.value) {
            return taskSchedule;
        }
        
        const startTime = new Date();
        const [hours, minutes] = this.startTimeInput.value.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If start time is in the past, move to next day
        if (startTime < new Date()) {
            startTime.setDate(startTime.getDate() + 1);
        }
        
        let currentTime = new Date(startTime);
        let breakCount = 0;
        
        // Only include non-completed tasks
        const activeTasks = this.tasks.filter(task => !task.completed);
        
        activeTasks.forEach((task, taskIndex) => {
            const taskStartTime = new Date(currentTime);
            
            // Add work sessions for this task (no breaks between sessions of the same task)
            for (let session = 0; session < task.count; session++) {
                const sessionStartTime = new Date(currentTime);
                
                // Add work session time
                currentTime.setMinutes(currentTime.getMinutes() + this.settings.workDuration);
                const sessionEndTime = new Date(currentTime);
            }
            
            const taskEndTime = new Date(currentTime);
            
            // Add break time after the entire task is complete (except after the last task)
            if (taskIndex < activeTasks.length - 1) {
                breakCount++;
                const isLongBreak = breakCount % this.settings.longBreakInterval === 0;
                const breakDuration = isLongBreak ? this.settings.longBreakDuration : this.settings.shortBreakDuration;
                currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
            }
            
            // Format time span for the entire task
            const startTimeStr = taskStartTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            });
            const endTimeStr = taskEndTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            });
            
            // Store schedule for the task (full time span)
            taskSchedule[task.id] = {
                startTime: taskStartTime,
                endTime: taskEndTime,
                timeSpan: `${startTimeStr} - ${endTimeStr}`,
                totalSessions: task.count
            };
        });
        
        return taskSchedule;
    }

    calculateTotalTime() {
        const activeTasks = this.tasks.filter(task => !task.completed);
        
        if (activeTasks.length === 0 || !this.startTimeInput.value) {
            return null;
        }
        
        // Calculate total work time (each task can have multiple sessions)
        const workTime = activeTasks.reduce((total, task) => {
            return total + (task.count * this.settings.workDuration);
        }, 0);
        
        // Calculate total break time (breaks between all individual tasks, including sub-tasks)
        const totalBreaks = Math.max(0, activeTasks.length - 1); // One less break than total tasks
        let breakTime = 0;
        
        for (let i = 1; i <= totalBreaks; i++) {
            const isLongBreak = i % this.settings.longBreakInterval === 0;
            breakTime += isLongBreak ? this.settings.longBreakDuration : this.settings.shortBreakDuration;
        }
        
        const totalTime = workTime + breakTime;
        
        // Calculate completion time
        const startTime = new Date();
        const [hours, minutes] = this.startTimeInput.value.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // If start time is in the past, move to next day
        if (startTime < new Date()) {
            startTime.setDate(startTime.getDate() + 1);
        }
        
        const completionTime = new Date(startTime);
        completionTime.setMinutes(completionTime.getMinutes() + totalTime);
        
        const completionTimeStr = completionTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
        
        return {
            workTime,
            totalTime,
            completionTime: completionTimeStr
        };
    }

    generateSchedule() {
        // Update the total time display and re-render tasks to show updated schedule times
        this.updateTotalTimeDisplay();
        this.renderTasks();
    }


    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    // Bulk Import Methods
    openBulkImportModal() {
        this.bulkImportModal.classList.add('show');
        this.bulkTaskInput.focus();
        this.bulkTaskInput.value = '';
        this.parsedTasks = [];
        this.updateTaskPreview();
    }

    closeBulkImportModal() {
        this.bulkImportModal.classList.remove('show');
        this.bulkTaskInput.value = '';
        this.parsedTasks = [];
        this.updateTaskPreview();
        this.resetImageUpload();
    }

    parseAndPreviewTasks() {
        const input = this.bulkTaskInput.value.trim();
        this.parsedTasks = [];

        if (!input) {
            this.updateTaskPreview();
            return;
        }

        const lines = input.split('\n').filter(line => line.trim());
        
        lines.forEach((line, index) => {
            const parsed = this.parseTaskLine(line.trim(), index + 1);
            this.parsedTasks.push(parsed);
        });

        this.updateTaskPreview();
    }

    parseTaskLine(line, lineNumber) {
        // Support multiple formats for both English and Chinese:
        // "Task description 2" (number at end)
        // "Task description [2]" (number in brackets)
        // "2 Task description" (number at start)
        // "Task description" (default to 1)
        // Chinese formats: "任务描述 2", "2. 任务描述", etc.
        
        const patterns = [
            // Pattern 1: "Task description 2" or "Task description  2" (works for Chinese too)
            /^(.+?)\s+(\d+)$/,
            // Pattern 2: "Task description [2]" or "Task description (2)" (works for Chinese too)
            /^(.+?)\s*[\[\(（](\d+)[\]\)）]$/,
            // Pattern 3: "2 Task description" or "2. Task description" (works for Chinese too)
            /^(\d+)[\.\s]+(.+)$/,
            // Pattern 4: Chinese style "数字：任务描述" or "数字、任务描述"
            /^(\d+)[：:、]\s*(.+)$/,
            // Pattern 5: List style "1) Task" or "1） Task"
            /^(\d+)[）)]\s*(.+)$/
        ];

        for (let pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                let description, count;
                
                if (pattern === patterns[2] || pattern === patterns[3] || pattern === patterns[4]) { 
                    // Number at start patterns
                    count = parseInt(match[1]);
                    description = match[2].trim();
                } else { 
                    // Number at end or in brackets patterns
                    description = match[1].trim();
                    count = parseInt(match[2]);
                }

                if (description && count > 0 && count <= 10) {
                    return {
                        description,
                        count,
                        valid: true,
                        lineNumber,
                        originalLine: line
                    };
                }
            }
        }

        // If no pattern matches, try to extract just the description (default count = 1)
        if (line.trim()) {
            // Check if it's just a description without numbers (support Chinese characters)
            const cleanLine = line.replace(/[\[\]\(\)（）\d]/g, '').trim();
            if (cleanLine.length > 0 && (
                /[\u4e00-\u9fff]/.test(cleanLine) ||  // Contains Chinese characters
                /[a-zA-Z]/.test(cleanLine) ||         // Contains English letters
                cleanLine.length > 2                  // Or is reasonably long
            )) {
                return {
                    description: line.trim(), // Use original line to preserve formatting
                    count: 1,
                    valid: true,
                    lineNumber,
                    originalLine: line,
                    assumedCount: true
                };
            }
        }

        return {
            description: line,
            count: 0,
            valid: false,
            lineNumber,
            originalLine: line,
            error: 'Invalid format. Use: "Task description [number]" or "Task description number"'
        };
    }

    updateTaskPreview() {
        if (this.parsedTasks.length === 0) {
            this.taskPreview.innerHTML = '<p class="no-preview">Enter tasks above to see preview</p>';
            this.confirmImport.disabled = true;
            return;
        }

        const validTasks = this.parsedTasks.filter(task => task.valid);
        const hasValidTasks = validTasks.length > 0;

        this.taskPreview.innerHTML = this.parsedTasks.map(task => {
            if (task.valid) {
                return `
                    <div class="preview-task">
                        <div class="preview-description">${task.description}</div>
                        <div class="preview-count">
                            ${task.count} session${task.count > 1 ? 's' : ''} 
                            (${task.count * this.settings.workDuration} min)
                            ${task.assumedCount ? ' - assumed 1 session' : ''}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="preview-task error">
                        <div class="preview-description">${task.originalLine}</div>
                        <div class="preview-error">${task.error}</div>
                    </div>
                `;
            }
        }).join('');

        this.confirmImport.disabled = !hasValidTasks;

        // Show summary
        if (hasValidTasks) {
            const totalSessions = validTasks.reduce((sum, task) => sum + task.count, 0);
            const totalMinutes = totalSessions * 25;
            const summaryDiv = document.createElement('div');
            summaryDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 8px; font-size: 0.9rem; color: #1976d2;';
            summaryDiv.innerHTML = `<strong>Summary:</strong> ${validTasks.length} task${validTasks.length > 1 ? 's' : ''}, ${totalSessions} session${totalSessions > 1 ? 's' : ''}, ${totalMinutes} minutes total`;
            this.taskPreview.appendChild(summaryDiv);
        }
    }

    importParsedTasks() {
        const validTasks = this.parsedTasks.filter(task => task.valid);
        
        if (validTasks.length === 0) {
            alert('No valid tasks to import');
            return;
        }

        // Add each valid task to the main task list (single task per parsed task)
        validTasks.forEach(parsedTask => {
            const task = {
                id: Date.now() + Math.random(), // Ensure unique ID
                description: parsedTask.description, // Keep original description
                originalDescription: parsedTask.description,
                count: parsedTask.count, // Store the count for scheduling
                completed: false
            };
            this.tasks.push(task);
        });

        // Update UI
        this.renderTasks();
        this.closeBulkImportModal();

        // Show success message
        const message = `Successfully imported ${validTasks.length} task${validTasks.length > 1 ? 's' : ''}!`;
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Simple notification - you can enhance this
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : '#667eea'};
            color: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    moveTaskUp(index) {
        // Close menu first
        this.closeAllTaskMenus();
        
        if (index > 0) {
            [this.tasks[index], this.tasks[index - 1]] = [this.tasks[index - 1], this.tasks[index]];
            this.renderTasks();
        }
    }

    moveTaskDown(index) {
        // Close menu first
        this.closeAllTaskMenus();
        
        if (index < this.tasks.length - 1) {
            [this.tasks[index], this.tasks[index + 1]] = [this.tasks[index + 1], this.tasks[index]];
            this.renderTasks();
        }
    }

    moveTaskToTop(index) {
        // Close menu first
        this.closeAllTaskMenus();
        
        if (index > 0) {
            // Remove the task from its current position
            const [task] = this.tasks.splice(index, 1);
            // Insert it at the beginning
            this.tasks.unshift(task);
            this.renderTasks();
            this.showNotification('📋 Task moved to top!', 'success');
        }
    }

    moveTaskToBottom(index) {
        // Close menu first
        this.closeAllTaskMenus();
        
        if (index < this.tasks.length - 1) {
            // Remove the task from its current position
            const [task] = this.tasks.splice(index, 1);
            // Insert it at the end
            this.tasks.push(task);
            this.renderTasks();
            this.showNotification('📋 Task moved to bottom!', 'success');
        }
    }

    // Bulk Import Methods
    switchTab(tabType) {
        // Update tab buttons
        this.textTab.classList.toggle('active', tabType === 'text');
        this.imageTab.classList.toggle('active', tabType === 'image');
        
        // Update sections
        this.textInputSection.classList.toggle('active', tabType === 'text');
        this.imageInputSection.classList.toggle('active', tabType === 'image');
        
        // Focus appropriate input
        if (tabType === 'text') {
            setTimeout(() => this.bulkTaskInput.focus(), 100);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.imageUploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.imageUploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.imageUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processImageFile(files[0]);
        }
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }

    processImageFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image file is too large. Please select a file smaller than 10MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.imagePreview.src = e.target.result;
            this.imageUploadArea.style.display = 'none';
            this.imagePreviewContainer.style.display = 'block';
            this.currentImageFile = file;
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.resetImageUpload();
    }

    resetImageUpload() {
        // Only reset image upload elements if they exist
        if (this.imageUploadArea) {
            this.imageUploadArea.style.display = 'block';
        }
        if (this.imagePreviewContainer) {
            this.imagePreviewContainer.style.display = 'none';
        }
        if (this.ocrStatus) {
            this.ocrStatus.style.display = 'none';
        }
        if (this.imageInput) {
            this.imageInput.value = '';
        }
        this.currentImageFile = null;
        // Set default language to English + Chinese Simplified for better compatibility
        if (this.languageSelect) {
            this.languageSelect.value = 'eng+chi_sim';
        }
    }

    async processImage() {
        if (!this.currentImageFile) {
            alert('No image selected');
            return;
        }

        const selectedLanguage = this.languageSelect.value;
        
        // Show loading status
        this.ocrStatus.style.display = 'block';
        this.processImageBtn.disabled = true;
        this.ocrStatus.querySelector('p').textContent = 'Loading OCR library...';

        try {
            // Load Tesseract.js dynamically when needed
            if (!window.Tesseract) {
                await this.loadTesseract();
            }

            this.ocrStatus.querySelector('p').textContent = `Initializing OCR for ${this.getLanguageName(selectedLanguage)}...`;

            // Use Tesseract.js to extract text with selected language
            const { data: { text } } = await Tesseract.recognize(
                this.currentImageFile,
                selectedLanguage,
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            this.ocrStatus.querySelector('p').textContent = `Processing image... ${progress}%`;
                        } else if (m.status === 'loading tesseract core') {
                            this.ocrStatus.querySelector('p').textContent = 'Loading OCR engine...';
                        } else if (m.status === 'initializing tesseract') {
                            this.ocrStatus.querySelector('p').textContent = 'Initializing OCR...';
                        } else if (m.status === 'loading language traineddata') {
                            this.ocrStatus.querySelector('p').textContent = `Loading ${this.getLanguageName(selectedLanguage)} language data...`;
                        }
                    }
                }
            );

            // Hide loading status
            this.ocrStatus.style.display = 'none';
            this.processImageBtn.disabled = false;

            // Clean up the extracted text
            const cleanedText = this.cleanOCRText(text);
            
            if (!cleanedText.trim()) {
                alert('No text found in the image. Please try with a clearer image.');
                return;
            }

            // Switch to text tab and populate the textarea
            this.switchTab('text');
            this.bulkTaskInput.value = cleanedText;
            this.parseAndPreviewTasks();

            // Show success notification
            this.showNotification('Text extracted successfully from image!', 'success');

        } catch (error) {
            console.error('OCR Error:', error);
            this.ocrStatus.style.display = 'none';
            this.processImageBtn.disabled = false;
            alert('Failed to process image. Please try again or use a clearer image.');
        }
    }

    getLanguageName(langCode) {
        const languageNames = {
            'eng': 'English',
            'chi_sim': 'Chinese Simplified',
            'chi_tra': 'Chinese Traditional',
            'eng+chi_sim': 'English + Chinese Simplified',
            'eng+chi_tra': 'English + Chinese Traditional'
        };
        return languageNames[langCode] || langCode;
    }

    cleanOCRText(text) {
        // Clean up common OCR artifacts and formatting issues
        return text
            // Remove excessive whitespace but preserve line breaks
            .replace(/[ \t]+/g, ' ')
            // Split into lines and clean each line
            .split('\n')
            .map(line => line.trim())
            // Remove empty lines
            .filter(line => line.length > 0)
            // Remove lines that are just numbers, special characters, or very short
            .filter(line => {
                // Keep lines with Chinese characters, English letters, or meaningful content
                return /[\u4e00-\u9fff]/.test(line) || // Chinese characters
                       /[a-zA-Z]/.test(line) ||        // English letters
                       (line.length > 2 && /\w/.test(line)); // Other meaningful content
            })
            // Clean up common OCR errors
            .map(line => {
                return line
                    // Fix common character recognition errors
                    .replace(/[|｜]/g, '1')  // Vertical bars often misread as 1
                    .replace(/[０-９]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xFF10 + 0x30)) // Full-width to half-width numbers
                    .replace(/：/g, ':')     // Full-width colon to half-width
                    .replace(/；/g, ';')     // Full-width semicolon to half-width
                    .trim();
            })
            // Join back with newlines
            .join('\n')
            .trim();
    }

    switchSession(sessionType) {
        // Allow switching even when timer is running - reset current timer and switch to target time
        if (this.isRunning) {
            // Stop the current timer
            clearInterval(this.timerInterval);
            this.isRunning = false;
            this.isPaused = false;
        }
        
        this.currentSessionType = sessionType;
        this.setTimeForCurrentSession();
        
        // Reset progress ring state
        this.progressRing.classList.remove('active');
        document.querySelector('.timer-circle').classList.remove('active');
        
        this.updateSessionButtons();
        this.updateCurrentTask();
        this.updateDisplay();
        this.updateProgressRing();
        this.updateToggleButton();
    }

    updateSessionButtons() {
        // Remove active class from all buttons
        this.workBtn.classList.remove('active');
        this.shortBreakBtn.classList.remove('active');
        this.longBreakBtn.classList.remove('active');
        
        // Add active class to current session button
        if (this.currentSessionType === 'work') {
            this.workBtn.classList.add('active');
        } else if (this.currentSessionType === 'short-break') {
            this.shortBreakBtn.classList.add('active');
        } else if (this.currentSessionType === 'long-break') {
            this.longBreakBtn.classList.add('active');
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        this.isPaused = false;
        this.updateToggleButton();

        // Set time based on current session type
        if (!this.isPaused) {
            this.setTimeForCurrentSession();
        }

        // Record actual start time for background support
        if (!this.timerStartTime) {
            this.timerStartTime = Date.now();
            this.timerDuration = this.timeRemaining;
            this.pausedTime = 0;
        } else {
            // Resuming from pause - update start time to account for pause
            this.timerStartTime = Date.now() - (this.timerDuration - this.timeRemaining) * 1000;
        }
        
        // Save timer state to localStorage
        this.saveTimerState();

        this.updateCurrentTask();
        this.updateProgressRing();
        
        this.timerInterval = setInterval(() => {
            this.updateTimerFromRealTime();
        }, 1000);

        // Add active class to timer circle
        document.querySelector('.timer-circle').classList.add('active');
        this.progressRing.classList.add('active');
    }

    updateTimerFromRealTime() {
        if (!this.timerStartTime) return;
        
        const now = Date.now();
        const elapsedTime = Math.floor((now - this.timerStartTime) / 1000);
        this.timeRemaining = Math.max(0, this.timerDuration - elapsedTime);
        
        this.updateDisplay();
        this.updateProgressRing();

        if (this.timeRemaining <= 0) {
            this.completeCurrentSession();
        }
    }

    setTimeForCurrentSession() {
        if (this.currentSessionType === 'work') {
            this.timeRemaining = this.settings.workDuration * 60;
            this.isBreakTime = false;
        } else if (this.currentSessionType === 'short-break') {
            this.timeRemaining = this.settings.shortBreakDuration * 60;
            this.isBreakTime = true;
        } else if (this.currentSessionType === 'long-break') {
            this.timeRemaining = this.settings.longBreakDuration * 60;
            this.isBreakTime = true;
        }
    }

    pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;
        this.updateToggleButton();
        
        // Update paused time for accurate resume
        if (this.timerStartTime) {
            const now = Date.now();
            const elapsedTime = Math.floor((now - this.timerStartTime) / 1000);
            this.pausedTime += elapsedTime;
        }
        
        this.saveTimerState();
        clearInterval(this.timerInterval);
        document.querySelector('.timer-circle').classList.remove('active');
        this.progressRing.classList.remove('active');
    }

    updateToggleButton() {
        if (this.isRunning) {
            this.toggleBtn.textContent = 'PAUSE';
            this.toggleBtn.classList.remove('btn-primary');
            this.toggleBtn.classList.add('btn-pause');
        } else {
            this.toggleBtn.textContent = 'START';
            this.toggleBtn.classList.remove('btn-pause');
            this.toggleBtn.classList.add('btn-primary');
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.updateToggleButton();
        
        clearInterval(this.timerInterval);
        
        // Reset timer state for background support
        this.timerStartTime = null;
        this.timerDuration = 0;
        this.pausedTime = 0;
        
        // Reset to current session type duration
        this.setTimeForCurrentSession();
        
        // Clear timer state from localStorage
        this.clearTimerState();
        
        this.updateDisplay();
        this.updateProgressRing();
        this.updateCurrentTask();
        document.querySelector('.timer-circle').classList.remove('active');
        this.progressRing.classList.remove('active');
    }

    completeCurrentSession() {
        clearInterval(this.timerInterval);
        
        // Clear timer state since session is complete
        this.timerStartTime = null;
        this.timerDuration = 0;
        this.pausedTime = 0;
        
        // Play notification sound
        this.playNotification();

        // Determine next session type
        if (this.currentSessionType === 'work') {
            this.completedSessions++;
            // Check if it's time for a long break
            if (this.completedSessions % this.settings.longBreakInterval === 0) {
                this.currentSessionType = 'long-break';
            } else {
                this.currentSessionType = 'short-break';
            }
        } else {
            // After any break, go back to work
            this.currentSessionType = 'work';
        }

        // Prepare for next session
        this.setTimeForCurrentSession();
        
        // Check if auto-start is enabled
        const activeTasks = this.tasks.filter(task => !task.completed);
        const shouldAutoStart = this.shouldAutoStartNext();
        
        if (shouldAutoStart) {
            // Auto-start next session after a brief delay
            setTimeout(() => {
                this.startTimer();
            }, 1000);
        } else {
            this.isRunning = false;
            this.updateToggleButton();
            document.querySelector('.timer-circle').classList.remove('active');
            this.progressRing.classList.remove('active');
            
            // Show message if no active tasks remain
            if (activeTasks.length === 0) {
                this.showNotification('🎉 All tasks completed! Add new tasks to continue working.', 'success');
            }
        }

        this.updateDisplay();
        this.updateCurrentTask();
        this.updateProgressRing();
        this.updateSessionButtons();
    }

    shouldAutoStartNext() {
        // First check if there are any active (uncompleted) tasks
        const activeTasks = this.tasks.filter(task => !task.completed);
        
        // If no active tasks, don't auto-start
        if (activeTasks.length === 0) {
            return false;
        }
        
        // Check if the next session should auto-start based on current session and settings
        if (this.currentSessionType === 'work') {
            // Just finished work, next is break - check auto start break
            return this.autoStartBreak.checked;
        } else {
            // Just finished break, next is work - check auto start work
            // Only auto-start work if there are tasks to work on
            return this.autoStartWork.checked;
        }
    }

    playNotification() {
        // Check if notifications are enabled in settings
        if (!this.settings.notificationsEnabled) return;
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            let title, body;
            const activeTasks = this.tasks.filter(task => !task.completed);
            
            if (this.currentSessionType === 'work') {
                title = '✅ Work Session Complete!';
                // Determine next session
                const nextIsLong = (this.completedSessions + 1) % this.settings.longBreakInterval === 0;
                if (activeTasks.length === 0) {
                    body = 'All tasks completed! 🎉 Add new tasks to continue.';
                } else {
                    body = nextIsLong ? 'Time for a long break! 🎉' : 'Time for a short break! ☕';
                }
            } else {
                title = '🎉 Break Complete!';
                if (activeTasks.length === 0) {
                    body = 'All tasks completed! Add new tasks to continue working.';
                } else {
                    body = 'Time to get back to work! 💪';
                }
            }
            
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>',
                requireInteraction: false,
                silent: !this.settings.soundEnabled
            });
        }
        
        // Simple sound notification (if enabled)
        if (this.settings.soundEnabled) {
            // Create a simple beep sound using Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                console.log('Audio notification not supported');
            }
        }
    }

    updateCurrentTask() {
        if (this.currentSessionType === 'work') {
            this.currentTaskName.textContent = 'Work Session';
            this.taskProgress.textContent = `Session ${this.completedSessions + 1} • Focus time`;
        } else if (this.currentSessionType === 'short-break') {
            this.currentTaskName.textContent = 'Short Break';
            this.taskProgress.textContent = 'Take a short break and relax ☕';
        } else if (this.currentSessionType === 'long-break') {
            this.currentTaskName.textContent = 'Long Break';
            this.taskProgress.textContent = 'Enjoy your long break! 🎉';
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.isRunning) {
            if (this.currentSessionType === 'work') {
                this.timerLabel.textContent = 'Focus Time';
            } else {
                this.timerLabel.textContent = 'Break Time';
            }
        } else {
            this.timerLabel.textContent = 'Ready to start';
        }
    }

    updateProgressRing() {
        let totalTime;
        
        if (this.currentSessionType === 'work') {
            totalTime = this.settings.workDuration * 60;
        } else if (this.currentSessionType === 'short-break') {
            totalTime = this.settings.shortBreakDuration * 60;
        } else if (this.currentSessionType === 'long-break') {
            totalTime = this.settings.longBreakDuration * 60;
        }
        
        const progress = (totalTime - this.timeRemaining) / totalTime;
        const circumference = 2 * Math.PI * 140; // radius = 140
        const offset = circumference - (progress * circumference);
        
        // Ensure the progress ring is properly initialized
        this.progressRing.style.strokeDasharray = circumference;
        this.progressRing.style.strokeDashoffset = offset;
    }

    // Timer State Persistence Methods
    saveTimerState() {
        const timerState = {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            currentSessionType: this.currentSessionType,
            timerStartTime: this.timerStartTime,
            timerDuration: this.timerDuration,
            pausedTime: this.pausedTime,
            timeRemaining: this.timeRemaining,
            completedSessions: this.completedSessions,
            isBreakTime: this.isBreakTime
        };
        localStorage.setItem('timefocus-timer-state', JSON.stringify(timerState));
    }

    loadTimerState() {
        const savedState = localStorage.getItem('timefocus-timer-state');
        if (savedState) {
            try {
                const timerState = JSON.parse(savedState);
                
                // Restore timer state
                this.currentSessionType = timerState.currentSessionType || 'work';
                this.timerStartTime = timerState.timerStartTime;
                this.timerDuration = timerState.timerDuration || 0;
                this.pausedTime = timerState.pausedTime || 0;
                this.completedSessions = timerState.completedSessions || 0;
                this.isBreakTime = timerState.isBreakTime || false;
                
                // If timer was running, check if it should still be running or completed
                if (timerState.isRunning && this.timerStartTime) {
                    const now = Date.now();
                    const elapsedTime = Math.floor((now - this.timerStartTime) / 1000);
                    const remainingTime = this.timerDuration - elapsedTime;
                    
                    if (remainingTime > 0) {
                        // Timer should still be running
                        this.timeRemaining = remainingTime;
                        this.isRunning = true;
                        this.isPaused = false;
                        this.startTimer();
                        this.showNotification('⏰ Timer resumed from background!', 'info');
                    } else {
                        // Timer should have completed while in background
                        this.timeRemaining = 0;
                        this.completeCurrentSession();
                        this.showNotification('🔔 Timer completed while in background!', 'success');
                    }
                } else if (timerState.isPaused) {
                    // Restore paused state
                    this.isPaused = true;
                    this.timeRemaining = timerState.timeRemaining;
                    this.setTimeForCurrentSession();
                }
                
                // Update UI to reflect restored state
                this.updateSessionButtons();
                this.updateDisplay();
                this.updateToggleButton();
                this.updateCurrentTask();
                
            } catch (error) {
                console.warn('Failed to restore timer state:', error);
                this.clearTimerState();
            }
        }
    }

    clearTimerState() {
        localStorage.removeItem('timefocus-timer-state');
    }

    // Page Visibility Handling for Background Support
    addVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isRunning) {
                // Page became visible and timer is running
                // Force update from real time to catch up with background time
                this.updateTimerFromRealTime();
                this.saveTimerState();
            }
        });
        
        // Also listen for focus events as backup
        window.addEventListener('focus', () => {
            if (this.isRunning) {
                this.updateTimerFromRealTime();
                this.saveTimerState();
            }
        });
    }

    // Settings Management Methods
    loadSettings() {
        const savedSettings = localStorage.getItem('timefocus-settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // Load favorite tasks
        const savedFavorites = localStorage.getItem('timefocus-favorites');
        if (savedFavorites) {
            this.favoriteTasks = JSON.parse(savedFavorites);
        }
        
        this.applySettings();
    }

    applySettings() {
        // Update durations
        this.workDuration = this.settings.workDuration * 60;
        this.breakDuration = this.settings.shortBreakDuration * 60;
        
        // Update UI inputs
        if (this.workDurationInput) {
            this.workDurationInput.value = this.settings.workDuration;
            this.shortBreakInput.value = this.settings.shortBreakDuration;
            this.longBreakInput.value = this.settings.longBreakDuration;
            this.longBreakIntervalInput.value = this.settings.longBreakInterval;
            this.notificationsEnabled.checked = this.settings.notificationsEnabled;
            this.soundEnabled.checked = this.settings.soundEnabled;
        }
        
        // Update timer display if not running
        if (!this.isRunning && !this.isPaused) {
            this.timeRemaining = this.workDuration;
            this.updateDisplay();
        }
        
        // Re-render tasks to show updated durations
        if (this.tasks.length > 0) {
            this.renderTasks();
        }
    }

    openSettingsModal() {
        this.settingsModal.classList.add('show');
        this.updateSettingsPreview();
    }

    closeSettings() {
        this.settingsModal.classList.remove('show');
    }

    updateSettingsPreview() {
        const workDuration = parseInt(this.workDurationInput.value) || 25;
        const shortBreak = parseInt(this.shortBreakInput.value) || 5;
        const longBreak = parseInt(this.longBreakInput.value) || 15;
        const longBreakInterval = parseInt(this.longBreakIntervalInput.value) || 4;

        // Generate preview pattern (show first 8 sessions)
        let pattern = [];
        let breakCount = 0;
        
        for (let i = 1; i <= 8; i++) {
            pattern.push({ type: 'work', duration: workDuration });
            
            if (i < 8) { // Don't add break after last session
                breakCount++;
                const isLongBreak = breakCount % longBreakInterval === 0;
                pattern.push({
                    type: isLongBreak ? 'long-break' : 'short-break',
                    duration: isLongBreak ? longBreak : shortBreak
                });
            }
        }

        this.schedulePreview.innerHTML = pattern.map(item => {
            const className = item.type === 'work' ? 'pattern-work' : 
                            item.type === 'long-break' ? 'pattern-long-break' : 'pattern-short-break';
            const label = item.type === 'work' ? `W${item.duration}` :
                         item.type === 'long-break' ? `L${item.duration}` : `S${item.duration}`;
            return `<div class="pattern-block ${className}">${label}</div>`;
        }).join('');
    }

    resetSettings() {
        this.settings = {
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            notificationsEnabled: true,
            soundEnabled: true
        };
        this.applySettings();
        this.updateSettingsPreview();
        this.showNotification('Settings reset to default values', 'info');
    }

    saveSettings() {
        // Get values from inputs
        this.settings.workDuration = parseInt(this.workDurationInput.value) || 25;
        this.settings.shortBreakDuration = parseInt(this.shortBreakInput.value) || 5;
        this.settings.longBreakDuration = parseInt(this.longBreakInput.value) || 15;
        this.settings.longBreakInterval = parseInt(this.longBreakIntervalInput.value) || 4;
        this.settings.notificationsEnabled = this.notificationsEnabled.checked;
        this.settings.soundEnabled = this.soundEnabled.checked;

        // Validate settings
        if (this.settings.workDuration < 1 || this.settings.workDuration > 60) {
            alert('Work duration must be between 1 and 60 minutes');
            return;
        }
        if (this.settings.shortBreakDuration < 1 || this.settings.shortBreakDuration > 30) {
            alert('Short break must be between 1 and 30 minutes');
            return;
        }
        if (this.settings.longBreakDuration < 5 || this.settings.longBreakDuration > 60) {
            alert('Long break must be between 5 and 60 minutes');
            return;
        }
        if (this.settings.longBreakInterval < 2 || this.settings.longBreakInterval > 10) {
            alert('Long break interval must be between 2 and 10');
            return;
        }

        // Save to localStorage
        localStorage.setItem('timefocus-settings', JSON.stringify(this.settings));
        
        // Apply settings
        this.applySettings();
        
        // Close modal
        this.closeSettings();
        
        // Show success message
        this.showNotification('⚙️ Settings saved successfully!', 'success');
    }


}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TimeFocusApp();
    
    // Initialize favorite tasks
    app.renderFavoriteTasks();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
});

// Prevent page refresh when timer is running
window.addEventListener('beforeunload', (e) => {
    if (app && app.isRunning) {
        e.preventDefault();
        e.returnValue = '';
        return 'Timer is running. Are you sure you want to leave?';
    }
});

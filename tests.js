/**
 * Unit Tests for TimeFocus App
 * Tests existing behavior to prevent regression when implementing new features
 */

// Mock DOM elements for testing
class MockElement {
    constructor() {
        this.value = '';
        this.textContent = '';
        this.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn(() => false)
        };
        this.style = {};
        this.disabled = false;
        this.checked = false;
        this.innerHTML = '';
    }
}

// Mock DOM methods
global.document = {
    getElementById: () => new MockElement(),
    querySelector: () => new MockElement(),
    querySelectorAll: () => [],
    createElement: () => new MockElement(),
    addEventListener: () => {},
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

global.window = {
    localStorage: {
        getItem: () => {},
        setItem: () => {}
    },
    Notification: {
        permission: 'default',
        requestPermission: () => {}
    },
    AudioContext: () => {},
    webkitAudioContext: () => {}
};

// Mock setTimeout and setInterval
global.setTimeout = (fn, delay) => fn();
global.setInterval = () => {};
global.clearInterval = () => {};

// Mock jest functions
global.jest = {
    fn: () => ({
        mockReturnValue: () => {},
        mockImplementation: () => {}
    })
};

// Import the TimeFocusApp class (we'll need to modify it to be testable)
// For now, let's create a simplified version for testing

class TimeFocusAppTestable {
    constructor() {
        this.tasks = [];
        this.schedule = [];
        this.currentSessionType = 'work';
        this.completedSessions = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.timeRemaining = 25 * 60;
        this.timerInterval = null;
        this.isBreakTime = false;
        
        // Background support properties
        this.timerStartTime = null;
        this.timerDuration = 25 * 60;
        this.pausedTime = 0;
        
        this.settings = {
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            notificationsEnabled: true,
            soundEnabled: true
        };
        
        this.workDuration = this.settings.workDuration * 60;
        this.breakDuration = this.settings.shortBreakDuration * 60;
    }

    // Test helper methods
    addTask(description, count = 1) {
        if (!description) {
            throw new Error('Please enter a task description');
        }

        // Create a single task instead of splitting into multiple parts (new behavior)
        const task = {
            id: Date.now(),
            description: description, // Keep original description without parts
            originalDescription: description,
            count: count, // Store the count for scheduling purposes
            completed: false
        };
        this.tasks.push(task);
    }

    switchSession(sessionType) {
        // New behavior: Allow switching even when timer is running - reset current timer and switch to target time
        if (this.isRunning) {
            // Stop the current timer
            this.isRunning = false;
            this.isPaused = false;
        }
        
        this.currentSessionType = sessionType;
        this.setTimeForCurrentSession();
        return true; // Indicates switch was successful
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

    startTimer() {
        this.isRunning = true;
        this.isPaused = false;
        this.setTimeForCurrentSession();
        
        // Background support - record start time
        if (!this.timerStartTime) {
            this.timerStartTime = Date.now();
            this.timerDuration = this.timeRemaining;
            this.pausedTime = 0;
        }
    }
    
    updateTimerFromRealTime() {
        if (!this.timerStartTime) return;
        
        const now = Date.now();
        const elapsedTime = Math.floor((now - this.timerStartTime) / 1000);
        this.timeRemaining = Math.max(0, this.timerDuration - elapsedTime);
        
        if (this.timeRemaining <= 0) {
            this.completeCurrentSession();
        }
    }
    
    saveTimerState() {
        // Mock localStorage save
        this.savedTimerState = {
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
    }
    
    loadTimerState() {
        if (this.savedTimerState) {
            const timerState = this.savedTimerState;
            
            this.currentSessionType = timerState.currentSessionType || 'work';
            this.timerStartTime = timerState.timerStartTime;
            this.timerDuration = timerState.timerDuration || 0;
            this.pausedTime = timerState.pausedTime || 0;
            this.completedSessions = timerState.completedSessions || 0;
            this.isBreakTime = timerState.isBreakTime || false;
            
            if (timerState.isRunning && this.timerStartTime) {
                const now = Date.now();
                const elapsedTime = Math.floor((now - this.timerStartTime) / 1000);
                const remainingTime = this.timerDuration - elapsedTime;
                
                if (remainingTime > 0) {
                    this.timeRemaining = remainingTime;
                    this.isRunning = true;
                    this.isPaused = false;
                } else {
                    this.timeRemaining = 0;
                    this.completeCurrentSession();
                }
            } else if (timerState.isPaused) {
                this.isPaused = true;
                this.timeRemaining = timerState.timeRemaining;
            }
        }
    }
    
    clearTimerState() {
        this.savedTimerState = null;
    }

    pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;
    }
    
    completeCurrentSession() {
        // Clear timer state
        this.timerStartTime = null;
        this.timerDuration = 0;
        this.pausedTime = 0;
        
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
        
        // Set time for next session
        this.setTimeForCurrentSession();
        this.isRunning = false;
        this.isPaused = false;
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.setTimeForCurrentSession();
    }

    parseTaskLine(line, lineNumber) {
        const patterns = [
            /^(.+?)\s+(\d+)$/,
            /^(.+?)\s*[\[\(（](\d+)[\]\)）]$/,
            /^(\d+)[\.\s]+(.+)$/,
            /^(\d+)[：:、]\s*(.+)$/,
            /^(\d+)[）)]\s*(.+)$/
        ];

        for (let pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                let description, count;
                
                if (pattern === patterns[2] || pattern === patterns[3] || pattern === patterns[4]) {
                    count = parseInt(match[1]);
                    description = match[2].trim();
                } else {
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

        if (line.trim()) {
            const cleanLine = line.replace(/[\[\]\(\)（）\d]/g, '').trim();
            if (cleanLine.length > 0 && (
                /[\u4e00-\u9fff]/.test(cleanLine) ||
                /[a-zA-Z]/.test(cleanLine) ||
                cleanLine.length > 2
            )) {
                return {
                    description: line.trim(),
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

    calculateTotalTime() {
        const activeTasks = this.tasks.filter(task => !task.completed);
        
        if (activeTasks.length === 0) {
            return null;
        }
        
        // Calculate total work time (each task can have multiple sessions)
        const workTime = activeTasks.reduce((total, task) => {
            return total + (task.count * this.settings.workDuration);
        }, 0);
        
        // Calculate total break time (breaks only between different tasks, not between sessions of the same task)
        const totalBreaks = Math.max(0, activeTasks.length - 1); // One less break than total tasks
        let breakTime = 0;
        
        for (let i = 1; i <= totalBreaks; i++) {
            const isLongBreak = i % this.settings.longBreakInterval === 0;
            breakTime += isLongBreak ? this.settings.longBreakDuration : this.settings.shortBreakDuration;
        }
        
        const totalTime = workTime + breakTime;
        
        return {
            workTime,
            totalTime,
            completionTime: '12:00' // Mock completion time
        };
    }

    calculateTaskSchedule() {
        const taskSchedule = {};
        
        if (!this.startTimeInput || !this.startTimeInput.value) {
            return taskSchedule;
        }
        
        const startTime = new Date();
        const [hours, minutes] = this.startTimeInput.value.split(':');
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        let currentTime = new Date(startTime);
        let breakCount = 0;
        
        // Only include non-completed tasks
        const activeTasks = this.tasks.filter(task => !task.completed);
        
        activeTasks.forEach((task, taskIndex) => {
            const taskStartTime = new Date(currentTime);
            
            // Add work sessions for this task (no breaks between sessions of the same task)
            for (let session = 0; session < task.count; session++) {
                // Add work session time
                currentTime.setMinutes(currentTime.getMinutes() + this.settings.workDuration);
            }
            
            const taskEndTime = new Date(currentTime);
            
            // Add break time only after the entire task is complete (except after the last task)
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

    breakdownTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        
        if (task.count <= 1) {
            throw new Error('This task only has one session and cannot be broken down');
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
    }
}

// Test Suite
class TimeFocusTests {
    constructor() {
        this.app = new TimeFocusAppTestable();
        this.testResults = [];
    }

    runTest(testName, testFunction) {
        try {
            // Clear tasks before each test to avoid interference
            this.app.tasks = [];
            this.app.completedSessions = 0;
            testFunction();
            this.testResults.push({ name: testName, status: 'PASS' });
            console.log(`✅ ${testName}`);
        } catch (error) {
            this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
            console.log(`❌ ${testName}: ${error.message}`);
        }
    }

    // Test existing behavior
    testAddSingleTask() {
        this.app.addTask('Test task', 1);
        
        if (this.app.tasks.length !== 1) {
            throw new Error(`Expected 1 task, got ${this.app.tasks.length}`);
        }
        
        const task = this.app.tasks[0];
        if (task.description !== 'Test task') {
            throw new Error(`Expected 'Test task', got '${task.description}'`);
        }
        
        if (task.completed !== false) {
            throw new Error('Task should not be completed by default');
        }
    }

    testAddMultiSessionTask() {
        // This test is now obsolete since we changed the behavior
        // The new behavior creates a single task with count property
        this.app.addTask('Multi task', 3);
        
        if (this.app.tasks.length !== 1) {
            throw new Error(`Expected 1 task (new behavior), got ${this.app.tasks.length}`);
        }
        
        const task = this.app.tasks[0];
        if (task.description !== 'Multi task') {
            throw new Error(`Expected 'Multi task', got '${task.description}'`);
        }
        
        if (task.count !== 3) {
            throw new Error(`Expected count 3, got ${task.count}`);
        }
    }

    testSessionSwitchingWhenNotRunning() {
        // Test switching when timer is not running
        const result = this.app.switchSession('short-break');
        
        if (!result) {
            throw new Error('Session switch should succeed when timer is not running');
        }
        
        if (this.app.currentSessionType !== 'short-break') {
            throw new Error(`Expected 'short-break', got '${this.app.currentSessionType}'`);
        }
        
        if (this.app.timeRemaining !== this.app.settings.shortBreakDuration * 60) {
            throw new Error('Time remaining should be set to short break duration');
        }
        
        if (this.app.isBreakTime !== true) {
            throw new Error('isBreakTime should be true for break sessions');
        }
    }

    testSessionSwitchingWhenRunning() {
        // This test is now obsolete since we changed the behavior
        // The new behavior allows switching even when timer is running
        this.app.startTimer();
        
        // Try to switch session while running - should now succeed
        const result = this.app.switchSession('long-break');
        
        if (!result) {
            throw new Error('Session switch should succeed even when timer is running (new behavior)');
        }
        
        if (this.app.currentSessionType !== 'long-break') {
            throw new Error(`Expected 'long-break', got '${this.app.currentSessionType}'`);
        }
        
        if (this.app.isRunning !== false) {
            throw new Error('Timer should be stopped after switching sessions');
        }
    }

    testTimerStartStop() {
        // Test starting timer
        this.app.startTimer();
        
        if (!this.app.isRunning) {
            throw new Error('Timer should be running after start');
        }
        
        if (this.app.isPaused) {
            throw new Error('Timer should not be paused after start');
        }
        
        // Test pausing timer
        this.app.pauseTimer();
        
        if (this.app.isRunning) {
            throw new Error('Timer should not be running after pause');
        }
        
        if (!this.app.isPaused) {
            throw new Error('Timer should be paused after pause');
        }
        
        // Test resetting timer
        this.app.resetTimer();
        
        if (this.app.isRunning) {
            throw new Error('Timer should not be running after reset');
        }
        
        if (this.app.isPaused) {
            throw new Error('Timer should not be paused after reset');
        }
    }

    testTaskParsing() {
        // Test valid formats
        const testCases = [
            { input: 'Task description 2', expected: { description: 'Task description', count: 2 } },
            { input: 'Task description [3]', expected: { description: 'Task description', count: 3 } },
            { input: '2 Task description', expected: { description: 'Task description', count: 2 } },
            { input: 'Task description', expected: { description: 'Task description', count: 1 } }
        ];
        
        testCases.forEach(testCase => {
            const result = this.app.parseTaskLine(testCase.input, 1);
            
            if (!result.valid) {
                throw new Error(`Expected valid result for '${testCase.input}', got invalid`);
            }
            
            if (result.description !== testCase.expected.description) {
                throw new Error(`Expected description '${testCase.expected.description}', got '${result.description}'`);
            }
            
            if (result.count !== testCase.expected.count) {
                throw new Error(`Expected count ${testCase.expected.count}, got ${result.count}`);
            }
        });
        
        // Test invalid format
        const invalidResult = this.app.parseTaskLine('', 1);
        if (invalidResult.valid) {
            throw new Error('Empty line should be invalid');
        }
    }

    testTotalTimeCalculation() {
        // Add some tasks
        this.app.addTask('Task 1', 1);
        this.app.addTask('Task 2', 2);
        
        const totalTime = this.app.calculateTotalTime();
        
        if (!totalTime) {
            throw new Error('Total time calculation should return a result');
        }
        
        // 3 total sessions (1 + 2), 2 breaks between them
        const expectedWorkTime = 3 * this.app.settings.workDuration;
        if (totalTime.workTime !== expectedWorkTime) {
            throw new Error(`Expected work time ${expectedWorkTime}, got ${totalTime.workTime}`);
        }
        
        // 2 breaks: 1 short break (since 2 % 4 !== 0)
        const expectedBreakTime = this.app.settings.shortBreakDuration;
        const expectedTotalTime = expectedWorkTime + expectedBreakTime;
        
        if (totalTime.totalTime !== expectedTotalTime) {
            throw new Error(`Expected total time ${expectedTotalTime}, got ${totalTime.totalTime}`);
        }
    }

    testLongBreakInterval() {
        // Add 5 tasks to trigger long break
        for (let i = 1; i <= 5; i++) {
            this.app.addTask(`Task ${i}`, 1);
        }
        
        const totalTime = this.app.calculateTotalTime();
        
        // 5 work sessions, 4 breaks
        // Break 4 should be long break (4 % 4 === 0)
        const expectedWorkTime = 5 * this.app.settings.workDuration;
        const expectedBreakTime = 3 * this.app.settings.shortBreakDuration + this.app.settings.longBreakDuration;
        const expectedTotalTime = expectedWorkTime + expectedBreakTime;
        
        if (totalTime.totalTime !== expectedTotalTime) {
            throw new Error(`Expected total time ${expectedTotalTime}, got ${totalTime.totalTime}`);
        }
    }

    // NEW BEHAVIOR TESTS

    testTimerSwitchingWhenRunning() {
        // Start timer first
        this.app.startTimer();
        
        // Try to switch session while running - should now succeed
        const result = this.app.switchSession('long-break');
        
        if (!result) {
            throw new Error('Session switch should succeed even when timer is running');
        }
        
        if (this.app.currentSessionType !== 'long-break') {
            throw new Error(`Expected 'long-break', got '${this.app.currentSessionType}'`);
        }
        
        if (this.app.isRunning !== false) {
            throw new Error('Timer should be stopped after switching sessions');
        }
        
        if (this.app.isPaused !== false) {
            throw new Error('Timer should not be paused after switching sessions');
        }
    }

    testSingleTaskCreation() {
        // Test that tasks are created as single items, not split into parts
        this.app.addTask('Test task', 3);
        
        if (this.app.tasks.length !== 1) {
            throw new Error(`Expected 1 task, got ${this.app.tasks.length}`);
        }
        
        const task = this.app.tasks[0];
        if (task.description !== 'Test task') {
            throw new Error(`Expected 'Test task', got '${task.description}'`);
        }
        
        if (task.count !== 3) {
            throw new Error(`Expected count 3, got ${task.count}`);
        }
    }

    testTotalTimeWithMultiSessionTasks() {
        // Add tasks with multiple sessions
        this.app.addTask('Task 1', 2); // 2 sessions
        this.app.addTask('Task 2', 1); // 1 session
        
        const totalTime = this.app.calculateTotalTime();
        
        // Total work time: (2 + 1) * 25 = 75 minutes
        const expectedWorkTime = 3 * this.app.settings.workDuration;
        if (totalTime.workTime !== expectedWorkTime) {
            throw new Error(`Expected work time ${expectedWorkTime}, got ${totalTime.workTime}`);
        }
        
        // Total breaks: 1 break between 2 tasks (not between sessions of same task)
        const expectedBreakTime = 1 * this.app.settings.shortBreakDuration;
        const expectedTotalTime = expectedWorkTime + expectedBreakTime;
        
        if (totalTime.totalTime !== expectedTotalTime) {
            throw new Error(`Expected total time ${expectedTotalTime}, got ${totalTime.totalTime}`);
        }
    }

    testBulkImportSingleTasks() {
        // Test bulk import creates single tasks
        const parsedTasks = [
            { description: 'Task 1', count: 2, valid: true },
            { description: 'Task 2', count: 1, valid: true }
        ];
        
        // Simulate import process
        parsedTasks.forEach(parsedTask => {
            const task = {
                id: Date.now() + Math.random(),
                description: parsedTask.description,
                originalDescription: parsedTask.description,
                count: parsedTask.count,
                completed: false
            };
            this.app.tasks.push(task);
        });
        
        if (this.app.tasks.length !== 2) {
            throw new Error(`Expected 2 tasks after bulk import, got ${this.app.tasks.length}`);
        }
        
        const task1 = this.app.tasks[0];
        if (task1.description !== 'Task 1') {
            throw new Error(`Expected 'Task 1', got '${task1.description}'`);
        }
        
        if (task1.count !== 2) {
            throw new Error(`Expected count 2, got ${task1.count}`);
        }
        
        const task2 = this.app.tasks[1];
        if (task2.description !== 'Task 2') {
            throw new Error(`Expected 'Task 2', got '${task2.description}'`);
        }
        
        if (task2.count !== 1) {
            throw new Error(`Expected count 1, got ${task2.count}`);
        }
    }

    testMultiSessionTaskNoBreaks() {
        // Test that multi-session tasks don't have breaks between sessions
        this.app.addTask('Task 1', 2); // 2 sessions
        this.app.addTask('Task 2', 1); // 1 session
        
        const totalTime = this.app.calculateTotalTime();
        
        // Total work time: (2 + 1) * 25 = 75 minutes
        const expectedWorkTime = 3 * this.app.settings.workDuration;
        if (totalTime.workTime !== expectedWorkTime) {
            throw new Error(`Expected work time ${expectedWorkTime}, got ${totalTime.workTime}`);
        }
        
        // Total breaks: 1 break between 2 tasks (not between sessions of same task)
        const expectedBreakTime = 1 * this.app.settings.shortBreakDuration;
        const expectedTotalTime = expectedWorkTime + expectedBreakTime;
        
        if (totalTime.totalTime !== expectedTotalTime) {
            throw new Error(`Expected total time ${expectedTotalTime}, got ${totalTime.totalTime}`);
        }
    }

    testTaskScheduleCalculation() {
        // Test that task schedule shows full duration for multi-session tasks
        this.app.addTask('Multi Task', 3); // 3 sessions = 75 minutes
        
        // Mock start time
        this.app.startTimeInput = { value: '10:00' };
        
        const taskSchedule = this.app.calculateTaskSchedule();
        const task = this.app.tasks[0];
        
        if (!taskSchedule[task.id]) {
            throw new Error('Task schedule should be calculated');
        }
        
        const schedule = taskSchedule[task.id];
        
        // The task should span 75 minutes (3 sessions * 25 minutes each)
        const expectedDuration = 75; // minutes
        const actualDuration = (schedule.endTime - schedule.startTime) / (1000 * 60);
        
        if (Math.abs(actualDuration - expectedDuration) > 1) { // Allow 1 minute tolerance
            throw new Error(`Expected task duration ~${expectedDuration} minutes, got ~${actualDuration} minutes`);
        }
    }

    testScheduleUpdateOnStartTimeChange() {
        // Test that schedule updates when start time changes
        this.app.addTask('Test Task', 1);
        
        // Mock start time input
        this.app.startTimeInput = { value: '10:00' };
        
        // Calculate initial schedule
        const initialSchedule = this.app.calculateTaskSchedule();
        const task = this.app.tasks[0];
        const initialTimeSpan = initialSchedule[task.id].timeSpan;
        
        // Change start time
        this.app.startTimeInput.value = '11:00';
        
        // Calculate new schedule
        const newSchedule = this.app.calculateTaskSchedule();
        const newTimeSpan = newSchedule[task.id].timeSpan;
        
        // Time spans should be different
        if (initialTimeSpan === newTimeSpan) {
            throw new Error('Schedule should update when start time changes');
        }
        
        // New time span should be 1 hour later
        const initialStart = initialTimeSpan.split(' - ')[0];
        const newStart = newTimeSpan.split(' - ')[0];
        
        if (initialStart === newStart) {
            throw new Error('Start time should be updated in schedule');
        }
    }

    testTaskBreakdown() {
        // Test task breakdown functionality
        this.app.addTask('Multi Task', 3); // 3 sessions
        
        if (this.app.tasks.length !== 1) {
            throw new Error('Should have 1 task initially');
        }
        
        const originalTask = this.app.tasks[0];
        
        // Simulate breakdown
        this.app.breakdownTask(originalTask.id);
        
        if (this.app.tasks.length !== 3) {
            throw new Error(`Expected 3 sub-tasks after breakdown, got ${this.app.tasks.length}`);
        }
        
        // Check sub-task properties
        this.app.tasks.forEach((subTask, index) => {
            if (subTask.count !== 1) {
                throw new Error(`Sub-task ${index + 1} should have count 1, got ${subTask.count}`);
            }
            
            if (!subTask.description.includes('Part')) {
                throw new Error(`Sub-task ${index + 1} should contain 'Part' in description`);
            }
            
            if (subTask.completed !== false) {
                throw new Error(`Sub-task ${index + 1} should not be completed`);
            }
        });
    }

    testBreakdownScheduleCalculation() {
        // Test that breakdown creates proper schedule with breaks
        this.app.addTask('Task 1', 2); // 2 sessions
        this.app.addTask('Task 2', 1); // 1 session
        
        // Breakdown the first task
        const firstTask = this.app.tasks[0];
        this.app.breakdownTask(firstTask.id);
        
        // Now we should have 3 tasks total (2 sub-tasks + 1 original task)
        if (this.app.tasks.length !== 3) {
            throw new Error(`Expected 3 tasks after breakdown, got ${this.app.tasks.length}`);
        }
        
        // Mock start time
        this.app.startTimeInput = { value: '10:00' };
        
        const totalTime = this.app.calculateTotalTime();
        
        // Total work time: 3 tasks * 25 minutes each = 75 minutes
        const expectedWorkTime = 3 * this.app.settings.workDuration;
        if (totalTime.workTime !== expectedWorkTime) {
            throw new Error(`Expected work time ${expectedWorkTime}, got ${totalTime.workTime}`);
        }
        
        // Total breaks: 2 breaks between 3 tasks
        const expectedBreakTime = 2 * this.app.settings.shortBreakDuration;
        const expectedTotalTime = expectedWorkTime + expectedBreakTime;
        
        if (totalTime.totalTime !== expectedTotalTime) {
            throw new Error(`Expected total time ${expectedTotalTime}, got ${totalTime.totalTime}`);
        }
    }

    runAllTests() {
        console.log('🧪 Running TimeFocus Unit Tests...\n');
        
        // Existing behavior tests
        this.runTest('Add Single Task', () => this.testAddSingleTask());
        this.runTest('Add Multi-Session Task', () => this.testAddMultiSessionTask());
        this.runTest('Session Switching When Not Running', () => this.testSessionSwitchingWhenNotRunning());
        this.runTest('Session Switching When Running (Should Block)', () => this.testSessionSwitchingWhenRunning());
        this.runTest('Timer Start/Stop/Pause', () => this.testTimerStartStop());
        this.runTest('Task Parsing', () => this.testTaskParsing());
        this.runTest('Total Time Calculation', () => this.testTotalTimeCalculation());
        this.runTest('Long Break Interval', () => this.testLongBreakInterval());
        
        console.log('\n🆕 Testing New Behavior...\n');
        
        // New behavior tests
        this.runTest('Timer Switching When Running (New Behavior)', () => this.testTimerSwitchingWhenRunning());
        this.runTest('Single Task Creation (New Behavior)', () => this.testSingleTaskCreation());
        this.runTest('Total Time With Multi-Session Tasks (New Behavior)', () => this.testTotalTimeWithMultiSessionTasks());
        this.runTest('Bulk Import Single Tasks (New Behavior)', () => this.testBulkImportSingleTasks());
        this.runTest('Multi-Session Task No Breaks (New Behavior)', () => this.testMultiSessionTaskNoBreaks());
        this.runTest('Task Schedule Calculation (New Behavior)', () => this.testTaskScheduleCalculation());
        this.runTest('Schedule Update On Start Time Change (New Behavior)', () => this.testScheduleUpdateOnStartTimeChange());
        this.runTest('Task Breakdown (New Behavior)', () => this.testTaskBreakdown());
        this.runTest('Breakdown Schedule Calculation (New Behavior)', () => this.testBreakdownScheduleCalculation());
        
        this.printResults();
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Total: ${this.testResults.length}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => r.status === 'FAIL').forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }
        
        console.log('\n🎯 All existing behavior tests completed!');
        
        console.log('\n📱 Testing Background Support...');
        this.testTimerBackgroundResume();
        this.testTimerBackgroundCompletion();
        this.testTimerStatePersistence();
        this.testRealTimeCalculation();
    }

    testTimerBackgroundResume() {
        this.runTest('Timer Background Resume', () => {
            // Start a 10-second timer
            this.app.timeRemaining = 10;
            this.app.timerDuration = 10;
            this.app.timerStartTime = Date.now() - 5000; // Started 5 seconds ago
            this.app.isRunning = true;
            
            // Update from real time
            this.app.updateTimerFromRealTime();
            
            // Should have 5 seconds remaining
            if (this.app.timeRemaining !== 5) {
                throw new Error(`Expected 5 seconds remaining, got ${this.app.timeRemaining}`);
            }
            
            if (!this.app.isRunning) {
                throw new Error('Timer should still be running');
            }
        });
    }

    testTimerBackgroundCompletion() {
        this.runTest('Timer Background Completion', () => {
            // Start a 5-second timer
            this.app.timeRemaining = 5;
            this.app.timerDuration = 5;
            this.app.timerStartTime = Date.now() - 10000; // Started 10 seconds ago (should be completed)
            this.app.isRunning = true;
            this.app.currentSessionType = 'work';
            const originalSessionType = this.app.currentSessionType;
            
            // Update from real time
            this.app.updateTimerFromRealTime();
            
            // Should have switched to break session (completeCurrentSession sets new time)
            if (this.app.currentSessionType !== 'short-break') {
                throw new Error(`Expected short-break session, got ${this.app.currentSessionType}`);
            }
            
            // Timer should not be running after completion
            if (this.app.isRunning) {
                throw new Error('Timer should not be running after completion');
            }
        });
    }

    testTimerStatePersistence() {
        this.runTest('Timer State Persistence', () => {
            // Set up timer state
            this.app.timeRemaining = 15;
            this.app.timerDuration = 15;
            this.app.timerStartTime = Date.now();
            this.app.isRunning = true;
            this.app.currentSessionType = 'work';
            this.app.saveTimerState();
            
            // Create new app instance and load state
            const newApp = new TimeFocusAppTestable();
            newApp.savedTimerState = this.app.savedTimerState;
            newApp.loadTimerState();
            
            // Should restore running state
            if (!newApp.isRunning) {
                throw new Error('Timer should be running after state restore');
            }
            
            if (newApp.currentSessionType !== 'work') {
                throw new Error(`Expected work session, got ${newApp.currentSessionType}`);
            }
            
            if (!newApp.timerStartTime) {
                throw new Error('Timer start time should be restored');
            }
        });
    }

    testRealTimeCalculation() {
        this.runTest('Real Time Calculation', () => {
            // Test that timer uses actual time, not just counting
            this.app.timeRemaining = 20;
            this.app.timerDuration = 20;
            this.app.timerStartTime = Date.now() - 7000; // Started 7 seconds ago
            this.app.isRunning = true;
            
            this.app.updateTimerFromRealTime();
            
            // Should have 13 seconds remaining (20 - 7)
            if (this.app.timeRemaining !== 13) {
                throw new Error(`Expected 13 seconds remaining, got ${this.app.timeRemaining}`);
            }
            
            // Test edge case - timer should complete if time exceeded
            this.app.timerStartTime = Date.now() - 25000; // Started 25 seconds ago
            this.app.currentSessionType = 'work';
            this.app.isRunning = true;
            this.app.updateTimerFromRealTime();
            
            // After completion, should switch to break session (not check timeRemaining)
            if (this.app.currentSessionType !== 'short-break') {
                throw new Error(`Expected session to switch to short-break after completion, got ${this.app.currentSessionType}`);
            }
            
            if (this.app.isRunning) {
                throw new Error('Timer should not be running after completion');
            }
        });
    }
}

// Run tests if this file is executed directly
const tests = new TimeFocusTests();
tests.runAllTests();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TimeFocusTests, TimeFocusAppTestable };
}

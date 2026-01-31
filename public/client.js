const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#FF1493',
    '#00CED1', '#FF69B4', '#32CD32', '#FF8C00', '#9370DB'
];

const COLOR_NAMES = {
    '#FF6B6B': '红队',
    '#4ECDC4': '青队',
    '#45B7D1': '蓝队',
    '#FFA07A': '橙队',
    '#98D8C8': '薄荷队',
    '#F7DC6F': '黄队',
    '#BB8FCE': '紫队',
    '#85C1E2': '天蓝队',
    '#F8B500': '金队',
    '#FF1493': '粉队',
    '#00CED1': '青绿队',
    '#FF69B4': '玫瑰队',
    '#32CD32': '绿队',
    '#FF8C00': '深橙队',
    '#9370DB': '淡紫队'
};

let ws = null;
let gameId = '';
let teamColor = '';
let gameData = null;
let existingTeams = [];

// WebSocket连接
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket 连接成功');
        updateConnectionStatus(true);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        updateConnectionStatus(false);
    };
    
    ws.onclose = () => {
        console.log('WebSocket 连接关闭');
        updateConnectionStatus(false);
        
        // 尝试重新连接
        setTimeout(() => {
            if (document.getElementById('gameScreen').classList.contains('active')) {
                connectWebSocket();
            }
        }, 3000);
    };
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.textContent = '✓ 已连接';
        statusEl.className = 'connection-status connected';
    } else {
        statusEl.textContent = '✗ 未连接 - 尝试重新连接...';
        statusEl.className = 'connection-status disconnected';
    }
}

// 处理服务器消息
function handleServerMessage(data) {
    console.log('收到消息:', data);
    
    switch (data.type) {
        case 'GAME_CREATED':
            gameId = data.gameId;
            teamColor = data.teamColor;
            gameData = data.gameData;
            enterGame();
            break;
            
        case 'GAME_JOINED':
            gameId = data.gameId;
            teamColor = data.teamColor;
            gameData = data.gameData;
            enterGame();
            break;
            
        case 'TEAM_UPDATED':
            gameData = data.gameData;
            updateBoard();
            updateTeamList();
            break;
            
        case 'PROGRESS_UPDATED':
            gameData = data.gameData;
            updateBoard();
            updateTeamList();
            
            // 如果是当前队伍，检查连线
            if (data.teamColor === teamColor) {
                checkForWin(data.lines);
            }
            break;
            
        case 'TASKS_UPDATED':
            gameData = data.gameData;
            initializeBoard();
            break;
            
        case 'PROGRESS_RESET':
            gameData = data.gameData;
            updateBoard();
            updateTeamList();
            break;
            
        case 'GAME_EXISTS':
            existingTeams = data.existingTeams;
            updateColorPicker();
            break;
            
        case 'GAME_NOT_FOUND':
            existingTeams = [];
            updateColorPicker();
            break;
            
        case 'ERROR':
            showError(data.message);
            document.getElementById('startBtn').disabled = false;
            break;
    }
}

// 初始化
function init() {
    connectWebSocket();
    initColorPicker();
    
    // 监听游戏ID输入
    document.getElementById('gameIdInput').addEventListener('input', (e) => {
        const inputGameId = e.target.value.trim();
        if (inputGameId && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'CHECK_GAME',
                gameId: inputGameId
            }));
        } else {
            usedColors = [];
            updateColorPicker();
        }
    });
}

// 初始化颜色选择器
function initColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.innerHTML = '';
    
    COLORS.forEach(color => {
        const option = document.createElement('div');
        option.className = 'color-option';
        option.style.backgroundColor = color;
        option.dataset.color = color;
        option.onclick = () => selectColor(color, option);
        option.title = COLOR_NAMES[color];
        colorPicker.appendChild(option);
    });
}

// 更新颜色选择器 - 显示队伍信息
function updateColorPicker() {
    document.querySelectorAll('.color-option').forEach(option => {
        const color = option.dataset.color;
        const team = existingTeams.find(t => t.color === color);
        
        option.classList.remove('taken');
        
        if (team) {
            // 显示队伍信息
            option.title = `${COLOR_NAMES[color]} - ${team.memberCount}人 - ${team.progress}/25完成 - ${team.lines}连线`;
        } else {
            option.title = COLOR_NAMES[color];
        }
    });
}

// 选择颜色
function selectColor(color, element) {
    teamColor = color;
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
}

// 加入游戏
function joinGame() {
    const inputGameId = document.getElementById('gameIdInput').value.trim();
    
    if (!teamColor) {
        showError('请选择一个队伍颜色！');
        return;
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showError('未连接到服务器，请稍后重试');
        return;
    }
    
    document.getElementById('startBtn').disabled = true;
    
    if (inputGameId) {
        // 加入现有游戏
        ws.send(JSON.stringify({
            type: 'JOIN_GAME',
            gameId: inputGameId,
            teamColor: teamColor
        }));
    } else {
        // 创建新游戏
        ws.send(JSON.stringify({
            type: 'CREATE_GAME',
            teamColor: teamColor
        }));
    }
}

// 进入游戏
function enterGame() {
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').classList.add('active');
    
    document.getElementById('currentPlayerName').textContent = COLOR_NAMES[teamColor];
    document.getElementById('currentPlayerColorDot').style.backgroundColor = teamColor;
    document.getElementById('displayGameId').textContent = gameId;
    
    initializeBoard();
    updateTeamList();
}

// 初始化棋盘
function initializeBoard() {
    const grid = document.getElementById('bingoGrid');
    grid.innerHTML = '';
    
    gameData.tasks.forEach((task, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        cell.dataset.index = index;
        
        cell.innerHTML = `
            <div class="cell-background" id="bg-${index}"></div>
            <div class="completion-markers" id="markers-${index}"></div>
            <div class="cell-task">${task}</div>
            <button class="detail-button" onclick="showTaskDetail(${index})" title="查看任务详情">ℹ️</button>
        `;
        
        cell.addEventListener('click', (e) => {
            if (!e.target.classList.contains('detail-button')) {
                toggleCell(index);
            }
        });
        
        grid.appendChild(cell);
    });
    
    updateBoard();
}

// 显示任务详情
function showTaskDetail(cellIndex) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('detailTitle');
    const content = document.getElementById('detailContent');
    
    title.textContent = `任务 ${cellIndex + 1}`;
    content.textContent = gameData.tasks[cellIndex];
    
    modal.classList.add('show');
}

// 关闭详情弹窗
function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
}

// 切换格子状态
function toggleCell(index) {
    const currentTeam = gameData.teams.find(t => t.color === teamColor);
    if (!currentTeam) return;
    
    const newCompleted = !currentTeam.completed[index];
    
    ws.send(JSON.stringify({
        type: 'UPDATE_PROGRESS',
        gameId: gameId,
        teamColor: teamColor,
        cellIndex: index,
        completed: newCompleted
    }));
}

// 更新棋盘显示
function updateBoard() {
    if (!gameData) return;
    
    gameData.tasks.forEach((task, index) => {
        const cell = document.querySelector(`.bingo-cell[data-index="${index}"]`);
        if (!cell) return;
        
        // 获取完成该格子的所有队伍
        const completedTeams = gameData.teams.filter(team => team.completed[index]);
        
        // 更新背景
        const bgDiv = document.getElementById(`bg-${index}`);
        if (bgDiv) {
            bgDiv.innerHTML = '';
            
            if (completedTeams.length > 0) {
                cell.classList.add('multi-team');
                completedTeams.forEach(team => {
                    const segment = document.createElement('div');
                    segment.className = 'cell-segment';
                    segment.style.backgroundColor = team.color;
                    bgDiv.appendChild(segment);
                });
            } else {
                cell.classList.remove('multi-team');
                cell.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
            }
        }
        
        // 更新标记点
        const markersDiv = document.getElementById(`markers-${index}`);
        if (markersDiv) {
            markersDiv.innerHTML = '';
            
            completedTeams.forEach(team => {
                const marker = document.createElement('div');
                marker.className = 'marker-dot';
                marker.style.backgroundColor = team.color;
                marker.title = `${COLOR_NAMES[team.color]} - ${team.memberCount}人`;
                markersDiv.appendChild(marker);
            });
        }
    });
}

// 更新团队列表
function updateTeamList() {
    if (!gameData) return;
    
    const teamList = document.getElementById('playerList');
    teamList.innerHTML = '';
    
    // 按连线数和完成数排序
    const sortedTeams = [...gameData.teams].sort((a, b) => {
        if (b.lines !== a.lines) return b.lines - a.lines;
        const aCompleted = a.completed.filter(c => c).length;
        const bCompleted = b.completed.filter(c => c).length;
        return bCompleted - aCompleted;
    });
    
    sortedTeams.forEach((team, index) => {
        const completedCount = team.completed.filter(c => c).length;
        const progress = Math.round((completedCount / 25) * 100);
        
        const teamItem = document.createElement('div');
        teamItem.className = 'player-item';
        if (team.color === teamColor) {
            teamItem.classList.add('current-player');
        }
        
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        teamItem.innerHTML = `
            <div class="player-item-color" style="background-color: ${team.color}"></div>
            <div class="player-item-info">
                <div class="player-item-name">${rankEmoji} ${COLOR_NAMES[team.color]} (${team.memberCount}人)${team.color === teamColor ? ' ⭐' : ''}</div>
                <div class="player-item-progress">完成: ${completedCount}/25 | 连线: ${team.lines}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%; background-color: ${team.color}"></div>
                </div>
            </div>
        `;
        
        teamList.appendChild(teamItem);
    });
}

// 检查胜利
function checkForWin(lines) {
    const currentTeam = gameData.teams.find(t => t.color === teamColor);
    if (!currentTeam) return;
    
    const prevLines = currentTeam.lines;
    
    if (lines > prevLines) {
        const winMessage = document.getElementById('winMessage');
        winMessage.textContent = `🎉 ${COLOR_NAMES[teamColor]}完成了 ${lines} 条连线！🎉`;
        winMessage.classList.add('show');
        setTimeout(() => {
            winMessage.classList.remove('show');
        }, 3000);
    }
}

// 重置队伍进度
function resetTeamProgress() {
    if (!confirm('确定要重置你的队伍进度吗？这将影响所有队友！')) return;
    
    ws.send(JSON.stringify({
        type: 'RESET_PROGRESS',
        gameId: gameId,
        teamColor: teamColor
    }));
}

// 打开自定义任务弹窗
function openCustomize() {
    const modal = document.getElementById('customizeModal');
    const taskInputs = document.getElementById('taskInputs');
    taskInputs.innerHTML = '';
    
    gameData.tasks.forEach((task, index) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-input';
        input.value = task;
        input.placeholder = `任务 ${index + 1}`;
        taskInputs.appendChild(input);
    });
    
    modal.classList.add('show');
}

// 保存任务
function saveTasks() {
    const inputs = document.querySelectorAll('.task-input');
    const tasks = Array.from(inputs).map(input => input.value || '空任务');
    
    ws.send(JSON.stringify({
        type: 'UPDATE_TASKS',
        gameId: gameId,
        tasks: tasks
    }));
    
    document.getElementById('customizeModal').classList.remove('show');
}

// 显示错误
function showError(message) {
    const errorDiv = document.getElementById('setupError');
    errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => {
        errorDiv.innerHTML = '';
    }, 5000);
}

// 显示通知
function showNotification(message) {
    console.log('通知:', message);
}

// 关闭弹窗
document.getElementById('customizeModal').addEventListener('click', (e) => {
    if (e.target.id === 'customizeModal') {
        e.target.classList.remove('show');
    }
});

document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') {
        e.target.classList.remove('show');
    }
});

// 页面加载时初始化
window.addEventListener('load', () => {
    init();
});

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 存储游戏数据（在生产环境中应使用数据库）
const games = new Map();

// 静态文件服务
app.use(express.static('public'));

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新客户端连接');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'CREATE_GAME':
                    handleCreateGame(ws, data);
                    break;
                case 'JOIN_GAME':
                    handleJoinGame(ws, data);
                    break;
                case 'UPDATE_PROGRESS':
                    handleUpdateProgress(ws, data);
                    break;
                case 'UPDATE_TASKS':
                    handleUpdateTasks(ws, data);
                    break;
                case 'RESET_PROGRESS':
                    handleResetProgress(ws, data);
                    break;
                case 'CHECK_GAME':
                    handleCheckGame(ws, data);
                    break;
            }
        } catch (error) {
            console.error('处理消息错误:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: '处理请求失败'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('客户端断开连接');
    });
});

// 创建新游戏
function handleCreateGame(ws, data) {
    const gameId = generateGameId();
    const { teamColor } = data;
    
    const team = {
        color: teamColor,
        completed: new Array(25).fill(false),
        lines: 0,
        memberCount: 1
    };
    
    const game = {
        id: gameId,
        tasks: data.tasks || getDefaultTasks(),
        teams: [team],
        createdAt: Date.now()
    };
    
    games.set(gameId, game);
    
    // 保存玩家的游戏ID和队伍颜色
    ws.gameId = gameId;
    ws.teamColor = teamColor;
    
    ws.send(JSON.stringify({
        type: 'GAME_CREATED',
        gameId: gameId,
        teamColor: teamColor,
        gameData: game
    }));
    
    console.log(`游戏创建成功: ${gameId}, 队伍颜色: ${teamColor}`);
}

// 加入游戏
function handleJoinGame(ws, data) {
    const { gameId, teamColor } = data;
    const game = games.get(gameId);
    
    if (!game) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: '游戏不存在'
        }));
        return;
    }
    
    // 查找或创建团队
    let team = game.teams.find(t => t.color === teamColor);
    
    if (team) {
        // 加入现有团队
        team.memberCount++;
    } else {
        // 创建新团队
        team = {
            color: teamColor,
            completed: new Array(25).fill(false),
            lines: 0,
            memberCount: 1
        };
        game.teams.push(team);
    }
    
    ws.gameId = gameId;
    ws.teamColor = teamColor;
    
    ws.send(JSON.stringify({
        type: 'GAME_JOINED',
        gameId: gameId,
        teamColor: teamColor,
        gameData: game
    }));
    
    // 通知所有其他玩家
    broadcastToGame(gameId, {
        type: 'TEAM_UPDATED',
        teamColor: teamColor,
        gameData: game
    }, ws);
    
    console.log(`队伍 ${teamColor} 新成员加入游戏 ${gameId}，当前人数: ${team.memberCount}`);
}

// 更新进度
function handleUpdateProgress(ws, data) {
    const { gameId, teamColor, cellIndex, completed } = data;
    const game = games.get(gameId);
    
    if (!game) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: '游戏不存在'
        }));
        return;
    }
    
    const team = game.teams.find(t => t.color === teamColor);
    if (!team) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: '团队不存在'
        }));
        return;
    }
    
    team.completed[cellIndex] = completed;
    team.lines = calculateLines(team.completed);
    
    // 广播给所有玩家
    broadcastToGame(gameId, {
        type: 'PROGRESS_UPDATED',
        teamColor: teamColor,
        cellIndex: cellIndex,
        completed: completed,
        lines: team.lines,
        gameData: game
    });
}

// 更新任务
function handleUpdateTasks(ws, data) {
    const { gameId, tasks } = data;
    const game = games.get(gameId);
    
    if (!game) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: '游戏不存在'
        }));
        return;
    }
    
    game.tasks = tasks;
    
    // 广播给所有玩家
    broadcastToGame(gameId, {
        type: 'TASKS_UPDATED',
        tasks: tasks,
        gameData: game
    });
}

// 重置进度
function handleResetProgress(ws, data) {
    const { gameId, teamColor } = data;
    const game = games.get(gameId);
    
    if (!game) return;
    
    const team = game.teams.find(t => t.color === teamColor);
    if (!team) return;
    
    team.completed = new Array(25).fill(false);
    team.lines = 0;
    
    broadcastToGame(gameId, {
        type: 'PROGRESS_RESET',
        teamColor: teamColor,
        gameData: game
    });
}

// 检查游戏是否存在
function handleCheckGame(ws, data) {
    const { gameId } = data;
    const game = games.get(gameId);
    
    if (game) {
        ws.send(JSON.stringify({
            type: 'GAME_EXISTS',
            gameId: gameId,
            existingTeams: game.teams.map(t => ({
                color: t.color,
                memberCount: t.memberCount,
                progress: t.completed.filter(c => c).length,
                lines: t.lines
            }))
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'GAME_NOT_FOUND',
            gameId: gameId
        }));
    }
}

// 广播消息给游戏中的所有玩家
function broadcastToGame(gameId, message, excludeWs = null) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && 
            client.gameId === gameId && 
            client !== excludeWs) {
            client.send(JSON.stringify(message));
        }
    });
}

// 计算连线数
function calculateLines(completed) {
    let lines = 0;
    
    // 检查行
    for (let i = 0; i < 5; i++) {
        if (completed.slice(i * 5, i * 5 + 5).every(c => c)) {
            lines++;
        }
    }
    
    // 检查列
    for (let i = 0; i < 5; i++) {
        if ([0, 1, 2, 3, 4].every(j => completed[j * 5 + i])) {
            lines++;
        }
    }
    
    // 检查对角线
    if ([0, 6, 12, 18, 24].every(i => completed[i])) {
        lines++;
    }
    if ([4, 8, 12, 16, 20].every(i => completed[i])) {
        lines++;
    }
    
    return lines;
}

// 生成游戏ID
function generateGameId() {
    return 'BINGO-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 默认任务
function getDefaultTasks() {
    return [
        "与新朋友自拍", "赞美某人", "分享一个有趣的事实", "做10个开合跳",
        "找到生日月份相同的人", "了解某人最喜欢的食物", "与3个人击掌", "讲一个笑话",
        "找到会说2种以上语言的人", "唱一首歌（任意长度）", "跳舞10秒", "快速画一幅画",
        "与他人交换联系方式", "询问某人的爱好", "分享你最喜欢的电影", "找到穿相同颜色衣服的人",
        "玩石头剪刀布", "用滑稽的步伐走过房间", "10秒内说出5种动物", "摆姿势拍照",
        "从20倒数", "找到鞋码相同的人", "分享一个尴尬的故事", "模仿一种动物叫声", "与某人碰拳"
    ];
}

// 定期清理超过24小时未活动的游戏
setInterval(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (const [gameId, game] of games.entries()) {
        if (now - game.createdAt > oneDay) {
            games.delete(gameId);
            console.log(`清理过期游戏: ${gameId}`);
        }
    }
}, 60 * 60 * 1000); // 每小时检查一次

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

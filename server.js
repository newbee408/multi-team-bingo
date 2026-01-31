const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 创建上传目录
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件！'));
        }
    }
});

// 存储游戏数据（在生产环境中应使用数据库）
const games = new Map();

// 静态文件服务
app.use(express.static('public'));
app.use(express.json());

// 图片上传接口
app.post('/upload/:gameId/:teamColor/:cellIndex', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }
        
        const { gameId, teamColor, cellIndex } = req.params;
        const game = games.get(gameId);
        
        if (!game) {
            return res.status(404).json({ error: '游戏不存在' });
        }
        
        const team = game.teams.find(t => t.color === teamColor);
        if (!team) {
            return res.status(404).json({ error: '队伍不存在' });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        // 保存图片URL到该格子
        if (!team.images) {
            team.images = {};
        }
        if (!team.images[cellIndex]) {
            team.images[cellIndex] = [];
        }
        team.images[cellIndex].push({
            url: imageUrl,
            uploadTime: Date.now()
        });
        
        res.json({ 
            success: true, 
            imageUrl: imageUrl,
            message: '图片上传成功'
        });
        
        // 通知所有客户端
        broadcastToGame(gameId, {
            type: 'IMAGE_UPLOADED',
            teamColor: teamColor,
            cellIndex: parseInt(cellIndex),
            imageUrl: imageUrl,
            gameData: game
        });
        
    } catch (error) {
        console.error('上传错误:', error);
        res.status(500).json({ error: '上传失败' });
    }
});

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
                case 'CHAT_MESSAGE':
                    handleChatMessage(ws, data);
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
        handleDisconnect(ws);
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
        memberCount: 1,
        images: {} // 存储每个格子的图片
    };
    
    const game = {
        id: gameId,
        tasks: data.tasks || getDefaultTasks(),
        teams: [team],
        chatHistory: [], // 聊天记录
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
            memberCount: 1,
            images: {}
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

// 处理聊天消息
function handleChatMessage(ws, data) {
    const { gameId, teamColor, message, teamName } = data;
    const game = games.get(gameId);
    
    if (!game) return;
    
    const chatMessage = {
        teamColor: teamColor,
        teamName: teamName,
        message: message,
        timestamp: Date.now()
    };
    
    // 保存聊天记录
    if (!game.chatHistory) {
        game.chatHistory = [];
    }
    game.chatHistory.push(chatMessage);
    
    // 只保留最近100条消息
    if (game.chatHistory.length > 100) {
        game.chatHistory = game.chatHistory.slice(-100);
    }
    
    // 广播消息
    broadcastToGame(gameId, {
        type: 'CHAT_MESSAGE',
        chatMessage: chatMessage
    });
}

// 处理断开连接
function handleDisconnect(ws) {
    if (ws.gameId && ws.teamColor) {
        const game = games.get(ws.gameId);
        if (game) {
            const team = game.teams.find(t => t.color === ws.teamColor);
            if (team && team.memberCount > 0) {
                team.memberCount--;
                
                // 如果队伍人数为0，可以选择保留或删除
                // 这里选择保留队伍数据，只是人数为0
                
                broadcastToGame(ws.gameId, {
                    type: 'TEAM_UPDATED',
                    teamColor: ws.teamColor,
                    gameData: game
                });
            }
        }
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

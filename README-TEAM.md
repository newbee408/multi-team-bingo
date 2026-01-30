# 团队Bingo游戏 - 多人实时协作版

一个支持多人团队协作的实时Bingo游戏，同一颜色的玩家组成一个队伍，共享进度！

## 🎮 游戏特点

- ✅ **团队模式** - 同一颜色的玩家为一个队伍
- ✅ **共享进度** - 队伍成员共同完成任务
- ✅ **实时同步** - 所有队伍的进度实时显示
- ✅ **无需注册** - 选择颜色即可加入
- ✅ **跨设备支持** - 手机、平板、电脑都可以玩
- ✅ **队伍排行榜** - 按连线数排名
- ✅ **WebSocket通信** - 低延迟实时更新

## 🎯 游戏玩法

### 创建游戏
1. 第一个玩家打开网页
2. **留空游戏ID字段**
3. **选择一个颜色作为队伍**（如：红队）
4. 点击"加入游戏"
5. 记下生成的游戏ID（如：BINGO-ABC123）
6. 将游戏ID分享给其他玩家

### 加入游戏
1. 其他玩家打开同一个网页
2. **输入游戏ID**
3. **选择自己的队伍颜色**
   - 选择相同颜色 = 加入该队伍（共享进度）
   - 选择不同颜色 = 创建新队伍（独立进度）
4. 点击"加入游戏"

### 游戏进行
- 点击格子标记完成的任务
- 同队伍的所有成员看到的进度是一样的
- 任何队友完成任务，整个队伍都会更新
- 完成横排、竖排或对角线即为连线
- 右侧显示所有队伍的排行榜

## 💡 团队策略

- **组建大团队**：多人同队可以更快完成任务
- **分队竞争**：不同颜色的队伍相互竞争
- **任务分工**：队友可以分工完成不同的任务
- **实时沟通**：建议队友通过语音或聊天软件协调

## 📱 游戏示例

**场景1 - 朋友聚会**
- 红队：小明、小红、小华（3人）
- 蓝队：小李、小张（2人）
- 绿队：小王（1人）
- 三个队伍竞争，看谁先完成5连线

**场景2 - 公司团建**
- 市场部选红色
- 技术部选蓝色
- 运营部选绿色
- 部门间PK，增强团队凝聚力

**场景3 - 课堂活动**
- 第一组选红色
- 第二组选蓝色
- 第三组选绿色
- 小组合作完成任务

## 🚀 安装部署

### 系统要求
- Node.js 14.0 或更高版本
- npm 包管理器

### 快速开始

1. **解压文件**
```bash
tar -xzf bingo-team-server.tar.gz
cd bingo-multiplayer-server
```

2. **安装依赖**
```bash
npm install
```

3. **启动服务器**
```bash
npm start
```

4. **访问游戏**
浏览器打开：`http://localhost:3000`

### 使用PM2（推荐生产环境）

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name bingo-team

# 查看状态
pm2 status

# 查看日志
pm2 logs bingo-team

# 停止
pm2 stop bingo-team

# 重启
pm2 restart bingo-team

# 设置开机自启
pm2 startup
pm2 save
```

### 配置端口

默认端口：3000

修改端口方法：
```bash
# 方法1：环境变量
PORT=8080 npm start

# 方法2：修改server.js
const PORT = process.env.PORT || 8080;
```

### 使用Nginx反向代理

创建配置文件 `/etc/nginx/sites-available/bingo-team`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/bingo-team /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### HTTPS配置（推荐）

使用Let's Encrypt获取免费SSL证书：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📁 文件结构

```
bingo-multiplayer-server/
├── server.js              # 服务器端（团队模式）
├── package.json           # 项目配置
├── public/
│   ├── index.html        # 游戏界面（团队UI）
│   └── client.js         # 客户端逻辑（团队逻辑）
├── README.md             # 说明文档
└── .gitignore            # Git忽略文件
```

## 🎨 可用队伍颜色

游戏提供15种颜色供选择：

1. 🔴 红队 (#FF6B6B)
2. 🟢 青队 (#4ECDC4)
3. 🔵 蓝队 (#45B7D1)
4. 🟠 橙队 (#FFA07A)
5. 🟡 薄荷队 (#98D8C8)
6. 🟡 黄队 (#F7DC6F)
7. 🟣 紫队 (#BB8FCE)
8. 🔵 天蓝队 (#85C1E2)
9. 🟡 金队 (#F8B500)
10. 🟣 粉队 (#FF1493)
11. 🟢 青绿队 (#00CED1)
12. 🟣 玫瑰队 (#FF69B4)
13. 🟢 绿队 (#32CD32)
14. 🟠 深橙队 (#FF8C00)
15. 🟣 淡紫队 (#9370DB)

## 🔧 自定义设置

### 修改默认任务

编辑 `server.js` 中的 `getDefaultTasks()` 函数：

```javascript
function getDefaultTasks() {
    return [
        "你的任务1",
        "你的任务2",
        // ... 总共25个任务
    ];
}
```

### 修改颜色和名称

编辑 `public/client.js` 中的 `COLORS` 和 `COLOR_NAMES`：

```javascript
const COLORS = ['#FF0000', '#00FF00', ...];
const COLOR_NAMES = {
    '#FF0000': '红队',
    '#00FF00': '绿队',
    ...
};
```

## 🐛 故障排查

### 无法连接到服务器
- 检查服务器是否运行：`pm2 status` 或 `ps aux | grep node`
- 检查防火墙：`sudo ufw allow 3000`
- 检查端口占用：`lsof -i :3000`

### WebSocket连接失败
- 检查浏览器控制台错误信息
- 确认没有代理服务器阻止WebSocket
- 查看服务器日志：`pm2 logs bingo-team`

### 队伍数据不同步
- 刷新页面重新连接
- 检查网络连接
- 查看服务器日志是否有错误

### 服务器重启后数据丢失
- 当前版本使用内存存储
- 建议添加数据库持久化（Redis/MongoDB）

## 🔒 安全建议

1. **限制游戏数量**：防止内存溢出
2. **输入验证**：验证任务内容
3. **速率限制**：防止恶意刷新
4. **HTTPS**：生产环境必须使用
5. **定期清理**：自动清理24小时未活动的游戏

## 📊 性能优化

### 使用数据库持久化

**Redis示例：**
```javascript
const redis = require('redis');
const client = redis.createClient();

// 保存游戏
await client.set(`game:${gameId}`, JSON.stringify(game));

// 读取游戏
const data = await client.get(`game:${gameId}`);
```

**MongoDB示例：**
```javascript
const mongoose = require('mongoose');
const GameSchema = new mongoose.Schema({
    id: String,
    tasks: [String],
    teams: [{
        color: String,
        completed: [Boolean],
        lines: Number,
        memberCount: Number
    }]
});
```

## 🎯 未来改进计划

- [ ] 队伍聊天功能
- [ ] 语音通话集成
- [ ] 数据库持久化
- [ ] 游戏历史记录
- [ ] 总排行榜
- [ ] 成就系统
- [ ] 自定义队伍名称
- [ ] 队长功能
- [ ] 踢人功能
- [ ] 房间密码

## 📝 更新日志

### v2.0.0 - 团队模式
- 改为团队协作模式
- 移除用户名输入
- 同颜色玩家共享进度
- 添加队伍排行榜
- 显示队伍人数

### v1.0.0 - 初始版本
- 基础多人游戏功能
- WebSocket实时通信

## 📄 许可证

MIT License

## 💬 支持与反馈

遇到问题？
1. 查看浏览器控制台（F12）
2. 查看服务器日志：`pm2 logs bingo-team`
3. 检查网络连接
4. 重启服务器：`pm2 restart bingo-team`

---

**祝你玩得开心！🎉**

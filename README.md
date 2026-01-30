# 多人实时Bingo游戏

一个支持多人在线实时互动的Bingo游戏，使用WebSocket实现实时同步。

## 功能特点

- ✅ **实时多人同步** - 所有玩家的进度实时显示
- ✅ **跨设备支持** - 手机、平板、电脑都可以玩
- ✅ **WebSocket通信** - 低延迟实时更新
- ✅ **游戏ID系统** - 轻松邀请朋友加入
- ✅ **颜色标识** - 每个玩家独特的颜色
- ✅ **自定义任务** - 可以修改游戏任务
- ✅ **进度追踪** - 查看所有玩家完成情况

## 系统要求

- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

## 安装步骤

### 1. 安装依赖

```bash
cd bingo-multiplayer-server
npm install
```

### 2. 启动服务器

**开发模式（自动重启）：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

服务器默认运行在 `http://localhost:3000`

### 3. 访问游戏

在浏览器中打开：`http://localhost:3000`

## 部署到服务器

### 方法一：直接部署

1. 将整个项目文件夹上传到服务器
2. 在服务器上运行：
```bash
cd bingo-multiplayer-server
npm install
npm start
```

### 方法二：使用PM2（推荐）

PM2 可以保持应用持续运行，并在崩溃时自动重启。

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name bingo-game

# 查看状态
pm2 status

# 查看日志
pm2 logs bingo-game

# 设置开机自启
pm2 startup
pm2 save
```

### 方法三：使用Nginx反向代理

1. 安装Nginx
2. 配置Nginx（`/etc/nginx/sites-available/bingo`）：

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

3. 启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/bingo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 方法四：Docker部署

创建 `Dockerfile`：
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

构建并运行：
```bash
docker build -t bingo-game .
docker run -d -p 3000:3000 --name bingo-game bingo-game
```

## 配置

### 修改端口

编辑 `server.js`，修改：
```javascript
const PORT = process.env.PORT || 3000;
```

或使用环境变量：
```bash
PORT=8080 npm start
```

### 使用HTTPS

如果使用HTTPS，修改 `client.js` 中的WebSocket连接会自动使用 `wss://` 协议。

建议使用 Let's Encrypt 获取免费SSL证书：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 如何使用

### 创建游戏
1. 第一个玩家打开网页
2. 留空"游戏ID"字段
3. 输入名字并选择颜色
4. 点击"开始游戏"
5. 记下生成的游戏ID（如：BINGO-ABC123）
6. 将游戏ID分享给其他玩家

### 加入游戏
1. 其他玩家打开同一个网页
2. 在"游戏ID"字段输入收到的游戏ID
3. 输入名字并选择可用颜色（已使用的颜色会显示为灰色）
4. 点击"开始游戏"

### 游戏进行
- 点击格子标记完成的任务
- 右侧查看所有玩家的进度
- 完成横排、竖排或对角线即为连线
- 可以自定义任务内容（所有玩家共享）

## 文件结构

```
bingo-multiplayer-server/
├── server.js              # 服务器端代码
├── package.json           # 项目配置
├── public/
│   ├── index.html        # 游戏界面
│   └── client.js         # 客户端逻辑
└── README.md             # 说明文档
```

## 技术栈

- **后端**: Node.js + Express + WebSocket (ws)
- **前端**: 原生 HTML/CSS/JavaScript
- **通信**: WebSocket 实时双向通信
- **存储**: 内存存储（可扩展为数据库）

## 性能优化建议

### 使用数据库
当前版本使用内存存储游戏数据。在生产环境中，建议使用数据库：

**使用Redis：**
```javascript
const redis = require('redis');
const client = redis.createClient();
```

**使用MongoDB：**
```javascript
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bingo');
```

### 扩展到多服务器
使用Redis Pub/Sub实现多服务器间的消息同步：
```javascript
const redis = require('redis');
const publisher = redis.createClient();
const subscriber = redis.createClient();
```

## 故障排查

### 无法连接到服务器
- 检查服务器是否正在运行：`pm2 status`
- 检查防火墙设置，确保端口开放
- 检查WebSocket连接是否被代理服务器阻止

### 玩家无法看到其他人的进度
- 检查WebSocket连接状态（页面顶部的连接状态）
- 检查浏览器控制台是否有错误
- 尝试刷新页面重新连接

### 游戏数据丢失
- 当前版本使用内存存储，服务器重启会丢失数据
- 建议实现数据库存储以持久化游戏数据

## 安全建议

1. **限制游戏数量**：添加最大游戏数量限制
2. **输入验证**：验证玩家名字和任务内容
3. **速率限制**：防止恶意刷新或频繁更新
4. **HTTPS**：在生产环境中使用HTTPS
5. **身份验证**：可选添加玩家身份验证

## 未来改进

- [ ] 添加聊天功能
- [ ] 数据库持久化
- [ ] 游戏历史记录
- [ ] 排行榜系统
- [ ] 音效和动画
- [ ] 移动端优化
- [ ] 房间密码保护
- [ ] 观众模式

## 许可证

MIT License

## 支持

如有问题，请查看服务器日志：
```bash
pm2 logs bingo-game
```

或检查浏览器控制台的错误信息。

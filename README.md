# Neo4j 图数据库管理系统

基于 Vue 3 + Element Plus 的 Neo4j 图数据库可视化管理平台。

## 功能特性

- 🔍 **节点查询**: 支持中文关键词搜索，智能节点发现
- 🔗 **关系查询**: 可视化展示节点间的关系网络
- ✏️ **数据管理**: 支持节点和关系的增删改查操作
- 👤 **用户权限**: 基于角色的权限控制（管理员/普通用户）
- ⚙️ **系统配置**: 数据库连接配置和系统监控
- 🎨 **现代化UI**: 采用 Element Plus + Glassmorphism 设计

## 技术栈

- **前端框架**: Vue 3 + Composition API
- **UI组件库**: Element Plus
- **图形可视化**: vis-network
- **构建工具**: Vite
- **路由管理**: Vue Router
- **HTTP客户端**: Axios

## 快速开始

### 1. 克隆项目

```bash
git clone https://jihulab.com/Restart666/YOUR_PROJECT_NAME.git
cd YOUR_PROJECT_NAME
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（根据实际情况修改）
vim .env
```

### 4. 本地开发

```bash
# 默认端口 (5173)
npm run dev

# 指定8888端口
npm run dev:8888
```

### 5. 生产构建

```bash
# 构建项目
npm run build

# 预览构建结果（8888端口）
npm run serve
```

## 服务器部署

### 方法一：自动部署脚本

```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 方法二：手动部署

```bash
# 1. 安装 Node.js (推荐 18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 克隆项目
git clone https://jihulab.com/Restart666/YOUR_PROJECT_NAME.git
cd YOUR_PROJECT_NAME

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置后端API地址等

# 5. 构建项目
npm run build

# 6. 启动服务（8888端口）
npm run serve
```

### 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'neo4j-frontend',
    script: 'npm',
    args: 'run serve',
    cwd: './',
    env: {
      NODE_ENV: 'production',
      PORT: 8888
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

## 环境变量说明

| 变量名 | 说明 | 默认值                     |
|--------|------|-------------------------|
| `GEMINI_API_KEY` | Gemini AI API密钥（可选） | -                       |
| `VITE_API_BASE_URL` | 后端API地址 | `http://localhost:8000` |

## 项目结构

```
src/
├── components/          # 公共组件
├── views/              # 页面组件
│   ├── Dashboard.vue   # 首页
│   ├── Login.vue       # 登录页
│   ├── NodeQuery.vue   # 节点查询
│   ├── RelationshipQuery.vue # 关系查询
│   └── SystemConfig.vue # 系统配置
├── router/             # 路由配置
├── services/           # API服务
│   ├── api.js         # 后端API
│   ├── auth.js        # 用户认证
│   └── neo4j.js       # Neo4j连接
└── utils/             # 工具函数
```

## 开发指南

### 本地开发环境

1. 确保后端服务正在运行
2. 配置正确的 `.env` 文件
3. 运行 `npm run dev:8888`
4. 访问 http://localhost:8888

### 代码规范

- 使用 Vue 3 Composition API
- 组件采用 `<script setup>` 语法
- 样式使用 scoped CSS
- 遵循 Element Plus 设计规范

## 常见问题

### 1. 无法连接后端API

检查 `.env` 文件中的 `VITE_API_BASE_URL` 配置是否正确。

### 2. 8888端口被占用

```bash
# 查看端口占用
lsof -i :8888

# 修改端口（在 vite.config.js 中）
```

### 3. 构建失败

```bash
# 清除依赖重新安装
rm -rf node_modules package-lock.json
npm install
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

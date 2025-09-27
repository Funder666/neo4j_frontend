<template>
  <div class="app-layout">
    <div class="layout-container">
      <!-- 顶部导航栏 -->
      <div class="top-navbar">
        <div class="navbar-left">
          <div class="logo-section">
            <div class="app-logo">
              <svg viewBox="0 0 100 100" class="logo-icon">
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" stroke-width="3"/>
                <circle cx="30" cy="35" r="6" fill="#00BCD4"/>
                <circle cx="70" cy="35" r="6" fill="#FF6B6B"/>
                <circle cx="50" cy="65" r="6" fill="#4ECDC4"/>
                <line x1="30" y1="35" x2="70" y2="35" stroke="#666" stroke-width="2"/>
                <line x1="30" y1="35" x2="50" y2="65" stroke="#666" stroke-width="2"/>
                <line x1="70" y1="35" x2="50" y2="65" stroke="#666" stroke-width="2"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#667eea"/>
                    <stop offset="100%" style="stop-color:#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="app-title">
              <h1>国际中文教育知识图谱</h1>
              <span class="subtitle">国际中文教育知识图谱</span>
            </div>
          </div>
        </div>
        
        <div class="navbar-right">
          <div class="connection-status">
            <div class="status-indicator" :class="getStatusClass()"></div>
            <span class="status-text">{{ connectionStatus }}</span>
          </div>
          
          <!-- 页面特定的操作按钮 -->
          <div class="page-actions" v-if="showPageActions">
            <slot name="page-actions"></slot>
          </div>
          
          <el-dropdown @command="handleCommand" class="user-dropdown">
            <div class="user-profile">
              <div class="avatar">
                <el-icon><User /></el-icon>
              </div>
              <div class="user-info">
                <span class="username">{{ currentUser?.username }}</span>
                <span class="user-role">{{ getUserRoleText(currentUser?.role) }}</span>
              </div>
              <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 侧边导航栏 -->
      <div class="sidebar-nav">
        <el-menu
          :default-active="activeMenu"
          class="nav-menu"
          router
          @select="handleMenuSelect"
        >
          <el-menu-item index="/dashboard" class="menu-item">
            <div class="menu-content">
              <el-icon class="menu-icon"><House /></el-icon>
              <span class="menu-text">首页</span>
            </div>
          </el-menu-item>
          <el-menu-item index="/query" class="menu-item">
            <div class="menu-content">
              <el-icon class="menu-icon"><Search /></el-icon>
              <span class="menu-text">节点查询</span>
            </div>
          </el-menu-item>
          <el-menu-item index="/relationships" class="menu-item">
            <div class="menu-content">
              <el-icon class="menu-icon"><Share /></el-icon>
              <span class="menu-text">关系查询</span>
            </div>
          </el-menu-item>
          <el-menu-item index="/cypher" class="menu-item">
            <div class="menu-content">
              <el-icon class="menu-icon"><EditPen /></el-icon>
              <span class="menu-text">通用查询</span>
            </div>
          </el-menu-item>
          <el-menu-item index="/corpus" class="menu-item">
            <div class="menu-content">
              <el-icon class="menu-icon"><Document /></el-icon>
              <span class="menu-text">语料库查询</span>
            </div>
          </el-menu-item>
          <el-menu-item index="/config" class="menu-item" v-if="currentUser?.role !== 'user'">
            <div class="menu-content">
              <el-icon class="menu-icon"><Setting /></el-icon>
              <span class="menu-text">系统配置</span>
            </div>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 主内容区域 -->
      <div class="main-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  ArrowDown,
  House,
  Search,
  Share,
  DataLine,
  Setting,
  SwitchButton,
  EditPen,
  Document
} from '@element-plus/icons-vue'
import authService from '../services/auth'
import apiService from '../services/api'

const props = defineProps({
  showPageActions: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()

const currentUser = ref(authService.getCurrentUser())
const connectionStatus = ref('检查中...')
let healthCheckTimer = null

const activeMenu = computed(() => route.path)

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      await authService.logout()
      router.push('/login')
      ElMessage.success('退出登录成功')
    }).catch(() => {
      // 用户取消登出，不需要任何操作
    })
  }
}

const handleMenuSelect = (index) => {
  // 菜单选择处理
}

const getUserRoleText = (role) => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'user1':
      return '用户1'
    case 'user2':
      return '用户2'
    case 'user3':
      return '用户3'
    case 'user4':
      return '用户4'
    default:
      return role || '用户'  // 直接显示角色名称，支持未来扩展
  }
}

// 获取连接状态样式类
const getStatusClass = () => {
  if (connectionStatus.value.includes('正常')) {
    return 'connected'
  }
  if (connectionStatus.value.includes('异常') || connectionStatus.value.includes('离线')) {
    return 'disconnected'
  }
  return 'checking'
}

// 检查服务健康状态
const checkHealth = async () => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    await apiService.healthCheck()
    clearTimeout(timeoutId)

    if (connectionStatus.value !== '服务正常') {
      connectionStatus.value = '服务正常'
    }
  } catch (error) {
    console.error('检查服务状态失败:', error)
    connectionStatus.value = '服务离线'
  }
}

onMounted(async () => {
  // 立即执行一次健康检查
  await checkHealth()

  // 每30秒检查一次服务状态
  healthCheckTimer = setInterval(checkHealth, 30000)
})

onUnmounted(() => {
  // 清理定时器
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
  }
})
</script>

<style scoped>
/* 主容器 */
.app-layout {
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
}

.layout-container {
  display: grid;
  grid-template-areas: 
    "navbar navbar"
    "sidebar main";
  grid-template-rows: 80px 1fr;
  grid-template-columns: 280px 1fr;
  height: 100%;
  width: 100%;
}

/* 顶部导航栏 */
.top-navbar {
  grid-area: navbar;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.navbar-left {
  display: flex;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-logo {
  width: 48px;
  height: 48px;
}

.logo-icon {
  width: 100%;
  height: 100%;
  animation: logoSpin 20s linear infinite;
}

@keyframes logoSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.app-title h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.app-title .subtitle {
  font-size: 14px;
  color: #666;
  font-weight: 400;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(240, 248, 255, 0.8);
  border-radius: 20px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: #52c41a;
}

.status-indicator.disconnected {
  background: #ff4d4f;
}

.status-indicator.checking {
  background: #faad14;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.status-text {
  font-size: 13px;
  font-weight: 500;
  color: #667eea;
}

.page-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-actions :deep(.action-btn) {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-actions :deep(.action-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-dropdown {
  cursor: pointer;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.user-profile:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.2);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.user-role {
  font-size: 12px;
  color: #7f8c8d;
}

.dropdown-arrow {
  color: #667eea;
  transition: transform 0.3s ease;
}

.user-profile:hover .dropdown-arrow {
  transform: rotate(180deg);
}

/* 侧边导航栏 */
.sidebar-nav {
  grid-area: sidebar;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  padding: 24px 0;
  overflow-y: auto;
}

.nav-menu {
  border: none;
  background: transparent;
}

.menu-item {
  margin: 4px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.menu-item.is-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.menu-item.is-active .menu-content {
  color: white;
}

.menu-item:hover:not(.is-active) {
  background: rgba(102, 126, 234, 0.1);
}

.menu-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #2c3e50;
  transition: all 0.3s ease;
}

.menu-icon {
  font-size: 20px;
  min-width: 20px;
}

.menu-text {
  font-size: 15px;
  font-weight: 500;
}

/* 主内容区域 */
.main-content {
  grid-area: main;
  padding: 32px;
  overflow-y: auto;
  background: transparent;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .layout-container {
    grid-template-columns: 240px 1fr;
  }
  
  .main-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .layout-container {
    grid-template-areas: 
      "navbar"
      "main";
    grid-template-rows: 80px 1fr;
    grid-template-columns: 1fr;
  }
  
  .sidebar-nav {
    display: none;
  }
  
  .main-content {
    padding: 16px;
  }
}

/* Element Plus 样式覆盖 */
.nav-menu :deep(.el-menu-item) {
  border-radius: 12px !important;
  margin: 4px 16px !important;
  color: #2c3e50 !important;
}

.nav-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
}

.nav-menu :deep(.el-menu-item:hover) {
  background: rgba(102, 126, 234, 0.1) !important;
}
</style>
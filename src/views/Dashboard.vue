<template>
  <AppLayout>
    <div class="dashboard-container">
          <!-- 欢迎横幅 -->
          <div class="welcome-banner">
            <div class="banner-content">
              <div class="welcome-text">
                <h2>欢迎回来，{{ currentUser?.username }}</h2>
                <p>管理和探索您的Neo4j图数据库</p>
              </div>
              <div class="banner-actions">
                <el-button type="primary" size="large" @click="$router.push('/query')">
                  <el-icon><Search /></el-icon>
                  开始查询
                </el-button>
              </div>
            </div>
          </div>


          <!-- 系统状态面板 -->
          <div class="system-section">
            <div class="section-header">
              <h3>系统状态</h3>
              <p>监控数据库连接和系统运行状态</p>
            </div>
            
            <div class="system-grid">
              <div class="system-card">
                <div class="system-header">
                  <h4>数据库连接</h4>
                  <div class="connection-badge" :class="getStatusClass()">
                    {{ connectionStatus }}
                  </div>
                </div>
                <div class="system-content">
                  <div class="connection-details">
                    <div class="detail-item">
                      <span class="label">服务器地址:</span>
                      <span class="value">bolt://8.153.207.172:7687</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">用户名:</span>
                      <span class="value">{{ currentUser?.username }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">连接时间:</span>
                      <span class="value">{{ formatTime(currentUser?.loginTime) }}</span>
                    </div>
                  </div>
                  <div class="action-buttons">
                    <el-button size="small" @click="testConnection" :loading="testing" type="primary">
                      <el-icon><Connection /></el-icon>
                      测试连接
                    </el-button>
                    <el-button size="small" @click="reconnect" :loading="reconnecting">
                      <el-icon><Refresh /></el-icon>
                      重新连接
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  ArrowDown,
  House,
  Search,
  Share,
  Setting,
  SwitchButton,
  Connection,
  Refresh
} from '@element-plus/icons-vue'
import authService from '../services/auth'
import apiService from '../services/api'
import AppLayout from '../components/AppLayout.vue'

const route = useRoute()
const router = useRouter()

const currentUser = ref(authService.getCurrentUser())
const connectionStatus = ref('检查中...')
const testing = ref(false)
const reconnecting = ref(false)
// 这些函数现在由 AppLayout 组件处理

onMounted(async () => {
  // 初始化连接状态检查
  await checkConnectionStatus()
})

const checkConnectionStatus = async () => {
  try {
    const isConnected = await apiService.isConnected()
    if (isConnected) {
      connectionStatus.value = '连接正常'
    } else {
      connectionStatus.value = '连接断开'
    }
  } catch (error) {
    console.error('检查连接状态失败:', error)
    connectionStatus.value = '连接异常'
  }
}

const testConnection = async () => {
  testing.value = true
  try {
    const isConnected = await apiService.isConnected()
    if (isConnected) {
      ElMessage.success('连接正常')
      connectionStatus.value = '连接正常'
    } else {
      ElMessage.warning('连接已断开')
      connectionStatus.value = '连接断开'
    }
  } catch (error) {
    console.error('测试连接失败:', error)
    ElMessage.error('连接测试失败')
    connectionStatus.value = '连接失败'
  } finally {
    testing.value = false
  }
}

const reconnect = async () => {
  reconnecting.value = true
  try {
    connectionStatus.value = '重连中...'
    const connected = await apiService.connect()
    
    if (connected) {
      ElMessage.success('重新连接成功')
      connectionStatus.value = '已连接'
    } else {
      ElMessage.error('重新连接失败')
      connectionStatus.value = '连接失败'
    }
  } catch (error) {
    console.error('重新连接失败:', error)
    ElMessage.error('重新连接失败')
    connectionStatus.value = '连接失败'
  } finally {
    reconnecting.value = false
  }
}


// 格式化时间显示
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString()
}

// 获取连接状态样式类
const getStatusClass = () => {
  if (connectionStatus.value.includes('已连接') || connectionStatus.value.includes('连接正常')) {
    return 'connected'
  }
  if (connectionStatus.value.includes('连接失败') || connectionStatus.value.includes('连接异常')) {
    return 'disconnected'
  }
  return 'checking'
}
</script>

<style scoped>
/* 主容器 */
.dashboard-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

/* Dashboard 内容样式 */

/* 欢迎横幅 */
.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  padding: 40px;
  color: white;
  position: relative;
  overflow: hidden;
}

.welcome-banner::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 200px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="3" fill="rgba(255,255,255,0.1)"/><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
  opacity: 0.3;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.welcome-text h2 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.welcome-text p {
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
}

.banner-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.banner-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* 统计卡片 */
.stats-section {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  justify-content: center;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.6;
}

.stat-card.nodes::before {
  color: #667eea;
}

.stat-card.relationships::before {
  color: #52c41a;
}

.stat-card.labels::before {
  color: #faad14;
}

.stat-card.performance::before {
  color: #722ed1;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.stat-card.nodes .stat-icon-wrapper {
  background: linear-gradient(135deg, #667eea20, #667eea10);
  color: #667eea;
}

.stat-card.relationships .stat-icon-wrapper {
  background: linear-gradient(135deg, #52c41a20, #52c41a10);
  color: #52c41a;
}

.stat-card.labels .stat-icon-wrapper {
  background: linear-gradient(135deg, #faad1420, #faad1410);
  color: #faad14;
}

.stat-card.performance .stat-icon-wrapper {
  background: linear-gradient(135deg, #722ed120, #722ed110);
  color: #722ed1;
}

.stat-icon {
  font-size: 28px;
}

.stat-details {
  flex: 1;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 8px 0;
  line-height: 1;
}

.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: #7f8c8d;
  margin: 0 0 4px 0;
}

.stat-trend {
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
  background: rgba(82, 196, 26, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
}

/* 功能面板 */
.features-section {
  margin: 0;
}

.section-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-header h3 {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.section-header p {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.feature-icon.query {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.feature-icon.visualization {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.feature-icon.management {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.feature-content {
  flex: 1;
}

.feature-content h4 {
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.feature-content p {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.feature-stats span {
  font-size: 12px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.feature-arrow {
  color: #7f8c8d;
  font-size: 18px;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-arrow {
  color: #667eea;
  transform: translateX(4px);
}

/* 系统状态面板 */
.system-section {
  margin: 0;
}

.system-grid {
  display: grid;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.system-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.system-header h4 {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
}

.connection-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.connection-badge.connected {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.2);
}

.connection-badge.disconnected {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
  border: 1px solid rgba(255, 77, 79, 0.2);
}

.connection-badge.checking {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
  border: 1px solid rgba(250, 173, 20, 0.2);
}

.system-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.connection-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #7f8c8d;
}

.value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
  text-align: right;
  max-width: 200px;
  word-break: break-all;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons .el-button {
  flex: 1;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-buttons .el-button:hover {
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-container {
    grid-template-columns: 240px 1fr;
  }
  
  .main-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
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
  
  .welcome-banner {
    padding: 24px;
  }
  
  .banner-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .welcome-text h2 {
    font-size: 24px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}

/* Element Plus 样式覆盖 */
.nav-menu .el-menu-item {
  border-radius: 12px !important;
  margin: 4px 16px !important;
  color: #2c3e50 !important;
}

.nav-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
}

.nav-menu .el-menu-item:hover {
  background: rgba(102, 126, 234, 0.1) !important;
}
</style>
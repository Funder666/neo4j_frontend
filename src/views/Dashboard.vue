<template>
  <div class="dashboard">
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h1>Neo4j 数据库管理系统</h1>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ currentUser?.username }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-container>
        <el-aside width="250px" class="sidebar">
          <el-menu
            :default-active="activeMenu"
            class="sidebar-menu"
            router
            @select="handleMenuSelect"
          >
            <el-menu-item index="/dashboard">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/query">
              <el-icon><Search /></el-icon>
              <span>节点查询</span>
            </el-menu-item>
            <el-menu-item index="/graph">
              <el-icon><Share /></el-icon>
              <span>图形可视化</span>
            </el-menu-item>
            <el-menu-item index="/data">
              <el-icon><DataLine /></el-icon>
              <span>数据管理</span>
            </el-menu-item>
            <el-menu-item index="/config">
              <el-icon><Setting /></el-icon>
              <span>系统配置</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <el-main class="main-content">
          <router-view v-if="$route.path !== '/dashboard'" />
          <div v-else class="dashboard-content">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-card class="stat-card">
                  <div class="stat-item">
                    <el-icon class="stat-icon nodes"><DataLine /></el-icon>
                    <div class="stat-info">
                      <div class="stat-number">{{ stats.nodeCount }}</div>
                      <div class="stat-label">节点总数</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card class="stat-card">
                  <div class="stat-item">
                    <el-icon class="stat-icon relationships"><Share /></el-icon>
                    <div class="stat-info">
                      <div class="stat-number">{{ stats.relationshipCount }}</div>
                      <div class="stat-label">关系总数</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="8">
                <el-card class="stat-card">
                  <div class="stat-item">
                    <el-icon class="stat-icon labels"><Collection /></el-icon>
                    <div class="stat-info">
                      <div class="stat-number">{{ stats.labelCount }}</div>
                      <div class="stat-label">标签类型</div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
            
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <div class="card-header">
                      <span>快速操作</span>
                    </div>
                  </template>
                  <div class="quick-actions">
                    <el-button type="primary" @click="$router.push('/query')">
                      <el-icon><Search /></el-icon>
                      节点查询
                    </el-button>
                    <el-button type="success" @click="$router.push('/graph')">
                      <el-icon><Share /></el-icon>
                      图形可视化
                    </el-button>
                    <el-button type="info" @click="$router.push('/data')">
                      <el-icon><DataLine /></el-icon>
                      数据管理
                    </el-button>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <div class="card-header">
                      <span>系统信息</span>
                    </div>
                  </template>
                  <div class="system-info">
                    <p><strong>数据库连接:</strong> {{ connectionStatus }}</p>
                    <p><strong>登录用户:</strong> {{ currentUser?.username }}</p>
                    <p><strong>登录时间:</strong> {{ formatTime(currentUser?.loginTime) }}</p>
                    <div style="margin-top: 15px;">
                      <el-button size="small" @click="testConnection" :loading="testing">
                        测试连接
                      </el-button>
                      <el-button size="small" @click="reconnect" :loading="reconnecting">
                        重新连接
                      </el-button>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
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
  DataLine,
  Setting,
  Collection
} from '@element-plus/icons-vue'
import authService from '../services/auth'
import neo4jService from '../services/neo4j'

const route = useRoute()
const router = useRouter()

const currentUser = ref(authService.getCurrentUser())
const connectionStatus = ref('检查中...')
const testing = ref(false)
const reconnecting = ref(false)
const stats = reactive({
  nodeCount: 0,
  relationshipCount: 0,
  labelCount: 0
})

const activeMenu = computed(() => route.path)

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      authService.logout()
      router.push('/login')
      ElMessage.success('退出登录成功')
    })
  }
}

const handleMenuSelect = (index) => {
  // 菜单选择处理
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString()
}

const loadStats = async () => {
  try {
    // 获取节点数量
    const nodeQuery = 'MATCH (n) RETURN count(n) as count'
    const nodeResult = await neo4jService.runQuery(nodeQuery)
    const nodeCount = nodeResult[0]?.get('count')
    stats.nodeCount = nodeCount && typeof nodeCount.toNumber === 'function' ? nodeCount.toNumber() : 0
    
    // 获取关系数量
    const relQuery = 'MATCH ()-[r]->() RETURN count(r) as count'
    const relResult = await neo4jService.runQuery(relQuery)
    const relCount = relResult[0]?.get('count')
    stats.relationshipCount = relCount && typeof relCount.toNumber === 'function' ? relCount.toNumber() : 0
    
    // 获取标签数量
    const labelResult = await neo4jService.getAllLabels()
    stats.labelCount = Array.isArray(labelResult) ? labelResult.length : 0
    
    connectionStatus.value = '已连接'
  } catch (error) {
    console.error('加载统计数据失败:', error)
    connectionStatus.value = '连接异常'
    // 重置统计数据为0，防止显示错误的数据
    stats.nodeCount = 0
    stats.relationshipCount = 0
    stats.labelCount = 0
  }
}

onMounted(async () => {
  // 确保Neo4j连接
  try {
    const connected = await neo4jService.connect()
    if (connected) {
      loadStats()
    } else {
      connectionStatus.value = '连接失败'
      ElMessage.error('无法连接到Neo4j数据库')
    }
  } catch (error) {
    console.error('连接Neo4j失败:', error)
    connectionStatus.value = '连接失败'
    ElMessage.error('数据库连接失败，请检查网络或配置')
  }
})

const testConnection = async () => {
  testing.value = true
  try {
    const isConnected = await neo4jService.isConnected()
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
    const connected = await neo4jService.connect()
    
    if (connected) {
      ElMessage.success('重新连接成功')
      connectionStatus.value = '已连接'
      // 重新加载统计数据
      loadStats()
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
</script>

<style scoped>
.dashboard {
  height: 100vh;
}

.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left h1 {
  color: #333;
  font-size: 20px;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #666;
}

.user-info:hover {
  color: #409eff;
}

.sidebar {
  background: white;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.main-content {
  background: #f5f5f5;
  padding: 20px;
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  height: 120px;
}

.stat-item {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 36px;
  margin-right: 15px;
}

.stat-icon.nodes {
  color: #409eff;
}

.stat-icon.relationships {
  color: #67c23a;
}

.stat-icon.labels {
  color: #e6a23c;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions {
  display: flex;
  gap: 10px;
}

.quick-actions .el-button {
  flex: 1;
}

.system-info p {
  margin: 10px 0;
  font-size: 14px;
  color: #666;
}
</style>
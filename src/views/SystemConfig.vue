<template>
  <AppLayout :show-page-actions="true">
    <template #page-actions>
      <el-button 
        type="info" 
        class="action-btn"
        @click="goHome"
      >
        <el-icon><HomeFilled /></el-icon>
        返回首页
      </el-button>
    </template>
    
    <div class="system-config">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <div class="page-icon">
              <el-icon class="icon"><Setting /></el-icon>
            </div>
            <div class="title-text">
              <h1 class="page-title">系统配置</h1>
              <p class="page-subtitle">管理数据库连接、系统信息和性能监控</p>
            </div>
          </div>
          <div class="header-status">
            <div class="connection-status">
              <div class="status-indicator" :class="connectionStatus.type"></div>
              <span class="status-text">{{ connectionStatus.text }}</span>
            </div>
          </div>
        </div>
      </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="content-card">
        <el-tabs v-model="activeTab" class="config-tabs">
          <el-tab-pane label="数据库配置" name="database">
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">
                  <el-icon><Connection /></el-icon>
                  数据库连接配置
                </h3>
                <p class="section-subtitle">配置 Neo4j 数据库连接参数</p>
              </div>
              
              <div class="form-container">
                <el-form
                  ref="dbFormRef"
                  :model="dbConfig"
                  :rules="dbRules"
                  label-width="140px"
                  class="config-form"
                >
                  <el-form-item label="数据库 URI" prop="uri">
                    <el-input
                      v-model="dbConfig.uri"
                      placeholder="bolt://localhost:7687"
                      class="config-input"
                    >
                      <template #prepend>
                        <el-icon><Link /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                  
                  <el-form-item label="用户名" prop="username">
                    <el-input 
                      v-model="dbConfig.username" 
                      class="config-input"
                      placeholder="请输入数据库用户名"
                    >
                      <template #prepend>
                        <el-icon><User /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                  
                  <el-form-item label="密码" prop="password">
                    <el-input
                      v-model="dbConfig.password"
                      type="password"
                      show-password
                      class="config-input"
                      placeholder="请输入数据库密码"
                    >
                      <template #prepend>
                        <el-icon><Lock /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                  
                  <el-form-item label="连接状态">
                    <div class="status-display">
                      <div class="status-indicator" :class="connectionStatus.type"></div>
                      <span class="status-text">{{ connectionStatus.text }}</span>
                    </div>
                  </el-form-item>
                  
                  <el-form-item>
                    <div class="form-actions">
                      <el-button 
                        type="primary" 
                        @click="testConnection" 
                        :loading="testing"
                        class="action-btn"
                      >
                        <el-icon><Connection /></el-icon>
                        {{ testing ? '测试中' : '测试连接' }}
                      </el-button>
                      <el-button 
                        type="success"
                        @click="saveConfig" 
                        :loading="saving"
                        class="action-btn"
                      >
                        <el-icon><Check /></el-icon>
                        {{ saving ? '保存中' : '保存配置' }}
                      </el-button>
                    </div>
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="系统信息" name="system">
            <div class="config-section">
              <div class="section-header">
                <h3 class="section-title">
                  <el-icon><InfoFilled /></el-icon>
                  系统信息概览
                </h3>
                <p class="section-subtitle">查看应用程序和数据库的详细信息</p>
              </div>
              
              <!-- 系统信息卡片 -->
              <div class="info-grid">
                <div class="info-card">
                  <div class="info-header">
                    <div class="info-icon app-icon">
                      <el-icon><Setting /></el-icon>
                    </div>
                    <h4 class="info-title">应用信息</h4>
                  </div>
                  <div class="info-content">
                    <div class="info-item">
                      <span class="info-label">应用名称</span>
                      <span class="info-value">{{ systemInfo.appName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">版本</span>
                      <span class="info-value">{{ systemInfo.version }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">构建时间</span>
                      <span class="info-value">{{ systemInfo.buildTime }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-card">
                  <div class="info-header">
                    <div class="info-icon tech-icon">
                      <el-icon><TrendCharts /></el-icon>
                    </div>
                    <h4 class="info-title">技术栈</h4>
                  </div>
                  <div class="info-content">
                    <div class="info-item">
                      <span class="info-label">Vue 版本</span>
                      <span class="info-value">{{ systemInfo.vueVersion }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Element Plus</span>
                      <span class="info-value">{{ systemInfo.elementVersion }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Neo4j Driver</span>
                      <span class="info-value">{{ systemInfo.neo4jVersion }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 数据库统计 -->
              <div class="stats-section">
                <div class="section-header">
                  <h3 class="section-title">
                    <el-icon><Connection /></el-icon>
                    数据库统计
                  </h3>
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="loadDbStats"
                    class="refresh-btn"
                  >
                    <el-icon><Refresh /></el-icon>
                    刷新数据
                  </el-button>
                </div>
                
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-icon nodes-icon">
                      <el-icon><Collection /></el-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ formatNumber(dbStats.nodeCount) }}</div>
                      <div class="stat-label">节点总数</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-icon relationships-icon">
                      <el-icon><Connection /></el-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ formatNumber(dbStats.relationshipCount) }}</div>
                      <div class="stat-label">关系总数</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-icon labels-icon">
                      <el-icon><DataLine /></el-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dbStats.labelCount }}</div>
                      <div class="stat-label">标签类型</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-icon types-icon">
                      <el-icon><Share /></el-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dbStats.relTypeCount }}</div>
                      <div class="stat-label">关系类型</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-icon index-icon">
                      <el-icon><Search /></el-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dbStats.indexCount }}</div>
                      <div class="stat-label">索引数量</div>
                    </div>
                  </div>
                  
                  <div class="stat-card">
                    <div class="stat-icon constraint-icon">
                      <el-icon><Lock /></el-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ dbStats.constraintCount }}</div>
                      <div class="stat-label">约束数量</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
      </el-tabs>
      </div>
    </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Setting, 
  Connection, 
  Link, 
  User, 
  Lock, 
  Check, 
  InfoFilled, 
  TrendCharts, 
  Refresh,
  Collection,
  DataLine,
  Share,
  Search,
  HomeFilled
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

const activeTab = ref('database')
const testing = ref(false)
const saving = ref(false)
const dbFormRef = ref(null)

const dbConfig = reactive({
  uri: 'bolt://8.153.207.172:7687',
  username: 'neo4j',
  password: 'xtxzhu2u'
})

const dbRules = {
  uri: [
    { required: true, message: '请输入数据库URI', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const connectionStatus = reactive({
  type: 'success',
  text: '已连接'
})

const systemInfo = reactive({
  appName: 'Neo4j 数据库管理系统',
  version: '1.0.0',
  vueVersion: '3.5.17',
  elementVersion: '2.10.3',
  neo4jVersion: '5.28.1',
  buildTime: new Date().toLocaleString()
})

const dbStats = reactive({
  nodeCount: 0,
  relationshipCount: 0,
  labelCount: 0,
  relTypeCount: 0,
  indexCount: 0,
  constraintCount: 0
})


// 导航方法
const goHome = () => {
  router.push('/dashboard')
}

const testConnection = async () => {
  if (!dbFormRef.value) return
  
  try {
    const valid = await dbFormRef.value.validate()
    if (!valid) return
    
    testing.value = true
    connectionStatus.type = 'warning'
    connectionStatus.text = '测试中...'
    
    const connected = await apiService.connect()
    
    if (connected) {
      connectionStatus.type = 'success'
      connectionStatus.text = '连接成功'
      ElMessage.success('数据库连接成功')
    } else {
      connectionStatus.type = 'danger'
      connectionStatus.text = '连接失败'
      ElMessage.error('数据库连接失败')
    }
    
  } catch (error) {
    connectionStatus.type = 'danger'
    connectionStatus.text = '连接失败'
    ElMessage.error('数据库连接失败')
  } finally {
    testing.value = false
  }
}

const saveConfig = async () => {
  if (!dbFormRef.value) return
  
  try {
    const valid = await dbFormRef.value.validate()
    if (!valid) return
    
    saving.value = true
    
    // 保存配置到本地存储
    localStorage.setItem('neo4j_config', JSON.stringify(dbConfig))
    
    ElMessage.success('配置保存成功')
    
  } catch (error) {
    ElMessage.error('配置保存失败')
  } finally {
    saving.value = false
  }
}

const loadDbStats = async () => {
  try {
    // 使用API服务获取统计数据
    const statsResponse = await apiService.getStats()
    dbStats.nodeCount = statsResponse.node_count || 0
    dbStats.relationshipCount = statsResponse.relationship_count || 0
    dbStats.labelCount = statsResponse.label_count || 0
    
    // 获取关系类型数量
    const relTypeResponse = await apiService.getRelationshipTypes()
    dbStats.relTypeCount = relTypeResponse.relationship_types.length
    
    // 获取索引数量 - 使用兼容的查询方式
    try {
      // 尝试新版本的查询
      const indexQuery = 'SHOW INDEXES'
      const indexResult = await apiService.runQuery(indexQuery)
      dbStats.indexCount = indexResult.records.length
    } catch (indexError) {
      console.log('使用备用索引查询方法')
      // 如果新版本不支持，使用其他方法或设置为0
      dbStats.indexCount = 0
    }
    
    // 获取约束数量 - 使用兼容的查询方式  
    try {
      // 尝试新版本的查询
      const constraintQuery = 'SHOW CONSTRAINTS'
      const constraintResult = await apiService.runQuery(constraintQuery)
      dbStats.constraintCount = constraintResult.records.length
    } catch (constraintError) {
      console.log('使用备用约束查询方法')
      // 如果新版本不支持，使用其他方法或设置为0
      dbStats.constraintCount = 0
    }
    
  } catch (error) {
    console.error('加载数据库统计失败:', error)
  }
}


const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

onMounted(async () => {
  // 加载保存的配置
  const savedConfig = localStorage.getItem('neo4j_config')
  if (savedConfig) {
    Object.assign(dbConfig, JSON.parse(savedConfig))
  }
  
  // 加载数据库统计
  await loadDbStats()
})
</script>

<style scoped>
/* 主容器 */
.system-config {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 24px;
}

/* 页面头部 */
.page-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.page-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.page-icon .icon {
  font-size: 28px;
  color: white;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-subtitle {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
  font-weight: 400;
}

.header-status {
  display: flex;
  align-items: center;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.success {
  background: #67C23A;
}

.status-indicator.danger {
  background: #F56C6C;
}

.status-indicator.warning {
  background: #E6A23C;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.status-text {
  font-size: 14px;
  color: #606266;
  font-weight: 600;
}

/* 主要内容区域 */
.main-content {
  margin-bottom: 24px;
}

.content-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 标签页 */
.config-tabs {
  margin-top: 16px;
}

.config-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  padding: 8px;
}

.config-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.config-tabs :deep(.el-tabs__item) {
  padding: 16px 24px;
  border-radius: 8px;
  font-weight: 600;
  color: #7f8c8d;
  transition: all 0.3s ease;
}

.config-tabs :deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.config-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

/* 配置区域 */
.config-section {
  padding: 24px 0;
}

.section-header {
  margin-bottom: 24px;
  text-align: center;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.section-subtitle {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

/* 表单容器 */
.form-container {
  max-width: 600px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.config-form {
  margin: 0;
}

.config-input :deep(.el-input-group__prepend) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 12px 0 0 12px;
}

.config-input :deep(.el-input__wrapper) {
  border-radius: 0 12px 12px 0;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  box-shadow: none;
}

.config-input :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.config-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.status-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 16px;
}

.action-btn {
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.info-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.info-card:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.info-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.app-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tech-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.info-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.info-value {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

/* 统计区域 */
.stats-section {
  margin-top: 40px;
}

.stats-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
}

.refresh-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  transform: translateY(-2px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.nodes-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.relationships-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.labels-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.types-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.index-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.constraint-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  
  .stats-section .section-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .system-config {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .title-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .info-item {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
</style>
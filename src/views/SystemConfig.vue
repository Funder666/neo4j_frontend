<template>
  <div class="system-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统配置</span>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="数据库配置" name="database">
          <div class="config-section">
            <el-form
              ref="dbFormRef"
              :model="dbConfig"
              :rules="dbRules"
              label-width="120px"
              style="max-width: 600px"
            >
              <el-form-item label="数据库URI" prop="uri">
                <el-input
                  v-model="dbConfig.uri"
                  placeholder="bolt://localhost:7687"
                />
              </el-form-item>
              
              <el-form-item label="用户名" prop="username">
                <el-input v-model="dbConfig.username" />
              </el-form-item>
              
              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="dbConfig.password"
                  type="password"
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="连接状态">
                <el-tag :type="connectionStatus.type">
                  {{ connectionStatus.text }}
                </el-tag>
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="testConnection" :loading="testing">
                  测试连接
                </el-button>
                <el-button @click="saveConfig" :loading="saving">
                  保存配置
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="系统信息" name="system">
          <div class="config-section">
            <el-descriptions title="系统信息" :column="2" border>
              <el-descriptions-item label="应用名称">
                {{ systemInfo.appName }}
              </el-descriptions-item>
              <el-descriptions-item label="版本">
                {{ systemInfo.version }}
              </el-descriptions-item>
              <el-descriptions-item label="Vue版本">
                {{ systemInfo.vueVersion }}
              </el-descriptions-item>
              <el-descriptions-item label="Element Plus版本">
                {{ systemInfo.elementVersion }}
              </el-descriptions-item>
              <el-descriptions-item label="Neo4j Driver版本">
                {{ systemInfo.neo4jVersion }}
              </el-descriptions-item>
              <el-descriptions-item label="构建时间">
                {{ systemInfo.buildTime }}
              </el-descriptions-item>
            </el-descriptions>
            
            <el-divider />
            
            <el-descriptions title="数据库统计" :column="2" border>
              <el-descriptions-item label="节点总数">
                {{ dbStats.nodeCount }}
              </el-descriptions-item>
              <el-descriptions-item label="关系总数">
                {{ dbStats.relationshipCount }}
              </el-descriptions-item>
              <el-descriptions-item label="标签类型">
                {{ dbStats.labelCount }}
              </el-descriptions-item>
              <el-descriptions-item label="关系类型">
                {{ dbStats.relTypeCount }}
              </el-descriptions-item>
              <el-descriptions-item label="索引数量">
                {{ dbStats.indexCount }}
              </el-descriptions-item>
              <el-descriptions-item label="约束数量">
                {{ dbStats.constraintCount }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="性能监控" name="performance">
          <div class="config-section">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>查询性能</span>
                  <el-button size="small" @click="refreshPerformance">刷新</el-button>
                </div>
              </template>
              
              <el-table :data="performanceData" stripe>
                <el-table-column prop="query" label="查询" min-width="300" />
                <el-table-column prop="executionTime" label="执行时间(ms)" width="150" />
                <el-table-column prop="recordsReturned" label="返回记录数" width="150" />
                <el-table-column prop="timestamp" label="执行时间" width="180" />
              </el-table>
            </el-card>
            
            <el-card style="margin-top: 20px;">
              <template #header>
                <span>内存使用情况</span>
              </template>
              
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-statistic title="总内存" :value="memoryInfo.total" suffix="MB" />
                </el-col>
                <el-col :span="8">
                  <el-statistic title="已用内存" :value="memoryInfo.used" suffix="MB" />
                </el-col>
                <el-col :span="8">
                  <el-statistic title="可用内存" :value="memoryInfo.available" suffix="MB" />
                </el-col>
              </el-row>
              
              <el-progress
                :percentage="memoryInfo.usagePercent"
                :status="memoryInfo.usagePercent > 80 ? 'exception' : 'success'"
                style="margin-top: 20px;"
              />
            </el-card>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="日志管理" name="logs">
          <div class="config-section">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>系统日志</span>
                  <div>
                    <el-button size="small" @click="clearLogs">清空日志</el-button>
                    <el-button size="small" @click="downloadLogs">下载日志</el-button>
                  </div>
                </div>
              </template>
              
              <div class="log-container">
                <div
                  v-for="log in logs"
                  :key="log.id"
                  :class="['log-item', log.level]"
                >
                  <span class="log-time">{{ log.timestamp }}</span>
                  <span class="log-level">{{ log.level }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import neo4jService from '../services/neo4j'

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

const performanceData = ref([])

const memoryInfo = reactive({
  total: 1024,
  used: 512,
  available: 512,
  usagePercent: 50
})

const logs = ref([
  {
    id: 1,
    timestamp: '2024-01-01 10:00:00',
    level: 'INFO',
    message: '系统启动成功'
  },
  {
    id: 2,
    timestamp: '2024-01-01 10:01:00',
    level: 'INFO',
    message: 'Neo4j数据库连接成功'
  },
  {
    id: 3,
    timestamp: '2024-01-01 10:02:00',
    level: 'WARN',
    message: '内存使用率较高'
  }
])

const testConnection = async () => {
  if (!dbFormRef.value) return
  
  try {
    const valid = await dbFormRef.value.validate()
    if (!valid) return
    
    testing.value = true
    connectionStatus.type = 'warning'
    connectionStatus.text = '测试中...'
    
    const connected = await neo4jService.connect()
    
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
    // 获取节点数量
    const nodeQuery = 'MATCH (n) RETURN count(n) as count'
    const nodeResult = await neo4jService.runQuery(nodeQuery)
    dbStats.nodeCount = nodeResult[0]?.get('count')?.toNumber() || 0
    
    // 获取关系数量
    const relQuery = 'MATCH ()-[r]->() RETURN count(r) as count'
    const relResult = await neo4jService.runQuery(relQuery)
    dbStats.relationshipCount = relResult[0]?.get('count')?.toNumber() || 0
    
    // 获取标签数量
    const labelResult = await neo4jService.getAllLabels()
    dbStats.labelCount = labelResult.length
    
    // 获取关系类型数量
    const relTypeResult = await neo4jService.getAllRelationshipTypes()
    dbStats.relTypeCount = relTypeResult.length
    
    // 获取索引数量
    const indexQuery = 'CALL db.indexes()'
    const indexResult = await neo4jService.runQuery(indexQuery)
    dbStats.indexCount = indexResult.length
    
    // 获取约束数量
    const constraintQuery = 'CALL db.constraints()'
    const constraintResult = await neo4jService.runQuery(constraintQuery)
    dbStats.constraintCount = constraintResult.length
    
  } catch (error) {
    console.error('加载数据库统计失败:', error)
  }
}

const refreshPerformance = () => {
  // 模拟性能数据
  performanceData.value = [
    {
      query: 'MATCH (n) RETURN n LIMIT 10',
      executionTime: 45,
      recordsReturned: 10,
      timestamp: new Date().toLocaleString()
    },
    {
      query: 'MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 50',
      executionTime: 120,
      recordsReturned: 50,
      timestamp: new Date().toLocaleString()
    },
    {
      query: 'MATCH (n:Person) WHERE n.name CONTAINS "张" RETURN n',
      executionTime: 89,
      recordsReturned: 25,
      timestamp: new Date().toLocaleString()
    }
  ]
  
  // 更新内存信息
  memoryInfo.used = Math.floor(Math.random() * 800) + 200
  memoryInfo.available = memoryInfo.total - memoryInfo.used
  memoryInfo.usagePercent = Math.round((memoryInfo.used / memoryInfo.total) * 100)
}

const clearLogs = () => {
  logs.value = []
  ElMessage.success('日志已清空')
}

const downloadLogs = () => {
  const logText = logs.value.map(log => 
    `${log.timestamp} [${log.level}] ${log.message}`
  ).join('\n')
  
  const blob = new Blob([logText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `system_logs_${new Date().toISOString().split('T')[0]}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  // 加载保存的配置
  const savedConfig = localStorage.getItem('neo4j_config')
  if (savedConfig) {
    Object.assign(dbConfig, JSON.parse(savedConfig))
  }
  
  // 加载数据库统计
  await loadDbStats()
  
  // 初始化性能数据
  refreshPerformance()
})
</script>

<style scoped>
.system-config {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-section {
  padding: 20px;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
  background: #f9f9f9;
  font-family: monospace;
}

.log-item {
  display: flex;
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}

.log-item.INFO {
  background: #e8f5e8;
}

.log-item.WARN {
  background: #fff3cd;
}

.log-item.ERROR {
  background: #f8d7da;
}

.log-time {
  width: 150px;
  color: #666;
  font-size: 12px;
}

.log-level {
  width: 60px;
  font-weight: bold;
  font-size: 12px;
}

.log-level {
  color: #28a745;
}

.log-item.WARN .log-level {
  color: #ffc107;
}

.log-item.ERROR .log-level {
  color: #dc3545;
}

.log-message {
  flex: 1;
  font-size: 12px;
}
</style>
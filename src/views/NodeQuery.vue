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
      <el-button 
        type="primary" 
        class="action-btn"
        @click="clearResults"
        :disabled="loading"
      >
        <el-icon><RefreshRight /></el-icon>
        清空结果
      </el-button>
    </template>
    
    <div class="node-query-container">
      <!-- 页面头部 -->
      <div class="page-header">
        <div class="header-content">
          <div class="title-section">
            <div class="page-icon">
              <el-icon class="icon"><Search /></el-icon>
            </div>
            <div class="title-text">
              <h1 class="page-title">节点查询</h1>
              <p class="page-subtitle">搜索和探索图数据库中的节点信息</p>
            </div>
          </div>
        </div>
      </div>

    <!-- 查询区域 -->
    <div class="search-section">
      <div class="search-card">
        <div class="search-header">
          <h3 class="section-title">
            <el-icon><Search /></el-icon>
            智能搜索
          </h3>
          <p class="section-subtitle">输入关键词快速定位相关节点</p>
        </div>
        
        <div class="search-form">
          <!-- 主搜索框 -->
          <div class="main-search">
            <div class="search-input-wrapper">
              <el-input
                v-model="queryText"
                placeholder="输入汉字或关键词查询相关节点..."
                size="large"
                class="search-input"
                @keyup.enter="searchNodes"
              >
                <template #prepend>
                  <el-icon class="search-icon"><Search /></el-icon>
                </template>
                <template #append>
                  <el-button 
                    type="primary" 
                    :loading="loading"
                    @click="searchNodes"
                    class="search-btn"
                  >
                    {{ loading ? '搜索中' : '搜索' }}
                  </el-button>
                </template>
              </el-input>
            </div>
          </div>
          
          <!-- 高级选项 -->
          <div class="advanced-options">
            <div class="option-group">
              <label class="option-label">节点标签</label>
              <el-select
                v-model="selectedLabel"
                placeholder="选择节点标签（可选）"
                clearable
                class="option-select"
              >
                <el-option
                  v-for="label in labels"
                  :key="label"
                  :label="label"
                  :value="label"
                />
              </el-select>
            </div>
            
            <div class="option-group">
              <label class="option-label">结果数量</label>
              <el-input-number
                v-model="limit"
                :min="1"
                :max="1000"
                :step="10"
                :precision="0"
                class="option-number"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 查询结果区域 -->
    <div class="results-section" v-if="results.length > 0">
      <div class="results-card">
        <div class="results-header">
          <div class="results-title">
            <h3 class="section-title">
              <el-icon><Collection /></el-icon>
              查询结果
            </h3>
            <div class="results-stats">
              <span class="result-count">{{ results.length }}</span>
              <span class="result-text">个节点</span>
            </div>
          </div>
          <div class="results-actions">
            <el-button 
              type="primary" 
              class="view-btn"
              @click="toggleView"
            >
              <el-icon><Share /></el-icon>
              {{ viewMode === 'table' ? '图形视图' : '表格视图' }}
            </el-button>
            <el-button 
              type="info" 
              class="export-btn"
              @click="exportResults"
            >
              <el-icon><Download /></el-icon>
              导出结果
            </el-button>
          </div>
        </div>
        
        <!-- 图形可视化视图 -->
        <div v-if="viewMode === 'graph'" class="graph-view">
          <div ref="networkContainer" class="network-container"></div>
          
          <!-- 选中节点信息面板 -->
          <div v-if="selectedNode" class="node-info-panel">
            <div class="panel-header">
              <h4 class="panel-title">
                <el-icon><InfoFilled /></el-icon>
                节点信息
              </h4>
              <el-button type="text" @click="selectedNode = null" class="close-btn">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <div class="panel-content">
              <div class="node-basic-info">
                <div class="info-item">
                  <span class="info-label">ID:</span>
                  <span class="info-value">{{ selectedNode.id }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">标签:</span>
                  <div class="info-labels">
                    <el-tag
                      v-for="label in selectedNode.labels"
                      :key="label"
                      type="info"
                      effect="light"
                      class="node-label-tag"
                    >
                      {{ label }}
                    </el-tag>
                  </div>
                </div>
              </div>
              
              <div class="node-properties">
                <h5 class="properties-title">属性</h5>
                <div class="properties-list">
                  <div 
                    v-for="(value, key) in selectedNode.properties"
                    :key="key"
                    class="property-row"
                  >
                    <div class="property-name">{{ key }}</div>
                    <div class="property-val">
                      <a v-if="isUrl(formatProperty(value))" 
                         :href="formatProperty(value)" 
                         target="_blank" 
                         class="property-url">
                        {{ formatProperty(value) }}
                      </a>
                      <span v-else>{{ formatProperty(value) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 表格视图 -->
        <div v-else class="results-content">
          <el-table :data="results" class="results-table">
            <el-table-column type="expand">
              <template #default="props">
                <div class="node-details">
                  <div class="details-header">
                    <h4 class="details-title">
                      <el-icon><InfoFilled /></el-icon>
                      节点详细属性
                    </h4>
                    <div class="node-id-badge">
                      ID: {{ props.row.id }}
                    </div>
                  </div>
                  
                  <div class="properties-grid">
                    <div 
                      v-for="(value, key) in props.row.properties"
                      :key="key"
                      class="property-card"
                    >
                      <div class="property-key">{{ key }}</div>
                      <div class="property-value">
                        <a v-if="isUrl(formatProperty(value))" 
                           :href="formatProperty(value)" 
                           target="_blank" 
                           class="property-link">
                          {{ formatProperty(value) }}
                        </a>
                        <span v-else class="property-text">{{ formatProperty(value) }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="details-actions">
                    <el-button 
                      type="primary" 
                      class="detail-btn"
                      @click="viewRelationships(props.row)"
                    >
                      <el-icon><Share /></el-icon>
                      查看关系
                    </el-button>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="id" label="节点ID" width="100" class-name="id-column" />
            
            <el-table-column prop="labels" label="标签" width="180">
              <template #default="scope">
                <div class="labels-container">
                  <el-tag
                    v-for="label in scope.row.labels"
                    :key="label"
                    type="info"
                    effect="light"
                    class="label-tag"
                  >
                    {{ label }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="主要属性" min-width="500">
              <template #default="scope">
                <div class="property-preview">
                  <div
                    v-for="(value, key) in getMainProperties(scope.row.properties)"
                    :key="key"
                    class="property-item"
                  >
                    <span class="prop-key">{{ key }}</span>
                    <span class="prop-value">
                      <a v-if="isUrl(formatProperty(value))" 
                         :href="formatProperty(value)" 
                         target="_blank" 
                         class="property-link-small">
                        {{ formatProperty(value) }}
                      </a>
                      <span v-else>{{ formatProperty(value) }}</span>
                    </span>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="240" class-name="actions-column">
              <template #default="scope">
                <div class="table-actions">
                  <el-button 
                    type="primary" 
                    size="small" 
                    class="action-btn-sm"
                    @click="editNode(scope.row)"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    class="action-btn-sm"
                    @click="deleteNode(scope.row)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div class="empty-section" v-else-if="searched && !loading">
      <div class="empty-card">
        <el-empty description="未找到相关节点">
          <template #image>
            <div class="empty-icon">
              <el-icon><Search /></el-icon>
            </div>
          </template>
          <template #description>
            <p class="empty-title">未找到相关节点</p>
            <p class="empty-subtitle">尝试使用不同的关键词或调整搜索条件</p>
          </template>
          <el-button type="primary" @click="clearResults">
            重新搜索
          </el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- 节点关系对话框 -->
    <el-dialog
      v-model="relationshipDialog"
      width="85%"
      class="relationship-dialog"
      :before-close="handleClose"
    >
      <template #header>
        <div class="dialog-header">
          <div class="dialog-title">
            <el-icon class="dialog-icon"><Share /></el-icon>
            <span>节点关系图谱</span>
          </div>
          <div class="dialog-subtitle" v-if="currentNode">
            节点 ID: {{ currentNode.id }} 的所有关系连接
          </div>
        </div>
      </template>
      
      <div class="relationship-content">
        <div v-if="relationships.length > 0" class="relationships-table-wrapper">
          <el-table :data="relationships" class="relationships-table">
            <el-table-column prop="type" label="关系类型" width="180">
              <template #default="scope">
                <div class="relation-type">
                  <el-tag type="warning" effect="light" class="type-tag">
                    {{ scope.row.type }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="direction" label="方向" width="80" align="center">
              <template #default="scope">
                <div class="direction-indicator">
                  <span class="direction-arrow">{{ scope.row.direction }}</span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="目标节点" min-width="400">
              <template #default="scope">
                <div class="target-node">
                  <div class="target-labels">
                    <el-tag
                      v-for="label in scope.row.targetLabels"
                      :key="label"
                      type="info"
                      effect="light"
                      class="target-label"
                    >
                      {{ label }}
                    </el-tag>
                  </div>
                  <div class="target-properties">
                    <div
                      v-for="(value, key) in getMainProperties(scope.row.targetProperties)"
                      :key="key"
                      class="target-property"
                    >
                      <span class="prop-key">{{ key }}</span>
                      <span class="prop-value">{{ formatProperty(value) }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <div v-else class="no-relationships">
          <el-empty description="该节点没有关系连接">
            <template #image>
              <div class="empty-relationship-icon">
                <el-icon><Connection /></el-icon>
              </div>
            </template>
            <template #description>
              <p class="empty-rel-title">暂无关系数据</p>
              <p class="empty-rel-subtitle">该节点尚未与其他节点建立关系连接</p>
            </template>
          </el-empty>
        </div>
      </div>
    </el-dialog>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  RefreshRight, 
  Collection, 
  Download, 
  InfoFilled, 
  Share, 
  TrendCharts, 
  Edit, 
  Delete,
  Connection,
  HomeFilled,
  Close
} from '@element-plus/icons-vue'
import neo4jService from '../services/neo4j'
import AppLayout from '../components/AppLayout.vue'
import { Network } from 'vis-network'

const router = useRouter()

const queryText = ref('')
const selectedLabel = ref('')
const limit = ref(50)
const loading = ref(false)
const searched = ref(false)
const results = ref([])
const labels = ref([])
const relationshipDialog = ref(false)
const relationships = ref([])
const currentNode = ref(null)
const viewMode = ref('graph') // 'table' 或 'graph' - 默认使用图形视图
const selectedNode = ref(null)
const networkContainer = ref(null)
const network = ref(null)

const searchNodes = async () => {
  if (!queryText.value.trim()) {
    ElMessage.warning('请输入查询内容')
    return
  }
  
  loading.value = true
  searched.value = true
  
  try {
    // 构建更精确的中文搜索查询
    let matchClause = 'MATCH (n)'
    let whereConditions = []
    
    // 如果指定了标签，在MATCH中直接指定
    if (selectedLabel.value) {
      matchClause = `MATCH (n:${selectedLabel.value})`
    }
    
    // 只支持精确匹配搜索
    const searchConditions = [
      // 搜索常见属性的精确匹配
      `(n.name IS NOT NULL AND n.name = $text)`,
      `(n.title IS NOT NULL AND n.title = $text)`,
      `(n.label IS NOT NULL AND n.label = $text)`,
      // 搜索所有属性的精确匹配
      `ANY(key IN keys(n) WHERE toString(n[key]) = $text)`
    ]
    
    whereConditions.push(`(${searchConditions.join(' OR ')})`)
    
    let query = `
      ${matchClause}
      WHERE ${whereConditions.join(' AND ')}
      RETURN n, labels(n) as labels, id(n) as id
      ORDER BY 
        CASE 
          WHEN n.name IS NOT NULL AND n.name = $text THEN 1
          WHEN n.title IS NOT NULL AND n.title = $text THEN 2
          WHEN n.label IS NOT NULL AND n.label = $text THEN 3
          ELSE 4
        END
      LIMIT $limit
    `
    
    const limitValue = Math.floor(Number(limit.value))
    
    const params = {
      text: queryText.value,
      limit: neo4jService.neo4j.int(limitValue)
    }
    
    const result = await neo4jService.runQuery(query, params)
    
    results.value = result.map(record => ({
      id: record.get('id').toNumber(),
      labels: record.get('labels'),
      properties: record.get('n').properties
    }))
    
    if (results.value.length === 0) {
      ElMessage.info('未找到相关节点')
    } else {
      ElMessage.success(`找到 ${results.value.length} 个节点`)
      // 如果当前是图形视图模式，延迟创建网络图
      if (viewMode.value === 'graph') {
        nextTick(() => {
          createNetwork()
        })
      }
    }
  } catch (error) {
    console.error('查询失败:', error)
    ElMessage.error('查询失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const clearResults = () => {
  results.value = []
  queryText.value = ''
  searched.value = false
}

const loadLabels = async () => {
  try {
    const result = await neo4jService.getAllLabels()
    labels.value = result.map(record => record.get(0))
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

const getMainProperties = (properties) => {
  const mainProps = {}
  let count = 0
  
  for (const [key, value] of Object.entries(properties)) {
    if (count < 3) {
      mainProps[key] = value
      count++
    }
  }
  
  return mainProps
}

const formatProperty = (value) => {
  if (value === null || value === undefined) return '-'
  return String(value)
}

// 判断是否为URL
const isUrl = (str) => {
  try {
    return str && (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('ftp://'))
  } catch {
    return false
  }
}

// 切换视图模式
const toggleView = () => {
  viewMode.value = viewMode.value === 'table' ? 'graph' : 'table'
  if (viewMode.value === 'graph') {
    // 延迟创建网络图，确保 DOM 元素已渲染
    nextTick(() => {
      createNetwork()
    })
  }
}

// 创建网络图
const createNetwork = () => {
  if (!networkContainer.value || !results.value.length) return
  
  // 清理旧的网络
  if (network.value) {
    network.value.destroy()
  }
  
  // 准备节点数据
  const nodes = results.value.map(node => ({
    id: node.id,
    label: node.properties.name || node.properties.title || `Node ${node.id}`,
    group: node.labels[0] || 'Unknown',
    title: `ID: ${node.id}\n标签: ${node.labels.join(', ')}`,
    color: getNodeColor(node.labels[0]),
    font: { color: '#2c3e50', size: 14 },
    shape: 'dot',
    size: 20,
    data: node // 存储完整的节点数据
  }))
  
  // 边数据（暂时为空，只显示节点）
  const edges = []
  
  // 网络配置
  const options = {
    nodes: {
      borderWidth: 2,
      shadow: true,
      chosen: {
        node: (values, id, selected, hovering) => {
          values.shadow = true
          values.shadowSize = 10
        }
      }
    },
    edges: {
      arrows: { to: { enabled: true, scaleFactor: 1, type: 'arrow' } },
      color: { color: '#848484', hover: '#667eea' },
      smooth: { type: 'continuous' }
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 100 },
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      hideEdgesOnDrag: false
    },
    layout: {
      improvedLayout: false
    }
  }
  
  // 创建网络图
  const data = { nodes, edges }
  network.value = new Network(networkContainer.value, data, options)
  
  // 添加点击事件
  network.value.on('click', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const nodeData = nodes.find(n => n.id === nodeId)
      if (nodeData) {
        selectedNode.value = nodeData.data
      }
    } else {
      selectedNode.value = null
    }
  })
}

// 根据标签获取节点颜色
const getNodeColor = (label) => {
  const colors = {
    'Character': '#FF6B6B',
    'Person': '#4ECDC4', 
    'Location': '#45B7D1',
    'Organization': '#96CEB4',
    'Event': '#FECA57',
    'Concept': '#FF9FF3',
    'Default': '#667eea'
  }
  return colors[label] || colors.Default
}

const viewRelationships = async (node) => {
  currentNode.value = node
  relationshipDialog.value = true
  
  try {
    const result = await neo4jService.getNodeRelationships(node.id)
    
    relationships.value = result.map(record => {
      const startNode = record.get('n')
      const endNode = record.get('m')
      const relation = record.get('r')
      
      const isOutgoing = startNode.identity.toNumber() === node.id
      const targetNode = isOutgoing ? endNode : startNode
      
      return {
        type: record.get('relType'),
        direction: isOutgoing ? '→' : '←',
        targetLabels: targetNode.labels,
        targetProperties: targetNode.properties
      }
    })
  } catch (error) {
    console.error('加载关系失败:', error)
    ElMessage.error('加载关系失败')
  }
}


const editNode = (node) => {
  router.push({
    path: '/data',
    query: { action: 'edit', nodeId: node.id }
  })
}

const deleteNode = async (node) => {
  try {
    await ElMessageBox.confirm('确定要删除这个节点吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await neo4jService.deleteNode(node.id)
    ElMessage.success('节点删除成功')
    
    // 从结果中移除已删除的节点
    results.value = results.value.filter(n => n.id !== node.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const exportResults = () => {
  const data = JSON.stringify(results.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nodes_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleClose = () => {
  relationshipDialog.value = false
  relationships.value = []
  currentNode.value = null
}

const goHome = () => {
  router.push('/dashboard')
}

onMounted(async () => {
  // 确保Neo4j连接
  try {
    const connected = await neo4jService.isConnected()
    if (!connected) {
      await neo4jService.connect()
    }
    loadLabels()
  } catch (error) {
    console.error('初始化连接失败:', error)
  }
})
</script>

<style scoped>
/* 主容器 */
.node-query-container {
  width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  width: 100%;
  max-width: 1200px;
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

.header-actions {
  display: flex;
  gap: 12px;
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

/* 搜索区域 */
.search-section {
  margin-bottom: 24px;
  width: 100%;
  max-width: 900px;
}

.search-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.search-header {
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

.search-form {
  max-width: 800px;
  margin: 0 auto;
}

.main-search {
  margin-bottom: 24px;
}

.search-input-wrapper {
  position: relative;
}

.search-input :deep(.el-input-group__prepend) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 12px 0 0 12px;
}

.search-input :deep(.el-input-group__append) {
  padding: 0;
  border: none;
  border-radius: 0 12px 12px 0;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 0;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  box-shadow: none;
}

.search-input :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.search-btn {
  height: 56px;
  padding: 0 24px;
  border-radius: 0 12px 12px 0;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.advanced-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.option-select,
.option-number {
  width: 100%;
}

.option-select :deep(.el-input__wrapper),
.option-number :deep(.el-input__wrapper) {
  border-radius: 12px;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.option-select :deep(.el-input__wrapper:hover),
.option-number :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.option-select :deep(.el-input__wrapper.is-focus),
.option-number :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* 结果区域 */
.results-section {
  margin-bottom: 24px;
  width: 100%;
  max-width: 1200px;
}

.results-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.results-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.results-stats {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-left: 12px;
}

.result-count {
  font-size: 28px;
  font-weight: 700;
  color: #667eea;
}

.result-text {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.export-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(144, 147, 153, 0.3);
}

/* 表格样式 */
.results-table {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.results-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.results-table :deep(.el-table__header th) {
  background: transparent;
  border: none;
  color: #2c3e50;
  font-weight: 600;
  font-size: 14px;
}

.results-table :deep(.el-table__body tr:hover > td) {
  background-color: rgba(102, 126, 234, 0.05) !important;
}

.labels-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.label-tag {
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  padding: 4px 8px;
}

.property-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(102, 126, 234, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.prop-key {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
  min-width: 80px;
}

.prop-value {
  color: #7f8c8d;
  font-size: 13px;
  flex: 1;
  word-break: break-all;
  max-width: 100%;
  overflow-wrap: break-word;
}

.property-link-small {
  color: #667eea;
  text-decoration: none;
  transition: color 0.3s ease;
  word-break: break-all;
}

.property-link-small:hover {
  color: #764ba2;
  text-decoration: underline;
}

/* 图形视图样式 */
.graph-view {
  position: relative;
  min-height: 600px;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

.network-container {
  width: 100%;
  height: 600px;
  background: #fafbfc;
}

.node-info-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 350px;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-left: 1px solid #e8ecf0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8ecf0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  padding: 4px;
  color: #7f8c8d;
}

.close-btn:hover {
  color: #2c3e50;
}

.panel-content {
  padding: 20px;
}

.node-basic-info {
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.info-label {
  font-weight: 600;
  color: #2c3e50;
  min-width: 40px;
}

.info-value {
  color: #7f8c8d;
  font-family: 'Monaco', monospace;
}

.info-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-label-tag {
  font-size: 12px;
  font-weight: 500;
}

.node-properties {
  border-top: 1px solid #e8ecf0;
  padding-top: 20px;
}

.properties-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.properties-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-row {
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid #667eea;
}

.property-name {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.property-val {
  font-size: 14px;
  color: #2c3e50;
  word-break: break-all;
  line-height: 1.4;
}

.property-url {
  color: #667eea;
  text-decoration: none;
  transition: color 0.3s ease;
}

.property-url:hover {
  color: #764ba2;
  text-decoration: underline;
}

.view-btn {
  margin-right: 12px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.action-btn-sm {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn-sm:hover {
  transform: translateY(-1px);
}

/* 节点详情 */
.node-details {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 24px;
  margin: 16px 0;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.details-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-id-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.properties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.property-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.property-card:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.property-key {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.property-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
  word-break: break-all;
  line-height: 1.4;
  max-width: 100%;
  overflow-wrap: break-word;
}

.property-link {
  color: #667eea;
  text-decoration: none;
  transition: color 0.3s ease;
  word-break: break-all;
  display: block;
}

.property-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

.property-text {
  word-break: break-all;
  display: block;
}

.details-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.detail-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.detail-btn:hover {
  transform: translateY(-2px);
}

/* 空状态 */
.empty-section {
  margin-bottom: 24px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 48px 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.empty-icon .el-icon {
  font-size: 40px;
  color: white;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.empty-subtitle {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0 0 24px 0;
}

/* 关系对话框 */
.relationship-dialog :deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

.relationship-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 32px;
  border: none;
}

.dialog-header {
  color: white;
}

.dialog-title {
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.dialog-icon {
  font-size: 24px;
}

.dialog-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.relationship-content {
  padding: 24px;
}

.relationships-table {
  border-radius: 12px;
  overflow: hidden;
}

.relationships-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.relationships-table :deep(.el-table__header th) {
  background: transparent;
  border: none;
  color: #2c3e50;
  font-weight: 600;
}

.relation-type {
  display: flex;
  align-items: center;
}

.type-tag {
  font-weight: 600;
  border-radius: 6px;
}

.direction-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
}

.direction-arrow {
  font-size: 18px;
  font-weight: bold;
  color: #667eea;
}

.target-node {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.target-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.target-label {
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
}

.target-properties {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.target-property {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(102, 126, 234, 0.05);
  padding: 6px 10px;
  border-radius: 6px;
  border-left: 2px solid #667eea;
}

.no-relationships {
  padding: 40px 0;
}

.empty-relationship-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.empty-relationship-icon .el-icon {
  font-size: 30px;
  color: white;
}

.empty-rel-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.empty-rel-subtitle {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .node-query {
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
  
  .advanced-options {
    grid-template-columns: 1fr;
  }
  
  .results-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .results-title {
    justify-content: center;
  }
  
  .properties-grid {
    grid-template-columns: 1fr;
  }
  
  .table-actions {
    flex-direction: column;
    gap: 4px;
  }
  
  .details-actions {
    flex-direction: column;
  }
  
  .relationship-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
}
</style>
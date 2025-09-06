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
    
    <div class="cypher-query-container">
      <!-- Cypher查询编辑器区域 -->
      <div class="query-editor-section">
        <div class="editor-card">
          <div class="editor-header">
            <h3 class="section-title">
              <el-icon><EditPen /></el-icon>
              Cypher 查询编辑器
            </h3>
            <p class="section-subtitle">输入 Cypher 查询语句来检索图数据库中的数据</p>
          </div>
          
          <div class="editor-content">
            <!-- 查询输入区域 -->
            <div class="query-input-group">
              <div class="input-label">
                <el-icon><EditPen /></el-icon>
                查询语句
              </div>
              <el-input
                v-model="cypherQuery"
                type="textarea"
                :rows="8"
                placeholder="输入 Cypher 查询语句，例如:&#10;MATCH (n) RETURN n LIMIT 10&#10;&#10;或者:&#10;MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 5"
                class="cypher-textarea"
                @keydown.ctrl.enter="executeQuery"
              />
<!--              <div class="input-help">-->
<!--                <span>按 Ctrl + Enter 执行查询</span>-->
<!--              </div>-->
            </div>
            
            <!-- 快捷查询模板 -->
            <div class="query-templates">
              <div class="template-header">
                <div class="param-label">
                  <el-icon><DocumentCopy /></el-icon>
                  常用查询模板
                </div>
              </div>
              <div class="templates-grid">
                <div 
                  v-for="template in queryTemplates"
                  :key="template.name"
                  class="template-card"
                  @click="selectTemplate(template)"
                >
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-description">{{ template.description }}</div>
                </div>
              </div>
            </div>
            
            <!-- 执行按钮和Schema下载 -->
            <div class="execute-actions">
              <el-button 
                type="primary"
                size="large"
                @click="executeQuery"
                :loading="loading"
                class="execute-btn"
                :disabled="!cypherQuery.trim()"
              >
                <el-icon><VideoPlay /></el-icon>
                执行查询
                <span v-if="cypherQuery.trim()">(Ctrl + Enter)</span>
              </el-button>
              <el-button 
                type="success"
                size="large"
                @click="downloadSchema"
                :loading="downloadingSchema"
                class="schema-download-btn"
              >
                <el-icon><Download /></el-icon>
                下载知识图谱Schema
              </el-button>
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
                <el-icon><Search /></el-icon>
                查询结果
              </h3>
              <div class="results-stats">
                <span class="result-count">{{ results.length }}</span>
                <span class="result-text">条记录</span>
                <span v-if="graphData?.nodes" class="graph-stats">
                  | {{ graphData.nodes.length }} 个节点
                  <span v-if="graphData?.edges">
                    | {{ graphData.edges.length }} 个关系
                  </span>
                </span>
              </div>
            </div>
            <div class="results-actions">
              <el-dropdown @command="handleExport" class="export-dropdown">
                <el-button type="info" class="export-btn">
                  <el-icon><Download /></el-icon>
                  导出结果
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="json">
                      <el-icon><DocumentCopy /></el-icon>
                      导出为 JSON
                    </el-dropdown-item>
                    <el-dropdown-item command="csv" v-if="viewMode === 'table'">
                      <el-icon><Collection /></el-icon>
                      导出为 CSV
                    </el-dropdown-item>
                    <el-dropdown-item command="txt">
                      <el-icon><EditPen /></el-icon>
                      导出为 TXT
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          
          <!-- 视图模式选择 -->
          <div class="view-selector">
            <el-radio-group v-model="viewMode" class="view-mode-group">
              <el-radio-button label="graph">
                <el-icon><Share /></el-icon>
                图形视图
              </el-radio-button>
              <el-radio-button label="table">
                <el-icon><Collection /></el-icon>
                表格视图
              </el-radio-button>
              <el-radio-button label="text">
                <el-icon><DocumentCopy /></el-icon>
                文本视图
              </el-radio-button>
            </el-radio-group>
          </div>

          <!-- 图形视图 -->
          <div v-if="viewMode === 'graph'" class="graph-view">
            <div ref="networkContainer" class="network-container"></div>
            
            <!-- 关系类型图例 - 仅在有关系时显示 -->
            <div v-if="getUniqueRelationshipTypes().length > 0" class="relationship-legend">
              <div class="legend-header">
                <h4 class="legend-title">
                  <el-icon><InfoFilled /></el-icon>
                  关系类型图例
                </h4>
              </div>
              <div class="legend-content">
                <div 
                  v-for="relationshipType in getUniqueRelationshipTypes()"
                  :key="relationshipType"
                  class="legend-item"
                >
                  <div class="legend-line" :style="getLegendLineStyle(relationshipType)"></div>
                  <span class="legend-label" :style="{ color: getRelationshipColor(relationshipType) }">
                    {{ getRelationshipDisplayName(relationshipType) }}
                  </span>
                </div>
              </div>
            </div>
            
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
                
                <!-- 节点操作区域 -->
                <div class="node-operations">
                  <h5 class="operations-title">操作</h5>
                  <div class="panel-actions">
                    <el-button 
                      type="success" 
                      size="small"
                      class="action-btn"
                      @click="showNodeRelationships(selectedNode)"
                    >
                      <el-icon><Share /></el-icon>
                      查看关系
                    </el-button>
                    <div v-if="canEditNode(selectedNode) || canDeleteNode(selectedNode)" class="admin-actions">
                      <el-button 
                        v-if="canEditNode(selectedNode)"
                        type="primary" 
                        size="small"
                        class="action-btn"
                        @click="editNode(selectedNode)"
                      >
                        <el-icon><EditPen /></el-icon>
                        编辑节点
                      </el-button>
                      <el-button 
                        v-if="canDeleteNode(selectedNode)"
                        type="danger" 
                        size="small"
                        class="action-btn"
                        @click="deleteNode(selectedNode)"
                      >
                        <el-icon><Delete /></el-icon>
                        删除节点
                      </el-button>
                    </div>
                  </div>
                </div>
                
                <div class="node-properties">
                  <h5 class="properties-title">属性</h5>
                  <div class="properties-list">
                    <div 
                      v-for="(value, key) in getVisibleProperties(selectedNode)"
                      :key="key"
                      class="property-row"
                    >
                      <div class="property-name">{{ getPropertyDisplayName(key, selectedNode.labels) }}</div>
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
          <div v-if="viewMode === 'table'" class="table-view">
            <el-table 
              :data="results" 
              stripe 
              max-height="600"
              style="width: 100%"
              class="results-table"
              :show-header="true"
              table-layout="auto"
            >
              <el-table-column 
                v-for="column in tableColumns"
                :key="column"
                :prop="column"
                :label="column"
                :min-width="getColumnMinWidth(column)"
                show-overflow-tooltip
                resizable
              >
                <template #default="scope">
                  <div class="cell-content">
                    {{ formatCellValue(scope.row[column]) }}
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 文本视图 -->
          <div v-if="viewMode === 'text'" class="text-view">
            <div class="text-content">
              <pre class="json-output">{{ formatResultsAsText() }}</pre>
            </div>
          </div>
        </div>
      </div>
    
      
      <!-- 空状态 -->
      <div class="empty-section" v-else-if="searched && !loading">
        <div class="empty-card">
          <el-empty description="未找到查询结果">
            <template #image>
              <div class="empty-icon">
                <el-icon><Search /></el-icon>
              </div>
            </template>
            <template #description>
              <p class="empty-title">查询未返回结果</p>
              <p class="empty-subtitle">请检查 Cypher 语句语法或尝试其他查询条件</p>
            </template>
            <el-button type="primary" @click="clearResults">
              重新查询
            </el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  EditPen,
  VideoPlay,
  RefreshRight, 
  Collection, 
  Download, 
  InfoFilled, 
  Close,
  HomeFilled,
  Share,
  Search,
  Delete,
  DocumentCopy,
  ArrowDown
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import authService from '../services/auth'
import AppLayout from '../components/AppLayout.vue'
import { Network } from 'vis-network'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const searched = ref(false)
const cypherQuery = ref('')
const results = ref([])
const graphData = ref(null)
const selectedNode = ref(null)
const networkContainer = ref(null)
const network = ref(null)
const viewMode = ref('graph') // 默认图形视图
const downloadingSchema = ref(false)

// 权限和标签映射相关
const availableLabels = ref([])
const propertyPermissions = ref({})
const nodeDialog = ref({
  visible: false,
  loading: false,
  mode: 'create', // 'create' 或 'edit'
  currentNodeId: null,
  form: {
    labels: [],
    properties: []
  }
})

// 权限控制
const currentUser = computed(() => authService.getCurrentUser())
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 查询模板
const queryTemplates = ref([
  {
    name: '获取所有节点',
    description: '返回前10个节点',
    query: 'MATCH (n) RETURN n LIMIT 10'
  },
  {
    name: '获取所有关系',
    description: '返回前10个节点关系',
    query: 'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10'
  },
  {
    name: '按标签查询',
    description: '查询指定标签的节点',
    query: 'MATCH (n:Character) RETURN n LIMIT 10'
  },
  {
    name: '路径查询',
    description: '查找两个节点间的路径',
    query: 'MATCH path = (n)-[*1..3]-(m) RETURN path LIMIT 5'
  },
  {
    name: '统计查询',
    description: '统计各类型节点数量',
    query: 'MATCH (n) RETURN labels(n)[0] as label, count(n) as count ORDER BY count DESC'
  },
  {
    name: '关系统计',
    description: '统计各类型关系数量',
    query: 'MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC'
  }
])

// 计算属性
const tableColumns = computed(() => {
  if (results.value.length === 0) return []
  return Object.keys(results.value[0])
})

// 方法
const goHome = () => {
  router.push('/dashboard')
}

const clearResults = () => {
  results.value = []
  graphData.value = null
  searched.value = false
  selectedNode.value = null
  viewMode.value = 'graph'
  if (network.value) {
    network.value.destroy()
    network.value = null
  }
}

const selectTemplate = (template) => {
  cypherQuery.value = template.query
  ElMessage.success(`已选择模板: ${template.name}`)
}

const executeQuery = async () => {
  if (!cypherQuery.value.trim()) {
    ElMessage.warning('请输入 Cypher 查询语句')
    return
  }

  loading.value = true
  searched.value = true

  try {
    const response = await apiService.runQuery(cypherQuery.value, {})
    
    results.value = response.records || []
    graphData.value = response.graph_data || null
    
    
    if (results.value.length === 0) {
      ElMessage.info('查询未返回结果')
    } else {
      ElMessage.success(`查询成功，返回 ${results.value.length} 条记录`)
      
      // 默认显示图形视图
      viewMode.value = 'graph'
      nextTick(() => {
        createNetwork()
      })
    }
  } catch (error) {
    console.error('Cypher查询失败:', error)
    ElMessage.error('查询失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 监听视图模式变化
watch(viewMode, (newMode) => {
  if (newMode === 'graph' && results.value.length > 0) {
    nextTick(() => {
      createNetwork()
    })
  }
})

// 格式化结果为文本形式
const formatResultsAsText = () => {
  return JSON.stringify(results.value, null, 2)
}

// 导出处理
const handleExport = (format) => {
  switch (format) {
    case 'json':
      exportAsJSON()
      break
    case 'csv':
      exportAsCSV()
      break
    case 'txt':
      exportAsText()
      break
  }
}

// 导出为JSON格式
const exportAsJSON = () => {
  const dataToExport = {
    query: cypherQuery.value,
    results: results.value,
    graph_data: graphData.value,
    timestamp: new Date().toISOString(),
    total_records: results.value.length
  }
  
  const dataStr = JSON.stringify(dataToExport, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cypher_query_results_${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('JSON文件导出成功')
}

// 导出为CSV格式
const exportAsCSV = () => {
  if (results.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  const headers = tableColumns.value
  const csvContent = [
    headers.join(','), // 表头
    ...results.value.map(row => 
      headers.map(header => {
        const value = row[header]
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        return `"${String(value || '').replace(/"/g, '""')}"`
      }).join(',')
    )
  ].join('\n')

  const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cypher_query_results_${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('CSV文件导出成功')
}

// 导出为TXT格式
const exportAsText = () => {
  const textContent = [
    `Cypher Query Results`,
    `Query: ${cypherQuery.value}`,
    `Executed at: ${new Date().toLocaleString()}`,
    `Total records: ${results.value.length}`,
    '',
    '--- Results ---',
    formatResultsAsText()
  ].join('\n')

  const dataBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cypher_query_results_${Date.now()}.txt`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('TXT文件导出成功')
}

const createNetwork = () => {
  if (!networkContainer.value || !results.value.length) return

  // 清理旧的网络
  if (network.value) {
    network.value.destroy()
  }

  console.log('Cypher查询结果结构:', results.value[0])

  // 处理节点和关系数据
  const nodesMap = new Map()
  const edges = []

  // 遍历查询结果，提取节点和关系
  results.value.forEach((record, index) => {
    Object.values(record).forEach(value => {
      // 处理节点数据
      if (value && typeof value === 'object' && value.labels && value.properties !== undefined) {
        const node = value
        if (!nodesMap.has(node.id)) {
          nodesMap.set(node.id, {
            id: node.id,
            label: truncateText(
              (node.properties && node.properties.name) || 
              (node.properties && node.properties.value ? node.properties.value.trim() : '') || 
              `节点 ${node.id}`, 
              10
            ),
            group: (node.labels && node.labels[0]) || 'Unknown',
            title: `${(node.properties && node.properties.name) || (node.properties && node.properties.value ? node.properties.value.trim() : '') || `节点 ${node.id}`}\nID: ${node.id}\n标签: ${node.labels ? node.labels.join(', ') : 'Unknown'}\n属性: ${node.properties ? Object.keys(node.properties).length : 0} 个`,
            color: {
              background: getNodeColor((node.labels && node.labels[0]) || 'Default'),
              border: darkenColor(getNodeColor((node.labels && node.labels[0]) || 'Default'), 0.3)
            },
            font: { 
              color: '#2c3e50', 
              size: 20, 
              face: 'Arial, sans-serif',
              strokeWidth: 2,
              strokeColor: '#ffffff'
            },
            shape: 'circle',
            size: 50,
            data: node
          })
        }
      }
      // 处理关系数据
      else if (value && typeof value === 'object' && value.type && value.start_node_id !== undefined && value.end_node_id !== undefined) {
        const relationship = value
        const edgeColor = getRelationshipColor(relationship.type)
        const highlightColor = getRelationshipHighlightColor(relationship.type)
        const lineStyle = getRelationshipLineStyle(relationship.type)
        const arrowStyle = getRelationshipArrowStyle(relationship.type)
        
        edges.push({
          id: relationship.id || `edge_${index}`,
          from: relationship.start_node_id,
          to: relationship.end_node_id,
          label: relationship.type,
          title: `关系类型: ${relationship.type}\n属性: ${relationship.properties ? JSON.stringify(relationship.properties) : '无'}`,
          color: {
            color: edgeColor,
            highlight: highlightColor,
            opacity: 0.8
          },
          font: {
            color: edgeColor,
            size: 12,
            bold: true,
            strokeWidth: 3,
            strokeColor: '#ffffff',
            background: 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1,
            borderColor: edgeColor
          },
          arrows: {
            to: {
              enabled: true,
              scaleFactor: arrowStyle.scaleFactor,
              type: arrowStyle.type
            }
          },
          arrowStrikethrough: false,
          smooth: {
            enabled: true,
            type: 'dynamic',
            roundness: 0.3
          },
          width: lineStyle.width,
          dashes: lineStyle.dashes,
          data: relationship
        })
      }
    })
  })

  const nodes = Array.from(nodesMap.values())
  const data = { nodes, edges }

  const options = {
    nodes: {
      borderWidth: 3,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.2)',
        size: 10,
        x: 2,
        y: 2
      },
      font: {
        color: '#2c3e50',
        size: 20,
        face: 'Arial, Microsoft YaHei, sans-serif',
        strokeWidth: 2,
        strokeColor: '#ffffff'
      },
      chosen: {
        node: (values, id, selected, hovering) => {
          values.shadow = true
          values.shadowSize = 15
          values.borderWidth = 4
        }
      }
    },
    edges: {
      arrows: {
        to: { 
          enabled: true, 
          scaleFactor: 1.2,
          type: 'arrow'
        }
      },
      smooth: {
        enabled: true,
        type: 'dynamic',
        roundness: 0.2
      },
      font: {
        color: '#2c3e50',
        size: 12,
        strokeWidth: 2,
        strokeColor: '#ffffff'
      },
      width: 2
    },
    interaction: {
      hover: true,
      selectConnectedEdges: true,
      tooltipDelay: 300
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 200 },
      barnesHut: {
        gravitationalConstant: -3000,
        centralGravity: 0.5,
        springLength: 150,
        springConstant: 0.06,
        damping: 0.1
      }
    },
    layout: {
      improvedLayout: true
    }
  }

  network.value = new Network(networkContainer.value, data, options)

  // 监听节点选择事件
  network.value.on('selectNode', async (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        selectedNode.value = node.data
        
        console.log('选中节点:', node.data)
        console.log('节点标签:', node.data.labels)
        
        // 动态加载选中节点的属性映射（如果还没有加载的话）
        await loadNodePropertyMappings(node.data)
      }
    }
  })

  // 监听空白区域点击
  network.value.on('deselectNode', () => {
    selectedNode.value = null
  })
}

const getNodeColor = (label) => {
  const colors = {
    'Character': '#FF6B6B',
    'Word': '#4ECDC4', 
    'Sentence': '#45B7D1',
    'ExternalLink': '#96CEB4',
    'default': '#667eea'
  }
  return colors[label] || colors.default
}

const getRelationshipColor = (relationshipType) => {
  const colors = {
    'NEAR_SYNONYMOUS_WITH': '#007BFF',
    'ANTITHESIS_WITH': '#28A745',
    'COMPOSITION_COMPONENT': '#6F42C1',
    'HYPERNYM_OF': '#DC3545',
    'HYPONYM_OF': '#FD7E14',
    'default': '#6C757D'
  }
  return colors[relationshipType] || colors.default
}

const darkenColor = (color, factor) => {
  return color // 简化实现
}

const truncateText = (text, maxLength = 10) => {
  if (!text || typeof text !== 'string') return text
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const getColumnMinWidth = (column) => {
  const widths = {
    'id': 100,
    'labels': 150,
    'properties': 300,
    'type': 150,
    'start_node_id': 120,
    'end_node_id': 120,
    'name': 200,
    'value': 250
  }
  return widths[column] || 150
}

const formatCellValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

const formatProperty = (value) => {
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

const isUrl = (str) => {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// 获取关系类型高亮颜色
const getRelationshipHighlightColor = (relationshipType) => {
  const highlightColors = {
    'NEAR_SYNONYMOUS_WITH': '#0056B3',
    'ANTITHESIS_WITH': '#1E7E34', 
    'COMPOSITION_COMPONENT': '#59359A',
    'HYPERNYM_OF': '#B02A37',
    'HYPONYM_OF': '#E8590C',
    'MERONYM_OF': '#1AA085',
    'HOLONYM_OF': '#520DC2',
    'SIMILAR_TO': '#138496',
    'RELATED_TO': '#E0A800',
    'DERIVES_FROM': '#D1326B',
    'LEADS_TO': '#E8590C',
    'default': '#495057'
  }
  return highlightColors[relationshipType] || highlightColors.default
}

// 获取关系类型的线条样式
const getRelationshipLineStyle = (relationshipType) => {
  const lineStyles = {
    'NEAR_SYNONYMOUS_WITH': { dashes: false, width: 4 },
    'ANTITHESIS_WITH': { dashes: [10, 5], width: 4 },
    'COMPOSITION_COMPONENT': { dashes: [15, 3, 3, 3], width: 3 },
    'HYPERNYM_OF': { dashes: false, width: 3 },
    'HYPONYM_OF': { dashes: [8, 3], width: 3 },
    'MERONYM_OF': { dashes: [5, 5], width: 2 },
    'HOLONYM_OF': { dashes: [12, 4], width: 2 },
    'SIMILAR_TO': { dashes: [3, 3], width: 2 },
    'RELATED_TO': { dashes: [2, 3], width: 2 },
    'DERIVES_FROM': { dashes: [6, 2, 2, 2], width: 2 },
    'LEADS_TO': { dashes: [8, 4], width: 2 },
    'default': { dashes: false, width: 2 }
  }
  return lineStyles[relationshipType] || lineStyles.default
}

// 获取关系类型的箭头样式
const getRelationshipArrowStyle = (relationshipType) => {
  const arrowStyles = {
    'NEAR_SYNONYMOUS_WITH': { type: 'arrow', scaleFactor: 1.8 },
    'ANTITHESIS_WITH': { type: 'triangle', scaleFactor: 1.8 },
    'COMPOSITION_COMPONENT': { type: 'triangle', scaleFactor: 1.4 },
    'HYPERNYM_OF': { type: 'arrow', scaleFactor: 1.6 },
    'HYPONYM_OF': { type: 'arrow', scaleFactor: 1.4 },
    'MERONYM_OF': { type: 'triangle', scaleFactor: 1.3 },
    'HOLONYM_OF': { type: 'triangle', scaleFactor: 1.5 },
    'SIMILAR_TO': { type: 'arrow', scaleFactor: 1.3 },
    'RELATED_TO': { type: 'arrow', scaleFactor: 1.2 },
    'DERIVES_FROM': { type: 'arrow', scaleFactor: 1.4 },
    'LEADS_TO': { type: 'arrow', scaleFactor: 1.5 },
    'default': { type: 'arrow', scaleFactor: 1.2 }
  }
  return arrowStyles[relationshipType] || arrowStyles.default
}

// 获取当前查询结果中的唯一关系类型
const getUniqueRelationshipTypes = () => {
  if (!results.value.length) return []
  
  const types = new Set()
  results.value.forEach(record => {
    Object.values(record).forEach(value => {
      if (value && typeof value === 'object' && value.type && value.start_node_id !== undefined) {
        types.add(value.type)
      }
    })
  })
  
  return Array.from(types).sort()
}

// 获取关系类型的显示名称
const getRelationshipDisplayName = (relationshipType) => {
  const displayNames = {
    'NEAR_SYNONYMOUS_WITH': '近义词',
    'ANTITHESIS_WITH': '反义词',
    'COMPOSITION_COMPONENT': '组成部分',
    'HYPERNYM_OF': '上位词',
    'HYPONYM_OF': '下位词', 
    'MERONYM_OF': '部分关系',
    'HOLONYM_OF': '整体关系',
    'SIMILAR_TO': '相似关系',
    'RELATED_TO': '相关关系',
    'DERIVES_FROM': '派生关系',
    'LEADS_TO': '导致关系'
  }
  return displayNames[relationshipType] || relationshipType
}

// 获取图例线条样式 - 参照NodeQuery.vue的实现
const getLegendLineStyle = (relationshipType) => {
  const color = getRelationshipColor(relationshipType)
  const lineStyle = getRelationshipLineStyle(relationshipType)
  
  let borderStyle = 'solid'
  if (lineStyle.dashes) {
    if (lineStyle.dashes.length === 2) {
      borderStyle = 'dashed'
    } else if (lineStyle.dashes.length === 4) {
      borderStyle = 'dotted'
    }
  }
  
  return {
    backgroundColor: color,
    borderTop: `${lineStyle.width}px ${borderStyle} ${color}`,
    height: `${Math.max(2, lineStyle.width)}px`
  }
}

// 检查属性是否可见
const isPropertyVisible = (propertyKey, nodeLabels) => {
  if (!nodeLabels || nodeLabels.length === 0) {
    return true // 如果没有标签信息，默认可见
  }
  
  // 查找匹配的标签映射
  const matchingLabel = availableLabels.value.find(label => 
    nodeLabels.includes(label.neo4j_name)
  )
  
  if (matchingLabel && propertyPermissions.value[matchingLabel.id]) {
    const permission = propertyPermissions.value[matchingLabel.id][propertyKey]
    // 只有在权限配置中明确允许查看的属性才显示
    const canView = permission ? permission.can_view : false
    console.log(`属性 ${propertyKey} 可见性检查: ${canView}`)
    return canView
  }
  
  return true // 如果没有找到匹配的标签映射，默认可见（兼容旧数据）
}

// 获取属性的显示名称
const getPropertyDisplayName = (propertyKey, nodeLabels) => {
  if (!nodeLabels || nodeLabels.length === 0) {
    console.log(`属性 ${propertyKey}: 没有标签信息，使用原始名称`)
    return propertyKey
  }
  
  console.log(`获取属性显示名称: ${propertyKey}, 节点标签:`, nodeLabels)
  console.log('可用标签映射:', availableLabels.value)
  console.log('属性权限配置:', propertyPermissions.value)
  
  // 查找匹配的标签映射
  const matchingLabel = availableLabels.value.find(label => 
    nodeLabels.includes(label.neo4j_name)
  )
  
  console.log(`找到匹配的标签映射:`, matchingLabel)
  
  if (matchingLabel && propertyPermissions.value[matchingLabel.id]) {
    const permission = propertyPermissions.value[matchingLabel.id][propertyKey]
    console.log(`属性 ${propertyKey} 的权限配置:`, permission)
    
    const displayName = permission ? permission.display_name || propertyKey : propertyKey
    console.log(`属性 ${propertyKey} 最终显示名称: ${displayName}`)
    return displayName
  }
  
  console.log(`属性 ${propertyKey}: 没有找到匹配的映射，使用原始名称`)
  return propertyKey
}

// 获取节点的可见属性
const getVisibleProperties = (node) => {
  if (!node || !node.properties) {
    return {}
  }
  
  const visibleProps = {}
  Object.entries(node.properties).forEach(([key, value]) => {
    if (isPropertyVisible(key, node.labels)) {
      visibleProps[key] = value
    }
  })
  
  return visibleProps
}

// 检查用户是否有编辑节点的权限
const canEditNode = (node) => {
  if (!node || !node.labels || node.labels.length === 0) {
    return false
  }
  
  // 管理员拥有所有权限
  if (isAdmin.value) {
    return true
  }
  
  // 查找匹配的标签映射
  const matchingLabel = availableLabels.value.find(label => 
    node.labels.includes(label.neo4j_name)
  )
  
  if (matchingLabel && propertyPermissions.value[matchingLabel.id]) {
    // 检查是否有编辑权限（通过属性权限中的can_edit字段判断）
    const permissions = propertyPermissions.value[matchingLabel.id]
    const firstProperty = Object.values(permissions)[0]
    return firstProperty ? firstProperty.can_edit : false
  }
  
  return false
}

// 检查用户是否有删除节点的权限
const canDeleteNode = (node) => {
  // 删除权限通常比编辑权限更严格，这里与编辑权限保持一致
  return canEditNode(node)
}

// 查看节点关系
const showNodeRelationships = async (node) => {
  try {
    loading.value = true
    
    // 获取节点的所有关系
    const response = await apiService.getNodeRelationships(node.id)
    
    console.log('API response for node relationships:', response)
    
    // 检查不同可能的数据结构
    let relationships = null
    if (response.relationships) {
      relationships = response.relationships
    } else if (response.records) {
      relationships = response.records
    } else if (Array.isArray(response)) {
      relationships = response
    }
    
    if (!relationships || relationships.length === 0) {
      ElMessage.info('该节点没有关联的关系')
      return
    }
    
    console.log('Processed relationships:', relationships)
    
    // 将关系数据转换为可视化格式并更新结果
    results.value = relationships
    
    // 重新创建网络图
    nextTick(() => {
      createNetwork()
    })
    
    ElMessage.success(`找到 ${relationships.length} 个关联关系`)
  } catch (error) {
    console.error('获取节点关系失败:', error)
    ElMessage.error('获取节点关系失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 编辑节点
const editNode = (node) => {
  nodeDialog.value.mode = 'edit'
  nodeDialog.value.currentNodeId = node.id
  nodeDialog.value.form = {
    labels: [...node.labels],
    properties: Object.entries(node.properties).map(([key, value]) => ({ key, value }))
  }
  nodeDialog.value.visible = true
}

// 删除节点
const deleteNode = async (node) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除节点 ${node.id} 吗？这个操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await apiService.deleteNode(node.id)
    ElMessage.success('节点删除成功')
    
    // 从结果中移除被删除的节点
    results.value = results.value.filter(record => {
      // 检查记录中的所有值，移除包含被删除节点的记录
      return !Object.values(record).some(value => 
        value && typeof value === 'object' && value.id === node.id
      )
    })
    selectedNode.value = null
    
    // 重新创建网络图
    if (results.value.length > 0) {
      createNetwork()
    } else {
      // 如果没有节点了，清空网络图
      if (network.value) {
        network.value.destroy()
        network.value = null
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error)
      ElMessage.error('删除节点失败: ' + error.message)
    }
  }
}

// 加载标签属性映射
const loadPropertyPermissions = async (labelMappingId) => {
  try {
    const response = await apiService.getPropertyPermissions(labelMappingId)
    const properties = response.properties || []
    
    // 创建属性键到显示信息的映射
    const propertyMap = {}
    properties.forEach(prop => {
      propertyMap[prop.property_key] = {
        display_name: prop.display_name,
        can_view: prop.can_view,  // 基于标签权限的查看权限
        can_edit: prop.can_edit   // 基于标签权限的编辑权限
      }
    })
    
    propertyPermissions.value[labelMappingId] = propertyMap
  } catch (error) {
    console.error(`加载标签 ${labelMappingId} 的属性信息失败:`, error)
  }
}

// 动态加载节点的属性映射
const loadNodePropertyMappings = async (nodeData) => {
  if (!nodeData || !nodeData.labels || nodeData.labels.length === 0) {
    console.warn('节点没有标签信息，无法加载属性映射')
    return
  }

  console.log('为节点加载属性映射，节点标签:', nodeData.labels)

  // 遍历节点的所有标签，找到对应的映射配置
  for (const label of nodeData.labels) {
    try {
      // 先查找是否已经有这个标签的映射
      let labelMapping = availableLabels.value.find(mapping => mapping.neo4j_name === label)
      
      if (!labelMapping) {
        // 如果没有找到，尝试从API获取这个标签的映射信息
        console.log(`尝试获取标签 ${label} 的映射信息`)
        const mappingResponse = await apiService.getLabelMappings('node')
        const allMappings = mappingResponse.node_labels || []
        labelMapping = allMappings.find(mapping => mapping.neo4j_name === label)
        
        if (labelMapping) {
          // 将找到的映射添加到availableLabels中
          const existingMapping = availableLabels.value.find(m => m.id === labelMapping.id)
          if (!existingMapping) {
            availableLabels.value.push(labelMapping)
          }
        }
      }

      if (labelMapping) {
        // 如果还没有加载这个标签的属性权限，就加载它
        if (!propertyPermissions.value[labelMapping.id]) {
          console.log(`加载标签 ${label} (ID: ${labelMapping.id}) 的属性权限`)
          await loadPropertyPermissions(labelMapping.id)
        }
      } else {
        console.warn(`未找到标签 ${label} 的映射配置`)
      }
    } catch (error) {
      console.error(`加载标签 ${label} 的映射失败:`, error)
    }
  }
}

// 在组件加载时获取标签映射和权限配置（预加载常用的映射）
const loadLabelMappings = async () => {
  try {
    const mappingResponse = await apiService.getLabelMappings('node')
    const nodeMappings = mappingResponse.node_labels || []
    
    console.log('API响应:', mappingResponse)
    console.log('预加载的标签映射:', nodeMappings)
    
    if (nodeMappings.length > 0) {
      availableLabels.value = nodeMappings.map(mapping => ({
        id: mapping.id,
        neo4j_name: mapping.neo4j_name,
        display_name: mapping.display_name,
        description: mapping.description
      }))
      
      console.log('处理后的标签映射:', availableLabels.value)
      
      // 同时加载每个节点标签的属性权限
      console.log('开始预加载属性权限...')
      for (const mapping of nodeMappings) {
        await loadPropertyPermissions(mapping.id)
        console.log(`已加载标签 ${mapping.neo4j_name} (ID: ${mapping.id}) 的属性权限`)
      }
      console.log('属性权限预加载完成:', propertyPermissions.value)
    }
  } catch (error) {
    console.error('加载标签映射失败:', error)
  }
}

// 下载知识图谱Schema
const downloadSchema = async () => {
  downloadingSchema.value = true
  try {
    // 获取所有节点标签和关系类型数据
    const [labelsResponse, relationshipTypesResponse, nodeMappingsResponse, relationshipMappingsResponse] = await Promise.all([
      apiService.getAllLabels(),
      apiService.getRelationshipTypes(),
      apiService.getLabelMappings('node'),
      apiService.getLabelMappings('relationship')
    ])

    // 构建Schema对象
    const schema = {
      generated_at: new Date().toISOString(),
      version: '1.0',
      description: '知识图谱完整Schema结构',
      
      // 节点类型信息
      node_types: [],
      
      // 关系类型信息
      relationship_types: [],
      
      // 统计信息
      statistics: {
        total_node_types: 0,
        total_relationship_types: 0,
        total_properties: 0
      }
    }

    // 处理节点类型
    const nodeLabels = labelsResponse.labels_with_counts || []
    const nodeMappings = nodeMappingsResponse.node_labels || []
    
    for (const labelInfo of nodeLabels) {
      const labelName = labelInfo.label
      const mapping = nodeMappings.find(m => m.neo4j_name === labelName)
      
      const nodeType = {
        neo4j_name: labelName,
        display_name: mapping ? mapping.display_name : labelName,
        description: mapping ? mapping.description : null,
        count: labelInfo.count,
        properties: []
      }

      // 如果有映射配置，获取属性信息
      if (mapping) {
        try {
          const propertiesResponse = await apiService.getPropertyPermissions(mapping.id)
          const properties = propertiesResponse.properties || []
          
          nodeType.properties = properties.map(prop => ({
            neo4j_name: prop.property_key,
            display_name: prop.display_name,
            description: prop.description,
            data_type: prop.data_type,
            is_required: prop.is_required,
            default_value: prop.default_value,
            can_view: prop.can_view,
            can_edit: prop.can_edit
          }))
        } catch (error) {
          console.warn(`获取节点类型 ${labelName} 的属性信息失败:`, error)
        }
      }

      schema.node_types.push(nodeType)
    }

    // 处理关系类型
    const relationshipTypes = relationshipTypesResponse.relationship_types || []
    const relationshipMappings = relationshipMappingsResponse.relationship_labels || []
    
    for (const relInfo of relationshipTypes) {
      const relType = relInfo.type
      const mapping = relationshipMappings.find(m => m.neo4j_name === relType)
      
      const relationshipType = {
        neo4j_name: relType,
        display_name: mapping ? mapping.display_name : getRelationshipDisplayName(relType),
        description: mapping ? mapping.description : null,
        count: relInfo.count,
        properties: []
      }

      // 如果有映射配置，获取属性信息
      if (mapping) {
        try {
          const propertiesResponse = await apiService.getPropertyPermissions(mapping.id)
          const properties = propertiesResponse.properties || []
          
          relationshipType.properties = properties.map(prop => ({
            neo4j_name: prop.property_key,
            display_name: prop.display_name,
            description: prop.description,
            data_type: prop.data_type,
            is_required: prop.is_required,
            default_value: prop.default_value,
            can_view: prop.can_view,
            can_edit: prop.can_edit
          }))
        } catch (error) {
          console.warn(`获取关系类型 ${relType} 的属性信息失败:`, error)
        }
      }

      schema.relationship_types.push(relationshipType)
    }

    // 更新统计信息
    schema.statistics.total_node_types = schema.node_types.length
    schema.statistics.total_relationship_types = schema.relationship_types.length
    schema.statistics.total_properties = schema.node_types.reduce((sum, nt) => sum + nt.properties.length, 0) +
                                        schema.relationship_types.reduce((sum, rt) => sum + rt.properties.length, 0)

    // 导出Schema为JSON文件
    const dataStr = JSON.stringify(schema, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `knowledge_graph_schema_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success(`Schema导出成功！包含 ${schema.statistics.total_node_types} 种节点类型和 ${schema.statistics.total_relationship_types} 种关系类型`)
  } catch (error) {
    console.error('下载Schema失败:', error)
    ElMessage.error('下载Schema失败: ' + error.message)
  } finally {
    downloadingSchema.value = false
  }
}

// 在组件挂载时预加载标签映射
onMounted(() => {
  loadLabelMappings()
})

</script>

<style scoped>
/* 主容器 */
.cypher-query-container {
  width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 查询编辑器区域 */
.query-editor-section {
  margin-bottom: 24px;
  width: 100%;
  max-width: 1200px;
}

.editor-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.editor-header {
  margin-bottom: 24px;
  text-align: center;
}

.editor-content {
  max-width: 1000px;
  margin: 0 auto;
}

.query-input-group {
  margin-bottom: 24px;
}

.input-label,
.param-label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cypher-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border-radius: 12px;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  resize: vertical;
}

.cypher-textarea :deep(.el-textarea__inner:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.cypher-textarea :deep(.el-textarea__inner:focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.input-help {
  margin-top: 8px;
  font-size: 12px;
  color: #7f8c8d;
  text-align: right;
}


.query-templates {
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  border: 1px solid #e8ecf0;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.template-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.template-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px;
}

.template-description {
  font-size: 12px;
  color: #7f8c8d;
}

.execute-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.execute-btn,
.schema-download-btn {
  height: 48px;
  padding: 0 32px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  transition: all 0.3s ease;
  min-width: 200px;
}

.execute-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.schema-download-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.execute-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.schema-download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(40, 167, 69, 0.3);
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

.result-text,
.graph-stats {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.results-actions {
  display: flex;
  gap: 12px;
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

.export-dropdown :deep(.el-dropdown-menu) {
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.export-dropdown :deep(.el-dropdown-menu__item) {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.export-dropdown :deep(.el-dropdown-menu__item:hover) {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

/* 视图选择器 */
.view-selector {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  border: 1px solid #e8ecf0;
  display: flex;
  justify-content: center;
}

.view-mode-group :deep(.el-radio-button) {
  margin: 0;
}

.view-mode-group :deep(.el-radio-button__inner) {
  height: 44px;
  line-height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.view-mode-group :deep(.el-radio-button__inner:hover) {
  background: rgba(102, 126, 234, 0.1);
}

.view-mode-group :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 表格视图 */
.table-view {
  margin-top: 16px;
}

.results-table {
  border-radius: 8px;
  overflow: hidden;
}

.cell-content {
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 文本视图 */
.text-view {
  margin-top: 16px;
}

.text-content {
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid #e8ecf0;
  border-radius: 8px;
  overflow: hidden;
}

.json-output {
  margin: 0;
  padding: 20px;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #2c3e50;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 600px;
  overflow-y: auto;
}

/* 图形视图 */
.graph-view {
  position: relative;
  min-height: 600px;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

/* 关系类型图例 - 参照NodeQuery.vue样式 */
.relationship-legend {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-width: 250px;
  z-index: 10;
}

.legend-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.legend-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.legend-line {
  width: 30px;
  min-width: 30px;
  border-radius: 2px;
  position: relative;
}

.legend-line::after {
  content: '→';
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: inherit;
  font-weight: bold;
}

.legend-label {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.network-container {
  width: 100%;
  height: 600px;
  background: #fafbfc;
}

/* 节点信息面板 */
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

/* 节点操作区域 */
.node-operations {
  border-top: 1px solid #e8ecf0;
  padding-top: 20px;
  margin-top: 20px;
}

.operations-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 管理员操作按钮 */
.panel-actions {
  margin-top: 20px;
  margin-bottom: 20px;
  padding-top: 16px;
  padding-bottom: 16px;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.panel-actions .action-btn {
  flex: 1;
  min-width: 100px;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.panel-actions .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.admin-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.admin-actions .action-btn {
  flex: 1;
  min-width: 100px;
}


/* 空状态 */
.empty-section {
  margin-bottom: 24px;
  width: 100%;
  max-width: 1200px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .cypher-query-container {
    padding: 16px;
  }
  
  .templates-grid {
    grid-template-columns: 1fr;
  }
  
  .results-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .node-info-panel {
    width: 100%;
    position: relative;
    border-left: none;
    border-top: 1px solid #e8ecf0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
  
}
</style>
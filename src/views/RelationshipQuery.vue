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
    
    <div class="relationship-query-container">
      <!-- 关系类型选择区域 -->
      <div class="relationship-types-section">
        <div class="types-card">
          <div class="types-header">
            <h3 class="section-title">
              <el-icon><Share /></el-icon>
              关系类型
            </h3>
            <p class="section-subtitle">点击关系类型查看相关连接</p>
          </div>
          
          <div class="types-content">
            <div v-if="relationshipTypes.length > 0" class="types-grid">
              <div 
                v-for="relType in relationshipTypes"
                :key="relType.type"
                class="type-card"
                :class="{ active: selectedRelType === relType.type }"
                @click="selectRelationType(relType.type)"
              >
                <div class="type-header">
                  <div class="type-name">{{ relType.type }}</div>
                  <div class="type-count">{{ relType.count }} 个关系</div>
                </div>
                <div class="type-description">
                  点击查看 {{ relType.type }} 类型的所有关系
                </div>
              </div>
            </div>
            
            <div v-else-if="loadingTypes" class="loading-types">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在加载关系类型...</span>
            </div>
            
            <div v-else class="no-types">
              <el-empty description="暂无关系数据">
                <template #image>
                  <div class="empty-icon">
                    <el-icon><Share /></el-icon>
                  </div>
                </template>
              </el-empty>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 查询参数设置 -->
      <div class="query-params-section" v-if="selectedRelType">
        <div class="params-card">
          <div class="params-header">
            <h3 class="section-title">
              <el-icon><Setting /></el-icon>
              查询参数
            </h3>
            <p class="section-subtitle">设置 {{ selectedRelType }} 关系的查询参数</p>
          </div>
          
          <div class="params-form">
            <div class="param-group">
              <div class="param-label">
                <el-icon><DataLine /></el-icon>
                节点数量限制
              </div>
              <el-input-number
                v-model="nodeLimit"
                :min="1"
                :max="100"
                :step="5"
                class="param-input"
              />
            </div>
            
            <div class="param-actions">
              <el-button 
                type="primary"
                size="large"
                @click="queryRelationship"
                :loading="loading"
                class="query-btn"
              >
                <el-icon><Search /></el-icon>
                查询 {{ selectedRelType }} 关系
              </el-button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 结果区域 -->
      <div class="results-section" v-if="queryResults.length > 0">
        <div class="results-card">
          <div class="results-header">
            <div class="results-title">
              <h3 class="section-title">
                <el-icon><TrendCharts /></el-icon>
                查询结果
              </h3>
              <div class="results-stats">
                <span class="result-count">{{ queryResults.length }}</span>
                <span class="result-text">条记录</span>
                <span class="execution-time">{{ executionTime }}ms</span>
              </div>
            </div>
            <div class="results-actions">
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
          
          <!-- 关系图可视化 -->
          <div class="graph-visualization">
            <div ref="networkContainer" class="network-container"></div>
            
            <!-- 选中元素信息面板 -->
            <div v-if="selectedElement" class="element-info-panel">
              <div class="panel-header">
                <h4 class="panel-title">
                  <el-icon><InfoFilled /></el-icon>
                  {{ selectedElement.type === 'node' ? '节点信息' : '关系信息' }}
                </h4>
                <el-button type="text" @click="selectedElement = null" class="close-btn">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
              <div class="panel-content">
                <!-- 节点信息 -->
                <div v-if="selectedElement.type === 'node'" class="node-info">
                  <div class="element-basic-info">
                    <div class="info-item">
                      <span class="info-label">ID:</span>
                      <span class="info-value">{{ selectedElement.data.id }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">标签:</span>
                      <div class="info-labels">
                        <el-tag
                          v-for="label in selectedElement.data.labels"
                          :key="label"
                          type="info"
                          effect="light"
                          class="element-label-tag"
                        >
                          {{ label }}
                        </el-tag>
                      </div>
                    </div>
                  </div>
                  
                  <div class="element-properties">
                    <h5 class="properties-title">属性</h5>
                    <div class="properties-list">
                      <div 
                        v-for="(value, key) in selectedElement.data.properties"
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
                
                <!-- 关系信息 -->
                <div v-else class="relationship-info">
                  <div class="element-basic-info">
                    <div class="info-item">
                      <span class="info-label">ID:</span>
                      <span class="info-value">{{ selectedElement.data.id }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">类型:</span>
                      <el-tag type="warning" effect="light" class="rel-type-tag">
                        {{ selectedElement.data.relType }}
                      </el-tag>
                    </div>
                    <div class="info-item">
                      <span class="info-label">方向:</span>
                      <span class="info-value">{{ selectedElement.data.startNode }} → {{ selectedElement.data.endNode }}</span>
                    </div>
                  </div>
                  
                  <div class="element-properties" v-if="Object.keys(selectedElement.data.properties).length > 0">
                    <h5 class="properties-title">属性</h5>
                    <div class="properties-list">
                      <div 
                        v-for="(value, key) in selectedElement.data.properties"
                        :key="key"
                        class="property-row"
                      >
                        <div class="property-name">{{ key }}</div>
                        <div class="property-val">{{ formatProperty(value) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div class="empty-section" v-else-if="searched && !loading">
        <div class="empty-card">
          <el-empty description="暂无查询结果">
            <template #image>
              <div class="empty-icon">
                <el-icon><Search /></el-icon>
              </div>
            </template>
            <template #description>
              <p class="empty-title">暂无查询结果</p>
              <p class="empty-subtitle">请检查 Cypher 语句或尝试其他查询条件</p>
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
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  RefreshRight, 
  Share, 
  Download, 
  InfoFilled, 
  TrendCharts, 
  Setting,
  DataLine,
  HomeFilled,
  Close,
  Loading
} from '@element-plus/icons-vue'
import neo4jService from '../services/neo4j'
import AppLayout from '../components/AppLayout.vue'
import { Network } from 'vis-network'

const router = useRouter()

const loading = ref(false)
const loadingTypes = ref(true)
const searched = ref(false)
const queryResults = ref([])
const executionTime = ref(0)
const selectedElement = ref(null)
const networkContainer = ref(null)
const network = ref(null)
const relationshipTypes = ref([])
const selectedRelType = ref('')
const nodeLimit = ref(25)

// 加载关系类型
const loadRelationshipTypes = async () => {
  loadingTypes.value = true
  try {
    const query = 'MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC'
    const result = await neo4jService.runQuery(query)
    
    relationshipTypes.value = result.map(record => ({
      type: record.get('type'),
      count: record.get('count').toNumber()
    }))
    
    ElMessage.success(`加载了 ${relationshipTypes.value.length} 种关系类型`)
  } catch (error) {
    console.error('加载关系类型失败:', error)
    ElMessage.error('加载关系类型失败')
    relationshipTypes.value = []
  } finally {
    loadingTypes.value = false
  }
}

// 选择关系类型
const selectRelationType = (type) => {
  selectedRelType.value = type
  // 清空之前的结果
  clearResults()
}

// 回到首页
const goHome = () => {
  router.push('/dashboard')
}

// 清空结果
const clearResults = () => {
  queryResults.value = []
  searched.value = false
  selectedElement.value = null
  if (network.value) {
    network.value.destroy()
    network.value = null
  }
}


// 查询特定关系类型
const queryRelationship = async () => {
  if (!selectedRelType.value) {
    ElMessage.warning('请选择关系类型')
    return
  }
  
  loading.value = true
  searched.value = true
  const startTime = Date.now()
  
  try {
    const query = `MATCH (n)-[r:${selectedRelType.value}]->(m) RETURN n, r, m LIMIT ${nodeLimit.value}`
    const result = await neo4jService.runQuery(query)
    
    // 直接使用原始数据结构，不进行转换
    queryResults.value = result.map(record => {
      const recordData = {}
      record.keys.forEach(key => {
        const value = record.get(key)
        recordData[key] = value
      })
      return recordData
    })
    
    executionTime.value = Date.now() - startTime
    
    if (queryResults.value.length === 0) {
      ElMessage.info('查询执行成功，但未返回结果')
    } else {
      console.log('查询结果:', queryResults.value)
      ElMessage.success(`查询执行成功，返回 ${queryResults.value.length} 条记录`)
      // 延迟创建网络图
      nextTick(() => {
        createNetwork()
      })
    }
  } catch (error) {
    console.error('查询执行失败:', error)
    ElMessage.error(`查询执行失败: ${error.message}`)
    queryResults.value = []
  } finally {
    loading.value = false
  }
}

// 创建网络图
const createNetwork = () => {
  console.log('createNetwork called with:', {
    networkContainer: networkContainer.value,
    queryResultsLength: queryResults.value.length,
    queryResults: queryResults.value
  })
  
  if (!networkContainer.value || !queryResults.value.length) {
    console.log('createNetwork early return:', {
      hasContainer: !!networkContainer.value,
      hasResults: queryResults.value.length > 0
    })
    return
  }
  
  // 清理旧的网络
  if (network.value) {
    network.value.destroy()
  }
  
  const nodes = new Map()
  const edges = []
  
  // 处理查询结果，提取节点和关系
  queryResults.value.forEach(record => {
    // 直接处理记录中的 n, r, m 字段
    if (record.n && record.n.identity) {
      // 处理起始节点 n
      const nodeId = record.n.identity.low || record.n.identity
      if (!nodes.has(nodeId)) {
        const nodeLabel = record.n.properties.name || record.n.properties.value || record.n.properties.title || `${record.n.labels[0] || 'Node'}`
        const tooltip = `ID: ${nodeId}\n标签: ${record.n.labels.join(', ')}\n属性: ${Object.keys(record.n.properties).length} 个`
        
        nodes.set(nodeId, {
          id: nodeId,
          label: nodeLabel,
          group: record.n.labels[0] || 'Unknown',
          title: tooltip,
          color: {
            background: getNodeColor(record.n.labels[0]),
            border: darkenColor(getNodeColor(record.n.labels[0]), 0.3),
            highlight: {
              background: lightenColor(getNodeColor(record.n.labels[0]), 0.2),
              border: darkenColor(getNodeColor(record.n.labels[0]), 0.2)
            }
          },
          font: { 
            color: '#ffffff', 
            size: 13,
            face: 'Helvetica Neue, Arial',
            strokeWidth: 2,
            strokeColor: darkenColor(getNodeColor(record.n.labels[0]), 0.5)
          },
          shape: 'dot',
          size: 30,
          borderWidth: 3,
          data: record.n
        })
      }
    }
    
    if (record.m && record.m.identity) {
      // 处理目标节点 m
      const nodeId = record.m.identity.low || record.m.identity
      if (!nodes.has(nodeId)) {
        const nodeLabel = record.m.properties.name || record.m.properties.value || record.m.properties.title || `${record.m.labels[0] || 'Node'}`
        const tooltip = `ID: ${nodeId}\n标签: ${record.m.labels.join(', ')}\n属性: ${Object.keys(record.m.properties).length} 个`
        
        nodes.set(nodeId, {
          id: nodeId,
          label: nodeLabel,
          group: record.m.labels[0] || 'Unknown',
          title: tooltip,
          color: {
            background: getNodeColor(record.m.labels[0]),
            border: darkenColor(getNodeColor(record.m.labels[0]), 0.3),
            highlight: {
              background: lightenColor(getNodeColor(record.m.labels[0]), 0.2),
              border: darkenColor(getNodeColor(record.m.labels[0]), 0.2)
            }
          },
          font: { 
            color: '#ffffff', 
            size: 13,
            face: 'Helvetica Neue, Arial',
            strokeWidth: 2,
            strokeColor: darkenColor(getNodeColor(record.m.labels[0]), 0.5)
          },
          shape: 'dot',
          size: 30,
          borderWidth: 3,
          data: record.m
        })
      }
    }
    
    if (record.r && record.r.identity) {
      // 处理关系 r
      const relationshipId = record.r.identity.low || record.r.identity
      const startId = record.r.start.low || record.r.start
      const endId = record.r.end.low || record.r.end
      
      edges.push({
        id: relationshipId,
        from: startId,
        to: endId,
        label: record.r.type,
        color: { color: '#667eea', hover: '#764ba2' },
        font: { color: '#667eea', size: 12 },
        data: record.r
      })
    }
    
    // 保留原有的路径处理逻辑（如果需要的话）
    Object.values(record).forEach(item => {
      if (item && typeof item === 'object' && item.type === 'path') {
          // 处理路径数据
          item.segments.forEach(segment => {
            // 添加起始节点
            if (!nodes.has(segment.start.id)) {
              const startLabel = segment.start.properties.name || segment.start.properties.title || `${segment.start.labels[0] || 'Node'}`
              const startTooltip = `ID: ${segment.start.id}\n标签: ${segment.start.labels.join(', ')}\n属性: ${Object.keys(segment.start.properties).length} 个`
              
              nodes.set(segment.start.id, {
                id: segment.start.id,
                label: startLabel,
                group: segment.start.labels[0] || 'Unknown',
                title: startTooltip,
                color: {
                  background: getNodeColor(segment.start.labels[0]),
                  border: darkenColor(getNodeColor(segment.start.labels[0]), 0.3),
                  highlight: {
                    background: lightenColor(getNodeColor(segment.start.labels[0]), 0.2),
                    border: darkenColor(getNodeColor(segment.start.labels[0]), 0.2)
                  }
                },
                font: { 
                  color: '#ffffff', 
                  size: 13,
                  face: 'Helvetica Neue, Arial',
                  strokeWidth: 2,
                  strokeColor: darkenColor(getNodeColor(segment.start.labels[0]), 0.5)
                },
                shape: 'dot',
                size: 30,
                borderWidth: 3,
                data: { type: 'node', ...segment.start }
              })
            }
            
            // 添加结束节点
            if (!nodes.has(segment.end.id)) {
              const endLabel = segment.end.properties.name || segment.end.properties.title || `${segment.end.labels[0] || 'Node'}`
              const endTooltip = `ID: ${segment.end.id}\n标签: ${segment.end.labels.join(', ')}\n属性: ${Object.keys(segment.end.properties).length} 个`
              
              nodes.set(segment.end.id, {
                id: segment.end.id,
                label: endLabel,
                group: segment.end.labels[0] || 'Unknown',
                title: endTooltip,
                color: {
                  background: getNodeColor(segment.end.labels[0]),
                  border: darkenColor(getNodeColor(segment.end.labels[0]), 0.3),
                  highlight: {
                    background: lightenColor(getNodeColor(segment.end.labels[0]), 0.2),
                    border: darkenColor(getNodeColor(segment.end.labels[0]), 0.2)
                  }
                },
                font: { 
                  color: '#ffffff', 
                  size: 13,
                  face: 'Helvetica Neue, Arial',
                  strokeWidth: 2,
                  strokeColor: darkenColor(getNodeColor(segment.end.labels[0]), 0.5)
                },
                shape: 'dot',
                size: 30,
                borderWidth: 3,
                data: { type: 'node', ...segment.end }
              })
            }
            
            // 添加关系
            edges.push({
              id: segment.relationship.id,
              from: segment.start.id,
              to: segment.end.id,
              label: segment.relationship.relType,
              color: { color: '#667eea', hover: '#764ba2' },
              font: { color: '#667eea', size: 12 },
              data: { type: 'relationship', relType: segment.relationship.relType, startNode: segment.start.id, endNode: segment.end.id, ...segment.relationship }
            })
          })
        }
    })
  })
  
  // 网络配置 - 类似 Neo4j Browser 样式
  const options = {
    nodes: {
      borderWidth: 3,
      borderWidthSelected: 4,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.2)',
        size: 8,
        x: 2,
        y: 2
      },
      font: {
        color: '#2c3e50',
        size: 14,
        face: 'Helvetica Neue, Arial',
        strokeWidth: 1,
        strokeColor: '#ffffff'
      },
      chosen: {
        node: (values, id, selected, hovering) => {
          values.shadow = true
          values.shadowSize = 12
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
      color: {
        color: '#667eea',
        hover: '#764ba2',
        highlight: '#FF6B6B'
      },
      font: {
        color: '#667eea',
        size: 12,
        face: 'Helvetica Neue, Arial',
        strokeWidth: 2,
        strokeColor: '#ffffff',
        align: 'middle'
      },
      width: 2,
      smooth: {
        type: 'continuous',
        roundness: 0.5
      },
      chosen: {
        edge: (values, id, selected, hovering) => {
          values.width = 4
          values.shadow = true
          values.shadowSize = 8
        }
      },
      labelHighlightBold: true
    },
    physics: {
      enabled: true,
      stabilization: { 
        iterations: 200,
        updateInterval: 25
      },
      barnesHut: {
        gravitationalConstant: -4000,
        centralGravity: 0.4,
        springLength: 150,
        springConstant: 0.05,
        damping: 0.1,
        avoidOverlap: 0.2
      }
    },
    interaction: {
      hover: true,
      hoverConnectedEdges: true,
      selectConnectedEdges: false,
      tooltipDelay: 300,
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false
    },
    layout: {
      improvedLayout: true,
      clusterThreshold: 150
    }
  }
  
  // 创建网络图
  const data = { 
    nodes: Array.from(nodes.values()), 
    edges 
  }
  
  console.log('Network data:', {
    nodes: data.nodes,
    edges: data.edges,
    nodesCount: data.nodes.length,
    edgesCount: data.edges.length
  })
  
  network.value = new Network(networkContainer.value, data, options)
  
  // 添加点击事件
  network.value.on('click', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const nodeData = Array.from(nodes.values()).find(n => n.id === nodeId)
      if (nodeData) {
        selectedElement.value = {
          type: 'node',
          data: nodeData.data
        }
      }
    } else if (params.edges.length > 0) {
      const edgeId = params.edges[0]
      const edgeData = edges.find(e => e.id === edgeId)
      if (edgeData) {
        selectedElement.value = {
          type: 'relationship',
          data: edgeData.data
        }
      }
    } else {
      selectedElement.value = null
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
    'ExternalLink': '#FFA726',
    'Pinyin': '#AB47BC',
    'Default': '#667eea'
  }
  return colors[label] || colors.Default
}

// 颜色处理函数
const darkenColor = (color, amount) => {
  const hex = color.replace('#', '')
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * amount))
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * amount))
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const lightenColor = (color, amount) => {
  const hex = color.replace('#', '')
  const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * amount))
  const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * amount))
  const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// 格式化属性值
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

// 导出结果
const exportResults = () => {
  const dataStr = JSON.stringify(queryResults.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cypher_query_results_${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  // 初始化时加载关系类型
  loadRelationshipTypes()
})
</script>

<style scoped>
/* 主容器 */
.relationship-query-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

/* 关系类型选择区域 */
.relationship-types-section {
  margin-bottom: 24px;
  width: 100%;
}

.types-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.types-header {
  margin-bottom: 24px;
  text-align: center;
}

.types-content {
  width: 100%;
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.type-card {
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid #e8ecf0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.type-card:hover {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.type-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.type-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.type-count {
  font-size: 14px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.type-description {
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
}

.loading-types {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #7f8c8d;
}

.no-types {
  padding: 40px;
}

/* 查询参数设置区域 */
.query-params-section {
  margin-bottom: 24px;
  width: 100%;
}

.params-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.params-header {
  margin-bottom: 24px;
  text-align: center;
}

.params-form {
  max-width: 600px;
  margin: 0 auto;
}

.param-group {
  margin-bottom: 24px;
}

.param-label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-input {
  width: 100%;
}

.param-input :deep(.el-input-number) {
  width: 100%;
}

.param-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.param-input :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.param-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.param-actions {
  display: flex;
  justify-content: center;
}

.query-btn {
  height: 48px;
  padding: 0 32px;
  border-radius: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.query-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
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

/* 结果区域 */
.results-section {
  margin-bottom: 24px;
  width: 100%;
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
  gap: 8px;
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

.execution-time {
  font-size: 12px;
  color: #96CEB4;
  background: rgba(150, 206, 180, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: 8px;
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

/* 图形可视化 */
.graph-visualization {
  position: relative;
  min-height: 700px;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
}

.network-container {
  width: 100%;
  height: 700px;
  background: #fafbfc;
}

/* 元素信息面板 */
.element-info-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 380px;
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

.element-basic-info {
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
  min-width: 50px;
}

.info-value {
  color: #7f8c8d;
  font-family: 'Monaco', monospace;
  word-break: break-all;
}

.info-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.element-label-tag {
  font-size: 12px;
  font-weight: 500;
}

.rel-type-tag {
  font-weight: 600;
}

.element-properties {
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

/* 空状态 */
.empty-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.empty-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 48px 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
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
  .relationship-query-container {
    padding: 16px;
  }
  
  .examples-grid {
    grid-template-columns: 1fr;
  }
  
  .query-actions {
    flex-direction: column;
  }
  
  .results-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .results-title {
    justify-content: center;
  }
  
  .element-info-panel {
    width: 100%;
    position: relative;
    border-left: none;
    border-top: 1px solid #e8ecf0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .graph-visualization {
    min-height: 500px;
  }
  
  .network-container {
    height: 500px;
  }
}
</style>
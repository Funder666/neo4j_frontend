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
                  <div class="type-name">{{ relType.display_name || relType.type }}</div>
                  <div class="type-count">{{ relType.count }} 个关系</div>
                </div>
                <div class="type-description">
                  {{ relType.description || `点击查看 ${relType.display_name || relType.type} 类型的所有关系` }}
                </div>
              </div>
            </div>
            
            <div v-else-if="loadingTypes" class="loading-types">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在加载关系类型...</span>
            </div>
            
            <div v-else class="no-types">
              <el-empty description="您没有权限查看任何关系类型">
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
            <p class="section-subtitle">设置 {{ selectedRelTypeDisplayName }} 关系的查询参数</p>
          </div>
          
          <div class="params-form">
            <div class="param-group">
              <div class="param-label">
                <el-icon><User /></el-icon>
                起始节点（可选）
              </div>
              <el-input
                v-model="startNodeFilter"
                placeholder="输入起始节点包含的关键词，如：前"
                class="param-input"
                clearable
              />
            </div>
            
            <div class="param-group">
              <div class="param-label">
                <el-icon><User /></el-icon>
                终止节点（可选）
              </div>
              <el-input
                v-model="endNodeFilter"
                placeholder="输入终止节点包含的关键词，如：后"
                class="param-input"
                clearable
              />
            </div>
            
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
                查询关系
                <span v-if="startNodeFilter || endNodeFilter">（按节点过滤）</span>
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
                  
                  <!-- 节点操作区域 -->
                  <div v-if="isAdmin" class="node-operations">
                    <h5 class="operations-title">操作</h5>
                    <div class="panel-actions">
                      <el-button 
                        type="primary" 
                        size="small"
                        class="action-btn"
                        @click="editNode(selectedElement.data)"
                      >
                        <el-icon><Edit /></el-icon>
                        编辑节点
                      </el-button>
                      <el-button 
                        type="danger" 
                        size="small"
                        class="action-btn"
                        @click="deleteNode(selectedElement.data)"
                      >
                        <el-icon><Delete /></el-icon>
                        删除节点
                      </el-button>
                    </div>
                  </div>
                  
                  <div class="element-properties">
                    <h5 class="properties-title">属性</h5>
                    <div class="properties-list">
                      <div 
                        v-for="(value, key) in getVisibleProperties(selectedElement.data, selectedElement.type)"
                        :key="key"
                        class="property-row"
                      >
                        <div class="property-name">{{ getPropertyDisplayName(key, selectedElement.type, selectedElement.data.labels) }}</div>
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
                        {{ selectedElement.data.type }}
                      </el-tag>
                    </div>
                    <div class="info-item">
                      <span class="info-label">方向:</span>
                      <span class="info-value">{{ selectedElement.data.start_node_id }} → {{ selectedElement.data.end_node_id }}</span>
                    </div>
                  </div>
                  
                  <!-- 关系操作区域 -->
                  <div v-if="isAdmin" class="relationship-operations">
                    <h5 class="operations-title">操作</h5>
                    <div class="panel-actions">
                      <el-button 
                        type="primary" 
                        size="small"
                        class="action-btn"
                        @click="editRelationship(selectedElement.data)"
                      >
                        <el-icon><Edit /></el-icon>
                        编辑关系
                      </el-button>
                      <el-button 
                        type="danger" 
                        size="small"
                        class="action-btn"
                        @click="deleteRelationship(selectedElement.data)"
                      >
                        <el-icon><Delete /></el-icon>
                        删除关系
                      </el-button>
                    </div>
                  </div>
                  
                  <div class="element-properties" v-if="Object.keys(getVisibleProperties(selectedElement.data, selectedElement.type)).length > 0">
                    <h5 class="properties-title">属性</h5>
                    <div class="properties-list">
                      <div 
                        v-for="(value, key) in getVisibleProperties(selectedElement.data, selectedElement.type)"
                        :key="key"
                        class="property-row"
                      >
                        <div class="property-name">{{ getPropertyDisplayName(key, selectedElement.type, selectedElement.data.type) }}</div>
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
    
    <!-- 节点编辑对话框 -->
    <el-dialog
      v-model="nodeDialog.visible"
      title="编辑节点"
      width="600px"
      class="node-dialog"
    >
      <el-form
        ref="nodeForm"
        :model="nodeDialog.form"
        :rules="nodeDialog.rules"
        label-width="100px"
      >
        <el-form-item label="节点标签" prop="labels">
          <el-select
            v-model="nodeDialog.form.labels"
            multiple
            filterable
            allow-create
            placeholder="选择或输入标签"
            style="width: 100%"
          >
            <el-option
              v-for="label in availableLabels"
              :key="label"
              :label="label"
              :value="label"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="节点属性">
          <div class="properties-editor">
            <div 
              v-for="(prop, index) in nodeDialog.form.properties" 
              :key="index"
              class="property-input-row"
            >
              <el-input
                v-model="prop.key"
                placeholder="属性名"
                style="width: 40%"
              />
              <el-input
                v-model="prop.value"
                placeholder="属性值"
                style="width: 40%"
              />
              <el-button
                type="danger"
                @click="removeProperty(index)"
                :disabled="nodeDialog.form.properties.length <= 1"
              >
                删除
              </el-button>
            </div>
            <el-button type="primary" @click="addProperty">
              添加属性
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="nodeDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="saveNode" :loading="nodeDialog.loading">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
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
  Loading,
  Edit,
  Delete,
  User
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import authService from '../services/auth'
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
const startNodeFilter = ref('')
const endNodeFilter = ref('')
const propertyPermissions = ref({})

// 权限控制
const currentUser = computed(() => authService.getCurrentUser())
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 计算选中关系类型的显示名称
const selectedRelTypeDisplayName = computed(() => {
  if (!selectedRelType.value) return ''
  const relType = relationshipTypes.value.find(type => type.type === selectedRelType.value)
  return relType ? (relType.display_name || relType.type) : selectedRelType.value
})

// 节点编辑对话框
const nodeDialog = reactive({
  visible: false,
  loading: false,
  form: {
    labels: [],
    properties: [{ key: 'name', value: '' }]
  },
  rules: {
    labels: [
      { required: true, message: '请选择至少一个标签', trigger: 'change' }
    ]
  }
})

const nodeForm = ref(null)
const availableLabels = ref([])

// 加载关系类型
const loadRelationshipTypes = async () => {
  loadingTypes.value = true
  try {
    // 首先尝试使用新的标签映射API
    const mappingResponse = await apiService.getLabelMappings('relationship')
    const relationshipMappings = mappingResponse.relationship_labels || []
    
    if (relationshipMappings.length > 0) {
      // 使用映射数据，但需要获取计数信息
      try {
        const countResponse = await apiService.getRelationshipTypes()
        const countMap = {}
        countResponse.relationship_types.forEach(item => {
          countMap[item.type] = item.count
        })
        
        relationshipTypes.value = relationshipMappings.map(mapping => ({
          id: mapping.id,
          type: mapping.neo4j_name,
          display_name: mapping.display_name,
          count: countMap[mapping.neo4j_name] || 0,
          description: mapping.description
        }))
        
        // 同时加载每个关系类型的属性权限
        for (const mapping of relationshipMappings) {
          await loadPropertyPermissions(mapping.id)
        }
      } catch (countError) {
        // 如果获取计数失败，使用映射数据但不显示计数
        relationshipTypes.value = relationshipMappings.map(mapping => ({
          id: mapping.id,
          type: mapping.neo4j_name,
          display_name: mapping.display_name,
          count: 0,
          description: mapping.description
        }))
        
        // 即使计数失败，也要加载属性权限
        for (const mapping of relationshipMappings) {
          await loadPropertyPermissions(mapping.id)
        }
      }
    } else {
      // 如果没有映射数据，说明用户没有任何关系权限
      relationshipTypes.value = []
      ElMessage.info('您没有权限查看任何关系类型')
    }
    
    if (relationshipTypes.value.length > 0) {
      ElMessage.success(`加载了 ${relationshipTypes.value.length} 种关系类型`)
    }
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
  startNodeFilter.value = ''
  endNodeFilter.value = ''
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
    // 构建查询语句
    let query = `MATCH (n)-[r:${selectedRelType.value}]->(m)`
    
    // 添加节点过滤条件
    const whereConditions = []
    
    if (startNodeFilter.value && startNodeFilter.value.trim()) {
      // 检查起始节点的属性是否包含关键词
      whereConditions.push(`(
        (n.name IS NOT NULL AND n.name CONTAINS $startFilter) OR 
        (n.value IS NOT NULL AND n.value CONTAINS $startFilter) OR 
        (n.title IS NOT NULL AND n.title CONTAINS $startFilter)
      )`)
    }
    
    if (endNodeFilter.value && endNodeFilter.value.trim()) {
      // 检查终止节点的属性是否包含关键词
      whereConditions.push(`(
        (m.name IS NOT NULL AND m.name CONTAINS $endFilter) OR 
        (m.value IS NOT NULL AND m.value CONTAINS $endFilter) OR 
        (m.title IS NOT NULL AND m.title CONTAINS $endFilter)
      )`)
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ')
    }
    
    query += ` RETURN n, r, m LIMIT ${nodeLimit.value}`
    
    // 准备参数
    const parameters = {}
    if (startNodeFilter.value && startNodeFilter.value.trim()) {
      parameters.startFilter = startNodeFilter.value.trim()
    }
    if (endNodeFilter.value && endNodeFilter.value.trim()) {
      parameters.endFilter = endNodeFilter.value.trim()
    }
    
    console.log('执行查询:', query, '参数:', parameters)
    
    const response = await apiService.runQuery(query, parameters)
    
    // 处理查询结果，应用权限过滤
    queryResults.value = response.records.map(record => {
      // 创建过滤后的record副本
      const filteredRecord = { ...record }
      
      // 过滤节点n的属性
      if (record.n && record.n.properties) {
        filteredRecord.n = {
          ...record.n,
          properties: getVisibleProperties(record.n, 'node')
        }
      }
      
      // 过滤关系r的属性
      if (record.r && record.r.properties) {
        filteredRecord.r = {
          ...record.r,
          properties: getVisibleProperties(record.r, 'relationship')
        }
      }
      
      // 过滤节点m的属性
      if (record.m && record.m.properties) {
        filteredRecord.m = {
          ...record.m,
          properties: getVisibleProperties(record.m, 'node')
        }
      }
      
      return filteredRecord
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
    if (record.n && record.n.id) {
      // 处理起始节点 n
      const nodeId = record.n.id
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
            color: '#2c3e50', 
            size: 20,
            face: 'Arial, Microsoft YaHei, sans-serif',
            strokeWidth: 2,
            strokeColor: '#ffffff',
            bold: true
          },
          shape: 'circle',
          size: 50,
          borderWidth: 3,
          data: record.n
        })
      }
    }
    
    if (record.m && record.m.id) {
      // 处理目标节点 m
      const nodeId = record.m.id
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
            color: '#2c3e50', 
            size: 20,
            face: 'Arial, Microsoft YaHei, sans-serif',
            strokeWidth: 2,
            strokeColor: '#ffffff',
            bold: true
          },
          shape: 'circle',
          size: 50,
          borderWidth: 3,
          data: record.m
        })
      }
    }
    
    if (record.r && record.r.id) {
      // 处理关系 r
      const relationshipId = record.r.id
      const startId = record.r.start_node_id
      const endId = record.r.end_node_id
      
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

// CRUD操作方法
const editNode = (node) => {
  nodeDialog.currentNodeId = node.id
  nodeDialog.form = {
    labels: [...node.labels],
    properties: Object.entries(node.properties).map(([key, value]) => ({ key, value }))
  }
  nodeDialog.visible = true
}

const addProperty = () => {
  nodeDialog.form.properties.push({ key: '', value: '' })
}

const removeProperty = (index) => {
  nodeDialog.form.properties.splice(index, 1)
}

const saveNode = async () => {
  try {
    await nodeForm.value.validate()
    
    nodeDialog.loading = true
    
    const properties = {}
    nodeDialog.form.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })

    await apiService.updateNode(nodeDialog.currentNodeId, properties)
    ElMessage.success('节点更新成功')
    
    // 重新查询以更新结果
    if (selectedRelType.value) {
      await queryRelationship()
    }
    selectedElement.value = null
    nodeDialog.visible = false
  } catch (error) {
    console.error('保存节点失败:', error)
    ElMessage.error('保存节点失败: ' + error.message)
  } finally {
    nodeDialog.loading = false
  }
}

// 加载可用标签
const loadAvailableLabels = async () => {
  try {
    // 首先尝试加载节点标签映射
    const mappingResponse = await apiService.getLabelMappings('node')
    const nodeMappings = mappingResponse.node_labels || []
    
    if (nodeMappings.length > 0) {
      availableLabels.value = nodeMappings
      
      // 加载每个节点标签的属性权限
      for (const mapping of nodeMappings) {
        await loadPropertyPermissions(mapping.id)
      }
    } else {
      // 如果没有映射数据，使用原始API作为后备
      const response = await apiService.getAllLabels()
      availableLabels.value = (response.labels || []).map(label => ({
        neo4j_name: label,
        display_name: label,
        description: null
      }))
    }
  } catch (error) {
    console.error('加载标签失败:', error)
    // 后备方案
    try {
      const response = await apiService.getAllLabels()
      availableLabels.value = (response.labels || []).map(label => ({
        neo4j_name: label,
        display_name: label,
        description: null
      }))
    } catch (fallbackError) {
      console.error('加载标签失败（后备方案）:', fallbackError)
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

// 检查属性是否可见
const isPropertyVisible = (propertyKey, elementType, elementLabels) => {
  // 对于节点，使用节点的标签
  if (elementType === 'node' && elementLabels && elementLabels.length > 0) {
    // 查找匹配的节点标签映射
    const matchingLabel = availableLabels.value.find(label => 
      elementLabels.includes(label.neo4j_name)
    )
    
    if (matchingLabel && matchingLabel.id && propertyPermissions.value[matchingLabel.id]) {
      const permission = propertyPermissions.value[matchingLabel.id][propertyKey]
      return permission ? permission.can_view : false
    }
  }
  
  // 对于关系，使用关系类型查找对应的标签映射
  if (elementType === 'relationship') {
    const matchingRelType = relationshipTypes.value.find(relType => 
      relType.type === elementLabels
    )
    
    if (matchingRelType && matchingRelType.id && propertyPermissions.value[matchingRelType.id]) {
      const permission = propertyPermissions.value[matchingRelType.id][propertyKey]
      return permission ? permission.can_view : false
    }
  }
  
  return true // 默认可见（兼容没有权限配置的情况）
}

// 获取属性的显示名称
const getPropertyDisplayName = (propertyKey, elementType, elementLabels) => {
  // 对于节点
  if (elementType === 'node' && elementLabels && elementLabels.length > 0) {
    const matchingLabel = availableLabels.value.find(label => 
      elementLabels.includes(label.neo4j_name)
    )
    
    if (matchingLabel && matchingLabel.id && propertyPermissions.value[matchingLabel.id]) {
      const permission = propertyPermissions.value[matchingLabel.id][propertyKey]
      return permission ? permission.display_name || propertyKey : propertyKey
    }
  }
  
  // 对于关系
  if (elementType === 'relationship') {
    const matchingRelType = relationshipTypes.value.find(relType => 
      relType.type === elementLabels
    )
    
    if (matchingRelType && matchingRelType.id && propertyPermissions.value[matchingRelType.id]) {
      const permission = propertyPermissions.value[matchingRelType.id][propertyKey]
      return permission ? permission.display_name || propertyKey : propertyKey
    }
  }
  
  return propertyKey
}

// 获取元素的可见属性
const getVisibleProperties = (element, elementType) => {
  if (!element || !element.properties) {
    return {}
  }
  
  const visibleProps = {}
  const elementLabels = elementType === 'relationship' ? element.type : element.labels
  
  Object.entries(element.properties).forEach(([key, value]) => {
    if (isPropertyVisible(key, elementType, elementLabels)) {
      visibleProps[key] = value
    }
  })
  
  return visibleProps
}

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
    
    // 重新查询以更新结果
    if (selectedRelType.value) {
      await queryRelationship()
    }
    selectedElement.value = null
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error)
      ElMessage.error('删除节点失败: ' + error.message)
    }
  }
}

const editRelationship = async (relationship) => {
  try {
    const { value: newProperties } = await ElMessageBox.prompt(
      '请输入关系的新属性（JSON格式）：',
      '编辑关系',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValue: JSON.stringify(relationship.properties || {}, null, 2)
      }
    )

    let properties
    try {
      properties = JSON.parse(newProperties || '{}')
    } catch (e) {
      ElMessage.error('属性格式不正确，请输入有效的JSON格式')
      return
    }

    await apiService.updateRelationship(relationship.id, properties)
    ElMessage.success('关系更新成功')
    
    // 重新查询以更新结果
    if (selectedRelType.value) {
      await queryRelationship()
    }
    selectedElement.value = null
  } catch (error) {
    if (error !== 'cancel') {
      console.error('编辑关系失败:', error)
      ElMessage.error('编辑关系失败: ' + error.message)
    }
  }
}

const deleteRelationship = async (relationship) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除关系 ${relationship.id} 吗？这个操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await apiService.deleteRelationship(relationship.id)
    ElMessage.success('关系删除成功')
    
    // 重新查询以更新结果
    if (selectedRelType.value) {
      await queryRelationship()
    }
    selectedElement.value = null
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除关系失败:', error)
      ElMessage.error('删除关系失败: ' + error.message)
    }
  }
}

onMounted(() => {
  // 初始化时加载关系类型和可用标签
  loadRelationshipTypes()
  loadAvailableLabels()
})
</script>

<style scoped>
/* 主容器 */
.relationship-query-container {
  width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 关系类型选择区域 */
.relationship-types-section {
  margin-bottom: 24px;
  width: 100%;
  max-width: 1200px;
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
  max-width: 900px;
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

.param-input :deep(.el-input__inner) {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

.param-input :deep(.el-input__inner::placeholder) {
  color: #a0a7b0;
  font-weight: 400;
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

.properties-title,
.operations-title {
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
  margin-bottom: 24px;
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
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

.panel-actions .el-button {
  flex: 1;
  min-width: 100px;
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

/* 节点编辑对话框 */
.properties-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
  background: #f9f9f9;
}

.property-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.property-input-row:last-child {
  margin-bottom: 0;
}
</style>
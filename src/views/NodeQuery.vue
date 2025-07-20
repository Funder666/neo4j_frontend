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
          <div class="input-group">
            <div class="search-input-wrapper">
              <el-input
                v-model="searchQuery"
                placeholder="输入关键词搜索节点..."
                class="search-input"
                size="large"
                :loading="loading"
                @keyup.enter="performSearch"
              >
                <template #prefix>
                  <el-icon class="search-icon"><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <el-button 
              type="primary" 
              class="search-btn"
              @click="performSearch"
              :loading="loading"
              size="large"
            >
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </div>
          
          <div class="search-options">
            <div class="option-group">
              <label class="option-label">节点标签：</label>
              <el-select 
                v-model="selectedLabel" 
                placeholder="选择标签过滤"
                clearable
                class="option-select"
              >
                <el-option label="全部标签" value="" />
                <el-option
                  v-for="label in availableLabels"
                  :key="label"
                  :label="label"
                  :value="label"
                />
              </el-select>
            </div>
            
            <div class="option-group">
              <label class="option-label">结果数量：</label>
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
              <el-icon v-if="showingRelationships"><Share /></el-icon>
              <el-icon v-else><Collection /></el-icon>
              {{ showingRelationships ? '关系图' : '查询结果' }}
            </h3>
            <div class="results-stats">
              <span class="result-count">{{ showingRelationships ? (relationshipData?.relationships?.length || 0) : results.length }}</span>
              <span class="result-text">{{ showingRelationships ? '个关系' : '个节点' }}</span>
            </div>
          </div>
          <div class="results-actions">
            <el-button 
              v-if="showingRelationships"
              type="warning" 
              class="action-btn"
              @click="backToSearchResults"
            >
              <el-icon><RefreshRight /></el-icon>
              返回搜索结果
            </el-button>
            <el-button 
              v-if="isAdmin && !showingRelationships"
              type="success" 
              class="action-btn"
              @click="showCreateNodeDialog"
            >
              <el-icon><Plus /></el-icon>
              创建节点
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
        <div class="graph-view">
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
              
              <!-- 节点操作按钮 -->
              <div class="panel-actions">
                <el-button 
                  type="success" 
                  class="action-btn"
                  @click="showNodeRelationships(selectedNode)"
                >
                  <el-icon><Share /></el-icon>
                  查看关系
                </el-button>
                <div v-if="isAdmin" class="admin-actions">
                  <el-button 
                    type="primary" 
                    class="action-btn"
                    @click="editNode(selectedNode)"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑节点
                  </el-button>
                  <el-button 
                    type="danger" 
                    class="action-btn"
                    @click="deleteNode(selectedNode)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除节点
                  </el-button>
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

    <!-- 创建/编辑节点对话框 -->
    <el-dialog
      v-model="nodeDialog.visible"
      :title="nodeDialog.mode === 'create' ? '创建节点' : '编辑节点'"
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
            {{ nodeDialog.mode === 'create' ? '创建' : '保存' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  RefreshRight, 
  Collection, 
  Download, 
  InfoFilled, 
  Close,
  HomeFilled,
  Plus,
  Edit,
  Delete,
  Share
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import authService from '../services/auth'
import AppLayout from '../components/AppLayout.vue'
import { Network } from 'vis-network'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const searched = ref(false)
const searchQuery = ref('')
const selectedLabel = ref('')
const limit = ref(50)
const results = ref([])
const selectedNode = ref(null)
const availableLabels = ref([])
const networkContainer = ref(null)
const network = ref(null)
const showingRelationships = ref(false)
const relationshipData = ref(null)

// 权限控制
const currentUser = computed(() => authService.getCurrentUser())
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 节点编辑对话框
const nodeDialog = reactive({
  visible: false,
  mode: 'create', // 'create' | 'edit'
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

// 方法
const goHome = () => {
  router.push('/dashboard')
}

const clearResults = () => {
  results.value = []
  searched.value = false
  searchQuery.value = ''
  selectedNode.value = null
  showingRelationships.value = false
  relationshipData.value = null
  if (network.value) {
    network.value.destroy()
    network.value = null
  }
}

const performSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  loading.value = true
  searched.value = true

  try {
    const response = await apiService.searchNodes(
      searchQuery.value.trim(),
      selectedLabel.value || null,
      limit.value
    )
    
    results.value = response.nodes || []
    
    if (results.value.length === 0) {
      ElMessage.info('未找到匹配的节点')
    } else {
      ElMessage.success(`找到 ${results.value.length} 个节点`)
      // 创建图形可视化
      setTimeout(() => {
        createNetwork()
      }, 100)
    }
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const createNetwork = () => {
  if (!networkContainer.value || !results.value.length) return

  // 清理旧的网络
  if (network.value) {
    network.value.destroy()
  }

  // 调试：打印数据结构
  console.log('Results data structure:', results.value[0])

  const nodes = results.value.map(record => {
    // 从record中提取实际的节点数据
    const node = record.n || record;
    return {
      id: node.id,
      label: (node.properties && node.properties.name) || (node.properties && node.properties.value ? node.properties.value.trim() : '') || `${node.id}`,
      group: (node.labels && node.labels[0]) || 'Unknown',
      title: `ID: ${node.id}\n标签: ${node.labels ? node.labels.join(', ') : 'Unknown'}\n属性: ${node.properties ? Object.keys(node.properties).length : 0} 个`,
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
      data: node // 存储实际的节点数据
    }
  })

  const data = {
    nodes: nodes,
    edges: [] // 节点查询不显示边
  }

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
        strokeColor: '#ffffff',
        bold: true
      },
      chosen: {
        node: (values, id, selected, hovering) => {
          values.shadow = true
          values.shadowSize = 15
          values.borderWidth = 4
        }
      }
    },
    interaction: {
      hover: true,
      selectConnectedEdges: false,
      tooltipDelay: 300
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 100 },
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 120,
        springConstant: 0.04,
        damping: 0.09
      }
    }
  }

  network.value = new Network(networkContainer.value, data, options)

  // 监听节点选择事件
  network.value.on('selectNode', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const record = results.value.find(record => {
        const node = record.n || record;
        return node.id === nodeId
      })
      if (record) {
        selectedNode.value = record.n || record
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

const darkenColor = (color, factor) => {
  return color // 简化实现
}

const exportResults = () => {
  const dataStr = JSON.stringify(results.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `node_search_results_${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// CRUD操作
const showCreateNodeDialog = () => {
  nodeDialog.mode = 'create'
  nodeDialog.form = {
    labels: [],
    properties: [{ key: 'name', value: '' }]
  }
  nodeDialog.visible = true
}

const editNode = (node) => {
  nodeDialog.mode = 'edit'
  nodeDialog.currentNodeId = node.id
  nodeDialog.form = {
    labels: [...node.labels],
    properties: Object.entries(node.properties).map(([key, value]) => ({ key, value }))
  }
  nodeDialog.visible = true
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
    
    // 从结果中移除被删除的节点
    results.value = results.value.filter(record => {
      const n = record.n || record
      return n.id !== node.id
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

    if (nodeDialog.mode === 'create') {
      await apiService.createNode(nodeDialog.form.labels, properties)
      ElMessage.success('节点创建成功')
    } else {
      await apiService.updateNode(nodeDialog.currentNodeId, properties)
      ElMessage.success('节点更新成功')
      
      // 更新本地数据
      const record = results.value.find(record => {
        const node = record.n || record
        return node.id === nodeDialog.currentNodeId
      })
      if (record) {
        const node = record.n || record
        node.properties = properties
        node.labels = nodeDialog.form.labels
        
        // 立即重新创建网络图以显示更新
        createNetwork()
        
        // 如果当前选中的是被编辑的节点，更新选中状态
        if (selectedNode.value && selectedNode.value.id === nodeDialog.currentNodeId) {
          selectedNode.value = node
        }
      }
    }
    
    nodeDialog.visible = false
    
    // 如果是创建模式，重新搜索以显示新节点
    if (nodeDialog.mode === 'create' && searchQuery.value) {
      await performSearch()
    } else if (nodeDialog.mode === 'edit') {
      createNetwork() // 重新创建网络图
    }
  } catch (error) {
    console.error('保存节点失败:', error)
    ElMessage.error('保存节点失败: ' + error.message)
  } finally {
    nodeDialog.loading = false
  }
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
    
    // 设置关系数据并切换显示模式
    relationshipData.value = { relationships }
    showingRelationships.value = true
    
    // 创建关系图
    setTimeout(() => {
      createRelationshipNetwork(node, relationships)
    }, 100)
    
    ElMessage.success(`找到 ${relationships.length} 个关系`)
  } catch (error) {
    console.error('获取节点关系失败:', error)
    ElMessage.error('获取节点关系失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 创建关系网络图
const createRelationshipNetwork = (centerNode, relationships) => {
  if (!networkContainer.value) return

  console.log('Creating relationship network with:', {
    centerNode,
    relationships,
    relationshipsLength: relationships.length
  })

  // 清理旧的网络
  if (network.value) {
    network.value.destroy()
  }

  // 构建节点和边数据
  const nodes = new Map()
  const edges = []

  // 添加中心节点
  nodes.set(centerNode.id, {
    id: centerNode.id,
    label: (centerNode.properties && centerNode.properties.name) || 
           (centerNode.properties && centerNode.properties.value ? centerNode.properties.value.trim() : '') || 
           `节点 ${centerNode.id}`,
    group: (centerNode.labels && centerNode.labels[0]) || 'Unknown',
    title: `ID: ${centerNode.id}\n标签: ${centerNode.labels ? centerNode.labels.join(', ') : 'Unknown'}\n属性: ${centerNode.properties ? Object.keys(centerNode.properties).length : 0} 个`,
    color: {
      background: '#FF6B6B', // 中心节点使用特殊颜色
      border: '#E55654'
    },
    font: { 
      color: '#2c3e50', 
      size: 24, // 中心节点更大
      face: 'Arial, sans-serif',
      strokeWidth: 2,
      strokeColor: '#ffffff',
      bold: true
    },
    shape: 'circle',
    size: 80, // 中心节点更大
    data: centerNode,
    borderWidth: 4
  })

  // 处理关系并添加相关节点 - 根据RelationshipQuery.vue的数据结构
  relationships.forEach((record, index) => {
    console.log('Processing relationship record:', record)
    
    // 检查record的结构，API可能返回类似 {n, r, m} 的格式
    let startNode, relationship, endNode
    
    if (record.n && record.r && record.m) {
      // 如果是 {n, r, m} 格式
      startNode = record.n
      relationship = record.r
      endNode = record.m
    } else if (record.start_node && record.relationship && record.end_node) {
      // 如果是 {start_node, relationship, end_node} 格式
      startNode = record.start_node
      relationship = record.relationship
      endNode = record.end_node
    } else {
      // 直接的关系对象格式，可能包含完整的节点信息
      console.log('Processing direct relationship format:', record)
      
      // 尝试从关系对象中提取信息
      if (record.type && (record.start_node_id || record.end_node_id)) {
        relationship = record
        // 如果有完整的节点数据，使用它们
        if (record.start_node) {
          startNode = record.start_node
        }
        if (record.end_node) {
          endNode = record.end_node
        }
        // 如果没有完整节点数据，可能需要从其他地方获取
        if (!startNode || !endNode) {
          console.log('Missing node data in relationship:', record)
          return
        }
      } else {
        console.log('Unsupported relationship format:', record)
        return
      }
    }

    // 添加起始节点（如果不存在）
    if (startNode && startNode.id && !nodes.has(startNode.id)) {
      const nodeLabel = (startNode.properties && startNode.properties.name) || 
                       (startNode.properties && startNode.properties.value) || 
                       `节点 ${startNode.id}`
      nodes.set(startNode.id, {
        id: startNode.id,
        label: nodeLabel,
        group: (startNode.labels && startNode.labels[0]) || 'Unknown',
        title: `ID: ${startNode.id}\n标签: ${startNode.labels ? startNode.labels.join(', ') : 'Unknown'}\n属性: ${startNode.properties ? Object.keys(startNode.properties).length : 0} 个`,
        color: {
          background: getNodeColor((startNode.labels && startNode.labels[0]) || 'Default'),
          border: darkenColor(getNodeColor((startNode.labels && startNode.labels[0]) || 'Default'), 0.3)
        },
        font: { 
          color: '#2c3e50', 
          size: 18, 
          face: 'Arial, sans-serif',
          strokeWidth: 2,
          strokeColor: '#ffffff'
        },
        shape: 'circle',
        size: 50,
        data: startNode
      })
    }

    // 添加结束节点（如果不存在）
    if (endNode && endNode.id && !nodes.has(endNode.id)) {
      const nodeLabel = (endNode.properties && endNode.properties.name) || 
                       (endNode.properties && endNode.properties.value) || 
                       `节点 ${endNode.id}`
      nodes.set(endNode.id, {
        id: endNode.id,
        label: nodeLabel,
        group: (endNode.labels && endNode.labels[0]) || 'Unknown',
        title: `ID: ${endNode.id}\n标签: ${endNode.labels ? endNode.labels.join(', ') : 'Unknown'}\n属性: ${endNode.properties ? Object.keys(endNode.properties).length : 0} 个`,
        color: {
          background: getNodeColor((endNode.labels && endNode.labels[0]) || 'Default'),
          border: darkenColor(getNodeColor((endNode.labels && endNode.labels[0]) || 'Default'), 0.3)
        },
        font: { 
          color: '#2c3e50', 
          size: 18, 
          face: 'Arial, sans-serif',
          strokeWidth: 2,
          strokeColor: '#ffffff'
        },
        shape: 'circle',
        size: 50,
        data: endNode
      })
    }

    // 添加边
    if (relationship && startNode && endNode) {
      edges.push({
        id: relationship.id || `edge_${index}`,
        from: startNode.id,
        to: endNode.id,
        label: relationship.type,
        title: `关系类型: ${relationship.type}\n属性: ${relationship.properties ? JSON.stringify(relationship.properties) : '无'}`,
        color: {
          color: '#667eea',
          highlight: '#764ba2'
        },
        font: {
          color: '#2c3e50',
          size: 14,
          strokeWidth: 2,
          strokeColor: '#ffffff'
        },
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 1.2
          }
        },
        smooth: {
          enabled: true,
          type: 'dynamic',
          roundness: 0.2
        },
        width: 2,
        data: relationship
      })
    }
  })

  const data = {
    nodes: Array.from(nodes.values()),
    edges: edges
  }

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
        size: 18,
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
        to: { enabled: true, scaleFactor: 1.2 }
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
      }
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
  network.value.on('selectNode', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const nodeData = nodes.get(nodeId)
      if (nodeData) {
        selectedNode.value = nodeData.data
      }
    }
  })

  // 监听空白区域点击
  network.value.on('deselectNode', () => {
    selectedNode.value = null
  })
}

// 返回搜索结果
const backToSearchResults = () => {
  showingRelationships.value = false
  relationshipData.value = null
  selectedNode.value = null
  
  // 重新创建原始搜索结果的网络图
  setTimeout(() => {
    createNetwork()
  }, 100)
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

// 加载可用标签
const loadAvailableLabels = async () => {
  try {
    const response = await apiService.getAllLabels()
    availableLabels.value = response.labels || []
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

onMounted(() => {
  loadAvailableLabels()
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

.input-group {
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 12px;
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
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.search-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.search-options {
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

/* 管理员操作按钮 */
.panel-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.panel-actions .action-btn {
  flex: 1;
  min-width: 100px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .node-query-container {
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
  
  .search-options {
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
  
  .node-info-panel {
    width: 100%;
    position: relative;
    border-left: none;
    border-top: 1px solid #e8ecf0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .graph-view {
    min-height: 500px;
  }
  
  .network-container {
    height: 500px;
  }
}
</style>
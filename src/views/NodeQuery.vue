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
      <!-- 节点标签选择区域 -->
      <div class="node-labels-section">
        <div class="labels-card">
          <div class="labels-header">
            <h3 class="section-title">
              <el-icon><Collection /></el-icon>
              节点标签
            </h3>
            <p class="section-subtitle">点击节点标签查看相关节点</p>
          </div>
          
          <div class="labels-content">
            <div v-if="availableLabels.length > 0" class="labels-grid">
              <div 
                v-for="label in availableLabels"
                :key="label.neo4j_name"
                class="label-card"
                :class="{ active: selectedLabel === label.neo4j_name }"
                @click="selectLabel(label.neo4j_name)"
              >
                <div class="label-header">
                  <div class="label-name">{{ label.display_name || label.neo4j_name }}</div>
                  <div class="label-count">{{ label.count }} 个节点</div>
                </div>
                <div class="label-description">
                  {{ label.description || `点击查看 ${label.display_name || label.neo4j_name} 类型的所有节点` }}
                </div>
              </div>
            </div>
            
            <div v-else-if="loadingLabels" class="loading-labels">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在加载节点标签...</span>
            </div>
            
            <div v-else class="no-labels">
              <el-empty description="暂无节点数据">
                <template #image>
                  <div class="empty-icon">
                    <el-icon><Collection /></el-icon>
                  </div>
                </template>
              </el-empty>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 查询参数设置 -->
      <div class="query-params-section" v-if="selectedLabel">
        <div class="params-card">
          <div class="params-header">
            <h3 class="section-title">
              <el-icon><Setting /></el-icon>
              查询参数
            </h3>
            <p class="section-subtitle">设置 {{ selectedLabelDisplayName }} 节点的查询参数（留空关键词将加载前{{ limit }}个节点）</p>
          </div>
          
          <div class="params-form">
            <div class="param-group">
              <div class="param-label">
                <el-icon><Search /></el-icon>
                关键词搜索（可选）
              </div>
              <el-input
                v-model="searchQuery"
                placeholder="输入关键词搜索节点..."
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
                v-model="limit"
                :min="1"
                :max="1000"
                :step="10"
                :precision="0"
                class="param-input"
              />
            </div>
            
            <div class="param-actions">
              <el-button 
                type="primary"
                size="large"
                @click="performSearch"
                :loading="loading"
                class="query-btn"
              >
                <el-icon><Search /></el-icon>
                {{ searchQuery.trim() ? '查询节点' : '加载节点' }}
                <span v-if="searchQuery.trim()">(按关键词过滤)</span>
                <span v-else>(前{{ limit }}个)</span>
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
              v-if="canCreateNode() && !showingRelationships"
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
          
          <!-- 关系类型图例 - 仅在显示关系时显示 -->
          <div v-if="showingRelationships" class="relationship-legend">
            <div class="legend-header">
              <h4 class="legend-title">
                <el-icon><InfoFilled /></el-icon>
                关系类型图例
              </h4>
            </div>
            <div class="legend-content">
              <div 
                v-for="(relationshipType, index) in getUniqueRelationshipTypes()"
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
                      <el-icon><Edit /></el-icon>
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
              :key="label.neo4j_name"
              :label="label.display_name"
              :value="label.neo4j_name"
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
  Share,
  Setting,
  DataLine,
  Loading
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import authService from '../services/auth'
import AppLayout from '../components/AppLayout.vue'
import { Network } from 'vis-network'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const loadingLabels = ref(true)
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
const propertyPermissions = ref({})

// 权限控制
const currentUser = computed(() => authService.getCurrentUser())
const isAdmin = computed(() => currentUser.value?.role === 'admin')

// 计算选中标签的显示名称
const selectedLabelDisplayName = computed(() => {
  if (!selectedLabel.value) return ''
  const label = availableLabels.value.find(l => l.neo4j_name === selectedLabel.value)
  return label ? (label.display_name || label.neo4j_name) : selectedLabel.value
})

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

// 选择标签
const selectLabel = (labelName) => {
  selectedLabel.value = labelName
  // 清空之前的结果
  clearResults()
}

const clearResults = () => {
  results.value = []
  searched.value = false
  selectedNode.value = null
  showingRelationships.value = false
  relationshipData.value = null
  if (network.value) {
    network.value.destroy()
    network.value = null
  }
}

const performSearch = async () => {
  if (!selectedLabel.value) {
    ElMessage.warning('请选择节点标签')
    return
  }

  loading.value = true
  searched.value = true

  try {
    let response
    // 如果有搜索关键词，使用搜索API，否则使用获取节点API
    if (searchQuery.value.trim()) {
      response = await apiService.searchNodes(
        searchQuery.value.trim(),
        selectedLabel.value,
        limit.value
      )
    } else {
      // 没有搜索关键词时，获取指定标签的前50个节点
      response = await apiService.getNodes(limit.value, selectedLabel.value)
    }
    
    results.value = response.nodes || []
    
    if (results.value.length === 0) {
      ElMessage.info('未找到匹配的节点')
    } else {
      const message = searchQuery.value.trim() 
        ? `找到 ${results.value.length} 个匹配节点`
        : `加载了 ${results.value.length} 个节点`
      ElMessage.success(message)
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

// 关系类型颜色映射 - 增强版本，使用更鲜明的颜色
const getRelationshipColor = (relationshipType) => {
  const colors = {
    // 原有的关系类型
    'HAS_PINYIN': '#E74C3C',        // 鲜艳红色 - 汉字与拼音
    'HAS_RADICAL': '#17A2B8',       // 鲜艳青色 - 汉字与部首
    'SYNONYM': '#007BFF',           // 鲜艳蓝色 - 近义词
    'ANTONYM': '#28A745',           // 鲜艳绿色 - 反义词
    'DEPENDS_ON': '#FFC107',        // 鲜艳黄色 - 学习依赖
    'CONTAINS': '#6F42C1',          // 鲜艳紫色 - 包含关系
    'RELATES_TO': '#FD7E14',        // 鲜艳橙色 - 相关关系
    
    // 实际数据库中的关系类型
    'NEAR_SYNONYMOUS_WITH': '#007BFF',    // 鲜艳蓝色 - 近义词关系
    'ANTITHESIS_WITH': '#28A745',         // 鲜艳绿色 - 反义词关系
    'COMPOSITION_COMPONENT': '#6F42C1',   // 鲜艳紫色 - 组成部分关系
    'HYPERNYM_OF': '#DC3545',             // 红色 - 上位词关系
    'HYPONYM_OF': '#FD7E14',              // 橙色 - 下位词关系
    'MERONYM_OF': '#20C997',              // 青绿色 - 部分关系
    'HOLONYM_OF': '#6610F2',              // 靛蓝色 - 整体关系
    'SIMILAR_TO': '#17A2B8',              // 青色 - 相似关系
    'RELATED_TO': '#FFC107',              // 黄色 - 相关关系
    'DERIVES_FROM': '#E83E8C',            // 粉色 - 派生关系
    'LEADS_TO': '#FD7E14',                // 橙色 - 导致关系
    
    'default': '#6C757D'            // 灰色 - 默认
  }
  return colors[relationshipType] || colors.default
}

// 关系类型高亮颜色
const getRelationshipHighlightColor = (relationshipType) => {
  const highlightColors = {
    // 原有的关系类型
    'HAS_PINYIN': '#C82333',        // 更深红色
    'HAS_RADICAL': '#138496',       // 更深青色
    'SYNONYM': '#0056B3',           // 更深蓝色
    'ANTONYM': '#1E7E34',           // 更深绿色
    'DEPENDS_ON': '#E0A800',        // 更深黄色
    'CONTAINS': '#59359A',          // 更深紫色
    'RELATES_TO': '#E8590C',        // 更深橙色
    
    // 实际数据库中的关系类型
    'NEAR_SYNONYMOUS_WITH': '#0056B3',    // 更深蓝色 - 近义词关系
    'ANTITHESIS_WITH': '#1E7E34',         // 更深绿色 - 反义词关系
    'COMPOSITION_COMPONENT': '#59359A',   // 更深紫色 - 组成部分关系
    'HYPERNYM_OF': '#B02A37',             // 更深红色 - 上位词关系
    'HYPONYM_OF': '#E8590C',              // 更深橙色 - 下位词关系
    'MERONYM_OF': '#1AA085',              // 更深青绿色 - 部分关系
    'HOLONYM_OF': '#520DC2',              // 更深靛蓝色 - 整体关系
    'SIMILAR_TO': '#138496',              // 更深青色 - 相似关系
    'RELATED_TO': '#E0A800',              // 更深黄色 - 相关关系
    'DERIVES_FROM': '#D1326B',            // 更深粉色 - 派生关系
    'LEADS_TO': '#E8590C',                // 更深橙色 - 导致关系
    
    'default': '#495057'            // 更深灰色
  }
  return highlightColors[relationshipType] || highlightColors.default
}

// 获取关系类型的线条样式
const getRelationshipLineStyle = (relationshipType) => {
  const lineStyles = {
    // 原有的关系类型
    'HAS_PINYIN': { dashes: false, width: 3 },       // 实线，较粗
    'HAS_RADICAL': { dashes: [5, 5], width: 3 },     // 虚线
    'SYNONYM': { dashes: false, width: 4 },          // 实线，更粗（重要关系）
    'ANTONYM': { dashes: [10, 5], width: 4 },        // 长虚线，更粗（重要关系）
    'DEPENDS_ON': { dashes: [2, 3], width: 2 },      // 点线
    'CONTAINS': { dashes: [15, 3, 3, 3], width: 2 }, // 点划线
    'RELATES_TO': { dashes: [8, 3], width: 2 },      // 短虚线
    
    // 实际数据库中的关系类型
    'NEAR_SYNONYMOUS_WITH': { dashes: false, width: 4 },        // 实线，更粗（重要关系）
    'ANTITHESIS_WITH': { dashes: [10, 5], width: 4 },          // 长虚线，更粗（重要关系）
    'COMPOSITION_COMPONENT': { dashes: [15, 3, 3, 3], width: 3 }, // 点划线
    'HYPERNYM_OF': { dashes: false, width: 3 },                // 实线，较粗
    'HYPONYM_OF': { dashes: [8, 3], width: 3 },                // 短虚线，较粗
    'MERONYM_OF': { dashes: [5, 5], width: 2 },                // 虚线
    'HOLONYM_OF': { dashes: [12, 4], width: 2 },               // 长虚线
    'SIMILAR_TO': { dashes: [3, 3], width: 2 },                // 短虚线
    'RELATED_TO': { dashes: [2, 3], width: 2 },                // 点线
    'DERIVES_FROM': { dashes: [6, 2, 2, 2], width: 2 },        // 点划线
    'LEADS_TO': { dashes: [8, 4], width: 2 },                  // 中虚线
    
    'default': { dashes: false, width: 2 }           // 默认实线
  }
  return lineStyles[relationshipType] || lineStyles.default
}

// 获取关系类型的箭头样式
const getRelationshipArrowStyle = (relationshipType) => {
  const arrowStyles = {
    // 原有的关系类型
    'HAS_PINYIN': { type: 'arrow', scaleFactor: 1.5 },
    'HAS_RADICAL': { type: 'triangle', scaleFactor: 1.3 },
    'SYNONYM': { type: 'arrow', scaleFactor: 1.8 },      // 近义词用更大箭头
    'ANTONYM': { type: 'triangle', scaleFactor: 1.8 },   // 反义词用三角形大箭头
    'DEPENDS_ON': { type: 'arrow', scaleFactor: 1.2 },   
    'CONTAINS': { type: 'triangle', scaleFactor: 1.4 },  
    'RELATES_TO': { type: 'arrow', scaleFactor: 1.3 },   
    
    // 实际数据库中的关系类型
    'NEAR_SYNONYMOUS_WITH': { type: 'arrow', scaleFactor: 1.8 },     // 近义词用更大箭头
    'ANTITHESIS_WITH': { type: 'triangle', scaleFactor: 1.8 },       // 反义词用三角形大箭头
    'COMPOSITION_COMPONENT': { type: 'triangle', scaleFactor: 1.4 },  // 组成关系用三角形
    'HYPERNYM_OF': { type: 'arrow', scaleFactor: 1.6 },             // 上位词用大箭头
    'HYPONYM_OF': { type: 'arrow', scaleFactor: 1.4 },              // 下位词用中等箭头
    'MERONYM_OF': { type: 'triangle', scaleFactor: 1.3 },           // 部分关系用三角形
    'HOLONYM_OF': { type: 'triangle', scaleFactor: 1.5 },           // 整体关系用大三角形
    'SIMILAR_TO': { type: 'arrow', scaleFactor: 1.3 },              // 相似关系用中等箭头
    'RELATED_TO': { type: 'arrow', scaleFactor: 1.2 },              // 相关关系用小箭头
    'DERIVES_FROM': { type: 'arrow', scaleFactor: 1.4 },            // 派生关系用中等箭头
    'LEADS_TO': { type: 'arrow', scaleFactor: 1.5 },                // 导致关系用大箭头
    
    'default': { type: 'arrow', scaleFactor: 1.2 }
  }
  return arrowStyles[relationshipType] || arrowStyles.default
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
      strokeColor: '#ffffff'
    },
    shape: 'circle',
    size: 80, // 中心节点更大
    data: centerNode,
    borderWidth: 4
  })

  // 处理关系并添加相关节点 - 根据RelationshipQuery.vue的数据结构
  console.log('All relationships to process:', relationships)
  relationships.forEach((record, index) => {
    console.log('Processing relationship record:', index, record)
    
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
    console.log('Checking edge creation conditions:', {
      hasRelationship: !!relationship,
      hasStartNode: !!startNode,
      hasEndNode: !!endNode,
      relationshipType: relationship?.type
    })
    
    if (relationship && startNode && endNode) {
      const edgeColor = getRelationshipColor(relationship.type)
      const highlightColor = getRelationshipHighlightColor(relationship.type)
      const lineStyle = getRelationshipLineStyle(relationship.type)
      const arrowStyle = getRelationshipArrowStyle(relationship.type)
      console.log(`Setting edge style for ${relationship.type}: color=${edgeColor}, line=${JSON.stringify(lineStyle)}, arrow=${JSON.stringify(arrowStyle)}`)
      
      edges.push({
        id: relationship.id || `edge_${index}`,
        from: startNode.id,
        to: endNode.id,
        label: relationship.type,
        title: `关系类型: ${relationship.type}\n属性: ${relationship.properties ? JSON.stringify(relationship.properties) : '无'}`,
        color: {
          color: edgeColor,
          highlight: highlightColor,
          opacity: 0.8
        },
        font: {
          color: edgeColor,  // 让标签颜色与边保持一致
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
  loadingLabels.value = true
  try {
    // 首先尝试使用新的标签映射API
    const mappingResponse = await apiService.getLabelMappings('node')
    const nodeMappings = mappingResponse.node_labels || []
    
    if (nodeMappings.length > 0) {
      // 使用映射数据，但需要获取计数信息
      try {
        // 使用新的节点类型API获取数量
        const nodeTypesResponse = await apiService.getNodeTypes()
        const countMap = {}
        if (nodeTypesResponse.node_types) {
          nodeTypesResponse.node_types.forEach(item => {
            countMap[item.label] = item.count
          })
        }
        
        availableLabels.value = nodeMappings.map(mapping => ({
          id: mapping.id,
          neo4j_name: mapping.neo4j_name,
          display_name: mapping.display_name,
          count: countMap[mapping.neo4j_name] || 0,
          description: mapping.description
        }))
        
        // 同时加载每个节点标签的属性权限
        for (const mapping of nodeMappings) {
          await loadPropertyPermissions(mapping.id)
        }
      } catch (countError) {
        console.error('获取节点数量失败，尝试使用旧接口:', countError)
        // 如果新接口失败，尝试使用旧的labels接口
        try {
          const countResponse = await apiService.getAllLabels()
          const countMap = {}
          if (countResponse.labels_with_counts) {
            countResponse.labels_with_counts.forEach(item => {
              countMap[item.label] = item.count
            })
          }
          
          availableLabels.value = nodeMappings.map(mapping => ({
            id: mapping.id,
            neo4j_name: mapping.neo4j_name,
            display_name: mapping.display_name,
            count: countMap[mapping.neo4j_name] || 0,
            description: mapping.description
          }))
        } catch (fallbackError) {
          // 如果获取计数失败，使用映射数据但不显示计数
          availableLabels.value = nodeMappings.map(mapping => ({
            id: mapping.id,
            neo4j_name: mapping.neo4j_name,
            display_name: mapping.display_name,
            count: 0,
            description: mapping.description
          }))
        }
        
        // 即使计数失败，也要加载属性权限
        for (const mapping of nodeMappings) {
          await loadPropertyPermissions(mapping.id)
        }
      }
    } else {
      // 如果没有映射数据，直接使用节点类型API
      try {
        const nodeTypesResponse = await apiService.getNodeTypes()
        if (nodeTypesResponse.node_types) {
          availableLabels.value = nodeTypesResponse.node_types.map(item => ({
            neo4j_name: item.label,
            display_name: item.label,
            count: item.count,
            description: null
          }))
        } else {
          throw new Error('节点类型数据为空')
        }
      } catch (nodeTypesError) {
        console.error('获取节点类型失败，使用原始API:', nodeTypesError)
        // 后备方案：使用原始API
        const response = await apiService.getAllLabels()
        if (response.labels_with_counts) {
          availableLabels.value = response.labels_with_counts.map(item => ({
            neo4j_name: item.label,
            display_name: item.label,
            count: item.count,
            description: null
          }))
        } else {
          availableLabels.value = (response.labels || []).map(label => ({
            neo4j_name: label,
            display_name: label,
            count: 0,
            description: null
          }))
        }
      }
    }
    
    ElMessage.success(`加载了 ${availableLabels.value.length} 种节点标签`)
  } catch (error) {
    console.error('加载节点标签失败:', error)
    ElMessage.error('加载节点标签失败')
    availableLabels.value = []
  } finally {
    loadingLabels.value = false
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
    return permission ? permission.can_view : false
  }
  
  return true // 如果没有找到匹配的标签映射，默认可见（兼容旧数据）
}

// 获取属性的显示名称
const getPropertyDisplayName = (propertyKey, nodeLabels) => {
  if (!nodeLabels || nodeLabels.length === 0) {
    return propertyKey
  }
  
  // 查找匹配的标签映射
  const matchingLabel = availableLabels.value.find(label => 
    nodeLabels.includes(label.neo4j_name)
  )
  
  if (matchingLabel && propertyPermissions.value[matchingLabel.id]) {
    const permission = propertyPermissions.value[matchingLabel.id][propertyKey]
    return permission ? permission.display_name || propertyKey : propertyKey
  }
  
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

// 检查用户是否有创建节点的权限
const canCreateNode = () => {
  // 管理员拥有所有权限
  if (isAdmin.value) {
    return true
  }
  
  // 检查用户是否对任何标签有创建权限
  for (const label of availableLabels.value) {
    if (propertyPermissions.value[label.id]) {
      const permissions = propertyPermissions.value[label.id]
      const firstProperty = Object.values(permissions)[0]
      if (firstProperty && firstProperty.can_edit) {
        return true
      }
    }
  }
  
  return false
}

// 获取当前关系图中的唯一关系类型
const getUniqueRelationshipTypes = () => {
  if (!relationshipData.value || !relationshipData.value.relationships) {
    return []
  }
  
  const types = new Set()
  relationshipData.value.relationships.forEach(record => {
    let relationshipType = null
    
    // 处理不同的数据结构
    if (record.r && record.r.type) {
      relationshipType = record.r.type
    } else if (record.relationship && record.relationship.type) {
      relationshipType = record.relationship.type
    } else if (record.type) {
      relationshipType = record.type
    }
    
    if (relationshipType) {
      types.add(relationshipType)
    }
  })
  
  return Array.from(types).sort()
}

// 获取关系类型的显示名称
const getRelationshipDisplayName = (relationshipType) => {
  const displayNames = {
    // 原有的关系类型
    'HAS_PINYIN': '拼音关系',
    'HAS_RADICAL': '部首关系',
    'SYNONYM': '近义词',
    'ANTONYM': '反义词',
    'DEPENDS_ON': '学习依赖',
    'CONTAINS': '包含关系',
    'RELATES_TO': '相关关系',
    
    // 实际数据库中的关系类型
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

// 获取图例线条样式
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

/* 节点标签选择区域 */
.node-labels-section {
  margin-bottom: 24px;
  width: 100%;
  max-width: 1200px;
}

.labels-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.labels-header {
  margin-bottom: 24px;
  text-align: center;
}

.labels-content {
  width: 100%;
}

.labels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.label-card {
  background: rgba(248, 250, 252, 0.8);
  border: 2px solid #e8ecf0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.label-card:hover {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
}

.label-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.label-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.label-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.label-count {
  font-size: 14px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.label-description {
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
}

.loading-labels {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #7f8c8d;
}

.no-labels {
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

/* 关系类型图例 */
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
  
  .labels-grid {
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
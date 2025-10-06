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
            <p class="section-subtitle">{{ isGuest ? '新标准等级下的关系类型' : '选择查询模式并点击关系类型查看相关连接' }}</p>
          </div>

          <!-- 查询模式选择 - guest用户不显示 -->
          <div v-if="!isGuest" class="query-mode-selector">
            <el-radio-group v-model="queryMode" @change="onModeChange" class="mode-group">
              <el-radio-button label="general">
                <el-icon><Share /></el-icon>
                通用模式
              </el-radio-button>
              <el-radio-button label="new-standard">
                <el-icon><Star /></el-icon>
                国际中文教育标准模式
              </el-radio-button>
            </el-radio-group>
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
                v-if="isAdmin && selectedRelType"
                type="success" 
                class="action-btn"
                @click="showCreateRelationshipDialog"
              >
                <el-icon><Plus /></el-icon>
                新增关系
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
              <p class="empty-subtitle">未找到 {{ selectedRelTypeDisplayName }} 类型的关系，您可以创建一个新关系</p>
            </template>
            <div class="empty-actions">
              <el-button type="primary" @click="clearResults">
                重新查询
              </el-button>
              <el-button 
                v-if="isAdmin && selectedRelType"
                type="success" 
                @click="showCreateRelationshipDialog"
              >
                <el-icon><Plus /></el-icon>
                创建 {{ selectedRelTypeDisplayName }} 关系
              </el-button>
            </div>
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

    <!-- 创建关系对话框 -->
    <el-dialog
      v-model="relationshipDialog.visible"
      title="创建新关系"
      width="700px"
      class="relationship-dialog"
    >
      <el-form
        ref="relationshipForm"
        :model="relationshipDialog.form"
        :rules="relationshipDialog.rules"
        label-width="120px"
      >
        <el-form-item label="起始节点" prop="startNode">
          <el-select
            v-model="relationshipDialog.form.startNode"
            filterable
            remote
            reserve-keyword
            :placeholder="getNodePlaceholder('start')"
            :remote-method="handleStartNodeSearch"
            :loading="startNodeLoading"
            allow-create
            default-first-option
            style="width: 100%"
          >
            <el-option
              v-for="node in startNodeOptions"
              :key="node.id"
              :label="node.label"
              :value="node.id"
            >
              <span style="float: left">{{ node.label }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">ID: {{ node.id }}</span>
            </el-option>
            <template #empty>
              <div class="select-empty">
                <p>未找到匹配节点</p>
                <p style="font-size: 12px; color: #8492a6;">{{ getSearchHint() }}</p>
              </div>
            </template>
          </el-select>
        </el-form-item>

        <el-form-item label="关系类型" prop="relationshipType">
          <el-select
            v-model="relationshipDialog.form.relationshipType"
            placeholder="选择关系类型"
            style="width: 100%"
          >
            <el-option
              v-for="relType in relationshipTypes"
              :key="relType.type"
              :label="relType.display_name || relType.type"
              :value="relType.type"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="结束节点" prop="endNode">
          <el-select
            v-model="relationshipDialog.form.endNode"
            filterable
            remote
            reserve-keyword
            :placeholder="getNodePlaceholder('end')"
            :remote-method="handleEndNodeSearch"
            :loading="endNodeLoading"
            allow-create
            default-first-option
            style="width: 100%"
          >
            <el-option
              v-for="node in endNodeOptions"
              :key="node.id"
              :label="node.label"
              :value="node.id"
            >
              <span style="float: left">{{ node.label }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">ID: {{ node.id }}</span>
            </el-option>
            <template #empty>
              <div class="select-empty">
                <p>未找到匹配节点</p>
                <p style="font-size: 12px; color: #8492a6;">{{ getSearchHint() }}</p>
              </div>
            </template>
          </el-select>
        </el-form-item>
        
        <!-- 预览关系 -->
        <el-form-item label="关系预览">
          <div class="relationship-preview">
            <el-tag v-if="relationshipDialog.form.startNode" type="info">
              {{ getSelectedNodeLabel(relationshipDialog.form.startNode, 'start') || '起始节点' }}
            </el-tag>
            <el-icon style="margin: 0 8px;"><Right /></el-icon>
            <el-tag v-if="relationshipDialog.form.relationshipType" type="warning">
              {{ relationshipTypes.find(r => r.type === relationshipDialog.form.relationshipType)?.display_name || relationshipDialog.form.relationshipType }}
            </el-tag>
            <el-icon style="margin: 0 8px;"><Right /></el-icon>
            <el-tag v-if="relationshipDialog.form.endNode" type="success">
              {{ getSelectedNodeLabel(relationshipDialog.form.endNode, 'end') || '结束节点' }}
            </el-tag>
          </div>
        </el-form-item>

        <el-divider content-position="left">
          <span style="color: #667eea; font-weight: 600;">关系属性（可选）</span>
        </el-divider>

        <el-form-item>
          <div class="properties-help">
            <el-alert
              title="关系属性用于存储关系的额外信息"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>例如：权重(weight): 0.8，时间(time): 2024-01-01，强度(strength): high</p>
                <p>如果不需要额外属性，可以留空。</p>
              </template>
            </el-alert>
          </div>
        </el-form-item>

        <el-form-item label="属性列表">
          <div class="properties-editor">
            <div 
              v-for="(prop, index) in relationshipDialog.form.properties" 
              :key="index"
              class="property-input-row"
            >
              <el-input
                v-model="prop.key"
                placeholder="属性名（如：weight）"
                style="width: 40%"
              />
              <el-input
                v-model="prop.value"
                placeholder="属性值（如：0.8）"
                style="width: 40%"
              />
              <el-button
                type="danger"
                @click="removeRelationshipProperty(index)"
                :disabled="relationshipDialog.form.properties.length <= 1"
                size="small"
              >
                删除
              </el-button>
            </div>
            <el-button type="primary" @click="addRelationshipProperty" size="small">
              <el-icon><Plus /></el-icon>
              添加属性
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="relationshipDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="saveRelationship" :loading="relationshipDialog.loading">
            <el-icon><Plus /></el-icon>
            创建关系
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑关系对话框 -->
    <el-dialog
      v-model="editRelationshipDialog.visible"
      title="编辑关系"
      width="700px"
      class="relationship-dialog"
    >
      <el-form
        ref="editRelationshipForm"
        :model="editRelationshipDialog.form"
        label-width="120px"
      >
        <!-- 关系信息展示 -->
        <el-form-item label="起始节点">
          <el-input 
            :value="getNodeDisplayLabel(findNodeFromResults(editRelationshipDialog.currentRelationship?.start_node_id))"
            readonly
            style="width: 100%"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="关系类型">
          <el-input 
            :value="editRelationshipDialog.currentRelationship?.type || ''"
            readonly
            style="width: 100%"
          >
            <template #prefix>
              <el-icon><Share /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="结束节点">
          <el-input 
            :value="getNodeDisplayLabel(findNodeFromResults(editRelationshipDialog.currentRelationship?.end_node_id))"
            readonly
            style="width: 100%"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 关系预览 -->
        <el-form-item label="关系预览">
          <div class="relationship-preview">
            <el-tag type="info">
              {{ getNodeDisplayLabel(findNodeFromResults(editRelationshipDialog.currentRelationship?.start_node_id)) }}
            </el-tag>
            <el-icon style="margin: 0 8px;"><Right /></el-icon>
            <el-tag type="warning">
              {{ editRelationshipDialog.currentRelationship?.type }}
            </el-tag>
            <el-icon style="margin: 0 8px;"><Right /></el-icon>
            <el-tag type="success">
              {{ getNodeDisplayLabel(findNodeFromResults(editRelationshipDialog.currentRelationship?.end_node_id)) }}
            </el-tag>
          </div>
        </el-form-item>

        <el-divider content-position="left">
          <span style="color: #667eea; font-weight: 600;">关系属性</span>
        </el-divider>

        <el-form-item>
          <div class="properties-help">
            <el-alert
              title="关系属性用于存储关系的额外信息"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>例如：权重(weight): 0.8，时间(time): 2024-01-01，强度(strength): high</p>
              </template>
            </el-alert>
          </div>
        </el-form-item>

        <el-form-item label="属性列表">
          <div class="properties-editor">
            <div 
              v-for="(prop, index) in editRelationshipDialog.form.properties" 
              :key="index"
              class="property-input-row"
            >
              <el-input
                v-model="prop.key"
                placeholder="属性名（如：weight）"
                style="width: 40%"
              />
              <el-input
                v-model="prop.value"
                placeholder="属性值（如：0.8）"
                style="width: 40%"
              />
              <el-button
                type="danger"
                @click="removeEditRelationshipProperty(index)"
                :disabled="editRelationshipDialog.form.properties.length <= 1"
                size="small"
              >
                删除
              </el-button>
            </div>
            <el-button type="primary" @click="addEditRelationshipProperty" size="small">
              <el-icon><Plus /></el-icon>
              添加属性
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editRelationshipDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="saveEditedRelationship" :loading="editRelationshipDialog.loading">
            <el-icon><Edit /></el-icon>
            保存修改
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
  User,
  Plus,
  Right,
  Star
} from '@element-plus/icons-vue'
import apiService from '../services/api'
import authService from '../services/auth'
import loggingService from '../services/logging'

// 调试：检查API服务方法
console.log('RelationshipQuery - API服务加载完成')
console.log('可用方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(apiService)).filter(name => name !== 'constructor'))
console.log('updateRelationship方法类型:', typeof apiService.updateRelationship)
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
const queryMode = ref('general')

// 权限控制
const currentUser = computed(() => authService.getCurrentUser())
const isAdmin = computed(() => currentUser.value?.role === 'admin')
const isGuest = computed(() => currentUser.value?.username === 'guest')

// 计算选中关系类型的显示名称
const selectedRelTypeDisplayName = computed(() => {
  if (!selectedRelType.value) return ''
  const relType = relationshipTypes.value.find(type => type.type === selectedRelType.value)
  return relType ? (relType.display_name || relType.type) : selectedRelType.value
})

// 文本截断工具函数
const truncateText = (text, maxLength = 10) => {
  if (!text || typeof text !== 'string') return text
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

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

// 关系创建对话框
const relationshipDialog = reactive({
  visible: false,
  loading: false,
  form: {
    startNode: '',
    endNode: '',
    relationshipType: '',
    properties: [{ key: '', value: '' }]
  },
  rules: {
    startNode: [
      { required: true, message: '请选择起始节点', trigger: 'change' }
    ],
    endNode: [
      { required: true, message: '请选择结束节点', trigger: 'change' }
    ],
    relationshipType: [
      { required: true, message: '请选择关系类型', trigger: 'change' }
    ]
  }
})

const nodeForm = ref(null)
const relationshipForm = ref(null)
const availableLabels = ref([])
const availableNodes = ref([])  // 可选择的节点列表
const startNodeOptions = ref([])  // 起始节点搜索结果
const endNodeOptions = ref([])    // 结束节点搜索结果
const startNodeLoading = ref(false)
const endNodeLoading = ref(false)

// 关系类型缓存 - 使用reactive而不是ref
const relationshipTypesCache = reactive({
  general: {
    data: null,
    timestamp: null
  },
  'new-standard': {
    data: null,
    timestamp: null
  }
})

// 加载关系类型
const loadRelationshipTypes = async () => {
  loadingTypes.value = true
  try {
    console.log('loadRelationshipTypes 调用，当前模式:', queryMode.value)

    // 检查缓存
    if (isCacheValid()) {
      const currentCache = relationshipTypesCache[queryMode.value]
      relationshipTypes.value = JSON.parse(JSON.stringify(currentCache.data)) // 深拷贝
      const modeText = queryMode.value === 'new-standard' ? '新标准' : '通用'
      console.log('使用缓存数据，模式:', queryMode.value, '数量:', relationshipTypes.value.length)
      console.log('缓存数据详情:', relationshipTypes.value.map(t => ({ type: t.type, count: t.count })))
      ElMessage.success(`${modeText}模式加载了 ${relationshipTypes.value.length} 种关系类型 (缓存)`)
      loadingTypes.value = false
      return
    }

    console.log('缓存无效，从API加载数据，模式:', queryMode.value)

    // 首先尝试使用新的标签映射API
    const mappingResponse = await apiService.getLabelMappings('relationship')
    const relationshipMappings = mappingResponse.relationship_labels || []

    if (relationshipMappings.length > 0) {
      // 使用映射数据，但需要获取计数信息
      try {
        const countResponse = await apiService.getRelationshipTypes(queryMode.value)
        console.log('API返回的关系类型数据，模式:', queryMode.value, '数据:', countResponse)
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
        })).filter(item => item.count > 0) // 过滤掉count为0的关系类型

        console.log('处理后的关系类型，模式:', queryMode.value, '数量:', relationshipTypes.value.length)
        console.log('处理后详情:', relationshipTypes.value.map(t => ({ type: t.type, count: t.count })))

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

    // 缓存数据
    relationshipTypesCache[queryMode.value] = {
      data: JSON.parse(JSON.stringify(relationshipTypes.value)), // 深拷贝
      timestamp: Date.now()
    }

    const modeText = queryMode.value === 'new-standard' ? '新标准' : '通用'
    console.log(`${queryMode.value}模式关系类型数据已缓存，数量:`, relationshipTypes.value.length, '缓存时间:', new Date().toLocaleTimeString())
    console.log('缓存内容:', relationshipTypesCache)

    if (relationshipTypes.value.length > 0) {
      ElMessage.success(`${modeText}模式加载了 ${relationshipTypes.value.length} 种关系类型`)
    }
  } catch (error) {
    console.error('加载关系类型失败:', error)
    ElMessage.error('加载关系类型失败')
    relationshipTypes.value = []
  } finally {
    loadingTypes.value = false
  }
}

// 模式切换处理
const onModeChange = () => {
  clearResults()
  selectedRelType.value = ''
  console.log('模式切换到:', queryMode.value)
  loadRelationshipTypes()
}

// 检查缓存是否有效
const isCacheValid = () => {
  const currentCache = relationshipTypesCache[queryMode.value]
  console.log('检查缓存有效性，模式:', queryMode.value, '缓存数据:', currentCache)

  if (!currentCache || !currentCache.data) {
    console.log('缓存不存在')
    return false
  }

  // 缓存过期时间：5分钟
  const CACHE_EXPIRY = 5 * 60 * 1000
  const now = Date.now()

  if (currentCache.timestamp && (now - currentCache.timestamp) > CACHE_EXPIRY) {
    console.log('缓存已过期，需要重新加载')
    return false
  }

  console.log('缓存有效')
  return true
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

  // 加载关系类型映射
  await loadRelationshipTypeMappings()

  try {
    // 构建查询语句
    let query = ''
    const whereConditions = []

    if (queryMode.value === 'new-standard') {
      // 新标准模式:
      // 起始节点必须与InternationalLevel有FROM_LEVEL关系
      // 并且终止节点要么与InternationalLevel有FROM_LEVEL关系,要么是特定等级节点
      query = `MATCH (n)-[r:${selectedRelType.value}]->(m)`

      whereConditions.push(`EXISTS((n)-[:FROM_LEVEL]->(:InternationalLevel))`)
      whereConditions.push(`(
        EXISTS((m)-[:FROM_LEVEL]->(:InternationalLevel))
        OR m:InternationalLevel
        OR m:CulturalStage
        OR m:CulturalLevel1
        OR m:CulturalLevel2
      )`)

      if (startNodeFilter.value && startNodeFilter.value.trim()) {
        // 如果是拼音相关关系,添加 normal_pinyin 字段搜索
        if (selectedRelType.value === 'HAS_PINYIN') {
          whereConditions.push(`(
            (n.name IS NOT NULL AND n.name CONTAINS $startFilter) OR
            (n.value IS NOT NULL AND n.value CONTAINS $startFilter) OR
            (n.title IS NOT NULL AND n.title CONTAINS $startFilter) OR
            (n.normal_pinyin IS NOT NULL AND n.normal_pinyin CONTAINS $startFilter)
          )`)
        } else {
          whereConditions.push(`(
            (n.name IS NOT NULL AND n.name CONTAINS $startFilter) OR
            (n.value IS NOT NULL AND n.value CONTAINS $startFilter) OR
            (n.title IS NOT NULL AND n.title CONTAINS $startFilter)
          )`)
        }
      }

      if (endNodeFilter.value && endNodeFilter.value.trim()) {
        // 如果是拼音相关关系,添加 normal_pinyin 字段搜索
        if (selectedRelType.value === 'HAS_PINYIN') {
          whereConditions.push(`(
            (m.name IS NOT NULL AND m.name CONTAINS $endFilter) OR
            (m.value IS NOT NULL AND m.value CONTAINS $endFilter) OR
            (m.title IS NOT NULL AND m.title CONTAINS $endFilter) OR
            (m.normal_pinyin IS NOT NULL AND m.normal_pinyin CONTAINS $endFilter)
          )`)
        } else {
          whereConditions.push(`(
            (m.name IS NOT NULL AND m.name CONTAINS $endFilter) OR
            (m.value IS NOT NULL AND m.value CONTAINS $endFilter) OR
            (m.title IS NOT NULL AND m.title CONTAINS $endFilter)
          )`)
        }
      }
    } else {
      // 通用模式
      query = `MATCH (n)-[r:${selectedRelType.value}]->(m)`

      if (startNodeFilter.value && startNodeFilter.value.trim()) {
        // 如果是拼音相关关系,添加 normal_pinyin 字段搜索
        if (selectedRelType.value === 'HAS_PINYIN') {
          whereConditions.push(`(
            (n.name IS NOT NULL AND n.name CONTAINS $startFilter) OR
            (n.value IS NOT NULL AND n.value CONTAINS $startFilter) OR
            (n.title IS NOT NULL AND n.title CONTAINS $startFilter) OR
            (n.normal_pinyin IS NOT NULL AND n.normal_pinyin CONTAINS $startFilter)
          )`)
        } else {
          whereConditions.push(`(
            (n.name IS NOT NULL AND n.name CONTAINS $startFilter) OR
            (n.value IS NOT NULL AND n.value CONTAINS $startFilter) OR
            (n.title IS NOT NULL AND n.title CONTAINS $startFilter)
          )`)
        }
      }

      if (endNodeFilter.value && endNodeFilter.value.trim()) {
        // 如果是拼音相关关系,添加 normal_pinyin 字段搜索
        if (selectedRelType.value === 'HAS_PINYIN') {
          whereConditions.push(`(
            (m.name IS NOT NULL AND m.name CONTAINS $endFilter) OR
            (m.value IS NOT NULL AND m.value CONTAINS $endFilter) OR
            (m.title IS NOT NULL AND m.title CONTAINS $endFilter) OR
            (m.normal_pinyin IS NOT NULL AND m.normal_pinyin CONTAINS $endFilter)
          )`)
        } else {
          whereConditions.push(`(
            (m.name IS NOT NULL AND m.name CONTAINS $endFilter) OR
            (m.value IS NOT NULL AND m.value CONTAINS $endFilter) OR
            (m.title IS NOT NULL AND m.title CONTAINS $endFilter)
          )`)
        }
      }
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
    
    console.log('查询响应:', response)
    console.log('原始记录数量:', response.records?.length)
    if (response.records?.length > 0) {
      console.log('第一条记录:', response.records[0])
      console.log('第一条记录的关系属性:', response.records[0].r?.properties)
    }
    
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

    // 记录成功的查询日志
    const queryData = {
      relationshipType: selectedRelType.value,
      startNodeFilter: startNodeFilter.value,
      endNodeFilter: endNodeFilter.value,
      limit: nodeLimit.value
    }

    loggingService.logRelationshipQuery(queryData, {
      success: true,
      data: queryResults.value
    }, executionTime.value).catch(console.error)

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

    // 记录失败的查询日志
    const queryData = {
      relationshipType: selectedRelType.value,
      startNodeFilter: startNodeFilter.value,
      endNodeFilter: endNodeFilter.value,
      limit: nodeLimit.value
    }

    const currentExecutionTime = Date.now() - startTime
    loggingService.logRelationshipQuery(queryData, {
      success: false,
      error: error
    }, currentExecutionTime).catch(console.error)

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
        const fullLabel = record.n.properties.name || record.n.properties.value || record.n.properties.title || `${record.n.labels[0] || 'Node'}`
        const nodeLabel = truncateText(fullLabel, 10)
        const tooltip = `${fullLabel}\nID: ${nodeId}\n标签: ${record.n.labels.join(', ')}\n属性: ${Object.keys(record.n.properties).length} 个`
        
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
            size: 16,
            face: 'Arial, Microsoft YaHei, sans-serif',
            strokeWidth: 1,
            strokeColor: '#ffffff',
            bold: true
          },
          shape: 'circle',
          size: 40,
          borderWidth: 3,
          data: record.n
        })
      }
    }
    
    if (record.m && record.m.id) {
      // 处理目标节点 m
      const nodeId = record.m.id
      if (!nodes.has(nodeId)) {
        const fullLabel = record.m.properties.name || record.m.properties.value || record.m.properties.title || `${record.m.labels[0] || 'Node'}`
        const nodeLabel = truncateText(fullLabel, 10)
        const tooltip = `${fullLabel}\nID: ${nodeId}\n标签: ${record.m.labels.join(', ')}\n属性: ${Object.keys(record.m.properties).length} 个`
        
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
            size: 16,
            face: 'Arial, Microsoft YaHei, sans-serif',
            strokeWidth: 1,
            strokeColor: '#ffffff',
            bold: true
          },
          shape: 'circle',
          size: 40,
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
        label: getRelationshipDisplayName(record.r.type),
        color: {
          color: getRelationshipColor(record.r.type),
          hover: getRelationshipHighlightColor(record.r.type)
        },
        font: { color: getRelationshipColor(record.r.type), size: 12 },
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
    // 原始节点类型
    'Character': '#FF6B6B',              // 红色 - 汉字
    'Word': '#4ECDC4',                   // 青蓝色 - 词语
    'Sentence': '#45B7D1',               // 蓝色 - 句子
    'ExternalLink': '#96CEB4',           // 绿色 - 外部链接

    // 新标准节点类型
    'CharacterNewStandard': '#E74C3C',   // 深红色 - 新标准汉字
    'WordNewStandard': '#3498DB',        // 深蓝色 - 新标准词语
    'GrammarNewStandard': '#9B59B6',     // 紫色 - 新标准语法
    'CulturalNewStandard': '#F39C12',    // 橙色 - 新标准文化
    'QuestionNewStandard': '#E67E22',    // 橙红色 - 新标准题目

    // 等级和组织节点
    'InternationalLevel': '#2ECC71',     // 绿色 - 国际等级
    'Level': '#27AE60',                  // 深绿色 - 等级
    'Grade': '#16A085',                  // 青绿色 - 年级

    // 语言组件节点
    'Pinyin': '#FF9800',                 // 橙色 - 拼音
    'Radical': '#795548',                // 棕色 - 部首
    'Stroke': '#607D8B',                 // 蓝灰色 - 笔划
    'Phonetic': '#FF5722',               // 深橙色 - 语音

    // 文化节点
    'CulturalOutlineStage': '#8E44AD',   // 紫色 - 文化大纲阶段
    'PrimaryCulturalCategory': '#9B59B6', // 紫红色 - 一级文化类别
    'SecondaryCulturalCategory': '#A569BD', // 浅紫色 - 二级文化类别

    // 错误类型
    'ErrorType': '#E74C3C',              // 红色 - 错误类型

    // 其他类型
    'Grammar': '#17A2B8',                // 青色 - 语法
    'Vocabulary': '#20C997',             // 青绿色 - 词汇
    'Text': '#6C757D',                   // 灰色 - 文本
    'Concept': '#FD7E14',                // 橙色 - 概念
    'Topic': '#DC3545',                  // 红色 - 主题
    'Category': '#28A745',               // 绿色 - 类别
    'Tag': '#6F42C1',                    // 紫色 - 标签
    'Resource': '#17A2B8',               // 青色 - 资源
    'Person': '#4ECDC4',                 // 青蓝色 - 人物
    'Location': '#45B7D1',               // 蓝色 - 地点
    'Organization': '#96CEB4',           // 绿色 - 组织
    'Event': '#FECA57',                  // 黄色 - 事件

    'Default': '#667EEA'                 // 深蓝紫色 - 默认
  }
  return colors[label] || colors.Default
}

// 关系类型颜色映射
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

    // 常见的新关系类型
    'CILIN': '#8E44AD',                   // 紫色 - 同义词林
    'CULTURAL_CORRELATION': '#E67E22',    // 橙红色 - 文化关联
    'FROM_LEVEL': '#3498DB',              // 蓝色 - 来自等级
    'HAS_CHARACTER': '#E74C3C',           // 红色 - 包含汉字
    'HAS_COMPONENT': '#9B59B6',           // 紫红色 - 包含组件
    'IS_COMPONENT_OF': '#8E44AD',         // 深紫色 - 是组件
    'BELONGS_TO': '#2ECC71',              // 绿色 - 属于
    'HAS_ERROR_TYPE': '#E74C3C',          // 红色 - 具有错误类型
    'IN_CATEGORY': '#F39C12',             // 橙色 - 在类别中
    'HAS_STAGE': '#16A085',               // 青绿色 - 具有阶段
    'STRUCTURAL_RELATION': '#607D8B',     // 蓝灰色 - 结构关系
    'SEMANTIC_RELATION': '#FF5722',       // 深橙色 - 语义关系
    'PHONETIC_RELATION': '#FF9800',       // 橙色 - 语音关系
    'GRAMMATICAL_RELATION': '#4CAF50',    // 绿色 - 语法关系

    'default': '#95A5A6'            // 浅灰色 - 默认（比原来更明亮）
  }
  return colors[relationshipType] || colors.default
}

// 关系类型高亮颜色
const getRelationshipHighlightColor = (relationshipType) => {
  const color = getRelationshipColor(relationshipType)
  // 简单的高亮效果，使颜色更深一些
  return darkenColor(color, 0.2)
}

// 关系类型映射
const relationshipTypeMappings = ref([])

// 加载关系类型映射
const loadRelationshipTypeMappings = async () => {
  if (relationshipTypeMappings.value.length > 0) {
    return // 已加载过
  }

  try {
    const mappingResponse = await apiService.getLabelMappings('relationship')
    relationshipTypeMappings.value = mappingResponse.relationship_labels || []
    console.log('Loaded relationship type mappings:', relationshipTypeMappings.value.length)
  } catch (error) {
    console.error('加载关系类型映射失败:', error)
    relationshipTypeMappings.value = []
  }
}

// 使用后端映射获取关系类型的显示名称
const getRelationshipDisplayName = (relationshipType) => {
  const mapping = relationshipTypeMappings.value.find(m => m.neo4j_name === relationshipType)
  return mapping ? (mapping.display_name || relationshipType) : relationshipType
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

// 编辑关系对话框变量
const editRelationshipDialog = reactive({
  visible: false,
  loading: false,
  currentRelationshipId: null,
  currentRelationship: null,  // 存储完整的关系信息
  form: {
    properties: [{ key: '', value: '' }]
  }
})

const editRelationshipForm = ref(null)

const editRelationship = (relationship) => {
  console.log('编辑关系 - 原始数据:', relationship)
  
  // 设置当前编辑的关系ID和完整信息
  editRelationshipDialog.currentRelationshipId = relationship.id
  editRelationshipDialog.currentRelationship = relationship
  
  // 提取属性，处理不同可能的数据结构
  let properties = {}
  
  if (relationship.properties) {
    properties = relationship.properties
  } else if (relationship.data && relationship.data.properties) {
    properties = relationship.data.properties
  }
  
  console.log('提取的属性:', properties)
  
  // 将现有属性转换为表单格式
  if (properties && typeof properties === 'object' && Object.keys(properties).length > 0) {
    editRelationshipDialog.form.properties = Object.entries(properties).map(([key, value]) => ({ 
      key, 
      value: typeof value === 'string' ? value : JSON.stringify(value)
    }))
  } else {
    editRelationshipDialog.form.properties = [{ key: '', value: '' }]
  }
  
  console.log('表单属性:', editRelationshipDialog.form.properties)
  
  editRelationshipDialog.visible = true
}

// 保存编辑的关系
const saveEditedRelationship = async () => {
  try {
    editRelationshipDialog.loading = true
    
    // 防御性检查
    if (!apiService) {
      throw new Error('API服务未初始化')
    }
    
    if (typeof apiService.updateRelationship !== 'function') {
      console.error('apiService methods:', Object.keys(apiService))
      throw new Error('updateRelationship方法不存在')
    }
    
    if (!editRelationshipDialog.currentRelationshipId) {
      throw new Error('关系ID不能为空')
    }
    
    // 准备属性
    const properties = {}
    editRelationshipDialog.form.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })

    console.log('更新关系:', {
      relationshipId: editRelationshipDialog.currentRelationshipId,
      properties
    })

    const updateResponse = await apiService.updateRelationship(editRelationshipDialog.currentRelationshipId, properties)
    console.log('更新响应:', updateResponse)
    ElMessage.success('关系更新成功')
    
    // 更新本地数据中的关系属性
    if (editRelationshipDialog.currentRelationship) {
      editRelationshipDialog.currentRelationship.properties = properties
    }
    
    // 在queryResults中也更新对应的关系数据
    const updatedResults = queryResults.value.map(record => {
      let relationship = null
      
      // 根据不同的数据结构查找关系
      if (record.r) {
        relationship = record.r
      } else if (record.relationship) {
        relationship = record.relationship
      } else if (record.id) {
        relationship = record
      }
      
      // 如果找到匹配的关系，更新其属性
      if (relationship && relationship.id === editRelationshipDialog.currentRelationshipId) {
        relationship.properties = properties
      }
      
      return record
    })
    queryResults.value = updatedResults
    
    editRelationshipDialog.visible = false
    
    // 重新创建网络图以显示更新
    if (queryResults.value.length > 0) {
      setTimeout(() => {
        createNetwork()
      }, 100)
    }
    
    selectedElement.value = null
  } catch (error) {
    console.error('编辑关系失败:', error)
    ElMessage.error('编辑关系失败: ' + error.message)
  } finally {
    editRelationshipDialog.loading = false
  }
}

// 添加编辑关系属性
const addEditRelationshipProperty = () => {
  editRelationshipDialog.form.properties.push({ key: '', value: '' })
}

// 删除编辑关系属性
const removeEditRelationshipProperty = (index) => {
  if (editRelationshipDialog.form.properties.length > 1) {
    editRelationshipDialog.form.properties.splice(index, 1)
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

// 显示创建关系对话框
const showCreateRelationshipDialog = async () => {
  try {
    // 加载可用节点
    await loadAvailableNodes()
    
    // 初始化节点选项
    startNodeOptions.value = availableNodes.value
    endNodeOptions.value = availableNodes.value
    
    // 重置表单
    relationshipDialog.form = {
      startNode: '',
      endNode: '',
      relationshipType: selectedRelType.value, // 预设为当前选中的关系类型
      properties: [{ key: '', value: '' }]
    }
    
    relationshipDialog.visible = true
  } catch (error) {
    console.error('加载节点失败:', error)
    ElMessage.error('加载节点失败: ' + error.message)
  }
}

// 动态搜索节点
const searchNodes = async (query) => {
  if (!query || query.length < 1) {
    return []
  }
  
  try {
    // 根据当前选中的关系类型优化搜索
    let searchQuery = ''
    
    if (selectedRelType.value === 'HAS_PINYIN') {
      // 对于拼音关系，优先搜索Character节点
      searchQuery = `
        MATCH (n) 
        WHERE (n.name IS NOT NULL AND n.name CONTAINS $query) OR 
              (n.value IS NOT NULL AND n.value CONTAINS $query) OR 
              (n.title IS NOT NULL AND n.title CONTAINS $query) OR
              toString(n.id) CONTAINS $query
        RETURN n, 
        CASE 
          WHEN 'Character' IN labels(n) THEN 1
          WHEN 'Pinyin' IN labels(n) THEN 2
          ELSE 3
        END as priority
        ORDER BY priority, n.id
        LIMIT 50
      `
    } else if (selectedRelType.value === 'HAS_RADICAL') {
      // 对于部首关系，优先搜索Character和Radical节点
      searchQuery = `
        MATCH (n) 
        WHERE (n.name IS NOT NULL AND n.name CONTAINS $query) OR 
              (n.value IS NOT NULL AND n.value CONTAINS $query) OR 
              (n.title IS NOT NULL AND n.title CONTAINS $query) OR
              toString(n.id) CONTAINS $query
        RETURN n,
        CASE 
          WHEN 'Character' IN labels(n) THEN 1
          WHEN 'Radical' IN labels(n) THEN 2
          ELSE 3
        END as priority
        ORDER BY priority, n.id
        LIMIT 50
      `
    } else {
      // 通用搜索，Character节点优先
      searchQuery = `
        MATCH (n) 
        WHERE (n.name IS NOT NULL AND n.name CONTAINS $query) OR 
              (n.value IS NOT NULL AND n.value CONTAINS $query) OR 
              (n.title IS NOT NULL AND n.title CONTAINS $query) OR
              toString(n.id) CONTAINS $query
        RETURN n,
        CASE 
          WHEN 'Character' IN labels(n) THEN 1
          ELSE 2
        END as priority
        ORDER BY priority, n.id
        LIMIT 50
      `
    }
    
    const response = await apiService.runQuery(searchQuery, { query })
    
    return response.records.map(record => {
      const node = record.n
      const label = (node.properties && node.properties.name) || 
                   (node.properties && node.properties.value) || 
                   (node.properties && node.properties.title) || 
                   `${node.labels ? node.labels[0] : 'Node'} ${node.id}`
      
      // 添加标签信息到显示标签中，帮助用户区分
      const labelWithType = node.labels && node.labels.length > 0 
        ? `${label} (${node.labels.join(', ')})` 
        : label
      
      return {
        id: node.id,
        label: labelWithType,
        labels: node.labels,
        properties: node.properties,
        value: node.id  // 用于el-select的value
      }
    })
  } catch (error) {
    console.error('搜索节点失败:', error)
    return []
  }
}

// 加载可选择的节点（初始加载）
const loadAvailableNodes = async () => {
  try {
    // 查询节点作为初始选项，Character节点优先
    const response = await apiService.runQuery(`
      MATCH (n) 
      RETURN n,
      CASE 
        WHEN 'Character' IN labels(n) THEN 1
        WHEN 'Pinyin' IN labels(n) THEN 2
        WHEN 'Radical' IN labels(n) THEN 3
        ELSE 4
      END as priority
      ORDER BY priority, n.id
      LIMIT 20
    `, {})
    
    availableNodes.value = response.records.map(record => {
      const node = record.n
      const label = (node.properties && node.properties.name) || 
                   (node.properties && node.properties.value) || 
                   (node.properties && node.properties.title) || 
                   `${node.labels ? node.labels[0] : 'Node'} ${node.id}`
      
      // 添加标签信息到显示标签中，帮助用户区分
      const labelWithType = node.labels && node.labels.length > 0 
        ? `${label} (${node.labels.join(', ')})` 
        : label
      
      return {
        id: node.id,
        label: labelWithType,
        labels: node.labels,
        properties: node.properties,
        value: node.id
      }
    })
    
    console.log('加载了初始节点:', availableNodes.value.length)
  } catch (error) {
    console.error('加载节点失败:', error)
    availableNodes.value = []
  }
}

// 添加关系属性
const addRelationshipProperty = () => {
  relationshipDialog.form.properties.push({ key: '', value: '' })
}

// 删除关系属性
const removeRelationshipProperty = (index) => {
  if (relationshipDialog.form.properties.length > 1) {
    relationshipDialog.form.properties.splice(index, 1)
  }
}

// 处理起始节点搜索
const handleStartNodeSearch = async (query) => {
  if (!query) {
    startNodeOptions.value = availableNodes.value
    return
  }
  
  startNodeLoading.value = true
  try {
    startNodeOptions.value = await searchNodes(query)
  } finally {
    startNodeLoading.value = false
  }
}

// 处理结束节点搜索
const handleEndNodeSearch = async (query) => {
  if (!query) {
    endNodeOptions.value = availableNodes.value
    return
  }
  
  endNodeLoading.value = true
  try {
    endNodeOptions.value = await searchNodes(query)
  } finally {
    endNodeLoading.value = false
  }
}

// 保存新关系
const saveRelationship = async () => {
  try {
    await relationshipForm.value.validate()
    
    relationshipDialog.loading = true
    
    // 准备属性
    const properties = {}
    relationshipDialog.form.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    // 如果选择的是新节点ID（非数字），需要先创建节点
    let startNodeId = relationshipDialog.form.startNode
    let endNodeId = relationshipDialog.form.endNode
    
    // 检查起始节点是否需要创建
    if (isNaN(parseInt(startNodeId))) {
      try {
        const newStartNode = await createNodeIfNeeded(startNodeId, 'Character')
        startNodeId = newStartNode.id
      } catch (error) {
        ElMessage.error('创建起始节点失败: ' + error.message)
        return
      }
    }
    
    // 检查结束节点是否需要创建
    if (isNaN(parseInt(endNodeId))) {
      try {
        const newEndNode = await createNodeIfNeeded(endNodeId, 'Character')
        endNodeId = newEndNode.id
      } catch (error) {
        ElMessage.error('创建结束节点失败: ' + error.message)
        return
      }
    }
    
    // 创建关系
    await apiService.createRelationship(
      parseInt(startNodeId),
      parseInt(endNodeId),
      relationshipDialog.form.relationshipType,
      properties
    )
    
    ElMessage.success('关系创建成功')
    relationshipDialog.visible = false
    
    // 重新查询以显示新创建的关系
    if (selectedRelType.value) {
      await queryRelationship()
    }
  } catch (error) {
    console.error('创建关系失败:', error)
    ElMessage.error('创建关系失败: ' + error.message)
  } finally {
    relationshipDialog.loading = false
  }
}

// 创建新节点（如果需要）
const createNodeIfNeeded = async (nodeValue, defaultLabel = 'Character') => {
  try {
    const response = await apiService.createNode([defaultLabel], { value: nodeValue })
    ElMessage.success(`创建了新节点: ${nodeValue}`)
    return response
  } catch (error) {
    console.error('创建节点失败:', error)
    throw error
  }
}

// 从当前查询结果中查找节点信息
const findNodeFromResults = (nodeId) => {
  for (const record of queryResults.value) {
    if (record.n && record.n.id === nodeId) {
      return record.n
    }
    if (record.m && record.m.id === nodeId) {
      return record.m
    }
  }
  return null
}

// 获取节点显示标签
const getNodeDisplayLabel = (node) => {
  if (!node) return '未知节点'
  return (node.properties && node.properties.name) || 
         (node.properties && node.properties.value) || 
         (node.properties && node.properties.title) || 
         `${node.labels ? node.labels[0] : 'Node'} ${node.id}`
}

// 获取选中节点的标签（用于预览）
const getSelectedNodeLabel = (nodeId, type) => {
  if (!nodeId) return ''
  
  // 如果是数字ID，从选项列表中查找
  if (!isNaN(parseInt(nodeId))) {
    const options = type === 'start' ? startNodeOptions.value : endNodeOptions.value
    const node = options.find(n => n.id === parseInt(nodeId))
    return node ? node.label : `节点 ${nodeId}`
  }
  
  // 如果是字符串，直接返回（新创建的节点）
  return nodeId
}

// 根据关系类型获取节点选择的占位符文本
const getNodePlaceholder = (nodeType) => {
  if (!selectedRelType.value) {
    return "输入搜索节点（支持名称、值、ID）"
  }
  
  if (selectedRelType.value === 'HAS_PINYIN') {
    return nodeType === 'start' 
      ? "搜索汉字节点（如：文、国、际）" 
      : "搜索拼音节点（如：wén、guó、jì）"
  } else if (selectedRelType.value === 'HAS_RADICAL') {
    return nodeType === 'start' 
      ? "搜索汉字节点（如：文、国、际）" 
      : "搜索部首节点（如：文、囗、亻）"
  } else if (selectedRelType.value === 'DEPENDS_ON') {
    return "搜索汉字节点（支持依赖关系）"
  }
  
  return "输入搜索节点（优先显示汉字节点）"
}

// 根据关系类型获取搜索提示
const getSearchHint = () => {
  if (!selectedRelType.value) {
    return "支持按名称、值、ID搜索，优先显示汉字节点"
  }
  
  if (selectedRelType.value === 'HAS_PINYIN') {
    return "优先显示汉字和拼音节点，输入汉字如：文"
  } else if (selectedRelType.value === 'HAS_RADICAL') {
    return "优先显示汉字和部首节点，输入汉字如：文"
  }
  
  return "优先显示汉字节点，支持按名称、值、ID搜索"
}

onMounted(() => {
  // 如果是guest用户，强制使用新标准模式
  if (isGuest.value) {
    queryMode.value = 'new-standard'
  }

  // 初始化时加载关系类型和可用标签
  loadRelationshipTypes()
  loadAvailableLabels()
  loadRelationshipTypeMappings()
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

/* 查询模式选择器 */
.query-mode-selector {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.mode-group :deep(.el-radio-button) {
  margin: 0;
}

.mode-group :deep(.el-radio-button__inner) {
  height: 44px;
  line-height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.mode-group :deep(.el-radio-button__inner:hover) {
  background: rgba(102, 126, 234, 0.1);
}

.mode-group :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
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

/* 空状态按钮 */
.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.empty-actions .el-button {
  min-width: 120px;
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

/* 关系创建对话框 */
.relationship-dialog {
  max-height: 80vh;
  overflow-y: auto;
}

.relationship-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.relationship-preview .el-tag {
  font-weight: 500;
}

.relationship-preview .el-icon {
  color: #667eea;
  font-size: 16px;
}

/* 选择框空状态样式 */
.select-empty {
  padding: 12px;
  text-align: center;
  color: #8492a6;
}

.select-empty p {
  margin: 4px 0;
}

/* 动作按钮样式统一 */
.action-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* 属性说明样式 */
.properties-help {
  margin-bottom: 16px;
}

.properties-help .el-alert {
  border-radius: 8px;
}

.properties-help p {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.4;
}

/* 只读输入框样式 */
.el-input.is-disabled .el-input__wrapper,
.el-input[readonly] .el-input__wrapper {
  background-color: #f8f9fa !important;
  border-color: #e8ecf0;
}

.el-input.is-disabled .el-input__inner,
.el-input[readonly] .el-input__inner {
  color: #2c3e50 !important;
  font-weight: 500;
}

/* 分割线样式 */
.el-divider .el-divider__text {
  font-size: 14px;
  font-weight: 600;
}
</style>
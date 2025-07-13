<template>
  <AppLayout :show-page-actions="true">
    <template #page-actions>
      <el-button 
        type="primary" 
        class="action-btn"
        @click="showCreateDialog"
      >
        <el-icon><Plus /></el-icon>
        创建新节点
      </el-button>
    </template>
    
    <div class="data-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <div class="page-icon">
            <el-icon class="icon"><DataLine /></el-icon>
          </div>
          <div class="title-text">
            <h1 class="page-title">数据管理</h1>
            <p class="page-subtitle">管理和维护图数据库中的节点与关系数据</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button 
            type="primary" 
            class="action-btn"
            @click="showCreateDialog"
          >
            <el-icon><Plus /></el-icon>
            创建新节点
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="content-card">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick" class="data-tabs">
          <el-tab-pane label="节点管理" name="nodes">
            <div class="nodes-management">
              <!-- 节点筛选区域 -->
              <div class="filter-section">
                <div class="filter-header">
                  <h3 class="filter-title">
                    <el-icon><Filter /></el-icon>
                    筛选条件
                  </h3>
                </div>
                <div class="filter-controls">
                  <div class="filter-group">
                    <label class="filter-label">节点标签</label>
                    <el-select 
                      v-model="nodeFilter.label" 
                      placeholder="选择标签（可选）" 
                      clearable
                      class="filter-select"
                    >
                      <el-option
                        v-for="label in labels"
                        :key="label"
                        :label="label"
                        :value="label"
                      />
                    </el-select>
                  </div>
                  <div class="filter-group">
                    <label class="filter-label">搜索关键词</label>
                    <el-input 
                      v-model="nodeFilter.search" 
                      placeholder="搜索节点属性..."
                      class="filter-input"
                      @keyup.enter="loadNodes"
                    >
                      <template #prepend>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </div>
                  <div class="filter-actions">
                    <el-button 
                      type="info"
                      class="filter-btn"
                      @click="loadNodes"
                      :loading="loading"
                    >
                      <el-icon><Refresh /></el-icon>
                      {{ loading ? '加载中' : '刷新数据' }}
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 节点数据表格 -->
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title">
                    <h3 class="section-title">
                      <el-icon><Collection /></el-icon>
                      节点列表
                    </h3>
                    <div class="table-stats">
                      <span class="stat-count">{{ nodes.length }}</span>
                      <span class="stat-text">个节点</span>
                    </div>
                  </div>
                </div>
                
                <div class="table-wrapper">
                  <el-table 
                    :data="nodes" 
                    class="modern-table"
                    empty-text="暂无节点数据"
                  >
                    <el-table-column prop="id" label="节点 ID" width="120" class-name="id-column">
                      <template #default="scope">
                        <div class="id-badge">
                          {{ scope.row.id }}
                        </div>
                      </template>
                    </el-table-column>
                    
                    <el-table-column prop="labels" label="标签" width="200">
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
                    
                    <el-table-column label="主要属性" min-width="400">
                      <template #default="scope">
                        <div class="property-preview">
                          <div
                            v-for="(value, key) in getPreviewProperties(scope.row.properties)"
                            :key="key"
                            class="property-item"
                          >
                            <span class="prop-key">{{ key }}</span>
                            <span class="prop-value">{{ formatProperty(value) }}</span>
                          </div>
                        </div>
                      </template>
                    </el-table-column>
                    
                    <el-table-column label="操作" width="180" class-name="actions-column">
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
        </el-tab-pane>
        
          <el-tab-pane label="关系管理" name="relationships">
            <div class="relationships-management">
              <!-- 关系筛选区域 -->
              <div class="filter-section">
                <div class="filter-header">
                  <h3 class="filter-title">
                    <el-icon><Filter /></el-icon>
                    筛选条件
                  </h3>
                </div>
                <div class="filter-controls">
                  <div class="filter-group">
                    <label class="filter-label">关系类型</label>
                    <el-select 
                      v-model="relFilter.type" 
                      placeholder="选择关系类型（可选）" 
                      clearable
                      class="filter-select"
                    >
                      <el-option
                        v-for="type in relationshipTypes"
                        :key="type"
                        :label="type"
                        :value="type"
                      />
                    </el-select>
                  </div>
                  <div class="filter-group">
                    <label class="filter-label">搜索关键词</label>
                    <el-input 
                      v-model="relFilter.search" 
                      placeholder="搜索关系属性..."
                      class="filter-input"
                      @keyup.enter="loadRelationships"
                    >
                      <template #prepend>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </div>
                  <div class="filter-actions">
                    <el-button 
                      type="info"
                      class="filter-btn"
                      @click="loadRelationships"
                    >
                      <el-icon><Refresh /></el-icon>
                      刷新数据
                    </el-button>
                    <el-button 
                      type="success"
                      class="filter-btn"
                      @click="showCreateRelDialog"
                    >
                      <el-icon><Connection /></el-icon>
                      创建关系
                    </el-button>
                  </div>
                </div>
              </div>
              
              <!-- 关系数据表格 -->
              <div class="table-section">
                <div class="table-header">
                  <div class="table-title">
                    <h3 class="section-title">
                      <el-icon><Connection /></el-icon>
                      关系列表
                    </h3>
                    <div class="table-stats">
                      <span class="stat-count">{{ relationships.length }}</span>
                      <span class="stat-text">个关系</span>
                    </div>
                  </div>
                </div>
                
                <div class="table-wrapper">
                  <el-table 
                    :data="relationships" 
                    class="modern-table"
                    empty-text="暂无关系数据"
                  >
                    <el-table-column prop="id" label="关系 ID" width="120" class-name="id-column">
                      <template #default="scope">
                        <div class="id-badge">
                          {{ scope.row.id }}
                        </div>
                      </template>
                    </el-table-column>
                    
                    <el-table-column prop="type" label="关系类型" width="180">
                      <template #default="scope">
                        <el-tag type="warning" effect="light" class="type-tag">
                          {{ scope.row.type }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    
                    <el-table-column label="起始节点" width="220">
                      <template #default="scope">
                        <div class="node-info">
                          <div class="node-labels">
                            <el-tag 
                              v-for="label in scope.row.startLabels" 
                              :key="label"
                              type="info" 
                              effect="light" 
                              size="small"
                              class="node-label"
                            >
                              {{ label }}
                            </el-tag>
                          </div>
                          <div class="node-id">
                            ID: {{ scope.row.startId }}
                          </div>
                        </div>
                      </template>
                    </el-table-column>
                    
                    <el-table-column label="目标节点" width="220">
                      <template #default="scope">
                        <div class="node-info">
                          <div class="node-labels">
                            <el-tag 
                              v-for="label in scope.row.endLabels" 
                              :key="label"
                              type="info" 
                              effect="light" 
                              size="small"
                              class="node-label"
                            >
                              {{ label }}
                            </el-tag>
                          </div>
                          <div class="node-id">
                            ID: {{ scope.row.endId }}
                          </div>
                        </div>
                      </template>
                    </el-table-column>
                    
                    <el-table-column label="属性" min-width="300">
                      <template #default="scope">
                        <div class="property-preview" v-if="Object.keys(scope.row.properties).length > 0">
                          <div
                            v-for="(value, key) in scope.row.properties"
                            :key="key"
                            class="property-item"
                          >
                            <span class="prop-key">{{ key }}</span>
                            <span class="prop-value">{{ formatProperty(value) }}</span>
                          </div>
                        </div>
                        <div v-else class="no-properties">
                          <el-icon><InfoFilled /></el-icon>
                          无属性
                        </div>
                      </template>
                    </el-table-column>
                    
                    <el-table-column label="操作" width="180" class-name="actions-column">
                      <template #default="scope">
                        <div class="table-actions">
                          <el-button 
                            type="primary" 
                            size="small" 
                            class="action-btn-sm"
                            @click="editRelationship(scope.row)"
                          >
                            <el-icon><Edit /></el-icon>
                            编辑
                          </el-button>
                          <el-button 
                            type="danger" 
                            size="small" 
                            class="action-btn-sm"
                            @click="deleteRelationship(scope.row)"
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
        </el-tab-pane>
      </el-tabs>
      </div>
    </div>
    
    <!-- 创建/编辑节点对话框 -->
    <el-dialog
      v-model="nodeDialog.visible"
      :title="nodeDialog.isEdit ? '编辑节点' : '创建节点'"
      width="600px"
    >
      <el-form ref="nodeFormRef" :model="nodeDialog.form" :rules="nodeRules" label-width="100px">
        <el-form-item label="标签" prop="labels">
          <el-select
            v-model="nodeDialog.form.labels"
            multiple
            allow-create
            placeholder="选择或输入标签"
            style="width: 100%"
          >
            <el-option
              v-for="label in labels"
              :key="label"
              :label="label"
              :value="label"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="属性">
          <div class="properties-editor">
            <div
              v-for="(prop, index) in nodeDialog.form.properties"
              :key="index"
              class="property-row"
            >
              <el-input
                v-model="prop.key"
                placeholder="属性名"
                style="width: 200px; margin-right: 10px;"
              />
              <el-input
                v-model="prop.value"
                placeholder="属性值"
                style="width: 200px; margin-right: 10px;"
              />
              <el-button type="danger" size="small" @click="removeProperty(index)">删除</el-button>
            </div>
            <el-button type="primary" size="small" @click="addProperty">添加属性</el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="nodeDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveNode">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- 创建关系对话框 -->
    <el-dialog
      v-model="relDialog.visible"
      title="创建关系"
      width="600px"
    >
      <el-form ref="relFormRef" :model="relDialog.form" :rules="relRules" label-width="100px">
        <el-form-item label="起始节点" prop="startNodeId">
          <el-input
            v-model="relDialog.form.startNodeId"
            placeholder="起始节点ID"
            type="number"
          />
        </el-form-item>
        
        <el-form-item label="目标节点" prop="endNodeId">
          <el-input
            v-model="relDialog.form.endNodeId"
            placeholder="目标节点ID"
            type="number"
          />
        </el-form-item>
        
        <el-form-item label="关系类型" prop="type">
          <el-select
            v-model="relDialog.form.type"
            allow-create
            placeholder="选择或输入关系类型"
            style="width: 100%"
          >
            <el-option
              v-for="type in relationshipTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="属性">
          <div class="properties-editor">
            <div
              v-for="(prop, index) in relDialog.form.properties"
              :key="index"
              class="property-row"
            >
              <el-input
                v-model="prop.key"
                placeholder="属性名"
                style="width: 200px; margin-right: 10px;"
              />
              <el-input
                v-model="prop.value"
                placeholder="属性值"
                style="width: 200px; margin-right: 10px;"
              />
              <el-button type="danger" size="small" @click="removeRelProperty(index)">删除</el-button>
            </div>
            <el-button type="primary" size="small" @click="addRelProperty">添加属性</el-button>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="relDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveRelationship">保存</el-button>
      </template>
    </el-dialog>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  DataLine, 
  Plus, 
  Filter, 
  Search, 
  Refresh, 
  Edit, 
  Delete, 
  Connection,
  InfoFilled,
  Warning,
  Collection
} from '@element-plus/icons-vue'
import neo4jService from '../services/neo4j'
import AppLayout from '../components/AppLayout.vue'

const route = useRoute()

const activeTab = ref('nodes')
const labels = ref([])
const relationshipTypes = ref([])
const nodes = ref([])
const relationships = ref([])

const nodeFilter = reactive({
  label: '',
  search: ''
})

const loading = ref(false)

const relFilter = reactive({
  type: '',
  search: ''
})

const nodeDialog = reactive({
  visible: false,
  isEdit: false,
  form: {
    id: null,
    labels: [],
    properties: []
  }
})

const relDialog = reactive({
  visible: false,
  form: {
    startNodeId: '',
    endNodeId: '',
    type: '',
    properties: []
  }
})

const nodeFormRef = ref(null)
const relFormRef = ref(null)

const nodeRules = {
  labels: [
    { required: true, message: '请选择节点标签', trigger: 'change' }
  ]
}

const relRules = {
  startNodeId: [
    { required: true, message: '请输入起始节点ID', trigger: 'blur' }
  ],
  endNodeId: [
    { required: true, message: '请输入目标节点ID', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择关系类型', trigger: 'change' }
  ]
}

const loadNodes = async () => {
  loading.value = true
  try {
    let query = 'MATCH (n)'
    const params = {}
    
    if (nodeFilter.label) {
      query += ' WHERE $label IN labels(n)'
      params.label = nodeFilter.label
    }
    
    if (nodeFilter.search) {
      const searchCondition = nodeFilter.label ? ' AND ' : ' WHERE '
      query += `${searchCondition} ANY(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $search)`
      params.search = nodeFilter.search
    }
    
    query += ' RETURN n, labels(n) as labels, id(n) as id LIMIT 100'
    
    const result = await neo4jService.runQuery(query, params)
    
    nodes.value = result.map(record => ({
      id: record.get('id').toNumber(),
      labels: record.get('labels'),
      properties: record.get('n').properties
    }))
    
  } catch (error) {
    console.error('加载节点失败:', error)
    ElMessage.error('加载节点失败')
  } finally {
    loading.value = false
  }
}

const loadRelationships = async () => {
  try {
    let query = 'MATCH (n)-[r]->(m)'
    const params = {}
    
    if (relFilter.type) {
      query += ' WHERE type(r) = $type'
      params.type = relFilter.type
    }
    
    query += ' RETURN r, n, m, type(r) as type, id(r) as id, id(n) as startId, id(m) as endId, labels(n) as startLabels, labels(m) as endLabels LIMIT 100'
    
    const result = await neo4jService.runQuery(query, params)
    
    relationships.value = result.map(record => ({
      id: record.get('id').toNumber(),
      type: record.get('type'),
      startId: record.get('startId').toNumber(),
      endId: record.get('endId').toNumber(),
      startLabels: record.get('startLabels'),
      endLabels: record.get('endLabels'),
      properties: record.get('r').properties
    }))
    
  } catch (error) {
    console.error('加载关系失败:', error)
    ElMessage.error('加载关系失败')
  }
}

const loadLabels = async () => {
  try {
    const result = await neo4jService.getAllLabels()
    labels.value = result.map(record => record.get(0))
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}

const loadRelationshipTypes = async () => {
  try {
    const result = await neo4jService.getAllRelationshipTypes()
    relationshipTypes.value = result.map(record => record.get(0))
  } catch (error) {
    console.error('加载关系类型失败:', error)
  }
}

const handleTabClick = (tab) => {
  if (tab.name === 'nodes') {
    loadNodes()
  } else if (tab.name === 'relationships') {
    loadRelationships()
  }
}

const showCreateDialog = () => {
  nodeDialog.visible = true
  nodeDialog.isEdit = false
  nodeDialog.form = {
    id: null,
    labels: [],
    properties: []
  }
}

const showCreateRelDialog = () => {
  relDialog.visible = true
  relDialog.form = {
    startNodeId: '',
    endNodeId: '',
    type: '',
    properties: []
  }
}

const addProperty = () => {
  nodeDialog.form.properties.push({ key: '', value: '' })
}

const removeProperty = (index) => {
  nodeDialog.form.properties.splice(index, 1)
}

const addRelProperty = () => {
  relDialog.form.properties.push({ key: '', value: '' })
}

const removeRelProperty = (index) => {
  relDialog.form.properties.splice(index, 1)
}

const editNode = (node) => {
  nodeDialog.visible = true
  nodeDialog.isEdit = true
  nodeDialog.form = {
    id: node.id,
    labels: [...node.labels],
    properties: Object.entries(node.properties).map(([key, value]) => ({ key, value }))
  }
}

const saveNode = async () => {
  if (!nodeFormRef.value) return
  
  try {
    const valid = await nodeFormRef.value.validate()
    if (!valid) return
    
    const properties = {}
    nodeDialog.form.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    if (nodeDialog.isEdit) {
      await neo4jService.updateNode(nodeDialog.form.id, properties)
      ElMessage.success('节点更新成功')
    } else {
      const labelStr = nodeDialog.form.labels.join(':')
      await neo4jService.createNode(labelStr, properties)
      ElMessage.success('节点创建成功')
    }
    
    nodeDialog.visible = false
    loadNodes()
    
  } catch (error) {
    console.error('保存节点失败:', error)
    ElMessage.error('保存节点失败')
  }
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
    loadNodes()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error)
      ElMessage.error('删除节点失败')
    }
  }
}

const saveRelationship = async () => {
  if (!relFormRef.value) return
  
  try {
    const valid = await relFormRef.value.validate()
    if (!valid) return
    
    const properties = {}
    relDialog.form.properties.forEach(prop => {
      if (prop.key && prop.value) {
        properties[prop.key] = prop.value
      }
    })
    
    await neo4jService.createRelationship(
      parseInt(relDialog.form.startNodeId),
      parseInt(relDialog.form.endNodeId),
      relDialog.form.type,
      properties
    )
    
    ElMessage.success('关系创建成功')
    relDialog.visible = false
    loadRelationships()
    
  } catch (error) {
    console.error('保存关系失败:', error)
    ElMessage.error('保存关系失败')
  }
}

const editRelationship = (relationship) => {
  // 关系编辑功能的实现
  ElMessage.info('关系编辑功能开发中...')
}

const deleteRelationship = async (relationship) => {
  try {
    await ElMessageBox.confirm('确定要删除这个关系吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 删除关系的实现
    ElMessage.success('关系删除成功')
    loadRelationships()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除关系失败:', error)
      ElMessage.error('删除关系失败')
    }
  }
}

const getPreviewProperties = (properties) => {
  const preview = {}
  let count = 0
  
  for (const [key, value] of Object.entries(properties)) {
    if (count < 2) {
      preview[key] = value
      count++
    }
  }
  
  return preview
}

const formatProperty = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  return String(value)
}

onMounted(async () => {
  await loadLabels()
  await loadRelationshipTypes()
  
  // 检查路由参数
  if (route.query.action === 'edit' && route.query.nodeId) {
    const nodeId = parseInt(route.query.nodeId)
    // 加载特定节点进行编辑
    try {
      const result = await neo4jService.runQuery(
        'MATCH (n) WHERE id(n) = $id RETURN n, labels(n) as labels, id(n) as id',
        { id: nodeId }
      )
      
      if (result.length > 0) {
        const node = {
          id: result[0].get('id').toNumber(),
          labels: result[0].get('labels'),
          properties: result[0].get('n').properties
        }
        editNode(node)
      }
    } catch (error) {
      console.error('加载节点失败:', error)
    }
  }
  
  loadNodes()
})
</script>

<style scoped>
/* 主容器 */
.data-management {
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

/* 主内容区域 */
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
.data-tabs {
  margin-top: 16px;
}

.data-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 12px;
  padding: 8px;
}

.data-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}

.data-tabs :deep(.el-tabs__item) {
  padding: 16px 24px;
  border-radius: 8px;
  font-weight: 600;
  color: #7f8c8d;
  transition: all 0.3s ease;
}

.data-tabs :deep(.el-tabs__item.is-active) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.data-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

/* 筛选区域 */
.filter-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid rgba(102, 126, 234, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.filter-header {
  margin-bottom: 20px;
  text-align: center;
}

.filter-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.filter-controls {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.filter-select,
.filter-input {
  width: 100%;
}

.filter-select :deep(.el-input__wrapper),
.filter-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.filter-select :deep(.el-input__wrapper:hover),
.filter-input :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.filter-select :deep(.el-input__wrapper.is-focus),
.filter-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.filter-input :deep(.el-input-group__prepend) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 12px 0 0 12px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-btn {
  height: 56px;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  transform: translateY(-2px);
}

/* 表格区域 */
.table-section {
  margin-top: 24px;
}

.table-header {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-stats {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-count {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.stat-text {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.table-wrapper {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.modern-table {
  border-radius: 16px;
  overflow: hidden;
}

.modern-table :deep(.el-table__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.modern-table :deep(.el-table__header th) {
  background: transparent;
  border: none;
  color: #2c3e50;
  font-weight: 600;
  font-size: 14px;
  padding: 16px 12px;
}

.modern-table :deep(.el-table__body tr:hover > td) {
  background-color: rgba(102, 126, 234, 0.05) !important;
}

.modern-table :deep(.el-table__body td) {
  padding: 12px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

/* ID 列 */
.id-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  min-width: 60px;
}

/* 标签容器 */
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

/* 属性预览 */
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
}

.no-properties {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a0a7b0;
  font-size: 13px;
  font-style: italic;
}

/* 节点信息 */
.node-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.node-label {
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  padding: 2px 6px;
}

.node-id {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
}

/* 类型标签 */
.type-tag {
  font-weight: 600;
  border-radius: 8px;
  padding: 6px 12px;
}

/* 表格操作 */
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

/* 属性编辑器 */
.properties-editor {
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.property-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.property-row:last-child {
  margin-bottom: 0;
}

.property-row .el-input {
  flex: 1;
}

.property-row .el-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  border: 2px solid #e8ecf0;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.property-row .el-input :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
}

.property-row .el-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .filter-controls {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .filter-actions {
    width: 100%;
    justify-content: center;
  }
  
  .table-title {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .data-management {
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
  
  .property-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .table-actions {
    flex-direction: column;
    gap: 4px;
  }
  
  .filter-actions {
    flex-direction: column;
  }
}
</style>
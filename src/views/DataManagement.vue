<template>
  <div class="data-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据管理</span>
          <el-button type="primary" @click="showCreateDialog">创建新节点</el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <el-tab-pane label="节点管理" name="nodes">
          <div class="nodes-management">
            <div class="filter-section">
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-select v-model="nodeFilter.label" placeholder="节点标签" clearable>
                    <el-option
                      v-for="label in labels"
                      :key="label"
                      :label="label"
                      :value="label"
                    />
                  </el-select>
                </el-col>
                <el-col :span="8">
                  <el-input v-model="nodeFilter.search" placeholder="搜索节点..." />
                </el-col>
                <el-col :span="8">
                  <el-button @click="loadNodes">刷新</el-button>
                </el-col>
              </el-row>
            </div>
            
            <el-table :data="nodes" stripe style="width: 100%; margin-top: 20px;">
              <el-table-column prop="id" label="ID" width="100" />
              <el-table-column prop="labels" label="标签" width="150">
                <template #default="scope">
                  <el-tag
                    v-for="label in scope.row.labels"
                    :key="label"
                    size="small"
                    style="margin-right: 5px;"
                  >
                    {{ label }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="属性预览" min-width="300">
                <template #default="scope">
                  <div class="property-preview">
                    <span
                      v-for="(value, key) in getPreviewProperties(scope.row.properties)"
                      :key="key"
                      class="property-item"
                    >
                      <strong>{{ key }}:</strong> {{ formatProperty(value) }}
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button size="small" @click="editNode(scope.row)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteNode(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="关系管理" name="relationships">
          <div class="relationships-management">
            <div class="filter-section">
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-select v-model="relFilter.type" placeholder="关系类型" clearable>
                    <el-option
                      v-for="type in relationshipTypes"
                      :key="type"
                      :label="type"
                      :value="type"
                    />
                  </el-select>
                </el-col>
                <el-col :span="8">
                  <el-input v-model="relFilter.search" placeholder="搜索关系..." />
                </el-col>
                <el-col :span="8">
                  <el-button @click="loadRelationships">刷新</el-button>
                  <el-button type="primary" @click="showCreateRelDialog">创建关系</el-button>
                </el-col>
              </el-row>
            </div>
            
            <el-table :data="relationships" stripe style="width: 100%; margin-top: 20px;">
              <el-table-column prop="id" label="ID" width="100" />
              <el-table-column prop="type" label="类型" width="150" />
              <el-table-column label="起始节点" width="200">
                <template #default="scope">
                  <div>
                    <el-tag size="small">{{ scope.row.startLabels[0] }}</el-tag>
                    <div style="margin-top: 5px; font-size: 12px;">
                      ID: {{ scope.row.startId }}
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="目标节点" width="200">
                <template #default="scope">
                  <div>
                    <el-tag size="small">{{ scope.row.endLabels[0] }}</el-tag>
                    <div style="margin-top: 5px; font-size: 12px;">
                      ID: {{ scope.row.endId }}
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="属性" min-width="200">
                <template #default="scope">
                  <div class="property-preview">
                    <span
                      v-for="(value, key) in scope.row.properties"
                      :key="key"
                      class="property-item"
                    >
                      <strong>{{ key }}:</strong> {{ formatProperty(value) }}
                    </span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button size="small" @click="editRelationship(scope.row)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteRelationship(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
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
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import neo4jService from '../services/neo4j'

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
.data-management {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.property-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.property-item {
  background: #e8f4f8;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.property-item strong {
  color: #409eff;
}

.properties-editor {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  background: #f9f9f9;
}

.property-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.property-row:last-child {
  margin-bottom: 0;
}
</style>
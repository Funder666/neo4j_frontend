<template>
  <div class="node-query">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>节点查询</span>
          <el-button type="primary" @click="clearResults">清空结果</el-button>
        </div>
      </template>
      
      <div class="query-section">
        <el-row :gutter="20">
          <el-col :span="18">
            <el-input
              v-model="queryText"
              placeholder="输入汉字查询相关节点..."
              size="large"
              @keyup.enter="searchNodes"
            >
              <template #prepend>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <el-button 
              type="primary" 
              size="large" 
              :loading="loading"
              @click="searchNodes"
            >
              {{ loading ? '查询中...' : '查询' }}
            </el-button>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" style="margin-top: 15px;">
          <el-col :span="12">
            <el-select
              v-model="selectedLabel"
              placeholder="选择节点标签（可选）"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="label in labels"
                :key="label"
                :label="label"
                :value="label"
              />
            </el-select>
          </el-col>
          <el-col :span="12">
            <el-input-number
              v-model="limit"
              :min="1"
              :max="1000"
              :step="1"
              :precision="0"
              placeholder="结果数量限制"
              style="width: 100%"
            />
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card style="margin-top: 20px;" v-if="results.length > 0">
      <template #header>
        <div class="card-header">
          <span>查询结果 ({{ results.length }} 条)</span>
          <el-button type="info" @click="exportResults">导出结果</el-button>
        </div>
      </template>
      
      <div class="results-section">
        <el-table :data="results" stripe style="width: 100%">
          <el-table-column type="expand">
            <template #default="props">
              <div class="node-details">
                <h4>节点属性:</h4>
                <el-descriptions :column="2" border>
                  <el-descriptions-item
                    v-for="(value, key) in props.row.properties"
                    :key="key"
                    :label="key"
                  >
                    {{ formatProperty(value) }}
                  </el-descriptions-item>
                </el-descriptions>
                
                <div style="margin-top: 20px;">
                  <el-button type="primary" size="small" @click="viewRelationships(props.row)">
                    查看关系
                  </el-button>
                  <el-button type="success" size="small" @click="visualizeNode(props.row)">
                    可视化
                  </el-button>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="id" label="节点ID" width="100" />
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
          
          <el-table-column label="主要属性" min-width="300">
            <template #default="scope">
              <div class="property-preview">
                <span
                  v-for="(value, key) in getMainProperties(scope.row.properties)"
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
              <el-button type="primary" size="small" @click="editNode(scope.row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deleteNode(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
    
    <el-empty v-else-if="searched && !loading" description="未找到相关节点" />
    
    <!-- 节点关系对话框 -->
    <el-dialog
      v-model="relationshipDialog"
      title="节点关系"
      width="80%"
      :before-close="handleClose"
    >
      <div v-if="relationships.length > 0">
        <el-table :data="relationships" stripe>
          <el-table-column prop="type" label="关系类型" width="150" />
          <el-table-column prop="direction" label="方向" width="100" />
          <el-table-column label="目标节点">
            <template #default="scope">
              <div>
                <el-tag
                  v-for="label in scope.row.targetLabels"
                  :key="label"
                  size="small"
                  style="margin-right: 5px;"
                >
                  {{ label }}
                </el-tag>
                <div style="margin-top: 5px;">
                  <span
                    v-for="(value, key) in getMainProperties(scope.row.targetProperties)"
                    :key="key"
                    class="property-item"
                  >
                    <strong>{{ key }}:</strong> {{ formatProperty(value) }}
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="该节点没有关系" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import neo4jService from '../services/neo4j'

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

const searchNodes = async () => {
  if (!queryText.value.trim()) {
    ElMessage.warning('请输入查询内容')
    return
  }
  
  loading.value = true
  searched.value = true
  
  try {
    let query = `
      MATCH (n)
      WHERE ANY(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $text)
    `
    
    if (selectedLabel.value) {
      query += ` AND $label IN labels(n)`
    }
    
    query += `
      RETURN n, labels(n) as labels, id(n) as id
      LIMIT $limit
    `
    
    const limitValue = Math.floor(Number(limit.value))
    
    const params = {
      text: queryText.value,
      limit: neo4jService.neo4j.int(limitValue)
    }
    
    if (selectedLabel.value) {
      params.label = selectedLabel.value
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
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  return String(value)
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

const visualizeNode = (node) => {
  router.push({
    path: '/graph',
    query: { nodeId: node.id }
  })
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
.node-query {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.query-section {
  padding: 20px 0;
}

.results-section {
  min-height: 400px;
}

.node-details {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 10px 0;
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
  margin-bottom: 5px;
}

.property-item strong {
  color: #409eff;
}
</style>
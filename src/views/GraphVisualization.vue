<template>
  <div class="graph-visualization">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>图形可视化</span>
          <div class="header-actions">
            <el-button @click="resetGraph">重置</el-button>
            <el-button type="primary" @click="loadGraph">加载图形</el-button>
          </div>
        </div>
      </template>
      
      <div class="control-panel">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input-number
              v-model="nodeLimit"
              :min="10"
              :max="1000"
              :step="1"
              :precision="0"
              placeholder="节点数量"
              style="width: 100%"
            />
          </el-col>
          <el-col :span="6">
            <el-select v-model="selectedLabel" placeholder="节点标签筛选" clearable style="width: 100%">
              <el-option
                v-for="label in labels"
                :key="label"
                :label="label"
                :value="label"
              />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="selectedRelType" placeholder="关系类型筛选" clearable style="width: 100%">
              <el-option
                v-for="relType in relationshipTypes"
                :key="relType"
                :label="relType"
                :value="relType"
              />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-switch
              v-model="showLabels"
              active-text="显示标签"
              inactive-text="隐藏标签"
              @change="updateLabels"
            />
          </el-col>
        </el-row>
        
        <el-row :gutter="20" style="margin-top: 15px;">
          <el-col :span="12">
            <el-input
              v-model="searchText"
              placeholder="搜索节点..."
              @keyup.enter="searchInGraph"
            >
              <template #prepend>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="12">
            <el-button @click="searchInGraph">搜索</el-button>
            <el-button @click="fitToScreen">适应屏幕</el-button>
            <el-button @click="exportGraph">导出图片</el-button>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card style="margin-top: 20px;">
      <div class="graph-container">
        <div
          ref="graphContainer"
          class="graph-canvas"
          :style="{ height: graphHeight + 'px' }"
        />
        
        <div class="graph-info">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="节点数量" :value="nodeCount" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="关系数量" :value="edgeCount" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="连接组件" :value="clusters" />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>
    
    <!-- 节点详情面板 -->
    <el-drawer
      v-model="nodeDrawer"
      title="节点详情"
      size="400px"
      direction="rtl"
    >
      <div v-if="selectedNode">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="节点ID">
            {{ selectedNode.id }}
          </el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag
              v-for="label in selectedNode.labels"
              :key="label"
              style="margin-right: 5px;"
            >
              {{ label }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <el-divider>节点属性</el-divider>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item
            v-for="(value, key) in selectedNode.properties"
            :key="key"
            :label="key"
          >
            {{ formatProperty(value) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <el-divider>操作</el-divider>
        
        <el-space>
          <el-button type="primary" @click="editSelectedNode">编辑节点</el-button>
          <el-button type="success" @click="expandNode">展开节点</el-button>
          <el-button type="danger" @click="deleteSelectedNode">删除节点</el-button>
        </el-space>
      </div>
    </el-drawer>
    
    <!-- 关系详情面板 -->
    <el-drawer
      v-model="edgeDrawer"
      title="关系详情"
      size="400px"
      direction="rtl"
    >
      <div v-if="selectedEdge">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="关系类型">
            {{ selectedEdge.type }}
          </el-descriptions-item>
          <el-descriptions-item label="起始节点">
            {{ selectedEdge.from }}
          </el-descriptions-item>
          <el-descriptions-item label="目标节点">
            {{ selectedEdge.to }}
          </el-descriptions-item>
        </el-descriptions>
        
        <el-divider>关系属性</el-divider>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item
            v-for="(value, key) in selectedEdge.properties"
            :key="key"
            :label="key"
          >
            {{ formatProperty(value) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <el-divider>操作</el-divider>
        
        <el-space>
          <el-button type="primary" @click="editSelectedEdge">编辑关系</el-button>
          <el-button type="danger" @click="deleteSelectedEdge">删除关系</el-button>
        </el-space>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import neo4jService from '../services/neo4j'

const route = useRoute()
const router = useRouter()

const graphContainer = ref(null)
const graphHeight = ref(600)
const nodeLimit = ref(100)
const selectedLabel = ref('')
const selectedRelType = ref('')
const showLabels = ref(true)
const searchText = ref('')
const nodeDrawer = ref(false)
const edgeDrawer = ref(false)
const selectedNode = ref(null)
const selectedEdge = ref(null)

const labels = ref([])
const relationshipTypes = ref([])
const nodeCount = ref(0)
const edgeCount = ref(0)
const clusters = ref(0)

let network = null
let nodes = new DataSet()
let edges = new DataSet()

const loadGraph = async () => {
  try {
    let query = `
      MATCH (n)-[r]->(m)
    `
    
    const conditions = []
    const params = { limit: neo4jService.neo4j.int(Math.floor(Number(nodeLimit.value))) }
    
    if (selectedLabel.value) {
      conditions.push(`$label IN labels(n) OR $label IN labels(m)`)
      params.label = selectedLabel.value
    }
    
    if (selectedRelType.value) {
      conditions.push(`type(r) = $relType`)
      params.relType = selectedRelType.value
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += `
      RETURN n, r, m, labels(n) as nLabels, labels(m) as mLabels, 
             id(n) as nId, id(m) as mId, type(r) as relType
      LIMIT $limit
    `
    
    const result = await neo4jService.runQuery(query, params)
    
    const nodeMap = new Map()
    const edgeList = []
    
    result.forEach(record => {
      const startNode = record.get('n')
      const endNode = record.get('m')
      const relationship = record.get('r')
      const startId = record.get('nId').toNumber()
      const endId = record.get('mId').toNumber()
      const startLabels = record.get('nLabels')
      const endLabels = record.get('mLabels')
      const relType = record.get('relType')
      
      // 添加起始节点
      if (!nodeMap.has(startId)) {
        nodeMap.set(startId, {
          id: startId,
          label: showLabels.value ? getNodeLabel(startNode.properties, startLabels) : '',
          group: startLabels[0] || 'default',
          labels: startLabels,
          properties: startNode.properties,
          color: getNodeColor(startLabels[0]),
          size: 20
        })
      }
      
      // 添加结束节点
      if (!nodeMap.has(endId)) {
        nodeMap.set(endId, {
          id: endId,
          label: showLabels.value ? getNodeLabel(endNode.properties, endLabels) : '',
          group: endLabels[0] || 'default',
          labels: endLabels,
          properties: endNode.properties,
          color: getNodeColor(endLabels[0]),
          size: 20
        })
      }
      
      // 添加关系
      edgeList.push({
        id: relationship.identity.toNumber(),
        from: startId,
        to: endId,
        label: showLabels.value ? relType : '',
        type: relType,
        properties: relationship.properties,
        arrows: 'to',
        color: getEdgeColor(relType)
      })
    })
    
    // 更新数据
    nodes.clear()
    edges.clear()
    nodes.add(Array.from(nodeMap.values()))
    edges.add(edgeList)
    
    // 更新统计信息
    nodeCount.value = nodes.length
    edgeCount.value = edges.length
    clusters.value = calculateClusters()
    
    ElMessage.success(`加载了 ${nodeCount.value} 个节点和 ${edgeCount.value} 个关系`)
    
  } catch (error) {
    console.error('加载图形失败:', error)
    ElMessage.error('加载图形失败')
  }
}

const initNetwork = () => {
  if (!graphContainer.value) return
  
  const data = { nodes, edges }
  
  const options = {
    nodes: {
      font: {
        size: 14,
        color: '#333'
      },
      borderWidth: 2,
      shadow: true,
      chosen: true
    },
    edges: {
      width: 2,
      shadow: true,
      smooth: {
        type: 'continuous'
      },
      font: {
        size: 12,
        color: '#666'
      }
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 100 },
      barnesHut: {
        gravitationalConstant: -2000,
        springLength: 200,
        springConstant: 0.04
      }
    },
    interaction: {
      hover: true,
      selectConnectedEdges: false
    },
    layout: {
      improvedLayout: true
    }
  }
  
  network = new Network(graphContainer.value, data, options)
  
  // 添加事件监听
  network.on('click', (event) => {
    if (event.nodes.length > 0) {
      const nodeId = event.nodes[0]
      const node = nodes.get(nodeId)
      selectedNode.value = node
      nodeDrawer.value = true
    } else if (event.edges.length > 0) {
      const edgeId = event.edges[0]
      const edge = edges.get(edgeId)
      selectedEdge.value = edge
      edgeDrawer.value = true
    }
  })
  
  network.on('stabilizationIterationsDone', () => {
    network.setOptions({ physics: false })
  })
}

const getNodeLabel = (properties, labels) => {
  // 优先显示中文属性
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' && /[\u4e00-\u9fa5]/.test(value)) {
      return value.length > 10 ? value.substring(0, 10) + '...' : value
    }
  }
  
  // 如果没有中文，显示第一个属性
  const firstProp = Object.values(properties)[0]
  if (firstProp) {
    const str = String(firstProp)
    return str.length > 10 ? str.substring(0, 10) + '...' : str
  }
  
  return labels[0] || 'Node'
}

const getNodeColor = (label) => {
  const colors = {
    'Person': '#97C2FC',
    'Movie': '#FB7E81',
    'Actor': '#7BE141',
    'Director': '#FFA807',
    'Genre': '#AD85E4',
    'default': '#D3D3D3'
  }
  return colors[label] || colors.default
}

const getEdgeColor = (type) => {
  const colors = {
    'ACTED_IN': '#848484',
    'DIRECTED': '#2B7CE9',
    'PRODUCED': '#00A652',
    'FOLLOWS': '#FD5A77',
    'default': '#848484'
  }
  return colors[type] || colors.default
}

const calculateClusters = () => {
  // 简单的连接组件计算
  const visited = new Set()
  let clusterCount = 0
  
  const dfs = (nodeId) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    
    const connectedEdges = edges.get({
      filter: (edge) => edge.from === nodeId || edge.to === nodeId
    })
    
    connectedEdges.forEach(edge => {
      const nextNode = edge.from === nodeId ? edge.to : edge.from
      dfs(nextNode)
    })
  }
  
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id)
      clusterCount++
    }
  })
  
  return clusterCount
}

const updateLabels = () => {
  const nodeUpdates = nodes.map(node => ({
    id: node.id,
    label: showLabels.value ? getNodeLabel(node.properties, node.labels) : ''
  }))
  
  const edgeUpdates = edges.map(edge => ({
    id: edge.id,
    label: showLabels.value ? edge.type : ''
  }))
  
  nodes.update(nodeUpdates)
  edges.update(edgeUpdates)
}

const searchInGraph = () => {
  if (!searchText.value.trim()) {
    ElMessage.warning('请输入搜索内容')
    return
  }
  
  const foundNodes = nodes.get({
    filter: (node) => {
      const searchLower = searchText.value.toLowerCase()
      return JSON.stringify(node.properties).toLowerCase().includes(searchLower)
    }
  })
  
  if (foundNodes.length > 0) {
    const nodeIds = foundNodes.map(node => node.id)
    network.selectNodes(nodeIds)
    network.fit({ nodes: nodeIds })
    ElMessage.success(`找到 ${foundNodes.length} 个匹配节点`)
  } else {
    ElMessage.info('未找到匹配的节点')
  }
}

const fitToScreen = () => {
  if (network) {
    network.fit()
  }
}

const exportGraph = () => {
  if (network) {
    const canvas = network.getCanvas()
    const link = document.createElement('a')
    link.download = `graph_${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL()
    link.click()
  }
}

const resetGraph = () => {
  nodes.clear()
  edges.clear()
  nodeCount.value = 0
  edgeCount.value = 0
  clusters.value = 0
  if (network) {
    network.fit()
  }
}

const expandNode = async () => {
  if (!selectedNode.value) return
  
  try {
    const result = await neo4jService.getNodeRelationships(selectedNode.value.id)
    
    const newNodes = []
    const newEdges = []
    
    result.forEach(record => {
      const startNode = record.get('n')
      const endNode = record.get('m')
      const relationship = record.get('r')
      const relType = record.get('relType')
      
      const otherNode = startNode.identity.toNumber() === selectedNode.value.id ? endNode : startNode
      const otherNodeId = otherNode.identity.toNumber()
      
      // 检查节点是否已存在
      if (!nodes.get(otherNodeId)) {
        newNodes.push({
          id: otherNodeId,
          label: showLabels.value ? getNodeLabel(otherNode.properties, otherNode.labels) : '',
          group: otherNode.labels[0] || 'default',
          labels: otherNode.labels,
          properties: otherNode.properties,
          color: getNodeColor(otherNode.labels[0]),
          size: 20
        })
      }
      
      // 检查关系是否已存在
      const relId = relationship.identity.toNumber()
      if (!edges.get(relId)) {
        newEdges.push({
          id: relId,
          from: startNode.identity.toNumber(),
          to: endNode.identity.toNumber(),
          label: showLabels.value ? relType : '',
          type: relType,
          properties: relationship.properties,
          arrows: 'to',
          color: getEdgeColor(relType)
        })
      }
    })
    
    if (newNodes.length > 0) {
      nodes.add(newNodes)
    }
    if (newEdges.length > 0) {
      edges.add(newEdges)
    }
    
    // 更新统计信息
    nodeCount.value = nodes.length
    edgeCount.value = edges.length
    clusters.value = calculateClusters()
    
    ElMessage.success(`展开了 ${newNodes.length} 个新节点`)
    
  } catch (error) {
    console.error('展开节点失败:', error)
    ElMessage.error('展开节点失败')
  }
}

const editSelectedNode = () => {
  if (selectedNode.value) {
    router.push({
      path: '/data',
      query: { action: 'edit', nodeId: selectedNode.value.id }
    })
  }
}

const deleteSelectedNode = async () => {
  if (!selectedNode.value) return
  
  try {
    await ElMessageBox.confirm('确定要删除这个节点吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await neo4jService.deleteNode(selectedNode.value.id)
    
    // 从图形中移除节点
    nodes.remove(selectedNode.value.id)
    
    // 移除相关边
    const relatedEdges = edges.get({
      filter: (edge) => edge.from === selectedNode.value.id || edge.to === selectedNode.value.id
    })
    edges.remove(relatedEdges.map(edge => edge.id))
    
    nodeDrawer.value = false
    selectedNode.value = null
    
    // 更新统计信息
    nodeCount.value = nodes.length
    edgeCount.value = edges.length
    clusters.value = calculateClusters()
    
    ElMessage.success('节点删除成功')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error)
      ElMessage.error('删除节点失败')
    }
  }
}

const editSelectedEdge = () => {
  if (selectedEdge.value) {
    router.push({
      path: '/data',
      query: { action: 'edit', edgeId: selectedEdge.value.id }
    })
  }
}

const deleteSelectedEdge = async () => {
  if (!selectedEdge.value) return
  
  try {
    await ElMessageBox.confirm('确定要删除这个关系吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 删除关系的具体实现需要根据Neo4j的关系ID来删除
    // 这里简化处理，直接从图形中移除
    edges.remove(selectedEdge.value.id)
    
    edgeDrawer.value = false
    selectedEdge.value = null
    
    // 更新统计信息
    edgeCount.value = edges.length
    
    ElMessage.success('关系删除成功')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除关系失败:', error)
      ElMessage.error('删除关系失败')
    }
  }
}

const formatProperty = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...'
  }
  return String(value)
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

onMounted(async () => {
  await nextTick()
  initNetwork()
  loadLabels()
  loadRelationshipTypes()
  
  // 检查是否有特定节点需要显示
  if (route.query.nodeId) {
    const nodeId = parseInt(route.query.nodeId)
    // 加载特定节点的图形
    try {
      const result = await neo4jService.getNodeRelationships(nodeId)
      // 处理特定节点的可视化
    } catch (error) {
      console.error('加载特定节点失败:', error)
    }
  }
})

onUnmounted(() => {
  if (network) {
    network.destroy()
  }
})
</script>

<style scoped>
.graph-visualization {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.control-panel {
  padding: 20px 0;
}

.graph-container {
  position: relative;
}

.graph-canvas {
  border: 1px solid #ddd;
  border-radius: 8px;
  width: 100%;
  background: #f9f9f9;
}

.graph-info {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.node-details, .edge-details {
  padding: 20px;
}

.el-space {
  width: 100%;
}
</style>
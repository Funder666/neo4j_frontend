src/views/Dashboard.vue<template>
  <AppLayout>
    <div class="dashboard-container">
          <!-- 欢迎横幅 -->
          <div class="welcome-banner">
            <div class="banner-content">
              <div class="welcome-text">
                <h2>欢迎回来，{{ currentUser?.username }}</h2>
                <p>管理和探索您的Neo4j图数据库</p>
              </div>
              <div class="banner-actions">
                <el-button type="primary" size="large" @click="$router.push('/query')">
                  <el-icon><Search /></el-icon>
                  开始查询
                </el-button>
              </div>
            </div>
          </div>


          <!-- 汉字节点示例 -->
          <div class="example-section">
            <div class="section-header">
<!--              <h3>汉字知识图谱示例</h3>-->
            </div>
            
            <div class="example-grid">
              <div class="example-card">
                <div class="example-header">
                  <h4>
                    <el-icon><Collection /></el-icon>
                    示例："国际中文教育知识图谱”关系图
                  </h4>
                  <div class="node-count-badge">
                    {{ characterResults.length }} 个节点
                  </div>
                </div>
                <div class="example-content">
                  <!-- 图形可视化区域 -->
                  <div class="graph-container">
                    <div ref="exampleNetworkContainer" class="example-network-container"></div>
                    
                    <!-- 选中节点信息面板 -->
                    <div v-if="selectedExampleNode" class="example-node-info-panel">
                      <div class="example-panel-header">
                        <h5 class="example-panel-title">
                          <el-icon><InfoFilled /></el-icon>
                          节点信息
                        </h5>
                        <el-button type="text" @click="selectedExampleNode = null" class="close-btn">
                          <el-icon><Close /></el-icon>
                        </el-button>
                      </div>
                      <div class="example-panel-content">
                        <div class="example-node-basic-info">
                          <div class="info-item">
                            <span class="info-label">ID:</span>
                            <span class="info-value">{{ selectedExampleNode.id }}</span>
                          </div>
                          <div class="info-item">
                            <span class="info-label">标签:</span>
                            <div class="info-labels">
                              <el-tag
                                v-for="label in selectedExampleNode.labels"
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
                        
                        <!-- 节点操作区域（只有查看关系） -->
                        <div class="example-node-operations">
                          <h6 class="operations-title">操作</h6>
                          <div class="example-panel-actions">
                            <el-button 
                              type="success" 
                              size="small"
                              class="action-btn"
                              @click="showExampleNodeRelationships(selectedExampleNode)"
                            >
                              <el-icon><Share /></el-icon>
                              查看关系
                            </el-button>
                          </div>
                        </div>
                        
                        <div class="example-node-properties">
                          <h6 class="properties-title">属性</h6>
                          <div class="properties-list">
                            <div 
                              v-for="(value, key) in getVisibleProperties(selectedExampleNode)"
                              :key="key"
                              class="property-row"
                            >
                              <div class="property-name">{{ getPropertyDisplayName(key, selectedExampleNode.labels) }}</div>
                              <div class="property-val">{{ formatProperty(value) }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="exampleLoading" class="loading-example">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>正在加载汉字节点示例...</span>
                  </div>
                  
                  <div v-else-if="!characterResults.length" class="empty-example">
                    <div class="empty-message">暂无汉字节点数据</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  Share,
  Collection,
  InfoFilled,
  Close,
  Loading
} from '@element-plus/icons-vue'
import authService from '../services/auth'
import apiService from '../services/api'
import AppLayout from '../components/AppLayout.vue'
import { Network } from 'vis-network'

const router = useRouter()

const currentUser = ref(authService.getCurrentUser())

// 汉字示例相关变量
const characterResults = ref([])
const relationshipsData = ref([])
const selectedExampleNode = ref(null)
const exampleLoading = ref(false)
const exampleNetworkContainer = ref(null)
const exampleNetwork = ref(null)
const availableLabels = ref([])
const propertyPermissions = ref({})

onMounted(async () => {
  // 首先加载标签映射
  await loadAvailableLabels()
  // 然后加载汉字示例
  await loadCharacterExample()
})

// 加载汉字节点示例 - 专门查询"国际中文教育知识图谱"这10个汉字
const loadCharacterExample = async () => {
  exampleLoading.value = true
  
  try {
    // 定义要查询的汉字
    const targetCharacters = ['国', '际', '中', '文', '教', '育', '知', '识', '图', '谱']
    
    // 构造Cypher查询，查找这些汉字及其关系
    const query = `
      MATCH (c:Character)
      WHERE c.value IN $characters
      OPTIONAL MATCH (c)-[r:HAS_RADICAL|HAS_PINYIN|DEPENDS_ON]-(related)
      RETURN c, r, related
    `
    
    const response = await apiService.runQuery(query, { characters: targetCharacters })
    
    // 处理响应数据
    let records = []
    if (response.records) {
      records = response.records
    } else if (Array.isArray(response)) {
      records = response
    }
    
    // 提取汉字节点
    const characterMap = new Map()
    const relationships = []
    
    records.forEach(record => {
      // 添加汉字节点
      if (record.c) {
        characterMap.set(record.c.id, record.c)
      }
      
      // 添加关系和相关节点
      if (record.r && record.related) {
        relationships.push({
          start_node: record.c,
          relationship: record.r,
          end_node: record.related
        })
        
        // 也保存相关节点（如部首、拼音等）
        if (record.related) {
          characterMap.set(record.related.id, record.related)
        }
      }
    })
    
    characterResults.value = Array.from(characterMap.values()).map(node => ({ n: node }))
    relationshipsData.value = relationships
    
    if (characterResults.value.length === 0) {
      ElMessage.info('未找到"国际中文教育知识图谱"相关汉字节点')
    } else {
      ElMessage.success(`加载了"国际中文教育知识图谱"中的 ${characterResults.value.length} 个节点和 ${relationships.length} 个关系`)
      // 创建图形可视化
      setTimeout(() => {
        createExampleNetwork()
      }, 100)
    }
  } catch (error) {
    console.error('加载汉字示例失败:', error)
    ElMessage.error('加载汉字示例失败: ' + error.message)
  } finally {
    exampleLoading.value = false
  }
}

// 创建示例网络图
const createExampleNetwork = () => {
  if (!exampleNetworkContainer.value || !characterResults.value.length) return

  // 清理旧的网络
  if (exampleNetwork.value) {
    exampleNetwork.value.destroy()
  }

  const nodes = characterResults.value.map(record => {
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
      data: node
    }
  })

  // 创建边数据
  const edges = relationshipsData.value.map((relData, index) => {
    const relationship = relData.relationship
    const startNode = relData.start_node
    const endNode = relData.end_node
    
    return {
      id: relationship.id || `edge_${index}`,
      from: startNode.id,
      to: endNode.id,
      label: relationship.type,
      title: `关系类型: ${relationship.type}\n属性: ${relationship.properties ? JSON.stringify(relationship.properties) : '无'}`,
      color: {
        color: getRelationshipColor(relationship.type),
        highlight: getRelationshipHighlightColor(relationship.type)
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
          scaleFactor: 1.2,
          type: 'arrow'
        }
      },
      arrowStrikethrough: false,
      smooth: {
        enabled: true,
        type: 'dynamic',
        roundness: 0.2
      },
      width: 3,
      data: relationship
    }
  })

  const data = {
    nodes: nodes,
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
        size: 14,
        strokeWidth: 2,
        strokeColor: '#ffffff'
      },
      width: 3
    },
    interaction: {
      hover: true,
      selectConnectedEdges: true,
      tooltipDelay: 300
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 150 },
      barnesHut: {
        gravitationalConstant: -3000,
        centralGravity: 0.5,
        springLength: 200,
        springConstant: 0.06,
        damping: 0.1
      }
    }
  }

  exampleNetwork.value = new Network(exampleNetworkContainer.value, data, options)

  // 监听节点选择事件
  exampleNetwork.value.on('selectNode', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const record = characterResults.value.find(record => {
        const node = record.n || record;
        return node.id === nodeId
      })
      if (record) {
        selectedExampleNode.value = record.n || record
      }
    }
  })

  // 监听空白区域点击
  exampleNetwork.value.on('deselectNode', () => {
    selectedExampleNode.value = null
  })
}

// 节点颜色映射
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
  return color
}

// 关系类型高亮颜色
const getRelationshipHighlightColor = (relationshipType) => {
  const highlightColors = {
    'HAS_PINYIN': '#E74C3C',        // 深红色
    'HAS_RADICAL': '#17A2B8',       // 深青色
    'SYNONYM': '#3498DB',           // 深蓝色
    'ANTONYM': '#28A745',           // 深绿色
    'DEPENDS_ON': '#F1C40F',        // 深黄色
    'CONTAINS': '#8E44AD',          // 深紫色
    'RELATES_TO': '#E67E22',        // 深橙色
    'default': '#764ba2'            // 默认深蓝紫色
  }
  return highlightColors[relationshipType] || highlightColors.default
}

// 格式化属性值
const formatProperty = (value) => {
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// 查看示例节点关系
const showExampleNodeRelationships = async (node) => {
  try {
    exampleLoading.value = true
    
    const response = await apiService.getNodeRelationships(node.id)
    
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
    
    // 创建关系图
    setTimeout(() => {
      createExampleRelationshipNetwork(node, relationships)
    }, 100)
    
    ElMessage.success(`找到 ${relationships.length} 个关系`)
  } catch (error) {
    console.error('获取节点关系失败:', error)
    ElMessage.error('获取节点关系失败: ' + error.message)
  } finally {
    exampleLoading.value = false
  }
}

// 创建关系网络图
const createExampleRelationshipNetwork = (centerNode, relationships) => {
  if (!exampleNetworkContainer.value) return

  // 清理旧的网络
  if (exampleNetwork.value) {
    exampleNetwork.value.destroy()
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
      background: '#FF6B6B',
      border: '#E55654'
    },
    font: { 
      color: '#2c3e50', 
      size: 24,
      face: 'Arial, sans-serif',
      strokeWidth: 2,
      strokeColor: '#ffffff'
    },
    shape: 'circle',
    size: 80,
    data: centerNode,
    borderWidth: 4
  })

  // 处理关系数据
  relationships.forEach((record, index) => {
    let startNode, relationship, endNode

    if (record.n && record.r && record.m) {
      startNode = record.n
      relationship = record.r
      endNode = record.m
    } else if (record.start_node && record.relationship && record.end_node) {
      startNode = record.start_node
      relationship = record.relationship
      endNode = record.end_node
    } else {
      return
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
        title: `ID: ${startNode.id}\n标签: ${startNode.labels ? startNode.labels.join(', ') : 'Unknown'}`,
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
        title: `ID: ${endNode.id}\n标签: ${endNode.labels ? endNode.labels.join(', ') : 'Unknown'}`,
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
      const edgeColor = getRelationshipColor(relationship.type)
      
      edges.push({
        id: relationship.id || `edge_${index}`,
        from: startNode.id,
        to: endNode.id,
        label: relationship.type,
        title: `关系类型: ${relationship.type}`,
        color: {
          color: edgeColor,
          highlight: edgeColor
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
            scaleFactor: 1.2,
            type: 'arrow'
          }
        },
        arrowStrikethrough: false,
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
    }
  }

  exampleNetwork.value = new Network(exampleNetworkContainer.value, data, options)

  // 监听节点选择事件
  exampleNetwork.value.on('selectNode', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0]
      const nodeData = nodes.get(nodeId)
      if (nodeData) {
        selectedExampleNode.value = nodeData.data
      }
    }
  })

  // 监听空白区域点击
  exampleNetwork.value.on('deselectNode', () => {
    selectedExampleNode.value = null
  })
}

// 关系类型颜色映射
const getRelationshipColor = (relationshipType) => {
  const colors = {
    'HAS_PINYIN': '#FF6B6B',
    'HAS_RADICAL': '#4ECDC4',
    'SYNONYM': '#45B7D1',
    'ANTONYM': '#96CEB4',
    'DEPENDS_ON': '#F7DC6F',
    'CONTAINS': '#BB8FCE',
    'RELATES_TO': '#F8C471',
    'default': '#667eea'
  }
  return colors[relationshipType] || colors.default
}

// 加载可用标签
const loadAvailableLabels = async () => {
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
        console.error('获取节点数量失败，使用映射数据但不显示计数:', countError)
        // 如果获取计数失败，使用映射数据但不显示计数
        availableLabels.value = nodeMappings.map(mapping => ({
          id: mapping.id,
          neo4j_name: mapping.neo4j_name,
          display_name: mapping.display_name,
          count: 0,
          description: mapping.description
        }))
        
        // 即使计数失败，也要加载属性权限
        for (const mapping of nodeMappings) {
          await loadPropertyPermissions(mapping.id)
        }
      }
    }
  } catch (error) {
    console.error('加载节点标签失败:', error)
    availableLabels.value = []
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
        can_view: prop.can_view,
        can_edit: prop.can_edit
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
    return true
  }
  
  // 查找匹配的标签映射
  const matchingLabel = availableLabels.value.find(label => 
    nodeLabels.includes(label.neo4j_name)
  )
  
  if (matchingLabel && propertyPermissions.value[matchingLabel.id]) {
    const permission = propertyPermissions.value[matchingLabel.id][propertyKey]
    return permission ? permission.can_view : false
  }
  
  return true
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
</script>

<style scoped>
/* 主容器 */
.dashboard-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
}

/* Dashboard 内容样式 */

/* 欢迎横幅 */
.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  padding: 40px;
  color: white;
  position: relative;
  overflow: hidden;
}

.welcome-banner::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 200px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="3" fill="rgba(255,255,255,0.1)"/><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
  opacity: 0.3;
}

.banner-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.welcome-text h2 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.welcome-text p {
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
}

.banner-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.banner-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* 统计卡片 */
.stats-section {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  justify-content: center;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.6;
}

.stat-card.nodes::before {
  color: #667eea;
}

.stat-card.relationships::before {
  color: #52c41a;
}

.stat-card.labels::before {
  color: #faad14;
}

.stat-card.performance::before {
  color: #722ed1;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.stat-card.nodes .stat-icon-wrapper {
  background: linear-gradient(135deg, #667eea20, #667eea10);
  color: #667eea;
}

.stat-card.relationships .stat-icon-wrapper {
  background: linear-gradient(135deg, #52c41a20, #52c41a10);
  color: #52c41a;
}

.stat-card.labels .stat-icon-wrapper {
  background: linear-gradient(135deg, #faad1420, #faad1410);
  color: #faad14;
}

.stat-card.performance .stat-icon-wrapper {
  background: linear-gradient(135deg, #722ed120, #722ed110);
  color: #722ed1;
}

.stat-icon {
  font-size: 28px;
}

.stat-details {
  flex: 1;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 8px 0;
  line-height: 1;
}

.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: #7f8c8d;
  margin: 0 0 4px 0;
}

.stat-trend {
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
  background: rgba(82, 196, 26, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
}

/* 功能面板 */
.features-section {
  margin: 0;
}

.section-header {
  text-align: center;
  margin-bottom: 32px;
}

.section-header h3 {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.section-header p {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  flex-shrink: 0;
}

.feature-icon.query {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.feature-icon.visualization {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.feature-icon.management {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.feature-content {
  flex: 1;
}

.feature-content h4 {
  font-size: 18px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.feature-content p {
  font-size: 14px;
  color: #7f8c8d;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.feature-stats span {
  font-size: 12px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.feature-arrow {
  color: #7f8c8d;
  font-size: 18px;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-arrow {
  color: #667eea;
  transform: translateX(4px);
}

/* 汉字示例面板 */
.example-section {
  margin: 0;
}

.example-grid {
  display: grid;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.example-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.example-header h4 {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-count-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.example-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.graph-container {
  position: relative;
  border: 1px solid #e8ecf0;
  border-radius: 12px;
  overflow: hidden;
  min-height: 500px;
}

.example-network-container {
  width: 100%;
  height: 500px;
  background: #fafbfc;
}

.example-node-info-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 300px;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-left: 1px solid #e8ecf0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.example-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8ecf0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.example-panel-title {
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

.example-panel-content {
  padding: 16px;
}

.example-node-basic-info {
  margin-bottom: 20px;
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

.example-node-operations,
.example-node-properties {
  border-top: 1px solid #e8ecf0;
  padding-top: 16px;
  margin-bottom: 16px;
}

.operations-title,
.properties-title {
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.example-panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.example-panel-actions .action-btn {
  flex: 1;
  min-width: 100px;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.example-panel-actions .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.properties-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.property-row {
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
  padding: 10px;
  border-left: 3px solid #667eea;
}

.property-name {
  font-size: 11px;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.property-val {
  font-size: 13px;
  color: #2c3e50;
  word-break: break-all;
  line-height: 1.3;
}

.loading-example {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #7f8c8d;
}

.empty-example {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
}

.empty-message {
  font-size: 16px;
  color: #7f8c8d;
  background: rgba(127, 140, 141, 0.1);
  padding: 20px 30px;
  border-radius: 12px;
  border: 1px solid rgba(127, 140, 141, 0.2);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-container {
    grid-template-columns: 240px 1fr;
  }
  
  .main-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    grid-template-areas: 
      "navbar"
      "main";
    grid-template-rows: 80px 1fr;
    grid-template-columns: 1fr;
  }
  
  .sidebar-nav {
    display: none;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .welcome-banner {
    padding: 24px;
  }
  
  .banner-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .welcome-text h2 {
    font-size: 24px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}

/* Element Plus 样式覆盖 */
.nav-menu .el-menu-item {
  border-radius: 12px !important;
  margin: 4px 16px !important;
  color: #2c3e50 !important;
}

.nav-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
}

.nav-menu .el-menu-item:hover {
  background: rgba(102, 126, 234, 0.1) !important;
}
</style>
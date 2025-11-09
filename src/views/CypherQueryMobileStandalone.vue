<template>
  <div class="cypher-query-mobile">
    <!-- 移动端头部 -->
    <div class="mobile-header">
      <h1>智能查询</h1>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 查询模式选择 -->
      <div class="query-mode-section">
        <div class="mode-selector">
          <button
            :class="['mode-btn', { active: queryMode === 'cypher' }]"
            @click="switchToCypherMode"
          >
            Cypher查询
          </button>
          <button
            :class="['mode-btn', { active: queryMode === 'smart' }]"
            @click="switchToSmartMode"
          >
            智能查询
          </button>
        </div>
      </div>

      <!-- Cypher查询区域 -->
      <div v-if="queryMode === 'cypher'" class="cypher-query-section">
        <!-- 查询模板 - 只在Cypher查询模式下显示 -->
        <div class="templates-section">
          <div class="section-header">
            <h3>常用模板</h3>
          </div>

          <div class="template-tabs">
            <button
              :class="['tab-btn', { active: activeTab === 'builtin' }]"
              @click="activeTab = 'builtin'"
            >
              系统模板
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'custom' }]"
              @click="activeTab = 'custom'"
            >
              自定义模板
            </button>
          </div>

          <div class="templates-list">
            <div v-if="activeTab === 'builtin'">
              <div
                v-for="template in builtinTemplates"
                :key="template.id"
                class="template-item"
                @click="applyTemplate(template)"
              >
                <div class="template-content">
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-description">{{ template.description }}</div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'custom'">
              <div v-if="customTemplates.length === 0" class="empty-templates">
                暂无自定义模板
              </div>
              <div
                v-for="template in customTemplates"
                :key="template.id"
                class="template-item"
              >
                <div class="template-content" @click="applyTemplate(template)">
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-description">{{ template.description }}</div>
                </div>
                <div class="template-actions">
                  <button @click="editTemplate(template)" class="action-btn edit-btn">编辑</button>
                  <button @click="deleteTemplate(template.id)" class="action-btn delete-btn">删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cypher查询输入 -->
        <div class="section-header">
          <h3>Cypher查询</h3>
        </div>

        <div class="query-input-container">
          <textarea
            v-model="query"
            placeholder="输入Cypher查询语句，例如:&#10;MATCH (n) RETURN n LIMIT 10"
            class="query-input"
            rows="6"
          ></textarea>
        </div>

        <!-- 执行按钮区域 -->
        <div class="execute-actions">
          <button
            @click="executeQuery"
            :disabled="!query.trim() || loading"
            class="execute-btn"
          >
            <span class="btn-icon">▶</span>
            {{ loading ? '执行中...' : '执行查询' }}
          </button>

          <button
            @click="downloadSchema"
            :disabled="downloadingSchema"
            class="schema-download-btn"
          >
            <span class="btn-icon">📄</span>
            知识图谱Schema
          </button>

          <button
            @click="downloadApiDocumentation"
            :disabled="downloadingApiDoc"
            class="api-doc-download-btn"
          >
            <span class="btn-icon">📋</span>
            API文档
          </button>
        </div>
      </div>

      <!-- 智能查询区域 -->
      <div v-if="queryMode === 'smart'" class="smart-query-section">
        <div class="section-header">
          <h3>智能查询</h3>
        </div>

        <div class="query-input-container">
          <textarea
            v-model="smartQuery"
            placeholder="请输入自然语言查询，例如：查找所有HSK等级为1的汉字"
            class="smart-input"
            rows="4"
          ></textarea>
        </div>

        <!-- 生成的Cypher查询预览 -->
        <div v-if="generatedCypher" class="generated-cypher-preview">
          <div class="preview-header">
            <h4>生成的Cypher查询</h4>
            <button @click="editGeneratedQuery" class="edit-btn">编辑</button>
          </div>
          <div class="cypher-preview">
            <pre>{{ generatedCypher }}</pre>
          </div>
        </div>

        <div v-if="smartQueryError" class="error-message">{{ smartQueryError }}</div>

        <!-- 执行按钮区域 -->
        <div class="execute-actions">
          <button
            @click="handleSmartQuery"
            :disabled="!smartQuery.trim() || smartQueryLoading"
            class="smart-query-btn"
          >
            <span class="btn-icon">▶</span>
            {{ smartQueryLoading ? '执行中...' : '执行智能查询' }}
          </button>

          <button
            @click="downloadSchema"
            :disabled="downloadingSchema"
            class="schema-download-btn"
          >
            <span class="btn-icon">📄</span>
            知识图谱Schema
          </button>

          <button
            @click="downloadApiDocumentation"
            :disabled="downloadingApiDoc"
            class="api-doc-download-btn"
          >
            <span class="btn-icon">📋</span>
            API文档
          </button>
        </div>
      </div>

      <!-- 查询结果 -->
      <div v-if="queryResult || error" class="results-section">
        <div class="section-header">
          <h3>查询结果</h3>
          <div v-if="queryResult" class="result-actions">
            <button @click="exportData('json')" class="export-btn">导出JSON</button>
            <button @click="exportData('csv')" class="export-btn">导出CSV</button>
            <button @click="exportData('excel')" class="export-btn">导出Excel</button>
          </div>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <div v-if="queryResult" class="result-container">
          <!-- 结果视图切换 -->
          <div class="view-tabs">
            <button
              :class="['view-tab', { active: resultView === 'graph' }]"
              @click="resultView = 'graph'"
              :disabled="!canShowGraph"
            >
              图形
            </button>
            <button
              :class="['view-tab', { active: resultView === 'table' }]"
              @click="resultView = 'table'"
            >
              表格
            </button>
            <button
              :class="['view-tab', { active: resultView === 'text' }]"
              @click="resultView = 'text'"
            >
              文本
            </button>
          </div>

          <!-- 图形视图 -->
          <div v-if="resultView === 'graph' && canShowGraph" class="graph-container">
            <div ref="graphContainer" class="graph"></div>

            <!-- 选中节点信息面板 -->
            <div v-if="selectedNode" class="node-info-panel">
              <div class="panel-header">
                <h4 class="panel-title">节点信息</h4>
                <button @click="selectedNode = null" class="close-btn">×</button>
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
                      <span
                        v-for="label in selectedNode.labels"
                        :key="label"
                        class="node-label-tag"
                      >
                        {{ label }}
                      </span>
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
                      <div class="property-value">
                        <template v-if="isUrl(value)">
                          <a :href="value" target="_blank" class="url-link">{{ value }}</a>
                        </template>
                        <template v-else>
                          {{ formatValue(value) }}
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 表格视图 -->
          <div v-if="resultView === 'table'" class="table-container">
            <table class="result-table">
              <thead>
                <tr>
                  <th v-for="key in tableHeaders" :key="key">{{ key }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in tableRows" :key="index">
                  <td v-for="key in tableHeaders" :key="key">{{ formatValue(row[key]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 文本视图 -->
          <div v-if="resultView === 'text'" class="text-container">
            <pre class="result-text">{{ JSON.stringify(queryResult, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 模态框 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑模板' : '保存模板' }}</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>模板名称</label>
            <input v-model="templateForm.name" type="text" placeholder="输入模板名称" />
          </div>
          <div class="form-group">
            <label>模板描述</label>
            <input v-model="templateForm.description" type="text" placeholder="输入模板描述" />
          </div>
          <div class="form-group">
            <label>Cypher查询</label>
            <textarea v-model="templateForm.query" placeholder="输入Cypher查询语句" rows="4"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="saveTemplate" :disabled="!templateForm.name.trim()" class="save-btn">
            {{ isEditing ? '更新' : '保存' }}
          </button>
          <button @click="closeModal" class="cancel-btn">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { Network } from 'vis-network'
import apiService from '../services/api.js'

export default {
  name: 'CypherQueryMobileStandalone',
  setup() {
    // 响应式数据
    const queryMode = ref('cypher') // 查询模式：cypher 或 smart
    const smartQuery = ref('')
    const query = ref('')
    const loading = ref(false)
    const smartQueryLoading = ref(false)
    const error = ref('')
    const smartQueryError = ref('')
    const queryResult = ref(null)
    const graphData = ref(null) // 图形数据，与原版保持一致
    const resultView = ref('graph')
    const activeTab = ref('builtin')
    const showModal = ref(false)
    const isEditing = ref(false)
    const graphContainer = ref(null)
    const selectedNode = ref(null) // 选中的节点
    const generatedCypher = ref('') // 智能查询生成的Cypher语句
    const downloadingSchema = ref(false) // 下载Schema中
    const downloadingApiDoc = ref(false) // 下载API文档中
    let network = null

    // 模板相关
    const customTemplates = ref([])
    const templateForm = ref({
      name: '',
      description: '',
      query: ''
    })

    // 系统内置模板
    const builtinTemplates = ref([
      {
        id: 'all_nodes',
        name: '查询所有节点',
        description: '获取图数据库中的所有节点',
        query: 'MATCH (n) RETURN n LIMIT 50'
      },
      {
        id: 'all_relationships',
        name: '查询所有关系',
        description: '获取图数据库中的所有关系',
        query: 'MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50'
      },
      {
        id: 'node_count',
        name: '统计节点数量',
        description: '按标签统计节点数量',
        query: 'MATCH (n) RETURN labels(n) AS labels, count(n) AS count ORDER BY count DESC'
      },
      {
        id: 'relationship_count',
        name: '统计关系数量',
        description: '按关系类型统计关系数量',
        query: 'MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY count DESC'
      }
    ])

    // 计算属性
    const canShowGraph = computed(() => {
      // 检查是否有查询结果数据
      if (queryResult.value && queryResult.value.length > 0) {
        return true
      }

      // 检查graphData（作为备用）
      if (graphData.value) {
        // 检查 graphData.nodes
        if (graphData.value.nodes && graphData.value.nodes.length > 0) {
          return true
        }
        // 检查 graphData.graph.nodes（某些情况下数据可能嵌套在graph中）
        if (graphData.value.graph && graphData.value.graph.nodes && graphData.value.graph.nodes.length > 0) {
          return true
        }
      }

      return false
    })

    const tableHeaders = computed(() => {
      if (!queryResult.value || !queryResult.value.records || queryResult.value.records.length === 0) {
        return []
      }
      return queryResult.value.records[0] ? Object.keys(queryResult.value.records[0]) : []
    })

    const tableRows = computed(() => {
      return queryResult.value?.records || []
    })

    // 生命周期
    onMounted(async () => {
      await performGuestLogin()
      loadCustomTemplates()
    })

    // 监听视图模式变化，当切换到图形视图时重新初始化
    watch(resultView, (newMode) => {
      if (newMode === 'graph' && canShowGraph.value) {
        nextTick(() => {
          initGraphVisualization()
        })
      }
    })

    // 自动访客登录
    const performGuestLogin = async () => {
      try {
        const response = await fetch('https://chineseedu.shuishan.net.cn:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'guest', password: 'guest' })
        })

        if (response.ok) {
          const data = await response.json()
          localStorage.setItem('neo4j_token', data.access_token)
        }
      } catch (error) {
        console.error('自动登录失败:', error)
      }
    }

    // 调用阿里云大模型生成Cypher查询
    const generateCypherWithAI = async (naturalLanguageQuery, schema) => {
      const DASHSCOPE_API_KEY = 'sk-f55b7b2a02a4478fbdcb48c30d90bb49'
      const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

      const systemPrompt = `你是一个Neo4j Cypher查询专家。根据用户的自然语言问题，生成准确的Cypher查询语句。
知识图谱Schema信息：
${JSON.stringify(schema, null, 2)}
重要规则：
1. 只返回纯净的Cypher查询语句，不要包含任何解释或markdown格式
2. 所有查询必须包含LIMIT 100，限制结果数量为100，避免性能问题
3. 理解用户的中文描述但必须使用neo4j_name生成查询（如：用户说"汉字"要理解为Character标签）
4. 对于模糊匹配，使用CONTAINS或正则表达式
5. 确保查询语法正确且能在Neo4j中执行
数据类型注意事项：
- HSK等级、新标准等级、笔画数等数字字段在Neo4j中存储为字符串，请使用字符串比较
- 所有等级和数字字段都需要用引号包围，如: n.hskLevel = '1', n.strokes = '5'
- 对于范围查询，可以使用字符串比较或转换: toInteger(n.strokes) < 5
正确示例：
用户问题："查找所有HSK等级为1的汉字"
理解：用户说的"汉字"对应Character标签
Cypher: MATCH (n:Character) WHERE n.hskLevel = '1' RETURN n LIMIT 100
用户问题："找到笔画数少于5的汉字"
理解：查询Character标签，使用数字比较
Cypher: MATCH (n:Character) WHERE toInteger(n.strokes) < 5 RETURN n LIMIT 100
用户问题："查找所有汉字节点和关系"
理解：这是一个广范围查询，必须限制数量
Cypher: MATCH (n:Character) RETURN n LIMIT 100
用户问题："查找'喜爱'词汇的近义词关系"
理解：近义词关系对应NEAR_SYNONYMOUS_WITH
Cypher: MATCH (n:Word {name: '喜爱'})-[r:NEAR_SYNONYMOUS_WITH]-(m) RETURN n, r, m LIMIT 100
用户问题："国际中文教育中文水平1级的词语"
理解：国际中文教育等级通过关系连接，等级节点的value为1，要词语和等级的关系！
Cypher: MATCH (n:Word)-[r:FROM_LEVEL]->(l:InternationalLevel {value: '1'}) RETURN n, r, l LIMIT 100`

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen3-coder-plus',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: naturalLanguageQuery
              }
            ],
            temperature: 0.1, // 降低创造性，提高准确性
            max_tokens: 1000
          })
        })

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`)
        }

        const result = await response.json()
        const cypherQuery = result.choices?.[0]?.message?.content?.trim()

        if (!cypherQuery) {
          throw new Error('AI未返回有效的查询语句')
        }

        return cypherQuery
      } catch (error) {
        console.error('AI生成查询失败:', error)
        throw new Error(`智能查询生成失败: ${error.message}`)
      }
    }

  // 智能查询
    const handleSmartQuery = async () => {
      if (!smartQuery.value.trim()) return

      smartQueryLoading.value = true
      smartQueryError.value = ''

      try {
        // 获取知识图谱Schema
        const [labelsResponse, relationshipTypesResponse, nodeMappingsResponse, relationshipMappingsResponse] = await Promise.all([
          apiService.getAllLabels(),
          apiService.getRelationshipTypes(),
          apiService.getLabelMappings('node'),
          apiService.getLabelMappings('relationship')
        ])

        // 构建简化的Schema用于AI
        const aiSchema = {
          node_types: (labelsResponse.labels_with_counts || []).map(label => {
            const mapping = (nodeMappingsResponse.node_labels || []).find(m => m.neo4j_name === label.label)
            return {
              neo4j_name: label.label,
              display_name: mapping?.display_name || label.label,
              count: label.count
            }
          }),
          relationship_types: (relationshipTypesResponse.relationship_types || []).map(rel => ({
            neo4j_name: rel.type,
            display_name: rel.type
          }))
        }

        // 调用AI生成查询
        const generatedQuery = await generateCypherWithAI(smartQuery.value, aiSchema)
        generatedCypher.value = generatedQuery
        query.value = generatedQuery
        await executeQuery()
      } catch (error) {
        // 在控制台记录详细错误信息供开发者调试
        console.error('智能查询执行失败:', error)

        // 对用户显示友好的错误信息
        if (error.message && (error.message.includes('500') || error.message.includes('Internal Error'))) {
          smartQueryError.value = '查询无结果'
        } else {
          smartQueryError.value = '智能查询失败: ' + error.message
        }
      } finally {
        smartQueryLoading.value = false
      }
    }

    // 编辑生成的查询
    const editGeneratedQuery = () => {
      queryMode.value = 'cypher'
      query.value = generatedCypher.value
      generatedCypher.value = ''
    }

    // 切换到Cypher查询模式
    const switchToCypherMode = () => {
      if (queryMode.value !== 'cypher') {
        queryMode.value = 'cypher'
        clearResults() // 清空结果
        smartQuery.value = ''
        generatedCypher.value = ''
      }
    }

    // 切换到智能查询模式
    const switchToSmartMode = () => {
      if (queryMode.value !== 'smart') {
        queryMode.value = 'smart'
        clearResults() // 清空结果
        query.value = ''
      }
    }

    // 清空查询结果
    const clearResults = () => {
      queryResult.value = null
      graphData.value = null
      selectedNode.value = null
      error.value = ''
      smartQueryError.value = ''
    }

    // 执行查询
    const executeQuery = async () => {
      if (!query.value.trim()) return

      loading.value = true
      error.value = ''

      try {
        const result = await apiService.runQuery(query.value.trim())
        queryResult.value = result.records || []
        graphData.value = result.graph_data || null

        // 默认显示图形视图，与原版保持一致
        resultView.value = 'graph'
        await nextTick()
        initGraphVisualization()
      } catch (error) {
        // 在控制台记录详细错误信息供开发者调试
        console.error('查询执行失败:', error)

        // 对用户显示友好的错误信息
        if (error.message && (error.message.includes('500') || error.message.includes('Internal Error'))) {
          error.value = '查询无结果'
        } else {
          error.value = '查询失败: ' + error.message
        }

        queryResult.value = null
        graphData.value = null
      } finally {
        loading.value = false
      }
    }

    // 初始化图形可视化
    const initGraphVisualization = () => {
      if (!graphContainer.value || !queryResult.value) return

      // 销毁现有图形
      if (network) {
        network.destroy()
        network = null
      }

      // 处理节点和关系数据 - 与原版保持一致
      const nodesMap = new Map()
      const edges = []
      let relationshipCount = 0

      // 检测是否为关系查询 (查询结果中包含关系数据)
      const hasRelationships = queryResult.value.some(record =>
        Object.values(record).some(value =>
          value && typeof value === 'object' && value.type && value.start_node_id !== undefined && value.end_node_id !== undefined
        )
      )

      // 如果是关系查询，收集所有相关的节点ID
      const relevantNodeIds = new Set()
      if (hasRelationships) {
        queryResult.value.forEach(record => {
          Object.values(record).forEach(value => {
            if (value && typeof value === 'object' && value.type && value.start_node_id !== undefined && value.end_node_id !== undefined) {
              relevantNodeIds.add(value.start_node_id)
              relevantNodeIds.add(value.end_node_id)
            }
          })
        })
      }

      // 遍历查询结果，提取节点和关系
      queryResult.value.forEach((record, index) => {
        Object.values(record).forEach(value => {
          // 处理节点数据
          if (value && typeof value === 'object' && value.labels && value.properties !== undefined) {
            const node = value
            // 如果是关系查询，只包含与关系相关的节点
            if (hasRelationships && !relevantNodeIds.has(node.id)) {
              return
            }
            if (!nodesMap.has(node.id)) {
              nodesMap.set(node.id, {
                id: node.id,
                label: node.properties ? node.properties.name || node.properties.id || `Node ${node.id}` : `Node ${node.id}`,
                color: getNodeColor(node.labels || []),
                properties: node.properties,
                labels: node.labels
              })
            }
          }

          // 处理关系数据
          if (value && typeof value === 'object' && value.type && value.start_node_id !== undefined && value.end_node_id !== undefined) {
            const relationship = value
            edges.push({
              id: relationship.id || `rel_${relationshipCount++}`,
              from: relationship.start_node_id,
              to: relationship.end_node_id,
              label: relationship.type,
              arrows: 'to',
              properties: relationship.properties
            })
          }
        })
      })

      const nodes = Array.from(nodesMap.values())

      if (nodes.length === 0) return

      // 创建网络图
      const data = { nodes, edges }
      const options = {
        nodes: {
          shape: 'dot',
          size: 20,
          font: { size: 14 },
          borderWidth: 2
        },
        edges: {
          width: 2,
          font: { size: 12, align: 'middle' },
          smooth: { type: 'dynamic' },
          arrows: { to: { enabled: true, scaleFactor: 1 } }
        },
        physics: {
          forceAtlas2Based: {
            gravitationalConstant: -26,
            centralGravity: 0.005,
            springLength: 230,
            springConstant: 0.18
          },
          maxVelocity: 146,
          solver: 'forceAtlas2Based',
          timestep: 0.35,
          stabilization: { iterations: 150 }
        }
      }

      network = new Network(graphContainer.value, data, options)

      // 添加节点点击事件监听
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const node = nodes.find(n => n.id === nodeId)
          if (node) {
            selectedNode.value = node
          }
        } else {
          // 点击空白区域，取消选择
          selectedNode.value = null
        }
      })
    }

    // 获取节点颜色
    const getNodeColor = (labels) => {
      const colors = ['#97c2fc', '#ffb2b2', '#b2e2b2', '#ffffb2', '#e2b2ff', '#ffb2e2']
      return labels.length > 0 ? colors[labels[0].length % colors.length] : '#97c2fc'
    }

    // 清空查询输入
    const clearQuery = () => {
      if (queryMode.value === 'cypher') {
        query.value = ''
        error.value = ''
      } else {
        smartQuery.value = ''
        smartQueryError.value = ''
        generatedCypher.value = ''
      }
    }

    // 应用模板
    const applyTemplate = (template) => {
      query.value = template.query
    }

    // 加载自定义模板
    const loadCustomTemplates = async () => {
      try {
        const saved = localStorage.getItem('custom_query_templates')
        if (saved) {
          customTemplates.value = JSON.parse(saved)
        }
      } catch (error) {
        console.error('加载模板失败:', error)
      }
    }

    // 保存模板
    const saveTemplate = () => {
      if (!templateForm.value.name.trim()) return

      if (isEditing.value) {
        const index = customTemplates.value.findIndex(t => t.id === templateForm.value.id)
        if (index !== -1) {
          customTemplates.value[index] = { ...templateForm.value }
        }
      } else {
        const newTemplate = {
          id: Date.now().toString(),
          ...templateForm.value
        }
        customTemplates.value.push(newTemplate)
      }

      localStorage.setItem('custom_query_templates', JSON.stringify(customTemplates.value))
      closeModal()
    }

    // 编辑模板
    const editTemplate = (template) => {
      templateForm.value = { ...template }
      isEditing.value = true
      showModal.value = true
    }

    // 删除模板
    const deleteTemplate = (id) => {
      if (confirm('确定要删除这个模板吗？')) {
        customTemplates.value = customTemplates.value.filter(t => t.id !== id)
        localStorage.setItem('custom_query_templates', JSON.stringify(customTemplates.value))
      }
    }

    // 关闭模态框
    const closeModal = () => {
      showModal.value = false
      isEditing.value = false
      templateForm.value = {
        name: '',
        description: '',
        query: ''
      }
    }

    // 导出数据
    const exportData = (format) => {
      if (!queryResult.value) return

      let content = ''
      let filename = `query_result.${format}`
      let mimeType = 'text/plain'

      if (format === 'json') {
        content = JSON.stringify(queryResult.value, null, 2)
        mimeType = 'application/json'
      } else if (format === 'csv' && tableRows.value.length > 0) {
        const headers = tableHeaders.value
        content = headers.join(',') + '\n'
        tableRows.value.forEach(row => {
          const values = headers.map(header => {
            const value = row[header]
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          })
          content += values.join(',') + '\n'
        })
        mimeType = 'text/csv'
      } else if (format === 'excel') {
        // 简单的Excel格式（实际上是HTML表格）
        content = '<table>'
        content += '<tr>' + tableHeaders.value.map(h => `<th>${h}</th>`).join('') + '</tr>'
        tableRows.value.forEach(row => {
          content += '<tr>' + tableHeaders.value.map(h => `<td>${row[h]}</td>`).join('') + '</tr>'
        })
        content += '</table>'
        filename = 'query_result.xls'
        mimeType = 'application/vnd.ms-excel'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }

    // 格式化显示值
    const formatValue = (value) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch {
          return String(value)
        }
      }
      return String(value)
    }

    // 检测是否为URL
    const isUrl = (value) => {
      if (typeof value !== 'string') return false
      try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    }

    // 下载知识图谱Schema
    const downloadSchema = async () => {
      downloadingSchema.value = true
      try {
        // 获取所有节点标签和关系类型数据
        const [labelsResponse, relationshipTypesResponse, nodeMappingsResponse, relationshipMappingsResponse] = await Promise.all([
          apiService.getAllLabels(),
          apiService.getRelationshipTypes(),
          apiService.getLabelMappings('node'),
          apiService.getLabelMappings('relationship')
        ])

        // 构建Schema对象
        const schema = {
          generated_at: new Date().toISOString(),
          version: '1.0',
          description: '知识图谱完整Schema结构',

          // 节点类型信息
          node_types: [],

          // 关系类型信息
          relationship_types: []
        }

        // 处理节点类型
        if (labelsResponse.labels_with_counts) {
          schema.node_types = labelsResponse.labels_with_counts.map(label => {
            const mapping = (nodeMappingsResponse.node_labels || []).find(m => m.neo4j_name === label.label)
            return {
              neo4j_name: label.label,
              display_name: mapping?.display_name || label.label,
              description: mapping?.description || '',
              count: label.count,
              properties: []
            }
          })
        }

        // 处理关系类型
        if (relationshipTypesResponse.relationship_types) {
          schema.relationship_types = relationshipTypesResponse.relationship_types.map(rel => {
            const mapping = (relationshipMappingsResponse.relationship_types || []).find(m => m.neo4j_name === rel.type)
            return {
              neo4j_name: rel.type,
              display_name: mapping?.display_name || rel.type,
              description: mapping?.description || '',
              properties: []
            }
          })
        }

        // 生成JSON文件并下载
        const jsonString = JSON.stringify(schema, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `knowledge_graph_schema_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

      } catch (error) {
        console.error('下载Schema失败:', error)
        alert('下载Schema失败: ' + error.message)
      } finally {
        downloadingSchema.value = false
      }
    }

    // 下载API使用文档
    const downloadApiDocumentation = async () => {
      downloadingApiDoc.value = true
      try {
        // API文档内容
        const apiDocContent = `# 智能查询API使用示例
本文档提供智能查询API的详细使用示例，包括两个核心接口的调用方法和响应格式。

## API概览
- **基础URL**: https://kg.chineseplus.net/out/api/intelligent
- **认证服务**: https://kg.chineseplus.net/out/api/auth
- **认证方式**: Bearer Token (JWT)
- **内容类型**: application/json
- **权限控制**: 基于用户角色的节点可见性控制

## 身份认证
### 获取JWT令牌
在使用智能查询API之前，需要先通过认证服务获取JWT令牌：

\`\`\`bash
curl -X POST "https://kg.chineseplus.net/out/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
\`\`\`

## 核心接口

### 1. 自然语言转Cypher查询
将自然语言描述转换为Neo4j Cypher查询语句。

#### 请求示例
\`\`\`bash
curl -X POST "https://kg.chineseplus.net/out/api/intelligent/nl-to-cypher" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "查找所有HSK等级为1的汉字"
  }'
\`\`\`

#### 响应示例
\`\`\`json
{
  "success": true,
  "cypher": "MATCH (n:Character) WHERE n.hskLevel = '1' RETURN n LIMIT 100",
  "explanation": "查询HSK等级为1的汉字节点"
}
\`\`\`

### 2. 执行Cypher查询
执行生成的Cypher查询并返回结果。

#### 请求示例
\`\`\`bash
curl -X POST "https://kg.chineseplus.net/out/api/intelligent/execute-cypher" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cypher": "MATCH (n:Character) WHERE n.hskLevel = '1' RETURN n LIMIT 10"
  }'
\`\`\`

#### 响应示例
\`\`\`json
{
  "success": true,
  "records": [...],
  "graph_data": {
    "nodes": [...],
    "edges": [...]
  },
  "total_count": 10
}
\`\`\`

## 常见查询示例

### 节点查询
- 查找所有汉字：\`"查找所有汉字"\`
- HSK等级查询：\`"查找HSK等级为2的汉字"\`
- 笔画数查询：\`"查找笔画数少于5的汉字"\`

### 关系查询
- 近义词查询：\`"查找'喜爱'的近义词"\`
- 反义词查询：\`"查找'大'的反义词"\`
- 组词关系：\`"查找能与'天'组合的词语"\`

## 使用建议
1. 查询描述尽量具体明确
2. 使用标准的中文术语
3. 复杂查询可以分步进行
4. 注意查询结果的数量限制

---
文档生成时间: ${new Date().toLocaleString('zh-CN')}
`

        // 生成Markdown文件并下载
        const blob = new Blob([apiDocContent], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `智能查询API使用文档_${new Date().toISOString().split('T')[0]}.md`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

      } catch (error) {
        console.error('下载API文档失败:', error)
        alert('下载API文档失败: ' + error.message)
      } finally {
        downloadingApiDoc.value = false
      }
    }

    return {
      // 数据
      queryMode,
      smartQuery,
      query,
      loading,
      smartQueryLoading,
      error,
      smartQueryError,
      queryResult,
      graphData,
      resultView,
      activeTab,
      showModal,
      isEditing,
      graphContainer,
      selectedNode,
      generatedCypher,
      downloadingSchema,
      downloadingApiDoc,
      customTemplates,
      templateForm,
      builtinTemplates,

      // 计算属性
      canShowGraph,
      tableHeaders,
      tableRows,

      // 方法
      handleSmartQuery,
      editGeneratedQuery,
      executeQuery,
      clearQuery,
      switchToCypherMode,
      switchToSmartMode,
      applyTemplate,
      saveTemplate,
      editTemplate,
      deleteTemplate,
      closeModal,
      exportData,
      formatValue,
      isUrl,
      downloadSchema,
      downloadApiDocumentation,

      // 模板相关
      loadCustomTemplates
    }
  }
}
</script>

<style scoped>
.cypher-query-mobile {
  min-height: 100vh;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 移动端头部 */
.mobile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.mobile-header h1 {
  color: white;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

/* 主要内容 */
.main-content {
  padding: 12px 16px;
  max-width: 100%;
  margin: 0 auto;
}

/* 查询模式选择 */
.query-mode-section {
  background: white;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.mode-selector {
  display: flex;
  gap: 4px;
}

.mode-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.mode-btn:not(.active):hover {
  background: #f8f9fa;
}

/* 区块样式 */
.cypher-query-section,
.smart-query-section,
.templates-section,
.results-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* 区块头部 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

/* 输入区域 */
.smart-input,
.query-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: vertical;
  min-height: 80px;
}

.smart-input {
  border-radius: 8px 8px 0 0;
  border-bottom: none;
  min-height: 60px;
}

/* 按钮样式 */
.smart-query-btn,
.execute-btn,
.export-btn,
.edit-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.smart-query-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.smart-query-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.execute-btn {
  background: #4CAF50;
  color: white;
}

.execute-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn {
  background: #17a2b8;
  color: white;
  font-size: 12px;
  padding: 6px 10px;
}

.edit-btn {
  background: #ffc107;
  color: #212529;
  font-size: 12px;
  padding: 6px 10px;
}

.schema-download-btn,
.api-doc-download-btn {
  background: #28a745;
  color: white;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.api-doc-download-btn {
  background: #ffc107;
  color: #212529;
}

.schema-download-btn:disabled,
.api-doc-download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 执行按钮区域 */
.execute-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

/* 按钮图标 */
.btn-icon {
  display: inline-block;
  margin-right: 6px;
  font-size: 14px;
  line-height: 1;
}

.smart-query-btn,
.execute-btn,
.schema-download-btn,
.api-doc-download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

/* 生成的Cypher查询预览 */
.generated-cypher-preview {
  margin-top: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
}

.preview-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.cypher-preview {
  padding: 12px;
  background: white;
}

.cypher-preview pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: #495057;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 标签页 */
.template-tabs,
.view-tabs {
  display: flex;
  margin-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.tab-btn,
.view-tab {
  flex: 1;
  padding: 10px 8px;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active,
.view-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 模板列表 */
.templates-list {
  max-height: 200px;
  overflow-y: auto;
}

.template-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.template-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.template-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
  margin-bottom: 4px;
}

.template-description {
  color: #6c757d;
  font-size: 12px;
  line-height: 1.4;
}

.template-actions {
  display: flex;
  gap: 8px;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.template-item:hover .template-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.edit-btn {
  background: #ffc107;
  color: #212529;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.empty-templates {
  text-align: center;
  color: #6c757d;
  font-size: 12px;
  padding: 20px;
}

/* 错误信息 */
.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 8px;
}

/* 结果显示 */
.graph-container {
  height: 350px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 12px;
  position: relative;
}

.graph {
  width: 100%;
  height: 100%;
}

/* 节点信息面板 */
.node-info-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 280px;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-left: 1px solid #ddd;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  z-index: 10;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px;
  line-height: 1;
}

.panel-content {
  padding: 16px;
}

.node-basic-info {
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.info-label {
  font-weight: 600;
  color: #495057;
  font-size: 13px;
  min-width: 40px;
}

.info-value {
  color: #6c757d;
  font-size: 13px;
  word-break: break-all;
}

.info-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.node-label-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.node-properties {
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.properties-title {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #495057;
}

.properties-list {
  max-height: 200px;
  overflow-y: auto;
}

.property-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.property-row:last-child {
  border-bottom: none;
}

.property-name {
  font-weight: 500;
  color: #495057;
  font-size: 12px;
}

.property-value {
  color: #6c757d;
  font-size: 12px;
  word-break: break-all;
  background: #f8f9fa;
  padding: 4px 6px;
  border-radius: 4px;
}

.url-link {
  color: #3498db;
  text-decoration: none;
  border-bottom: 1px dotted #3498db;
  word-break: break-all;

  &:hover {
    color: #2980b9;
    border-bottom-style: solid;
  }

  &:active {
    color: #e74c3c;
    border-bottom-color: #e74c3c;
  }
}

.table-container {
  overflow-x: auto;
  margin-top: 12px;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.result-table th,
.result-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.result-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.text-container {
  margin-top: 12px;
}

.result-text {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.modal-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px;
  border-top: 1px solid #eee;
}

.save-btn,
.cancel-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.save-btn {
  background: #007bff;
  color: white;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

/* 查询操作区 */
.query-actions {
  display: flex;
  gap: 8px;
}

.result-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .main-content {
    padding: 8px 12px;
  }

  .cypher-query-section,
  .smart-query-section,
  .templates-section,
  .results-section {
    padding: 12px;
    margin-bottom: 12px;
  }

  .mobile-header h1 {
    font-size: 20px;
  }

  .result-actions {
    gap: 4px;
  }

  .export-btn {
    font-size: 11px;
    padding: 5px 8px;
  }

  /* 移动端执行按钮区域 */
  .execute-actions {
    flex-wrap: wrap;
    gap: 6px;
  }

  .execute-btn,
  .smart-query-btn,
  .schema-download-btn,
  .api-doc-download-btn {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    padding: 10px 8px;
  }

  .btn-icon {
    font-size: 12px;
    margin-right: 4px;
  }

  /* 移动端节点信息面板 */
  .node-info-panel {
    width: 75%;
    max-width: 280px;
    height: 70%;
    top: 15%;
    box-shadow: -3px 0 12px rgba(0, 0, 0, 0.15);
  }

  .panel-content {
    padding: 12px;
  }

  .panel-header {
    padding: 10px 12px;
  }

  .properties-list {
    max-height: 150px;
  }

  .graph-container {
    height: 300px;
  }
}

/* 输入组 */
.input-group {
  position: relative;
  margin-bottom: 8px;
}

/* 图形和表格的响应式 */
@media (max-width: 768px) {
  .graph-container {
    height: 250px;
  }

  .result-table {
    font-size: 11px;
  }

  .result-table th,
  .result-table td {
    padding: 6px;
  }

  /* 平板节点信息面板 */
  .node-info-panel {
    width: 260px;
  }
}
</style>
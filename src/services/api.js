// API服务 - 调用后端REST API
// const API_BASE_URL = 'https://chineseedu.shuishan.net.cn:8000/api'
const API_BASE_URL = 'https://kg.chineseplus.net/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // 获取认证header
  getAuthHeaders() {
    const token = localStorage.getItem('neo4j_token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers
      },
      ...options
    }

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 15000) // 15秒超时，比后端的10秒稍长

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      if (!response.ok) {
        // 如果是认证失败，清除本地存储并跳转到登录页
        if (response.status === 401) {
          localStorage.removeItem('neo4j_token')
          localStorage.removeItem('neo4j_user')
          window.location.href = '/login'
          throw new Error('认证失败，请重新登录')
        }
        
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`API请求失败 [${endpoint}]:`, error)

      // 处理超时错误
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查查询条件是否过于复杂或添加LIMIT限制')
      }

      throw error
    }
  }

  // GET请求
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request(url)
  }

  // POST请求
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // PUT请求
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  // DELETE请求
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    })
  }

  // 健康检查
  async healthCheck() {
    return this.get('/health')
  }

  // 节点相关API
  async getNodes(limit = 50, label = null, skip = 0, mode = null) {
    const params = { limit, skip }
    if (label) params.label = label
    if (mode) params.mode = mode
    return this.get('/nodes', params)
  }

  async searchNodes(text, label = null, limit = 50, mode = null) {
    const data = { text, limit }
    if (label) data.label = label
    if (mode) data.mode = mode
    return this.post('/nodes/search', data)
  }

  async getNode(nodeId) {
    return this.get(`/nodes/${nodeId}`)
  }

  async createNode(labels, properties) {
    return this.post('/nodes', { labels, properties })
  }

  async updateNode(nodeId, properties) {
    return this.put(`/nodes/${nodeId}`, { properties })
  }

  async deleteNode(nodeId) {
    return this.delete(`/nodes/${nodeId}`)
  }

  // 关系相关API
  async getRelationships(limit = 50, relationshipType = null) {
    const params = { limit }
    if (relationshipType) params.relationship_type = relationshipType
    return this.get('/relationships', params)
  }

  async createRelationship(startNodeId, endNodeId, relationshipType, properties = {}) {
    return this.post('/relationships', {
      start_node_id: startNodeId,
      end_node_id: endNodeId,
      relationship_type: relationshipType,
      properties
    })
  }

  async updateRelationship(relationshipId, properties = {}) {
    return this.put(`/relationships/${relationshipId}`, { properties })
  }

  async deleteRelationship(relationshipId) {
    return this.delete(`/relationships/${relationshipId}`)
  }

  async getNodeRelationships(nodeId) {
    return this.get(`/nodes/${nodeId}/relationships`)
  }

  // 图数据API
  async getGraphData(limit = 100) {
    return this.get('/graph', { limit })
  }

  // 元数据API
  async getAllLabels() {
    return this.get('/labels')
  }

  async getRelationshipTypes(mode = null) {
    const params = mode ? { mode } : {}
    return this.get('/relationship-types', params)
  }

  async getNodeTypes(mode = null) {
    const params = mode ? { mode } : {}
    return this.get('/node-types', params)
  }

  // 自定义查询API
  async runQuery(cypher, parameters = {}) {
    return this.post('/query', { cypher, parameters })
  }

  // 统计信息API
  async getStats() {
    return this.get('/stats')
  }

  // 为了保持与原有neo4j.js的兼容性，添加一些适配方法
  async connect() {
    try {
      await this.healthCheck()
      console.log('后端API连接成功')
      return true
    } catch (error) {
      console.error('后端API连接失败:', error)
      return false
    }
  }

  async isConnected() {
    try {
      await this.healthCheck()
      return true
    } catch (error) {
      return false
    }
  }

  // 兼容原有的queryNodesByChineseText方法
  async queryNodesByChineseText(text) {
    const response = await this.searchNodes(text)
    // 转换格式以保持兼容性
    return response.nodes.map(item => ({
      get: (key) => {
        if (key === 'n') return item.n
        if (key === 'labels') return item.labels
        return item[key]
      },
      keys: Object.keys(item)
    }))
  }

  // 兼容原有的runQuery方法 - 返回records格式
  async runQueryCompat(query, params = {}) {
    try {
      const response = await this.runQuery(query, params)
      // 转换为类似neo4j driver的records格式
      return response.records.map(record => ({
        get: (key) => {
          const value = record[key]
          // 如果是节点数据，包装成类似Neo4j Node的格式
          if (value && typeof value === 'object' && value.labels && value.properties) {
            return {
              identity: { low: value.id },
              labels: value.labels,
              properties: value.properties,
              ...value.properties
            }
          }
          // 如果是关系数据，包装成类似Neo4j Relationship的格式
          if (value && typeof value === 'object' && value.type && value.start !== undefined) {
            return {
              identity: { low: value.id },
              type: value.type,
              start: { low: value.start },
              end: { low: value.end },
              properties: value.properties,
              ...value.properties
            }
          }
          // 如果是整数，包装成类似Neo4j Integer的格式
          if (typeof value === 'number' && Number.isInteger(value)) {
            return {
              low: value,
              toNumber: () => value
            }
          }
          return value
        },
        keys: Object.keys(record)
      }))
    } catch (error) {
      console.error('查询执行失败:', error)
      throw error
    }
  }

  // 标签映射相关API
  async getLabelMappings(type = null) {
    const params = type ? { type } : {}
    return this.get('/labels/mappings', params)
  }

  async getPropertyPermissions(labelMappingId) {
    return this.get(`/labels/${labelMappingId}/properties`)
  }

  async getDisplayName(neo4jName, type) {
    return this.get(`/labels/display-name/${neo4jName}`, { type })
  }

  // 管理员API
  async createLabelMapping(mapping) {
    return this.post('/admin/labels/mappings', mapping)
  }

  async updatePropertyPermissions(permissions) {
    return this.put('/admin/properties/permissions', permissions)
  }

  // Neo4j integer兼容
  get neo4j() {
    return {
      int: (value) => parseInt(value, 10)
    }
  }
}

export default new ApiService()
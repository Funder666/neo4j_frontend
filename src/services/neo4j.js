import neo4j from 'neo4j-driver'

class Neo4jService {
  constructor() {
    this.driver = null
    this.session = null
    this.neo4j = neo4j // 暴露neo4j模块
  }

  // 连接到Neo4j数据库
  async connect() {
    try {
      // 如果已有连接，先关闭
      if (this.driver) {
        await this.driver.close()
      }
      
      this.driver = neo4j.driver(
        'bolt://8.153.207.172:7687',
        neo4j.auth.basic('neo4j', 'xtxzhu2u'),
        {
          connectionTimeout: 10000, // 10秒连接超时
          maxConnectionLifetime: 3600000, // 1小时连接最大生命周期
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 5000
        }
      )
      
      // 验证连接
      await this.driver.verifyConnectivity()
      console.log('Neo4j连接成功')
      return true
    } catch (error) {
      console.error('Neo4j连接失败:', error)
      // 清理失效的driver
      if (this.driver) {
        try {
          await this.driver.close()
        } catch (closeError) {
          console.error('关闭driver失败:', closeError)
        }
        this.driver = null
      }
      return false
    }
  }

  // 获取会话
  getSession() {
    if (!this.driver) {
      throw new Error('数据库未连接')
    }
    return this.driver.session()
  }

  // 检查连接状态
  async isConnected() {
    if (!this.driver) return false
    
    try {
      await this.driver.verifyConnectivity()
      return true
    } catch (error) {
      console.warn('连接检查失败:', error)
      return false
    }
  }

  // 执行查询（带自动重连）
  async runQuery(query, params = {}) {
    // 检查连接状态，如果断开则尝试重连
    if (!(await this.isConnected())) {
      console.log('检测到连接断开，尝试重新连接...')
      const reconnected = await this.connect()
      if (!reconnected) {
        throw new Error('无法重新连接到数据库')
      }
    }


    const session = this.getSession()
    try {
      const result = await session.run(query, params)
      return result.records
    } catch (error) {
      console.error('查询执行失败:', error)
      throw error
    } finally {
      await session.close()
    }
  }

  // 根据汉字查询节点
  async queryNodesByChineseText(text) {
    const query = `
      MATCH (n)
      WHERE ANY(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $text)
      RETURN n, labels(n) as labels
      LIMIT 50
    `
    return await this.runQuery(query, { text })
  }

  // 获取节点的关系
  async getNodeRelationships(nodeId) {
    const query = `
      MATCH (n)-[r]-(m)
      WHERE id(n) = $nodeId
      RETURN n, r, m, type(r) as relType
      LIMIT 100
    `
    return await this.runQuery(query, { nodeId })
  }

  // 获取所有节点标签
  async getAllLabels() {
    const query = 'CALL db.labels()'
    return await this.runQuery(query)
  }

  // 获取所有关系类型
  async getAllRelationshipTypes() {
    const query = 'CALL db.relationshipTypes()'
    return await this.runQuery(query)
  }

  // 创建节点
  async createNode(label, properties) {
    const query = `
      CREATE (n:${label} $properties)
      RETURN n
    `
    return await this.runQuery(query, { properties })
  }

  // 更新节点
  async updateNode(nodeId, properties) {
    const query = `
      MATCH (n)
      WHERE id(n) = $nodeId
      SET n += $properties
      RETURN n
    `
    return await this.runQuery(query, { nodeId, properties })
  }

  // 删除节点
  async deleteNode(nodeId) {
    const query = `
      MATCH (n)
      WHERE id(n) = $nodeId
      DETACH DELETE n
    `
    return await this.runQuery(query, { nodeId })
  }

  // 创建关系
  async createRelationship(startNodeId, endNodeId, relationshipType, properties = {}) {
    const query = `
      MATCH (start), (end)
      WHERE id(start) = $startNodeId AND id(end) = $endNodeId
      CREATE (start)-[r:${relationshipType} $properties]->(end)
      RETURN r
    `
    return await this.runQuery(query, { startNodeId, endNodeId, properties })
  }

  // 获取图形数据（用于可视化）
  async getGraphData(limit = 100) {
    const query = `
      MATCH (n)-[r]->(m)
      RETURN n, r, m
      LIMIT $limit
    `
    return await this.runQuery(query, { limit: this.neo4j.int(Math.floor(Number(limit))) })
  }

  // 关闭连接
  async close() {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
    }
  }
}

export default new Neo4jService()
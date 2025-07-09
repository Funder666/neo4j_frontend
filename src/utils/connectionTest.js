import neo4jService from '../services/neo4j'

// 连接测试工具
export class ConnectionTester {
  static async testConnection() {
    console.log('🔍 开始测试Neo4j连接...')
    
    try {
      // 1. 测试基本连接
      console.log('📡 测试基本连接...')
      const connected = await neo4jService.connect()
      
      if (!connected) {
        console.error('❌ 基本连接失败')
        return {
          success: false,
          error: '无法建立连接',
          details: '可能是网络问题或认证失败'
        }
      }
      
      console.log('✅ 基本连接成功')
      
      // 2. 测试简单查询
      console.log('🔍 测试简单查询...')
      const result = await neo4jService.runQuery('RETURN 1 as test')
      
      if (!result || result.length === 0) {
        console.error('❌ 查询测试失败')
        return {
          success: false,
          error: '查询执行失败',
          details: '连接成功但无法执行查询'
        }
      }
      
      console.log('✅ 查询测试成功')
      
      // 3. 测试数据库信息
      console.log('📊 获取数据库信息...')
      const dbInfo = {}
      
      try {
        const nodeCountResult = await neo4jService.runQuery('MATCH (n) RETURN count(n) as count LIMIT $limit', { limit: neo4jService.neo4j.int(1) })
        dbInfo.nodeCount = nodeCountResult[0]?.get('count')?.toNumber() || 0
        
        const relCountResult = await neo4jService.runQuery('MATCH ()-[r]->() RETURN count(r) as count LIMIT $limit', { limit: neo4jService.neo4j.int(1) })
        dbInfo.relationshipCount = relCountResult[0]?.get('count')?.toNumber() || 0
        
        console.log('✅ 数据库信息获取成功:', dbInfo)
      } catch (error) {
        console.warn('⚠️ 获取数据库信息失败:', error.message)
        dbInfo.error = error.message
      }
      
      return {
        success: true,
        message: '连接测试成功',
        dbInfo
      }
      
    } catch (error) {
      console.error('❌ 连接测试失败:', error)
      return {
        success: false,
        error: error.message,
        details: error.stack
      }
    }
  }
  
  static async diagnoseConnection() {
    console.log('🔧 开始连接诊断...')
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      checks: []
    }
    
    // 检查1: 驱动初始化
    try {
      if (neo4jService.driver) {
        diagnosis.checks.push({
          name: '驱动初始化',
          status: '✅ 通过',
          details: 'Neo4j驱动已初始化'
        })
      } else {
        diagnosis.checks.push({
          name: '驱动初始化',
          status: '❌ 失败',
          details: 'Neo4j驱动未初始化'
        })
      }
    } catch (error) {
      diagnosis.checks.push({
        name: '驱动初始化',
        status: '❌ 错误',
        details: error.message
      })
    }
    
    // 检查2: 连接验证
    try {
      const isConnected = await neo4jService.isConnected()
      if (isConnected) {
        diagnosis.checks.push({
          name: '连接验证',
          status: '✅ 通过',
          details: '连接验证成功'
        })
      } else {
        diagnosis.checks.push({
          name: '连接验证',
          status: '❌ 失败',
          details: '连接验证失败，可能需要重新连接'
        })
      }
    } catch (error) {
      diagnosis.checks.push({
        name: '连接验证',
        status: '❌ 错误',
        details: error.message
      })
    }
    
    // 检查3: 会话创建
    try {
      const session = neo4jService.getSession()
      if (session) {
        await session.close()
        diagnosis.checks.push({
          name: '会话创建',
          status: '✅ 通过',
          details: '会话创建和关闭成功'
        })
      }
    } catch (error) {
      diagnosis.checks.push({
        name: '会话创建',
        status: '❌ 失败',
        details: error.message
      })
    }
    
    return diagnosis
  }
}

export default ConnectionTester
// 日志记录服务
import apiService from './api'

class LoggingService {
  /**
   * 创建查询日志
   * @param {Object} logData - 日志数据
   * @param {string} logData.query_type - 查询类型 ('node_query', 'relationship_query', 'cypher_query', 'smart_query')
   * @param {string} logData.page_name - 页面名称
   * @param {string} logData.query_content - 查询内容
   * @param {string} logData.cypher_query - Cypher查询语句
   * @param {string} logData.natural_language_query - 自然语言查询（智能查询用）
   * @param {string} logData.generated_cypher - AI生成的Cypher（智能查询用）
   * @param {string} logData.satisfaction_rating - 满意度评价 ('satisfied', 'unsatisfied')
   * @param {string} logData.execution_status - 执行状态 ('success', 'error')
   * @param {number} logData.result_count - 结果数量
   * @param {number} logData.node_count - 节点数量
   * @param {number} logData.edge_count - 边数量
   * @param {number} logData.execution_time_ms - 执行时间（毫秒）
   * @param {string} logData.error_message - 错误信息
   * @returns {Promise<Object>} API响应
   */
  async createQueryLog(logData) {
    try {
      const response = await apiService.post('/logs/query', {
        user_id: 0, // 后端会自动使用当前用户ID
        query_type: logData.query_type,
        page_name: logData.page_name,
        query_content: logData.query_content || null,
        cypher_query: logData.cypher_query || null,
        natural_language_query: logData.natural_language_query || null,
        generated_cypher: logData.generated_cypher || null,
        satisfaction_rating: logData.satisfaction_rating || null,
        execution_status: logData.execution_status,
        result_count: logData.result_count || 0,
        node_count: logData.node_count || 0,
        edge_count: logData.edge_count || 0,
        execution_time_ms: logData.execution_time_ms || null,
        error_message: logData.error_message || null
      })
      return response
    } catch (error) {
      console.error('创建查询日志失败:', error)
      // 不抛出错误，避免影响主要功能
      return { success: false, error }
    }
  }


  /**
   * 更新满意度评价
   * @param {number} logId - 日志ID
   * @param {string} rating - 满意度评价 ('satisfied', 'unsatisfied')
   * @returns {Promise<Object>} API响应
   */
  async updateSatisfactionRating(logId, rating) {
    try {
      const response = await apiService.patch(`/logs/query/${logId}/satisfaction`, null, {
        params: { satisfaction_rating: rating }
      })
      return response
    } catch (error) {
      console.error('更新满意度评价失败:', error)
      // 不抛出错误，避免影响主要功能
      return { success: false, error }
    }
  }

  /**
   * 记录节点查询日志
   * @param {Object} queryData - 查询数据
   * @param {Object} result - 查询结果
   * @param {number} executionTime - 执行时间（毫秒）
   */
  async logNodeQuery(queryData, result, executionTime) {
    const logData = {
      query_type: 'node_query',
      page_name: 'NodeQuery',
      query_content: JSON.stringify(queryData),
      execution_status: result.success ? 'success' : 'error',
      result_count: result.data?.length || 0,
      execution_time_ms: executionTime,
      error_message: result.error?.message || null
    }
    return await this.createQueryLog(logData)
  }

  /**
   * 记录关系查询日志
   * @param {Object} queryData - 查询数据
   * @param {Object} result - 查询结果
   * @param {number} executionTime - 执行时间（毫秒）
   */
  async logRelationshipQuery(queryData, result, executionTime) {
    const logData = {
      query_type: 'relationship_query',
      page_name: 'RelationshipQuery',
      query_content: JSON.stringify(queryData),
      execution_status: result.success ? 'success' : 'error',
      result_count: result.data?.length || 0,
      execution_time_ms: executionTime,
      error_message: result.error?.message || null
    }
    return await this.createQueryLog(logData)
  }

  /**
   * 记录Cypher查询日志
   * @param {string} cypher - Cypher查询语句
   * @param {Object} result - 查询结果
   * @param {number} executionTime - 执行时间（毫秒）
   */
  async logCypherQuery(cypher, result, executionTime) {
    const logData = {
      query_type: 'cypher_query',
      page_name: 'CypherQuery',
      query_content: cypher,
      cypher_query: cypher,
      execution_status: result.success ? 'success' : 'error',
      result_count: result.records?.length || 0,
      node_count: result.graph_data?.nodes?.length || 0,
      edge_count: result.graph_data?.edges?.length || 0,
      execution_time_ms: executionTime,
      error_message: result.error?.message || null
    }
    return await this.createQueryLog(logData)
  }

  /**
   * 记录智能查询日志
   * @param {string} naturalLanguage - 自然语言查询
   * @param {string} generatedCypher - AI生成的Cypher
   * @param {Object} result - 查询结果
   * @param {number} executionTime - 执行时间（毫秒）
   * @param {string} satisfactionRating - 满意度评价（可选）
   */
  async logSmartQuery(naturalLanguage, generatedCypher, result, executionTime, satisfactionRating = null) {
    const logData = {
      query_type: 'smart_query',
      page_name: 'CypherQuery',
      query_content: naturalLanguage,
      cypher_query: generatedCypher,
      natural_language_query: naturalLanguage,
      generated_cypher: generatedCypher,
      satisfaction_rating: satisfactionRating,
      execution_status: result.success ? 'success' : 'error',
      result_count: result.records?.length || 0,
      node_count: result.graph_data?.nodes?.length || 0,
      edge_count: result.graph_data?.edges?.length || 0,
      execution_time_ms: executionTime,
      error_message: result.error?.message || null
    }
    return await this.createQueryLog(logData)
  }

  /**
   * 创建会话ID（简单实现）
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取当前页面名称
   */
  getCurrentPageName() {
    const path = window.location.pathname
    if (path.includes('node-query')) return 'NodeQuery'
    if (path.includes('relationship-query')) return 'RelationshipQuery'
    if (path.includes('cypher-query')) return 'CypherQuery'
    return 'Unknown'
  }
}

// 创建单例实例
const loggingService = new LoggingService()

export default loggingService
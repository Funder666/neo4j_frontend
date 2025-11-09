<template>
  <AppLayout>
    <div class="corpus-query-container">
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">
              <el-icon class="title-icon"><Document /></el-icon>
              语料库查询
            </h1>
            <p class="page-description">在语料库中搜索相关内容</p>
          </div>
        </div>
      </div>

      <div class="query-section">
        <!-- 查询配置卡片 -->
        <div class="config-card">
          <div class="config-header">
            <h3>查询配置</h3>
          </div>

          <div class="config-form">
            <el-form :model="queryConfig" label-width="120px">
              <el-form-item label="查询关键词">
                <el-input
                  v-model="searchQuery"
                  placeholder="请输入查询关键词..."
                  size="large"
                  @keyup.enter="handleSearch"
                  :disabled="searching"
                />
              </el-form-item>

              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="查询类型">
                    <el-select v-model="queryConfig.type" placeholder="选择查询类型" size="large">
                      <el-option label="上下文检索" value="Context" />
                      <el-option label="频次检索" value="Freq" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="返回数量">
                    <el-input-number
                      v-model="queryConfig.number"
                      :min="1"
                      :max="1000"
                      size="large"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="目标语料">
                    <el-select v-model="queryConfig.corpusType" placeholder="选择语料库" size="large">
                      <el-option
                        v-for="type in corpusTypes"
                        :key="type.value"
                        :label="type.label"
                        :value="type.value"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="上下文窗口" v-if="queryConfig.type === 'Context'">
                <el-input-number
                  v-model="queryConfig.winSize"
                  :min="1"
                  :max="100"
                  size="large"
                  style="width: 100%"
                />
              </el-form-item>
            </el-form>

            <div class="search-actions">
              <el-button
                type="primary"
                size="large"
                @click="handleSearch"
                :loading="searching"
                :disabled="!searchQuery.trim()"
              >
                <el-icon><Search /></el-icon>
                开始查询
              </el-button>
              <el-button size="large" @click="resetForm">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </div>
          </div>
        </div>

        <!-- 搜索历史 -->
        <div class="search-history" v-if="searchHistory.length > 0">
          <div class="history-header">
            <span>最近搜索</span>
            <el-button text size="small" @click="clearHistory">清空</el-button>
          </div>
          <div class="history-tags">
            <el-tag
              v-for="item in searchHistory.slice(0, 8)"
              :key="item"
              class="history-tag"
              @click="applyHistoryItem(item)"
              style="cursor: pointer"
            >
              {{ item }}
            </el-tag>
          </div>
        </div>

        <!-- 查询结果 -->
        <div class="results-section" v-if="hasSearched">
          <!-- 频次结果 -->
          <div v-if="queryResult && queryResult.Type === 'Freq'" class="freq-results">
            <div class="results-header">
              <div>
                <h3>频次查询结果</h3>
                <div class="corpus-info">来自{{ getCorpusTypeLabel(queryConfig.corpusType) }}语料库</div>
              </div>
              <el-tag type="success">{{ queryResult.total }} 条记录</el-tag>
            </div>

            <div class="freq-content">
              <div class="freq-section">
                <h4>词频统计</h4>
                <div class="freq-list">
                  <div v-for="(freq, word) in queryResult.Freq" :key="word" class="freq-item">
                    <span class="word">{{ word }}</span>
                    <span class="frequency">{{ freq }} 次</span>
                  </div>
                </div>
              </div>

              <div v-if="queryResult.Source" class="source-section">
                <h4>来源分布</h4>
                <div class="source-list">
                  <div v-for="(sources, word) in queryResult.Source" :key="word" class="source-item">
                    <div class="word-title">{{ word }}</div>
                    <div class="source-detail">{{ sources }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 上下文结果 -->
          <div v-else-if="queryResult && queryResult.Type === 'Context'" class="context-results">
            <div class="results-header">
              <div>
                <h3>上下文查询结果</h3>
                <div class="corpus-info">来自{{ getCorpusTypeLabel(queryConfig.corpusType) }}语料库</div>
              </div>
              <el-tag type="success">{{ queryResult.total }} 条记录</el-tag>
            </div>

            <div class="context-list">
              <div v-for="(item, index) in queryResult.Context" :key="index" class="context-item">
                <div class="context-header">
                  <div class="context-meta">
                    <el-tag type="info" size="small">{{ item.Source }}</el-tag>
                    <el-tag v-if="item.Note" type="warning" size="small">{{ item.Note }}</el-tag>
                  </div>
                  <span class="context-index">#{{ index + 1 }}</span>
                </div>
                <div class="context-content" v-html="highlightQuery(item.Context)"></div>
                <div v-if="item.Project || item.Title" class="context-details">
                  <div v-if="item.Project" class="detail-item">
                    <span class="detail-label">项目:</span>
                    <span class="detail-value">{{ item.Project }}</span>
                  </div>
                  <div v-if="item.Title" class="detail-item">
                    <span class="detail-label">标题:</span>
                    <span class="detail-value">{{ item.Title }}</span>
                  </div>
                  <div v-if="item.URL" class="detail-item">
                    <span class="detail-label">链接:</span>
                    <a :href="item.URL" target="_blank" class="detail-link">查看原文</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 无结果 -->
          <div v-else-if="queryResult && queryResult.total === 0" class="no-results">
            <el-empty description="未找到匹配的语料库内容" />
          </div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-state" v-if="searching">
          <el-skeleton :rows="5" animated />
          <p class="loading-text">正在查询语料库...</p>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Search, Refresh } from '@element-plus/icons-vue'
import AppLayout from '../components/AppLayout.vue'

const route = useRoute()

// 语料库API地址 - 根据实际部署情况修改
const CORPUS_API_BASE_URL = 'https://corpus.chineseplus.net/corpus/api/v1/search'

// 语料库类型配置
const corpusTypes = [
  { value: 0, label: '教材' },
  { value: 1, label: '视频' },
  { value: 2, label: '中介语' },
  { value: 3, label: '口语' },
  { value: 4, label: '书面语' }
]

// 响应式数据
const searchQuery = ref('')
const searching = ref(false)
const hasSearched = ref(false)
const searchHistory = ref([])
const queryResult = ref(null)

// 查询配置
const queryConfig = ref({
  type: 'Context', // 'Context' 或 'Freq'
  number: 100,     // 返回数量
  winSize: 20,     // 上下文窗口大小
  corpusType: 0    // 语料库类型：0-4
})

// 生命周期
onMounted(() => {
  loadSearchHistory()

  // 检查URL参数中是否有关键词
  const keywordFromRoute = route.query.keyword
  if (keywordFromRoute) {
    searchQuery.value = keywordFromRoute
    // 自动执行查询
    setTimeout(() => {
      handleSearch()
    }, 500) // 延迟500ms确保组件完全加载
  }
})

// 搜索处理
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入查询关键词')
    return
  }

  searching.value = true
  hasSearched.value = true
  queryResult.value = null

  try {
    // 构建查询字符串
    const queryStr = buildQueryString(searchQuery.value.trim(), queryConfig.value)

    // 添加到搜索历史
    addToHistory(searchQuery.value.trim())

    // 调用语料库API
    const result = await queryCorpus(queryStr)

    if (result && result.data) {
      queryResult.value = result.data

      if (result.data.total > 0) {
        ElMessage.success(`查询成功，共找到 ${result.data.total} 条记录`)
      } else {
        ElMessage.info('未找到匹配的语料库内容')
      }
    } else {
      throw new Error('查询结果为空')
    }

  } catch (error) {
    console.error('语料库查询失败:', error)
    ElMessage.error(`查询失败: ${error.message || '请稍后重试'}`)
    queryResult.value = { total: 0 }
  } finally {
    searching.value = false
  }
}

// 构建查询字符串
const buildQueryString = (keyword, config) => {
  // 根据Python脚本示例，正确的格式应该是：
  // "办法{}Context(100)" 或 "办法{}Freq(100)"
  let query = `${keyword}{}${config.type}(${config.number}`

  if (config.type === 'Context') {
    query += `,${config.winSize}`
  }

  query += ')'

  console.log('构建查询字符串:', query)
  return query
}

// 调用语料库API
const queryCorpus = async (query) => {
  // 构建完整的API URL，包含语料库类型
  const apiUrl = `${CORPUS_API_BASE_URL}/${queryConfig.value.corpusType}/corpus`

  console.log('调用语料库API:', {
    url: apiUrl,
    query: query,
    requestBody: JSON.stringify({ query })
  })

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query })
    })

    console.log('API响应状态:', response.status, response.statusText)

    if (!response.ok) {
      // 尝试获取错误详情
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.text()
        console.error('API错误响应:', errorData)
        errorMessage += ` - ${errorData}`
      } catch (e) {
        console.error('无法读取错误响应:', e)
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log('API响应数据:', data)

    // 检查新的API响应格式
    if (data.code === 200 && data.data && data.data.content) {
      // 转换为兼容的格式
      const transformedData = {
        success: true,
        data: {
          Type: 'Context',
          Context: data.data.content.map(item => ({
            Context: item.context,
            Source: item.source,
            Note: item.note,
            Project: item.project,
            Title: item.title,
            URL: item.url
          })),
          total: data.data.content.length
        }
      }
      console.log('转换后的数据:', transformedData)
      return transformedData
    }

    // 保持原有的错误处理逻辑
    if (!data.success && data.message) {
      throw new Error(data.message)
    }

    return data
  } catch (error) {
    console.error('语料库API调用失败:', error)

    // 如果是500错误，优雅地处理为无结果
    if (error.message.includes('HTTP 500')) {
      console.log('检测到500错误，返回无结果')
      return {
        success: true,
        data: {
          Type: 'Context',
          Context: [],
          total: 0
        }
      }
    }

    // 如果是网络错误，提供更友好的提示
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('网络连接失败，请检查网络连接或稍后重试')
    }

    throw error
  }
}

// 获取语料库类型标签
const getCorpusTypeLabel = (corpusType) => {
  const corpusTypeObj = corpusTypes.find(type => type.value === corpusType)
  return corpusTypeObj ? corpusTypeObj.label : '未知'
}

// 高亮查询关键词
const highlightQuery = (text) => {
  if (!searchQuery.value.trim()) return text

  const keyword = searchQuery.value.trim()
  const regex = new RegExp(`(<Q>)?(${keyword})(</Q>)?`, 'gi')
  return text.replace(regex, '<mark>$2</mark>')
}

// 应用历史记录
const applyHistoryItem = (item) => {
  searchQuery.value = item
  handleSearch()
}

// 重置表单
const resetForm = () => {
  searchQuery.value = ''
  queryConfig.value = {
    type: 'Context',
    number: 100,
    winSize: 20,
    corpusType: 0
  }
  hasSearched.value = false
  queryResult.value = null
}

// 搜索历史管理
const loadSearchHistory = () => {
  const history = localStorage.getItem('corpus_search_history')
  if (history) {
    try {
      searchHistory.value = JSON.parse(history)
    } catch (e) {
      searchHistory.value = []
    }
  }
}

const addToHistory = (query) => {
  // 移除已存在的相同搜索词
  searchHistory.value = searchHistory.value.filter(item => item !== query)
  // 添加到开头
  searchHistory.value.unshift(query)
  // 只保留最近10个
  searchHistory.value = searchHistory.value.slice(0, 10)
  // 保存到本地存储
  localStorage.setItem('corpus_search_history', JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('corpus_search_history')
  ElMessage.success('搜索历史已清空')
}
</script>

<style scoped>
.corpus-query-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 80px);
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left .page-title {
  display: flex;
  align-items: center;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  gap: 12px;
}

.title-icon {
  color: #3b82f6;
  font-size: 32px;
}

.page-description {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.query-section {
  max-width: 1000px;
  margin: 0 auto;
}

/* 配置卡片 */
.config-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.config-header {
  text-align: center;
  margin-bottom: 24px;
}

.config-header h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.config-form {
  margin-bottom: 24px;
}

.search-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

/* 搜索历史 */
.search-history {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #6b7280;
  font-size: 14px;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  transition: all 0.2s ease;
}

.history-tag:hover {
  background-color: #3b82f6;
  color: white;
}

/* 查询结果 */
.results-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.results-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.corpus-info {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* 频次结果样式 */
.freq-results {
  width: 100%;
}

.freq-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .freq-content {
    grid-template-columns: 1fr;
  }
}

.freq-section, .source-section {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
}

.freq-section h4, .source-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.freq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.freq-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.freq-item .word {
  font-weight: 500;
  color: #1f2937;
}

.freq-item .frequency {
  font-weight: 600;
  color: #3b82f6;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-item {
  background: white;
  border-radius: 6px;
  padding: 12px;
}

.source-item .word-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.source-item .source-detail {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

/* 上下文结果样式 */
.context-results {
  width: 100%;
}

.context-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.context-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.context-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.context-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.context-index {
  font-size: 12px;
  color: #6b7280;
}

.context-content {
  line-height: 1.6;
  color: #1f2937;
  margin-bottom: 12px;
}

.context-content :deep(mark) {
  background-color: #fef08a;
  color: #1f2937;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.context-details {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

.detail-label {
  font-weight: 600;
  color: #6b7280;
  min-width: 50px;
  flex-shrink: 0;
}

.detail-value {
  color: #374151;
  word-break: break-all;
}

.detail-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.1);
  transition: all 0.2s ease;
}

.detail-link:hover {
  background: rgba(59, 130, 246, 0.2);
  color: #2563eb;
  text-decoration: underline;
}

/* 无结果 */
.no-results {
  text-align: center;
  padding: 40px 20px;
}

/* 加载状态 */
.loading-state {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.loading-text {
  margin-top: 16px;
  color: #6b7280;
  font-size: 16px;
}
</style>
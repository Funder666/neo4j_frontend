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
        <div class="search-card">
          <div class="search-header">
            <h3>语料库搜索</h3>
            <p>输入关键词搜索语料库内容</p>
          </div>

          <div class="search-form">
            <div class="search-input-wrapper">
              <el-input
                v-model="searchQuery"
                placeholder="请输入搜索关键词..."
                size="large"
                class="search-input"
                @keyup.enter="handleSearch"
                :loading="searching"
              >
                <template #prepend>
                  <el-icon><Search /></el-icon>
                </template>
                <template #append>
                  <el-button
                    type="primary"
                    @click="handleSearch"
                    :loading="searching"
                    :disabled="!searchQuery.trim()"
                  >
                    搜索
                  </el-button>
                </template>
              </el-input>
            </div>
          </div>

          <!-- 搜索提示 -->
          <div class="search-tips" v-if="!searchQuery.trim()">
            <div class="tips-header">
              <el-icon><InfoFilled /></el-icon>
              搜索提示
            </div>
            <ul class="tips-list">
              <li>支持中文关键词搜索</li>
              <li>可以搜索文档内容、标题等信息</li>
              <li>支持模糊匹配和精确匹配</li>
            </ul>
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
                @click="searchQuery = item"
                style="cursor: pointer"
              >
                {{ item }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 搜索结果占位区域 -->
        <div class="results-placeholder" v-if="hasSearched && !searching">
          <div class="placeholder-content">
            <el-icon class="placeholder-icon"><FolderOpened /></el-icon>
            <h4>搜索结果将在这里显示</h4>
            <p>当前为演示页面，实际的语料库搜索结果将显示在此区域</p>
          </div>
        </div>

        <!-- 加载状态 -->
        <div class="loading-state" v-if="searching">
          <el-skeleton :rows="5" animated />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Search, InfoFilled, FolderOpened } from '@element-plus/icons-vue'
import AppLayout from '../components/AppLayout.vue'

// 响应式数据
const searchQuery = ref('')
const searching = ref(false)
const hasSearched = ref(false)
const searchHistory = ref([])

// 生命周期
onMounted(() => {
  loadSearchHistory()
})

// 搜索处理
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  hasSearched.value = true

  try {
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 添加到搜索历史
    addToHistory(searchQuery.value.trim())

    // TODO: 实际的跳转逻辑，目标页面还未确定
    // 当前先记录搜索关键词并显示提示
    const keyword = searchQuery.value.trim()
    console.log('将要搜索的关键词:', keyword)

    ElMessage.info(`搜索关键词：${keyword}，将跳转到语料库页面（开发中）`)

    // 未来的跳转逻辑示例:
    // window.location.href = `https://corpus-site.com/search?q=${encodeURIComponent(keyword)}`
    // 或者使用 router 跳转到其他内部页面
    // router.push({ name: 'CorpusResults', query: { q: keyword } })

  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请稍后重试')
  } finally {
    searching.value = false
  }
}

// 搜索历史管理
const loadSearchHistory = () => {
  const history = localStorage.getItem('corpus_search_history')
  if (history) {
    searchHistory.value = JSON.parse(history)
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
  max-width: 800px;
  margin: 0 auto;
}

.search-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.search-header {
  text-align: center;
  margin-bottom: 32px;
}

.search-header h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.search-header p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

.search-form {
  margin-bottom: 32px;
}

.search-input-wrapper {
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
  max-width: 600px;
}

.search-input :deep(.el-input__inner) {
  font-size: 16px;
  padding: 16px 20px;
}

.search-tips {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 12px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #6b7280;
}

.tips-list li {
  margin-bottom: 6px;
}

.search-history {
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  margin-top: 24px;
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

.results-placeholder {
  background: white;
  border-radius: 12px;
  padding: 60px 32px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.placeholder-content {
  max-width: 400px;
  margin: 0 auto;
}

.placeholder-icon {
  font-size: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.placeholder-content h4 {
  font-size: 20px;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.placeholder-content p {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.loading-state {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>
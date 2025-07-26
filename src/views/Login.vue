<template>
  <div class="login-container">
    <!-- 背景动画元素 -->
    <div class="background-animation">
      <div class="floating-nodes">
        <div class="node node-1"></div>
        <div class="node node-2"></div>
        <div class="node node-3"></div>
        <div class="node node-4"></div>
        <div class="node node-5"></div>
        <div class="node node-6"></div>
      </div>
      <div class="connecting-lines">
        <svg class="lines-svg" viewBox="0 0 1200 800">
          <line x1="200" y1="150" x2="400" y2="300" class="line line-1" />
          <line x1="400" y1="300" x2="600" y2="200" class="line line-2" />
          <line x1="600" y1="200" x2="800" y2="400" class="line line-3" />
          <line x1="300" y1="500" x2="500" y2="350" class="line line-4" />
          <line x1="700" y1="600" x2="900" y2="450" class="line line-5" />
        </svg>
      </div>
    </div>

    <!-- 主登录卡片 -->
    <div class="login-card">
      <!-- Logo和标题区域 -->
      <div class="login-header">
        <div class="logo-container">
          <div class="neo4j-logo">
            <svg viewBox="0 0 100 100" class="logo-svg">
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient1)" stroke-width="3"/>
              <circle cx="30" cy="35" r="8" fill="#00BCD4"/>
              <circle cx="70" cy="35" r="8" fill="#FF6B6B"/>
              <circle cx="50" cy="65" r="8" fill="#4ECDC4"/>
              <line x1="30" y1="35" x2="70" y2="35" stroke="#666" stroke-width="2"/>
              <line x1="30" y1="35" x2="50" y2="65" stroke="#666" stroke-width="2"/>
              <line x1="70" y1="35" x2="50" y2="65" stroke="#666" stroke-width="2"/>
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#667eea"/>
                  <stop offset="100%" style="stop-color:#764ba2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <h1 class="title">国际中文教育知识图谱</h1>
        <p class="subtitle">图数据库可视化管理平台</p>
      </div>
      
      <!-- 登录表单 -->
      <div class="login-form-container">
        <el-form
          ref="loginForm"
          :model="form"
          :rules="rules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username" class="form-item">
            <div class="input-wrapper">
              <el-icon class="input-icon"><User /></el-icon>
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                class="custom-input"
              />
            </div>
          </el-form-item>
          
          <el-form-item prop="password" class="form-item">
            <div class="input-wrapper">
              <el-icon class="input-icon"><Lock /></el-icon>
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                class="custom-input"
                @keyup.enter="handleLogin"
              />
            </div>
          </el-form-item>
          
          <el-form-item class="form-item">
            <el-button
              type="primary"
              size="large"
              class="login-button"
              :loading="loading"
              @click="handleLogin"
            >
              <span v-if="!loading">
                <el-icon class="button-icon"><Right /></el-icon>
                立即登录
              </span>
              <span v-else>
                登录中...
              </span>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      
<!--      &lt;!&ndash; 提示信息 &ndash;&gt;-->
<!--      <div class="login-tips">-->
<!--        <div class="tip-card">-->
<!--          <el-icon class="tip-icon"><InfoFilled /></el-icon>-->
<!--          <div class="tip-content">-->
<!--            <p class="tip-title">默认管理员账号</p>-->
<!--            <p class="tip-text">用户名: <code>admin</code></p>-->
<!--            <p class="tip-text">密码: <code>admin</code></p>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->
    </div>

    <!-- 底部信息 -->
    <div class="footer-info">
      <p>2025 主办单位: 中外语言交流合作中心 华东师范大学</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Right, Loading, InfoFilled } from '@element-plus/icons-vue'
import authService from '../services/auth'
import apiService from '../services/api'

const router = useRouter()
const loginForm = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginForm.value) return
  
  try {
    const valid = await loginForm.value.validate()
    if (!valid) return
    
    loading.value = true
    
    const result = await authService.login(form.username, form.password)
    
    if (result.success) {
      ElMessage.success('登录成功！')
      router.push('/dashboard')
    } else {
      ElMessage.error(result.message || '登录失败')
    }
  } catch (error) {
    console.error('登录错误:', error)
    ElMessage.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 主容器 */
.login-container {
  min-height: 100vh;
  width: 100vw;
  position: fixed;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 背景动画 */
.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-nodes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.node {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  opacity: 0.6;
}

.node-1 {
  background: #00BCD4;
  top: 20%;
  left: 15%;
  animation: float 6s ease-in-out infinite;
}

.node-2 {
  background: #FF6B6B;
  top: 30%;
  right: 20%;
  animation: float 8s ease-in-out infinite reverse;
}

.node-3 {
  background: #4ECDC4;
  bottom: 30%;
  left: 25%;
  animation: float 7s ease-in-out infinite;
}

.node-4 {
  background: #45B7D1;
  top: 60%;
  right: 15%;
  animation: float 9s ease-in-out infinite reverse;
}

.node-5 {
  background: #96CEB4;
  bottom: 20%;
  right: 30%;
  animation: float 5s ease-in-out infinite;
}

.node-6 {
  background: #FFEAA7;
  top: 15%;
  left: 60%;
  animation: float 6.5s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.lines-svg {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0.3;
}

.line {
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1;
  stroke-dasharray: 5,5;
  animation: dash 20s linear infinite;
}

@keyframes dash {
  to { stroke-dashoffset: -100; }
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.1);
  animation: cardFadeIn 0.8s ease-out;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 标题区域 */
.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.neo4j-logo {
  width: 80px;
  height: 80px;
  animation: logoRotate 20s linear infinite;
}

@keyframes logoRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.logo-svg {
  width: 100%;
  height: 100%;
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
  font-weight: 400;
}

/* 表单区域 */
.login-form-container {
  margin-bottom: 32px;
}

.form-item {
  margin-bottom: 24px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  z-index: 5;
  color: #999;
  font-size: 18px;
}

.custom-input :deep(.el-input__wrapper) {
  padding-left: 48px;
  border-radius: 12px;
  border: 2px solid #e8ecf0;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  box-shadow: none;
}

.custom-input :deep(.el-input__wrapper:hover) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.9);
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  border-color: #667eea;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.custom-input :deep(.el-input__inner) {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
}

.custom-input :deep(.el-input__inner::placeholder) {
  color: #a0a7b0;
  font-weight: 400;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(102, 126, 234, 0.3);
}

.login-button:active {
  transform: translateY(0);
}

.login-button :deep(.el-button__text) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.button-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.login-button:hover .button-icon {
  transform: translateX(4px);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 提示卡片 */
.login-tips {
  margin-top: 24px;
}

.tip-card {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 0.3s ease;
}

.tip-card:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-color: rgba(102, 126, 234, 0.3);
}

.tip-icon {
  color: #667eea;
  font-size: 20px;
  margin-top: 2px;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.tip-text {
  font-size: 13px;
  color: #7f8c8d;
  margin: 4px 0;
  line-height: 1.4;
}

.tip-text code {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  font-weight: 600;
}

/* 底部信息 */
.footer-info {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
}

.footer-info p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0;
  font-weight: 400;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    margin: 16px;
  }
  
  .title {
    font-size: 24px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  .neo4j-logo {
    width: 60px;
    height: 60px;
  }
}

/* 表单验证错误样式 */
.form-item :deep(.el-form-item__error) {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .login-card {
    background: rgba(45, 55, 72, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .title {
    color: #f7fafc;
  }
  
  .subtitle {
    color: #a0aec0;
  }
  
  .custom-input :deep(.el-input__wrapper) {
    background: rgba(74, 85, 104, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .custom-input :deep(.el-input__inner) {
    color: #f7fafc;
  }
  
  .tip-title {
    color: #f7fafc;
  }
  
  .tip-text {
    color: #a0aec0;
  }
}
</style>
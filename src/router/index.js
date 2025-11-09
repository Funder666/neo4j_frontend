import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import NodeQuery from '../views/NodeQuery.vue'
import RelationshipQuery from '../views/RelationshipQuery.vue'
import CypherQuery from '../views/CypherQuery.vue'
import CypherQueryMobileStandalone from '../views/CypherQueryMobileStandalone.vue'
import CorpusQuery from '../views/CorpusQuery.vue'
import SystemConfig from '../views/SystemConfig.vue'

// 检测是否为移动端设备
const isMobileDevice = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/query',
    name: 'NodeQuery',
    component: NodeQuery,
    meta: { requiresAuth: true }
  },
  {
    path: '/relationships',
    name: 'RelationshipQuery',
    component: RelationshipQuery,
    meta: { requiresAuth: true }
  },
  {
    path: '/cypher',
    name: 'CypherQuery',
    component: CypherQuery,
    meta: { requiresAuth: true }
  },
    {
    path: '/mobile-cypher',
    name: 'CypherQueryMobileStandalone',
    component: CypherQueryMobileStandalone,
    meta: { requiresAuth: false } // 无需身份验证的独立手机端页面
  },
  {
    path: '/corpus',
    name: 'CorpusQuery',
    component: CorpusQuery,
    meta: { requiresAuth: true }
  },
  {
    path: '/config',
    name: 'SystemConfig',
    component: SystemConfig,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('neo4j_token')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && isLoggedIn) {
    next('/dashboard')
  } else if (to.path === '/cypher') {
    // 自动检测移动端并重定向
    if (isMobileDevice()) {
      next('/mobile-cypher') // 重定向到无需登录的独立手机端页面
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
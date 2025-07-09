import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import NodeQuery from '../views/NodeQuery.vue'
import GraphVisualization from '../views/GraphVisualization.vue'
import DataManagement from '../views/DataManagement.vue'
import SystemConfig from '../views/SystemConfig.vue'

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
    path: '/graph',
    name: 'GraphVisualization',
    component: GraphVisualization,
    meta: { requiresAuth: true }
  },
  {
    path: '/data',
    name: 'DataManagement',
    component: DataManagement,
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
  } else {
    next()
  }
})

export default router
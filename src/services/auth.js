class AuthService {
  constructor() {
    this.TOKEN_KEY = 'neo4j_token'
    this.USER_KEY = 'neo4j_user'
    this.API_BASE_URL = 'https://chineseedu.shuishan.net.cn:8000'
  }

  // 登录
  async login(username, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        })
      })

      const data = await response.json()

      if (response.ok) {
        // 存储token和用户信息
        localStorage.setItem(this.TOKEN_KEY, data.access_token)
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))
        
        return {
          success: true,
          token: data.access_token,
          user: data.user
        }
      } else {
        return {
          success: false,
          message: data.detail || '登录失败'
        }
      }
    } catch (error) {
      console.error('登录请求失败:', error)
      return {
        success: false,
        message: '网络连接失败，请检查后端服务是否启动'
      }
    }
  }

  // 登出
  async logout() {
    try {
      const token = this.getToken()
      if (token) {
        await fetch(`${this.API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      // 无论API调用是否成功，都清除本地存储
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
    }
  }

  // 检查是否已登录
  isLoggedIn() {
    const token = localStorage.getItem(this.TOKEN_KEY)
    if (!token) return false
    
    // 简单检查token是否过期（JWT格式）
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Date.now() / 1000
      return payload.exp > now
    } catch (error) {
      // token格式错误，清除
      this.logout()
      return false
    }
  }

  // 获取当前用户信息
  getCurrentUser() {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  // 获取token
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  // 刷新用户信息
  async refreshUserInfo() {
    try {
      const token = this.getToken()
      if (!token) return null

      const response = await fetch(`${this.API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const user = await response.json()
        localStorage.setItem(this.USER_KEY, JSON.stringify(user))
        return user
      } else {
        // token可能已过期
        this.logout()
        return null
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      return null
    }
  }

  // 检查token是否有效
  async validateToken() {
    try {
      const token = this.getToken()
      if (!token) return false

      const response = await fetch(`${this.API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      return response.ok
    } catch (error) {
      console.error('验证token失败:', error)
      return false
    }
  }
}

export default new AuthService()
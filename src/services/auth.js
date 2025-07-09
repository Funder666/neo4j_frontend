class AuthService {
  constructor() {
    this.TOKEN_KEY = 'neo4j_token'
    this.USER_KEY = 'neo4j_user'
  }

  // 登录
  async login(username, password) {
    // 写死的账号密码验证
    if (username === 'neo4j' && password === 'xtxzhu2u') {
      const token = this.generateToken()
      const user = {
        username,
        loginTime: new Date().toISOString()
      }
      
      localStorage.setItem(this.TOKEN_KEY, token)
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
      
      return {
        success: true,
        token,
        user
      }
    } else {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }
  }

  // 登出
  logout() {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  // 检查是否已登录
  isLoggedIn() {
    return !!localStorage.getItem(this.TOKEN_KEY)
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

  // 生成简单的token
  generateToken() {
    return btoa(`neo4j:${Date.now()}:${Math.random()}`)
  }
}

export default new AuthService()
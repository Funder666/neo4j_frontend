# Neo4j 浮点数问题修复

## 问题描述
Neo4j 查询中的 LIMIT 参数接收到浮点数（如 50.0）时会报错，需要确保传递的是整数。

## 修复的文件和位置

### 1. NodeQuery.vue (第233行)
```javascript
// 修复前
limit: limit.value

// 修复后
limit: parseInt(limit.value)
```

### 2. GraphVisualization.vue (第229行)
```javascript
// 修复前
const params = { limit: nodeLimit.value }

// 修复后
const params = { limit: parseInt(nodeLimit.value) }
```

### 3. neo4j.js (第125行)
```javascript
// 修复前
return await this.runQuery(query, { limit })

// 修复后
return await this.runQuery(query, { limit: parseInt(limit) })
```

## 测试步骤
1. 启动应用：`npm run dev`
2. 登录系统（neo4j/xtxzhu2u）
3. 进入节点查询页面
4. 在"结果数量限制"输入框中输入数字（如50）
5. 输入查询内容并点击查询
6. 验证查询是否正常执行，无错误信息

## 预期结果
- 查询应该正常执行
- 不再出现 "Invalid input. '50.0' is not a valid value" 错误
- 所有使用 limit 参数的功能都应该正常工作
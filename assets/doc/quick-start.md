# 快速开始

## 环境要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 本地服务器（用于运行项目）

## 安装步骤

### 1. 克隆项目

```bash
git clone [项目地址]
cd AI-game-center
```

### 2. 启动服务器

#### Windows

双击运行 `start.bat` 文件，或在项目目录下执行：

```bash
# 使用 Python
python -m http.server 8081

# 或使用 Node.js
npx http-server -p 8081
```

#### macOS / Linux

```bash
# 使用 Python
python3 -m http.server 8081

# 或使用 Node.js
npx http-server -p 8081
```

### 3. 访问应用

打开浏览器，访问：

```
http://localhost:8081
```

## 快速导航

| 功能 | 页面 | 说明 |
|------|------|------|
| 首页 | `/index.html` | 主入口页面 |
| 五子棋 | `/gomoku-home.html` | 双人/人机对战 |
| 围棋 | `/go.html` | 围棋游戏 |
| 推箱子 | `/sokoban.html` | 10关益智游戏 |
| 计算器 | `/calculator.html` | 基础计算 |
| AI技术站 | `/ai-doc.html` | 技术文档 |

## 移动端适配

项目已完美适配移动端：

- 响应式布局自动调整
- 触摸手势支持
- 适配各种屏幕尺寸

## 常见问题

### Q: 页面无法加载？

确保已正确启动本地服务器，且端口未被占用。

### Q: 游戏无法操作？

检查浏览器是否启用了 JavaScript。

### Q: 样式显示异常？

尝试清除浏览器缓存后重新加载。
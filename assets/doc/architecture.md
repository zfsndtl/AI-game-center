# 项目架构

## 整体结构

AI小站采用前后端分离的纯前端架构，所有功能模块独立运行，无需后端服务支持。

```
AI-game-center/
├── assets/                 # 静态资源
│   ├── backgrounds/        # 背景图片
│   └── doc/                # Markdown文档
├── css/                    # 样式文件
│   ├── style.css           # 全局样式
│   ├── background.css      # 背景样式
│   └── *.css               # 各功能样式
├── js/                     # 脚本文件
│   ├── background-manager.js
│   └── *.js                # 各功能脚本
├── index.html              # 首页
└── *.html                  # 功能页面
```

## 核心模块

### 1. 首页模块

**文件**: `index.html`

**功能**:
- 导航入口
- 气球气泡动画
- 背景图片随机切换

**依赖**:
- `css/style.css`
- `css/background.css`
- `js/background-manager.js`

### 2. 游戏模块

#### 五子棋
- `gomoku-home.html` - 入口页
- `js/game.js` - 游戏逻辑
- `css/style.css` - 样式

#### 围棋
- `go.html` - 游戏页
- `js/go.js` - 游戏逻辑
- `css/go.css` - 样式

#### 推箱子
- `sokoban.html` - 游戏页
- `js/sokoban.js` - 游戏逻辑
- `css/sokoban.css` - 样式

### 3. 工具模块

每个工具独立成模块，包含：
- HTML页面
- CSS样式
- JS逻辑

### 4. 文档模块

- `ai-doc.html` - 文档页面
- `js/ai-doc.js` - Markdown渲染
- `assets/doc/*.md` - 文档源文件

## 技术要点

### 响应式设计

使用CSS媒体查询适配不同屏幕：

```css
@media (max-width: 768px) {
    /* 移动端样式 */
}
```

### 动画效果

- CSS `@keyframes` 定义动画
- `animation` 属性应用动画
- `transition` 实现过渡效果

### Canvas渲染

游戏使用Canvas 2D进行渲染：

```javascript
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
```

### 事件处理

支持鼠标和触摸事件：

```javascript
// 鼠标事件
element.addEventListener('click', handler);

// 触摸事件
element.addEventListener('touchstart', handler);
```

## 性能优化

1. **CSS合并**: 公共样式合并到 `style.css`
2. **按需加载**: 各模块独立加载
3. **动画优化**: 使用 `requestAnimationFrame`
4. **事件委托**: 减少事件监听器数量
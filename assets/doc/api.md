# API 参考

## 概述

本文档描述AI小站中各模块提供的API接口。

## 背景管理器

**文件**: `js/background-manager.js`

### 方法

#### init()

初始化背景管理器。

```javascript
backgroundManager.init();
```

#### setBackground(url)

设置背景图片。

```javascript
backgroundManager.setBackground('assets/backgrounds/landscape1.jpg');
```

#### randomBackground()

随机切换背景图片。

```javascript
backgroundManager.randomBackground();
```

---

## 推箱子游戏

**文件**: `js/sokoban.js`

### 关卡数据结构

```javascript
// 关卡定义
// 0=空地, 1=墙, 2=地板, 3=目标, 4=箱子, 5=玩家
var LEVELS = [
    {
        width: 6,
        height: 6,
        map: [1, 1, 1, ...]
    }
];
```

### 游戏控制

#### move(dx, dy)

移动玩家。

```javascript
// 向上移动
move(0, -1);

// 向右移动
move(1, 0);
```

#### undo()

撤销上一步操作。

```javascript
undo();
```

#### reset()

重置当前关卡。

```javascript
reset();
```

#### loadLevel(index)

加载指定关卡。

```javascript
// 加载第3关
loadLevel(2);
```

---

## 五子棋游戏

**文件**: `js/game.js`

### 游戏状态

```javascript
var gameState = {
    board: [],          // 棋盘状态
    currentPlayer: 1,   // 当前玩家 (1=黑, 2=白)
    gameOver: false     // 游戏是否结束
};
```

### 方法

#### placePiece(x, y)

在指定位置落子。

```javascript
placePiece(7, 7);
```

#### checkWin(x, y)

检查是否获胜。

```javascript
if (checkWin(7, 7)) {
    console.log('获胜！');
}
```

---

## 文档系统

**文件**: `js/ai-doc.js`

### 文档索引配置

```javascript
var docIndex = [
    {
        category: '分类名称',
        docs: [
            { title: '文档标题', file: 'filename.md' }
        ]
    }
];
```

### 方法

#### loadDoc(file)

加载指定文档。

```javascript
loadDoc('intro.md');
```

#### renderMarkdown(markdown)

渲染Markdown内容。

```javascript
renderMarkdown('# 标题\n内容...');
```

---

## 事件系统

### 自定义事件

```javascript
// 监听事件
document.addEventListener('gameWin', function(e) {
    console.log('游戏获胜！', e.detail);
});

// 触发事件
var event = new CustomEvent('gameWin', {
    detail: { level: 1 }
});
document.dispatchEvent(event);
```

---

## 配置选项

### 游戏配置

```javascript
var CONFIG = {
    boardSize: 15,          // 棋盘大小
    tileSize: 40,           // 格子大小
    animationDuration: 300  // 动画时长(ms)
};
```

### 样式配置

```javascript
var COLORS = {
    background: '#f5f7fa',
    primary: '#8B5A2B',
    text: '#3d2410'
};
```
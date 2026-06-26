(function() {
    // 计算器状态
    let currentNumber = '0';
    let previousNumber = '';
    let operator = '';
    let expression = '';
    let shouldResetScreen = false;

    // 科学计算器状态
    let isScientificMode = false;
    let angleMode = 'deg'; // 'deg' or 'rad'
    let waitingForPower = false; // 等待输入 xⁿ 的指数
    let memoryBase = ''; // xⁿ 的底数

    // DOM 元素
    const container = document.querySelector('.calculator-container');
    const resultDisplay = document.getElementById('result');
    const expressionDisplay = document.getElementById('expression');
    const modeToggle = document.getElementById('modeToggle');
    const scientificPanel = document.getElementById('scientificPanel');
    const angleModeEl = document.getElementById('angleMode');
    const angleBtns = document.querySelectorAll('.calculator-angle-btn');

    // 获取所有按钮
    const buttons = document.querySelectorAll('.calculator-btn');

    // 添加按钮点击事件
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
        
        // 添加触摸事件以增强动画效果
        button.addEventListener('touchstart', function(e) {
            this.classList.add('calculator-btn-pressed');
            createRippleEffect(e, this);
        });
        
        button.addEventListener('touchend', function() {
            this.classList.remove('calculator-btn-pressed');
        });
    });

    // 模式切换
    modeToggle.addEventListener('click', function() {
        isScientificMode = !isScientificMode;
        this.classList.toggle('active', isScientificMode);
        scientificPanel.classList.toggle('visible', isScientificMode);
        angleModeEl.classList.toggle('visible', isScientificMode);
        container.classList.toggle('scientific-active', isScientificMode);
    });

    // 角度模式切换
    angleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            angleMode = this.dataset.angle;
            angleBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 处理按钮点击
    function handleButtonClick(e) {
        const button = e.currentTarget;
        const action = button.dataset.action;
        const value = button.dataset.value;

        // 添加点击动画
        addClickAnimation(button);

        switch(action) {
            case 'number':
                inputNumber(value);
                break;
            case 'operator':
                inputOperator(value);
                break;
            case 'equals':
                calculate();
                break;
            case 'clear':
                clear();
                break;
            case 'delete':
                deleteLast();
                break;
            case 'func':
                applyFunction(value);
                break;
            case 'power':
                applyPower(value);
                break;
            case 'constant':
                inputConstant(value);
                break;
            case 'paren':
                // 预留括号支持
                break;
        }
    }

    // 输入数字
    function inputNumber(num) {
        if (waitingForPower) {
            // 正在输入 xⁿ 的指数
            if (memoryBase === '') {
                memoryBase = currentNumber;
            }
            if (shouldResetScreen) {
                currentNumber = num;
                shouldResetScreen = false;
            } else {
                currentNumber += num;
            }
            expression = memoryBase + ' ^ ' + currentNumber;
            updateDisplay();
            return;
        }

        if (shouldResetScreen) {
            currentNumber = num;
            shouldResetScreen = false;
        } else {
            if (currentNumber === '0' && num !== '.') {
                currentNumber = num;
            } else if (num === '.' && currentNumber.includes('.')) {
                return;
            } else {
                currentNumber += num;
            }
        }
        updateDisplay();
    }

    // 输入操作符
    function inputOperator(op) {
        if (waitingForPower) {
            // 先完成幂运算
            calculate();
        }

        if (operator && !shouldResetScreen) {
            calculate();
        }
        
        previousNumber = currentNumber;
        operator = op;
        shouldResetScreen = true;
        
        // 更新表达式显示
        const operatorSymbol = getOperatorSymbol(op);
        expression = previousNumber + ' ' + operatorSymbol;
        updateDisplay();
    }

    // 应用科学函数
    function applyFunction(func) {
        const val = parseFloat(currentNumber);
        let result;
        let funcDisplay = '';

        // 角度转弧度辅助
        const toRad = (deg) => deg * Math.PI / 180;
        const fromRad = (rad) => rad * 180 / Math.PI;

        switch(func) {
            case 'sin':
                result = angleMode === 'deg' ? Math.sin(toRad(val)) : Math.sin(val);
                funcDisplay = 'sin(' + currentNumber + ')';
                break;
            case 'cos':
                result = angleMode === 'deg' ? Math.cos(toRad(val)) : Math.cos(val);
                funcDisplay = 'cos(' + currentNumber + ')';
                break;
            case 'tan':
                result = angleMode === 'deg' ? Math.tan(toRad(val)) : Math.tan(val);
                funcDisplay = 'tan(' + currentNumber + ')';
                break;
            case 'asin':
                if (val < -1 || val > 1) {
                    currentNumber = 'Error';
                    expression = 'asin: 输入超出范围';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = angleMode === 'deg' ? fromRad(Math.asin(val)) : Math.asin(val);
                funcDisplay = 'sin⁻¹(' + currentNumber + ')';
                break;
            case 'acos':
                if (val < -1 || val > 1) {
                    currentNumber = 'Error';
                    expression = 'acos: 输入超出范围';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = angleMode === 'deg' ? fromRad(Math.acos(val)) : Math.acos(val);
                funcDisplay = 'cos⁻¹(' + currentNumber + ')';
                break;
            case 'atan':
                result = angleMode === 'deg' ? fromRad(Math.atan(val)) : Math.atan(val);
                funcDisplay = 'tan⁻¹(' + currentNumber + ')';
                break;
            case 'log':
                if (val <= 0) {
                    currentNumber = 'Error';
                    expression = 'log: 输入必须大于0';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = Math.log10(val);
                funcDisplay = 'log(' + currentNumber + ')';
                break;
            case 'ln':
                if (val <= 0) {
                    currentNumber = 'Error';
                    expression = 'ln: 输入必须大于0';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = Math.log(val);
                funcDisplay = 'ln(' + currentNumber + ')';
                break;
            case 'sqrt':
                if (val < 0) {
                    currentNumber = 'Error';
                    expression = '√: 输入不能为负';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = Math.sqrt(val);
                funcDisplay = '√(' + currentNumber + ')';
                break;
            case 'abs':
                result = Math.abs(val);
                funcDisplay = '|' + currentNumber + '|';
                break;
            case 'exp':
                result = Math.exp(val);
                funcDisplay = 'e^(' + currentNumber + ')';
                break;
            case 'tenx':
                result = Math.pow(10, val);
                funcDisplay = '10^(' + currentNumber + ')';
                break;
            case 'inv':
                if (val === 0) {
                    currentNumber = 'Error';
                    expression = '1/x: 除数不能为0';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = 1 / val;
                funcDisplay = '1/(' + currentNumber + ')';
                break;
            case 'fact':
                if (val < 0 || val !== Math.floor(val) || val > 170) {
                    currentNumber = 'Error';
                    expression = '!: 需要非负整数(≤170)';
                    shouldResetScreen = true;
                    updateDisplay();
                    return;
                }
                result = factorial(val);
                funcDisplay = currentNumber + '!';
                break;
            default:
                return;
        }

        // 格式化结果
        if (isNaN(result) || !isFinite(result)) {
            currentNumber = 'Error';
        } else {
            currentNumber = parseFloat(result.toFixed(10)).toString();
        }

        expression = funcDisplay + ' =';
        shouldResetScreen = true;
        updateDisplay();
        addResultAnimation();
    }

    // 应用幂运算
    function applyPower(power) {
        const val = parseFloat(currentNumber);
        let result;

        if (power === 'n') {
            // xⁿ 模式：记录底数，等待输入指数
            waitingForPower = true;
            memoryBase = currentNumber;
            expression = currentNumber + ' ^ ';
            shouldResetScreen = true;
            updateDisplay();
            return;
        }

        const exp = parseInt(power);
        result = Math.pow(val, exp);

        const symbols = { '2': '²', '3': '³' };
        expression = currentNumber + symbols[power] + ' =';

        if (isNaN(result) || !isFinite(result)) {
            currentNumber = 'Error';
        } else {
            currentNumber = parseFloat(result.toFixed(10)).toString();
        }

        shouldResetScreen = true;
        updateDisplay();
        addResultAnimation();
    }

    // 输入常量
    function inputConstant(name) {
        switch(name) {
            case 'pi':
                currentNumber = Math.PI.toFixed(10);
                break;
            case 'e':
                currentNumber = Math.E.toFixed(10);
                break;
        }
        expression = '';
        shouldResetScreen = true;
        updateDisplay();
    }

    // 阶乘
    function factorial(n) {
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    // 计算
    function calculate() {
        // 处理 xⁿ 模式
        if (waitingForPower) {
            const base = parseFloat(memoryBase);
            const exp = parseFloat(currentNumber);
            const result = Math.pow(base, exp);

            expression = memoryBase + ' ^ ' + currentNumber + ' =';
            if (isNaN(result) || !isFinite(result)) {
                currentNumber = 'Error';
            } else {
                currentNumber = parseFloat(result.toFixed(10)).toString();
            }

            waitingForPower = false;
            memoryBase = '';
            previousNumber = '';
            operator = '';
            shouldResetScreen = true;
            updateDisplay();
            addResultAnimation();
            return;
        }

        if (!operator || previousNumber === '') return;

        const prev = parseFloat(previousNumber);
        const current = parseFloat(currentNumber);
        let result = 0;

        switch(operator) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '*':
                result = prev * current;
                break;
            case '/':
                if (current === 0) {
                    result = 'Error';
                } else {
                    result = prev / current;
                }
                break;
            case '%':
                result = prev % current;
                break;
        }

        // 格式化结果
        if (result === 'Error') {
            currentNumber = result;
        } else {
            // 限制小数位数
            currentNumber = parseFloat(result.toFixed(10)).toString();
        }

        // 更新表达式
        const operatorSymbol = getOperatorSymbol(operator);
        expression = previousNumber + ' ' + operatorSymbol + ' ' + currentNumber + ' =';
        
        // 重置状态
        previousNumber = '';
        operator = '';
        shouldResetScreen = true;

        updateDisplay();
        
        // 添加结果动画
        addResultAnimation();
    }

    // 清除
    function clear() {
        currentNumber = '0';
        previousNumber = '';
        operator = '';
        expression = '';
        shouldResetScreen = false;
        waitingForPower = false;
        memoryBase = '';
        updateDisplay();
    }

    // 删除最后一个字符
    function deleteLast() {
        if (waitingForPower) {
            waitingForPower = false;
            memoryBase = '';
            expression = '';
            updateDisplay();
            return;
        }

        if (currentNumber.length === 1 || currentNumber === 'Error') {
            currentNumber = '0';
        } else {
            currentNumber = currentNumber.slice(0, -1);
        }
        updateDisplay();
    }

    // 更新显示
    function updateDisplay() {
        resultDisplay.textContent = currentNumber;
        expressionDisplay.textContent = expression;
        
        // 根据数字长度调整字体大小
        adjustFontSize();
    }

    // 获取操作符符号
    function getOperatorSymbol(op) {
        switch(op) {
            case '+': return '+';
            case '-': return '−';
            case '*': return '×';
            case '/': return '÷';
            case '%': return '%';
            default: return op;
        }
    }

    // 调整字体大小
    function adjustFontSize() {
        const length = currentNumber.length;
        if (length > 12) {
            resultDisplay.style.fontSize = '32px';
        } else if (length > 9) {
            resultDisplay.style.fontSize = '40px';
        } else {
            resultDisplay.style.fontSize = '48px';
        }
    }

    // 添加点击动画
    function addClickAnimation(button) {
        button.style.transform = 'scale(0.92)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }

    // 添加结果动画
    function addResultAnimation() {
        resultDisplay.style.animation = 'none';
        setTimeout(() => {
            resultDisplay.style.animation = 'resultPulse 0.3s ease';
        }, 10);
    }

    // 创建涟漪效果
    function createRippleEffect(e, button) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.touches[0].clientX - rect.left - size / 2;
        const y = e.touches[0].clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // 初始化显示
    updateDisplay();
})();
(function() {
    // 计算器状态
    let currentNumber = '0';
    let previousNumber = '';
    let operator = '';
    let expression = '';
    let shouldResetScreen = false;

    // DOM 元素
    const resultDisplay = document.getElementById('result');
    const expressionDisplay = document.getElementById('expression');

    // 获取所有按钮
    const buttons = document.querySelectorAll('.calculator-btn');

    // 添加按钮点击事件
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
        
        // 添加触摸事件以增强动画效果
        button.addEventListener('touchstart', function(e) {
            this.classList.add('calculator-btn-pressed');
            createRippleEffect(e, this);
        });
        
        button.addEventListener('touchend', function() {
            this.classList.remove('calculator-btn-pressed');
        });
    });

    // 处理按钮点击
    function handleButtonClick(e) {
        const button = e.currentTarget;
        const action = button.dataset.action;
        const value = button.dataset.value;

        // 添加点击动画
        addClickAnimation(button);

        switch(action) {
            case 'number':
                inputNumber(value);
                break;
            case 'operator':
                inputOperator(value);
                break;
            case 'equals':
                calculate();
                break;
            case 'clear':
                clear();
                break;
            case 'delete':
                deleteLast();
                break;
        }
    }

    // 输入数字
    function inputNumber(num) {
        if (shouldResetScreen) {
            currentNumber = num;
            shouldResetScreen = false;
        } else {
            if (currentNumber === '0' && num !== '.') {
                currentNumber = num;
            } else if (num === '.' && currentNumber.includes('.')) {
                return;
            } else {
                currentNumber += num;
            }
        }
        updateDisplay();
    }

    // 输入操作符
    function inputOperator(op) {
        if (operator && !shouldResetScreen) {
            calculate();
        }
        
        previousNumber = currentNumber;
        operator = op;
        shouldResetScreen = true;
        
        // 更新表达式显示
        const operatorSymbol = getOperatorSymbol(op);
        expression = previousNumber + ' ' + operatorSymbol;
        updateDisplay();
    }

    // 计算
    function calculate() {
        if (!operator || previousNumber === '') return;

        const prev = parseFloat(previousNumber);
        const current = parseFloat(currentNumber);
        let result = 0;

        switch(operator) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '*':
                result = prev * current;
                break;
            case '/':
                if (current === 0) {
                    result = 'Error';
                } else {
                    result = prev / current;
                }
                break;
            case '%':
                result = prev % current;
                break;
        }

        // 格式化结果
        if (result === 'Error') {
            currentNumber = result;
        } else {
            // 限制小数位数
            currentNumber = parseFloat(result.toFixed(10)).toString();
        }

        // 更新表达式
        const operatorSymbol = getOperatorSymbol(operator);
        expression = previousNumber + ' ' + operatorSymbol + ' ' + currentNumber + ' =';
        
        // 重置状态
        previousNumber = '';
        operator = '';
        shouldResetScreen = true;

        updateDisplay();
        
        // 添加结果动画
        addResultAnimation();
    }

    // 清除
    function clear() {
        currentNumber = '0';
        previousNumber = '';
        operator = '';
        expression = '';
        shouldResetScreen = false;
        updateDisplay();
    }

    // 删除最后一个字符
    function deleteLast() {
        if (currentNumber.length === 1 || currentNumber === 'Error') {
            currentNumber = '0';
        } else {
            currentNumber = currentNumber.slice(0, -1);
        }
        updateDisplay();
    }

    // 更新显示
    function updateDisplay() {
        resultDisplay.textContent = currentNumber;
        expressionDisplay.textContent = expression;
        
        // 根据数字长度调整字体大小
        adjustFontSize();
    }

    // 获取操作符符号
    function getOperatorSymbol(op) {
        switch(op) {
            case '+': return '+';
            case '-': return '−';
            case '*': return '×';
            case '/': return '÷';
            case '%': return '%';
            default: return op;
        }
    }

    // 调整字体大小
    function adjustFontSize() {
        const length = currentNumber.length;
        if (length > 12) {
            resultDisplay.style.fontSize = '32px';
        } else if (length > 9) {
            resultDisplay.style.fontSize = '40px';
        } else {
            resultDisplay.style.fontSize = '48px';
        }
    }

    // 添加点击动画
    function addClickAnimation(button) {
        button.style.transform = 'scale(0.92)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }

    // 添加结果动画
    function addResultAnimation() {
        resultDisplay.style.animation = 'none';
        setTimeout(() => {
            resultDisplay.style.animation = 'resultPulse 0.3s ease';
        }, 10);
    }

    // 创建涟漪效果
    function createRippleEffect(e, button) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.touches[0].clientX - rect.left - size / 2;
        const y = e.touches[0].clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // 初始化显示
    updateDisplay();
})();
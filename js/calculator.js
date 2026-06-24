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
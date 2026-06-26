(function() {
    // 状态
    let selectedYears = 25;
    let tableExpanded = false;

    // DOM 元素
    const loanAmountInput = document.getElementById('loanAmount');
    const interestRateInput = document.getElementById('interestRate');
    const termGroup = document.getElementById('termGroup');
    const calcBtn = document.getElementById('calcBtn');
    const summaryEl = document.getElementById('summary');
    const scheduleEl = document.getElementById('schedule');
    const monthlyLabel = document.getElementById('monthlyLabel');
    const monthlyPaymentEl = document.getElementById('monthlyPayment');
    const totalPaymentEl = document.getElementById('totalPayment');
    const totalInterestEl = document.getElementById('totalInterest');
    const scheduleBody = document.getElementById('scheduleBody');
    const toggleBtn = document.getElementById('toggleBtn');
    const tableWrapper = document.getElementById('tableWrapper');

    // 年限按钮事件
    const termBtns = termGroup.querySelectorAll('.mortgage-term-btn');
    termBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            termBtns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            selectedYears = parseInt(this.dataset.years);
        });
    });

    // 计算按钮事件
    calcBtn.addEventListener('click', function() {
        calculate();
    });

    // 展开/收起明细
    toggleBtn.addEventListener('click', function() {
        tableExpanded = !tableExpanded;
        tableWrapper.style.display = tableExpanded ? 'block' : 'none';
        toggleBtn.textContent = tableExpanded ? '收起明细' : '展开明细';
    });

    // 计算函数
    function calculate() {
        var loanWan = parseFloat(loanAmountInput.value);
        var annualRate = parseFloat(interestRateInput.value);
        var years = selectedYears;
        var method = document.querySelector('input[name="method"]:checked').value;

        // 验证输入
        if (isNaN(loanWan) || loanWan <= 0) {
            alert('请输入有效的贷款金额');
            return;
        }
        if (isNaN(annualRate) || annualRate <= 0) {
            alert('请输入有效的年利率');
            return;
        }
        if (years <= 0) {
            alert('请选择贷款年限');
            return;
        }

        // 转换单位
        var principal = loanWan * 10000; // 万元转元
        var monthlyRate = annualRate / 100 / 12; // 年利率转月利率
        var months = years * 12; // 总月数

        var schedule = [];
        var totalPayment = 0;
        var totalInterest = 0;
        var firstMonthPayment = 0;
        var lastMonthPayment = 0;

        if (method === 'equal_installment') {
            // 等额本息
            // 月供 = P × r × (1+r)^n / ((1+r)^n - 1)
            var monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
            var remaining = principal;

            for (var i = 1; i <= months; i++) {
                var interest = remaining * monthlyRate;
                var principalPart = monthlyPayment - interest;
                remaining -= principalPart;

                if (remaining < 0) remaining = 0;

                totalPayment += monthlyPayment;
                totalInterest += interest;

                if (i === 1) firstMonthPayment = monthlyPayment;
                lastMonthPayment = monthlyPayment;

                schedule.push({
                    period: i,
                    payment: monthlyPayment,
                    principal: principalPart,
                    interest: interest,
                    remaining: remaining
                });
            }

            monthlyLabel.textContent = '每月月供';
            monthlyPaymentEl.textContent = formatMoney(firstMonthPayment) + '元';
        } else {
            // 等额本金
            // 每月本金 = P / n
            var monthlyPrincipal = principal / months;
            var remaining = principal;

            for (var i = 1; i <= months; i++) {
                var interest = remaining * monthlyRate;
                var payment = monthlyPrincipal + interest;
                remaining -= monthlyPrincipal;

                if (remaining < 0) remaining = 0;

                totalPayment += payment;
                totalInterest += interest;

                if (i === 1) firstMonthPayment = payment;
                if (i === months) lastMonthPayment = payment;

                schedule.push({
                    period: i,
                    payment: payment,
                    principal: monthlyPrincipal,
                    interest: interest,
                    remaining: remaining
                });
            }

            monthlyLabel.textContent = '首月月供';
            monthlyPaymentEl.textContent = formatMoney(firstMonthPayment) + '元';
        }

        // 显示摘要
        totalPaymentEl.textContent = formatMoney(totalPayment) + '元';
        totalInterestEl.textContent = formatMoney(totalInterest) + '元';

        summaryEl.style.display = 'block';
        scheduleEl.style.display = 'block';

        // 生成明细表
        renderSchedule(schedule);

        // 滚动到结果
        setTimeout(function() {
            summaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // 渲染明细表
    function renderSchedule(schedule) {
        scheduleBody.innerHTML = '';

        // 为了性能，只渲染前 60 期，如果展开则渲染全部
        var maxRender = tableExpanded ? schedule.length : Math.min(schedule.length, 60);

        for (var i = 0; i < maxRender; i++) {
            var row = schedule[i];
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + row.period + '</td>' +
                '<td>' + formatMoney(row.payment) + '</td>' +
                '<td>' + formatMoney(row.principal) + '</td>' +
                '<td>' + formatMoney(row.interest) + '</td>' +
                '<td>' + formatMoney(row.remaining) + '</td>';
            scheduleBody.appendChild(tr);
        }

        // 如果超过 60 期且未展开，显示提示
        if (!tableExpanded && schedule.length > 60) {
            var hintTr = document.createElement('tr');
            hintTr.innerHTML = '<td colspan="5" style="text-align:center;color:#aaa;padding:16px;">点击"展开明细"查看全部 ' + schedule.length + ' 期</td>';
            scheduleBody.appendChild(hintTr);
        }
    }

    // 格式化金额（保留2位小数，千分位）
    function formatMoney(num) {
        if (isNaN(num)) return '0.00';
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
})();

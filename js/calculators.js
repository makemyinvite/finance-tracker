/**
 * FinanceFlow - Calculators
 * Financial calculators functionality
 */

const Calculators = {
    charts: {},

    /**
     * Initialize calculators
     */
    init() {
        // Hide loader immediately - calculators don't need data sync
        App.hideLoader();

        this.setupEventListeners();
        this.calculateEMI();
        this.calculateReverseEMI();
        this.calculateFD();
        this.calculateRD();
        this.calculateSIP();
        this.calculatePPF();
        this.loadAccountsDropdown();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.calc-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchCalculator(e.target.closest('.calc-tab')));
        });

        // EMI Calculator inputs
        ['emiLoanAmount', 'emiInterestRate'].forEach(id => {
            const range = document.getElementById(id);
            const input = document.getElementById(id + 'Input');

            if (range && input) {
                range.addEventListener('input', () => {
                    input.value = range.value;
                    this.calculateEMI();
                });
                input.addEventListener('input', () => {
                    range.value = input.value;
                    this.calculateEMI();
                });
            }
        });

        // EMI Tenure input (no range slider, just input + unit select)
        const emiTenureInput = document.getElementById('emiTenureInput');
        const emiTenureUnit = document.getElementById('emiTenureUnit');
        if (emiTenureInput) {
            emiTenureInput.addEventListener('input', () => this.calculateEMI());
        }
        if (emiTenureUnit) {
            emiTenureUnit.addEventListener('change', () => this.calculateEMI());
        }

        // FD Calculator inputs
        ['fdPrincipal', 'fdInterestRate'].forEach(id => {
            const range = document.getElementById(id);
            const input = document.getElementById(id + 'Input');

            if (range && input) {
                range.addEventListener('input', () => {
                    input.value = range.value;
                    this.calculateFD();
                });
                input.addEventListener('input', () => {
                    range.value = input.value;
                    this.calculateFD();
                });
            }
        });

        // FD Tenure inputs (no range slider)
        const fdTenureInput = document.getElementById('fdTenureInput');
        const fdTenureUnit = document.getElementById('fdTenureUnit');
        if (fdTenureInput) fdTenureInput.addEventListener('input', () => this.calculateFD());
        if (fdTenureUnit) fdTenureUnit.addEventListener('change', () => this.calculateFD());

        document.getElementById('fdCompounding')?.addEventListener('change', () => this.calculateFD());

        // RD Calculator inputs
        ['rdMonthly', 'rdInterestRate'].forEach(id => {
            const range = document.getElementById(id);
            const input = document.getElementById(id + 'Input');

            if (range && input) {
                range.addEventListener('input', () => {
                    input.value = range.value;
                    this.calculateRD();
                });
                input.addEventListener('input', () => {
                    range.value = input.value;
                    this.calculateRD();
                });
            }
        });

        // RD Tenure inputs (no range slider)
        const rdTenureInput = document.getElementById('rdTenureInput');
        const rdTenureUnit = document.getElementById('rdTenureUnit');
        if (rdTenureInput) rdTenureInput.addEventListener('input', () => this.calculateRD());
        if (rdTenureUnit) rdTenureUnit.addEventListener('change', () => this.calculateRD());

        // SIP Calculator inputs
        ['sipMonthly', 'sipReturnRate'].forEach(id => {
            const range = document.getElementById(id);
            const input = document.getElementById(id + 'Input');

            if (range && input) {
                range.addEventListener('input', () => {
                    input.value = range.value;
                    this.calculateSIP();
                });
                input.addEventListener('input', () => {
                    range.value = input.value;
                    this.calculateSIP();
                });
            }
        });

        // SIP Tenure inputs (no range slider)
        const sipTenureInput = document.getElementById('sipTenureInput');
        const sipTenureUnit = document.getElementById('sipTenureUnit');
        if (sipTenureInput) sipTenureInput.addEventListener('input', () => this.calculateSIP());
        if (sipTenureUnit) sipTenureUnit.addEventListener('change', () => this.calculateSIP());

        // PPF Calculator inputs
        ['ppfYearly', 'ppfInterestRate', 'ppfTenure'].forEach(id => {
            const range = document.getElementById(id);
            const input = document.getElementById(id + 'Input');

            if (range && input) {
                range.addEventListener('input', () => {
                    input.value = range.value;
                    this.calculatePPF();
                });
                input.addEventListener('input', () => {
                    range.value = input.value;
                    this.calculatePPF();
                });
            }
        });

        // Loan type selector
        document.querySelectorAll('.loan-type').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.loan-type').forEach(b => b.classList.remove('active'));
                e.target.closest('.loan-type').classList.add('active');
                this.setLoanDefaults(e.target.closest('.loan-type').dataset.type);
            });
        });

        // Amortization toggle
        document.getElementById('toggleAmortization')?.addEventListener('click', () => {
            const wrapper = document.getElementById('amortizationWrapper');
            const btn = document.getElementById('toggleAmortization');
            if (wrapper.style.display === 'none') {
                wrapper.style.display = 'block';
                btn.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Details';
            } else {
                wrapper.style.display = 'none';
                btn.innerHTML = '<i class="fas fa-chevron-down"></i> Show Details';
            }
        });

        // Schedule EMI button
        document.getElementById('scheduleEmiBtn')?.addEventListener('click', () => this.openScheduleModal());

        // Schedule form
        document.getElementById('scheduleEmiForm')?.addEventListener('submit', (e) => this.scheduleEMI(e));

        // Close modal
        document.getElementById('closeScheduleModal')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('scheduleEmiModal'));
        });
        document.getElementById('cancelSchedule')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('scheduleEmiModal'));
        });

        // Add to investments buttons
        document.getElementById('addFdBtn')?.addEventListener('click', () => this.addInvestment('fd'));
        document.getElementById('addRdBtn')?.addEventListener('click', () => this.addInvestment('rd'));
        document.getElementById('addSipBtn')?.addEventListener('click', () => this.addInvestment('sip'));
        document.getElementById('addPpfBtn')?.addEventListener('click', () => this.addInvestment('ppf'));

        // Amortization view toggle buttons
        document.querySelectorAll('.amort-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleAmortizationView(e.target.closest('.amort-view-btn').dataset.view);
            });
        });

        // Reverse EMI Calculator inputs
        ['reverseEmiPrincipal', 'reverseEmiAmount', 'reverseEmiTenure'].forEach(id => {
            const input = document.getElementById(id + 'Input');
            if (input) {
                input.addEventListener('input', () => this.calculateReverseEMI());
            }
        });

        // Reverse EMI tenure unit dropdown
        document.getElementById('reverseEmiTenureUnit')?.addEventListener('change', () => this.calculateReverseEMI());
    },

    /**
     * Switch calculator tab
     */
    switchCalculator(tab) {
        const calcType = tab.dataset.calc;

        document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.calculator-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${calcType}-calculator`)?.classList.add('active');
    },

    /**
     * Set loan defaults based on type
     */
    setLoanDefaults(type) {
        const defaults = {
            home: { amount: 2500000, rate: 8.5, tenure: 20 },
            car: { amount: 800000, rate: 9.5, tenure: 5 },
            personal: { amount: 500000, rate: 12, tenure: 3 }
        };

        const d = defaults[type];
        document.getElementById('emiLoanAmount').value = d.amount;
        document.getElementById('emiLoanAmountInput').value = d.amount;
        document.getElementById('emiInterestRate').value = d.rate;
        document.getElementById('emiInterestRateInput').value = d.rate;
        document.getElementById('emiTenure').value = d.tenure;
        document.getElementById('emiTenureInput').value = d.tenure;

        this.calculateEMI();
    },

    /**
     * Calculate EMI
     */
    calculateEMI() {
        const principal = parseFloat(document.getElementById('emiLoanAmountInput')?.value) || 0;
        const annualRate = parseFloat(document.getElementById('emiInterestRateInput')?.value) || 0;
        const tenureValue = parseFloat(document.getElementById('emiTenureInput')?.value) || 0;
        const tenureUnit = document.getElementById('emiTenureUnit')?.value || 'years';

        const monthlyRate = annualRate / 12 / 100;

        // Convert tenure to months based on selected unit
        let tenureMonths;
        if (tenureUnit === 'days') {
            tenureMonths = tenureValue / 30; // Approximate days to months
        } else if (tenureUnit === 'months') {
            tenureMonths = tenureValue;
        } else {
            tenureMonths = tenureValue * 12; // years to months
        }

        // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
                    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        const totalAmount = emi * tenureMonths;
        const totalInterest = totalAmount - principal;

        // Update UI
        document.getElementById('emiMonthlyAmount').textContent = this.formatCurrency(emi);
        document.getElementById('emiPrincipal').textContent = this.formatCurrency(principal);
        document.getElementById('emiTotalInterest').textContent = this.formatCurrency(totalInterest);
        document.getElementById('emiTotalAmount').textContent = this.formatCurrency(totalAmount);

        // Update chart
        this.updateEMIChart(principal, totalInterest);

        // Update amortization table
        this.generateAmortizationTable(principal, monthlyRate, tenureMonths, emi);
    },

    /**
     * Update EMI Chart
     */
    updateEMIChart(principal, interest) {
        const ctx = document.getElementById('emiChart');
        if (!ctx) return;

        if (this.charts.emi) {
            this.charts.emi.destroy();
        }

        this.charts.emi = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest'],
                datasets: [{
                    data: [principal, interest],
                    backgroundColor: ['#6366f1', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * Generate Amortization Table with toggle between monthly and yearly view
     */
    generateAmortizationTable(principal, monthlyRate, totalMonths, emi) {
        const tbody = document.getElementById('amortizationBody');
        if (!tbody) return;

        // Store data for both views
        this.amortizationData = {
            monthly: [],
            yearly: [],
            principal,
            monthlyRate,
            totalMonths,
            emi
        };

        let balance = principal;
        let yearlyData = [];
        let yearPrincipal = 0;
        let yearInterest = 0;
        let yearPayment = 0;

        for (let month = 1; month <= totalMonths; month++) {
            const interest = balance * monthlyRate;
            const principalPaid = emi - interest;
            balance -= principalPaid;

            // Store monthly data
            this.amortizationData.monthly.push({
                month: month,
                principal: principalPaid,
                interest: interest,
                payment: emi,
                balance: Math.max(0, balance)
            });

            yearPrincipal += principalPaid;
            yearInterest += interest;
            yearPayment += emi;

            if (month % 12 === 0 || month === totalMonths) {
                yearlyData.push({
                    year: Math.ceil(month / 12),
                    principal: yearPrincipal,
                    interest: yearInterest,
                    payment: yearPayment,
                    balance: Math.max(0, balance)
                });
                yearPrincipal = 0;
                yearInterest = 0;
                yearPayment = 0;
            }
        }

        this.amortizationData.yearly = yearlyData;

        // Default view is yearly
        this.renderAmortizationTable('yearly');
    },

    /**
     * Render amortization table based on view type
     */
    renderAmortizationTable(viewType) {
        const tbody = document.getElementById('amortizationBody');
        if (!tbody || !this.amortizationData) return;

        const data = viewType === 'monthly' ? this.amortizationData.monthly : this.amortizationData.yearly;

        if (viewType === 'monthly') {
            tbody.innerHTML = data.map(row => `
                <tr>
                    <td>Month ${row.month}</td>
                    <td>${this.formatCurrency(row.principal)}</td>
                    <td>${this.formatCurrency(row.interest)}</td>
                    <td>${this.formatCurrency(row.payment)}</td>
                    <td>${this.formatCurrency(row.balance)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = data.map(row => `
                <tr>
                    <td>Year ${row.year}</td>
                    <td>${this.formatCurrency(row.principal)}</td>
                    <td>${this.formatCurrency(row.interest)}</td>
                    <td>${this.formatCurrency(row.payment)}</td>
                    <td>${this.formatCurrency(row.balance)}</td>
                </tr>
            `).join('');
        }
    },

    /**
     * Toggle amortization view between monthly and yearly
     */
    toggleAmortizationView(viewType) {
        this.renderAmortizationTable(viewType);

        // Update toggle buttons
        document.querySelectorAll('.amort-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewType);
        });
    },

    /**
     * Calculate Interest Rate from EMI (Reverse EMI Calculator)
     * Uses binary search to find the interest rate
     */
    calculateInterestRateFromEMI(principal, emi, tenureMonths) {
        let low = 0.01; // 0.01% annual
        let high = 50;   // 50% annual (max)
        let tolerance = 0.001;
        let maxIterations = 100;
        let iteration = 0;

        while (iteration < maxIterations) {
            const mid = (low + high) / 2;
            const monthlyRate = mid / 12 / 100;

            // Calculate EMI for this rate
            const calculatedEMI = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) /
                                  (Math.pow(1 + monthlyRate, tenureMonths) - 1);

            if (Math.abs(calculatedEMI - emi) < tolerance) {
                return mid;
            }

            if (calculatedEMI > emi) {
                high = mid;
            } else {
                low = mid;
            }

            iteration++;
        }

        return (low + high) / 2;
    },

    /**
     * Reverse EMI calculation - find interest rate from known EMI
     */
    calculateReverseEMI() {
        const principal = parseFloat(document.getElementById('reverseEmiPrincipalInput')?.value) || 0;
        const emi = parseFloat(document.getElementById('reverseEmiAmountInput')?.value) || 0;
        const tenureValue = parseFloat(document.getElementById('reverseEmiTenureInput')?.value) || 0;
        const tenureUnit = document.getElementById('reverseEmiTenureUnit')?.value || 'years';

        if (principal <= 0 || emi <= 0 || tenureValue <= 0) return;

        // Convert tenure to months based on unit
        let tenureMonths;
        if (tenureUnit === 'years') {
            tenureMonths = tenureValue * 12;
        } else if (tenureUnit === 'months') {
            tenureMonths = tenureValue;
        } else if (tenureUnit === 'days') {
            tenureMonths = tenureValue / 30; // Approximate
        }

        // Check if EMI is valid (must be greater than principal/months)
        const minEMI = principal / tenureMonths;
        if (emi < minEMI) {
            document.getElementById('reverseEmiRate').textContent = 'Invalid EMI (too low)';
            document.getElementById('reverseEmiTotal').textContent = '-';
            document.getElementById('reverseEmiInterest').textContent = '-';
            return;
        }

        const interestRate = this.calculateInterestRateFromEMI(principal, emi, tenureMonths);
        const totalAmount = emi * tenureMonths;
        const totalInterest = totalAmount - principal;

        // Update UI
        document.getElementById('reverseEmiRate').textContent = interestRate.toFixed(2) + '% p.a.';
        document.getElementById('reverseEmiTotal').textContent = this.formatCurrency(totalAmount);
        document.getElementById('reverseEmiInterest').textContent = this.formatCurrency(totalInterest);
    },

    /**
     * Calculate FD
     */
    calculateFD() {
        const principal = parseFloat(document.getElementById('fdPrincipalInput')?.value) || 0;
        const annualRate = parseFloat(document.getElementById('fdInterestRateInput')?.value) || 0;
        const tenureValue = parseFloat(document.getElementById('fdTenureInput')?.value) || 0;
        const tenureUnit = document.getElementById('fdTenureUnit')?.value || 'months';
        const compounding = parseInt(document.getElementById('fdCompounding')?.value) || 4;

        // Convert tenure to years
        let t;
        if (tenureUnit === 'days') {
            t = tenureValue / 365;
        } else if (tenureUnit === 'months') {
            t = tenureValue / 12;
        } else {
            t = tenureValue; // years
        }

        const rate = annualRate / 100;
        const n = compounding;

        // A = P * (1 + r/n)^(n*t)
        const maturityAmount = principal * Math.pow(1 + rate / n, n * t);
        const interestEarned = maturityAmount - principal;
        const effectiveYield = ((maturityAmount / principal) - 1) * 100;

        // Update UI
        document.getElementById('fdMaturityAmount').textContent = this.formatCurrency(maturityAmount);
        document.getElementById('fdPrincipalDisplay').textContent = this.formatCurrency(principal);
        document.getElementById('fdInterestEarned').textContent = this.formatCurrency(interestEarned);
        document.getElementById('fdEffectiveYield').textContent = effectiveYield.toFixed(2) + '%';

        // Update chart
        this.updateFDChart(principal, interestEarned);
    },

    /**
     * Update FD Chart
     */
    updateFDChart(principal, interest) {
        const ctx = document.getElementById('fdChart');
        if (!ctx) return;

        if (this.charts.fd) {
            this.charts.fd.destroy();
        }

        this.charts.fd = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest Earned'],
                datasets: [{
                    data: [principal, interest],
                    backgroundColor: ['#6366f1', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * Calculate RD
     */
    calculateRD() {
        const monthlyDeposit = parseFloat(document.getElementById('rdMonthlyInput')?.value) || 0;
        const annualRate = parseFloat(document.getElementById('rdInterestRateInput')?.value) || 0;
        const tenureValue = parseFloat(document.getElementById('rdTenureInput')?.value) || 0;
        const tenureUnit = document.getElementById('rdTenureUnit')?.value || 'months';

        // Convert tenure to months
        let tenureMonths;
        if (tenureUnit === 'days') {
            tenureMonths = tenureValue / 30;
        } else if (tenureUnit === 'years') {
            tenureMonths = tenureValue * 12;
        } else {
            tenureMonths = tenureValue; // months
        }

        const n = Math.round(tenureMonths);

        // RD Maturity with quarterly compounding
        let maturityAmount = 0;
        for (let i = 1; i <= n; i++) {
            maturityAmount += monthlyDeposit * Math.pow(1 + annualRate / 400, (n - i + 1) / 3);
        }

        const totalInvestment = monthlyDeposit * n;
        const interestEarned = maturityAmount - totalInvestment;

        // Update UI
        document.getElementById('rdMaturityAmount').textContent = this.formatCurrency(maturityAmount);
        document.getElementById('rdTotalInvestment').textContent = this.formatCurrency(totalInvestment);
        document.getElementById('rdInterestEarned').textContent = this.formatCurrency(interestEarned);

        // Update chart
        this.updateRDChart(totalInvestment, interestEarned);
    },

    /**
     * Update RD Chart
     */
    updateRDChart(investment, interest) {
        const ctx = document.getElementById('rdChart');
        if (!ctx) return;

        if (this.charts.rd) {
            this.charts.rd.destroy();
        }

        this.charts.rd = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Deposits', 'Interest Earned'],
                datasets: [{
                    data: [investment, interest],
                    backgroundColor: ['#6366f1', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * Calculate SIP
     */
    calculateSIP() {
        const monthlyInvestment = parseFloat(document.getElementById('sipMonthlyInput')?.value) || 0;
        const annualReturn = parseFloat(document.getElementById('sipReturnRateInput')?.value) || 0;
        const tenureValue = parseFloat(document.getElementById('sipTenureInput')?.value) || 0;
        const tenureUnit = document.getElementById('sipTenureUnit')?.value || 'years';

        // Convert tenure to months
        let months;
        if (tenureUnit === 'months') {
            months = tenureValue;
        } else {
            months = tenureValue * 12; // years to months
        }

        const monthlyRate = annualReturn / 12 / 100;

        // FV = P * [(1+r)^n - 1] / r * (1+r)
        const futureValue = monthlyInvestment *
            (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));

        const totalInvestment = monthlyInvestment * months;
        const wealthGained = futureValue - totalInvestment;

        // Update UI
        document.getElementById('sipFutureValue').textContent = this.formatCurrency(futureValue);
        document.getElementById('sipTotalInvestment').textContent = this.formatCurrency(totalInvestment);
        document.getElementById('sipWealthGained').textContent = this.formatCurrency(wealthGained);

        // Update chart
        this.updateSIPChart(totalInvestment, wealthGained);
    },

    /**
     * Update SIP Chart
     */
    updateSIPChart(investment, gains) {
        const ctx = document.getElementById('sipChart');
        if (!ctx) return;

        if (this.charts.sip) {
            this.charts.sip.destroy();
        }

        this.charts.sip = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Investment', 'Wealth Gained'],
                datasets: [{
                    data: [investment, gains],
                    backgroundColor: ['#6366f1', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * Calculate PPF
     */
    calculatePPF() {
        const yearlyInvestment = parseFloat(document.getElementById('ppfYearlyInput')?.value) || 0;
        const annualRate = parseFloat(document.getElementById('ppfInterestRateInput')?.value) || 0;
        const tenureYears = parseFloat(document.getElementById('ppfTenureInput')?.value) || 0;

        const rate = annualRate / 100;
        let balance = 0;

        // PPF compounds yearly
        for (let year = 1; year <= tenureYears; year++) {
            balance = (balance + yearlyInvestment) * (1 + rate);
        }

        const totalInvestment = yearlyInvestment * tenureYears;
        const interestEarned = balance - totalInvestment;
        const taxBenefit = Math.min(yearlyInvestment, 150000) * 0.3; // Assuming 30% tax bracket

        // Update UI
        document.getElementById('ppfMaturityAmount').textContent = this.formatCurrency(balance);
        document.getElementById('ppfTotalInvestment').textContent = this.formatCurrency(totalInvestment);
        document.getElementById('ppfInterestEarned').textContent = this.formatCurrency(interestEarned);
        document.getElementById('ppfTaxBenefit').textContent = this.formatCurrency(taxBenefit) + '/year';

        // Update chart
        this.updatePPFChart(totalInvestment, interestEarned);
    },

    /**
     * Update PPF Chart
     */
    updatePPFChart(investment, interest) {
        const ctx = document.getElementById('ppfChart');
        if (!ctx) return;

        if (this.charts.ppf) {
            this.charts.ppf.destroy();
        }

        this.charts.ppf = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Investment', 'Interest Earned'],
                datasets: [{
                    data: [investment, interest],
                    backgroundColor: ['#6366f1', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * Open schedule EMI modal
     */
    openScheduleModal() {
        const emi = document.getElementById('emiMonthlyAmount').textContent.replace(/[₹,]/g, '');
        const tenure = document.getElementById('emiTenureInput').value;
        const months = tenure * 12;

        document.getElementById('scheduledEmiAmount').value = parseFloat(emi).toFixed(2);
        document.getElementById('scheduledEmiCount').value = months;

        // Set default start date to next month
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        document.getElementById('emiStartDate').value = nextMonth.toISOString().split('T')[0];

        App.openModal(document.getElementById('scheduleEmiModal'));
    },

    /**
     * Load accounts dropdown
     */
    loadAccountsDropdown() {
        const accounts = Storage.getAccounts();
        const select = document.getElementById('emiAccount');
        if (!select) return;

        select.innerHTML = '<option value="">Select Account</option>';
        accounts.forEach(acc => {
            select.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.bankName || acc.accountType})</option>`;
        });
    },

    /**
     * Schedule EMI
     */
    scheduleEMI(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        const emiSchedule = {
            id: Date.now().toString(),
            name: formData.get('emiName'),
            amount: parseFloat(formData.get('emiAmount')),
            totalEmis: parseInt(formData.get('emiCount')),
            remainingEmis: parseInt(formData.get('emiCount')),
            startDate: formData.get('startDate'),
            paymentDay: parseInt(formData.get('paymentDay')),
            accountId: formData.get('account'),
            emailReminder: form.querySelector('#emiEmailReminder').checked,
            paidEmis: [],
            createdAt: new Date().toISOString()
        };

        // Save to storage
        const schedules = Storage.get('financeflow_emi_schedules', []);
        schedules.push(emiSchedule);
        Storage.set('financeflow_emi_schedules', schedules);

        App.closeModal(document.getElementById('scheduleEmiModal'));
        App.showToast('EMI scheduled successfully! Reminders are set.', 'success');
    },

    /**
     * Add investment
     */
    addInvestment(type) {
        let investment = {};

        switch (type) {
            case 'fd':
                investment = {
                    type: 'fd',
                    name: 'Fixed Deposit',
                    principal: parseFloat(document.getElementById('fdPrincipalInput').value),
                    interestRate: parseFloat(document.getElementById('fdInterestRateInput').value),
                    tenureMonths: parseInt(document.getElementById('fdTenureInput').value),
                    compounding: document.getElementById('fdCompounding').value,
                    maturityAmount: parseFloat(document.getElementById('fdMaturityAmount').textContent.replace(/[₹,]/g, ''))
                };
                break;
            case 'rd':
                investment = {
                    type: 'rd',
                    name: 'Recurring Deposit',
                    monthlyDeposit: parseFloat(document.getElementById('rdMonthlyInput').value),
                    interestRate: parseFloat(document.getElementById('rdInterestRateInput').value),
                    tenureMonths: parseInt(document.getElementById('rdTenureInput').value),
                    maturityAmount: parseFloat(document.getElementById('rdMaturityAmount').textContent.replace(/[₹,]/g, ''))
                };
                break;
            case 'sip':
                investment = {
                    type: 'sip',
                    name: 'SIP Investment',
                    monthlyAmount: parseFloat(document.getElementById('sipMonthlyInput').value),
                    expectedReturn: parseFloat(document.getElementById('sipReturnRateInput').value),
                    tenureYears: parseInt(document.getElementById('sipTenureInput').value),
                    futureValue: parseFloat(document.getElementById('sipFutureValue').textContent.replace(/[₹,]/g, ''))
                };
                break;
            case 'ppf':
                investment = {
                    type: 'ppf',
                    name: 'PPF Account',
                    yearlyAmount: parseFloat(document.getElementById('ppfYearlyInput').value),
                    interestRate: parseFloat(document.getElementById('ppfInterestRateInput').value),
                    tenureYears: parseInt(document.getElementById('ppfTenureInput').value),
                    maturityAmount: parseFloat(document.getElementById('ppfMaturityAmount').textContent.replace(/[₹,]/g, ''))
                };
                break;
        }

        investment.id = Date.now().toString();
        investment.startDate = new Date().toISOString();
        investment.status = 'active';

        // Save to storage
        const investments = Storage.get('financeflow_investments', []);
        investments.push(investment);
        Storage.set('financeflow_investments', investments);

        App.showToast(`${investment.name} added to your investments!`, 'success');
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (isNaN(amount)) return '₹0';
        return '₹' + amount.toLocaleString('en-IN', {
            maximumFractionDigits: 0
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.calculators-content')) {
        Calculators.init();
    }
});

window.Calculators = Calculators;

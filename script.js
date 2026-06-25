// ==========================================
// CONTROLE DE NAVEGAÇÃO INTERNA (SPA)
// ==========================================
const menuLinks = document.querySelectorAll('#sidebar-menu .nav-link');
const appViews = document.querySelectorAll('.app-view');

menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        menuLinks.forEach(l => {
            l.classList.remove('active');
            l.classList.add('text-white-50');
        });
        link.classList.add('active');
        link.classList.remove('text-white-50');

        const targetViewId = link.getAttribute('data-target');
        appViews.forEach(view => view.classList.add('d-none'));
        document.getElementById(targetViewId).classList.remove('d-none');
    });
});

// ==========================================
// SELETORES GLOBAIS DE AUTENTICAÇÃO
// ==========================================
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');
const nameGroup = document.getElementById('name-group');
const authAlert = document.getElementById('auth-alert');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const userDisplayName = document.getElementById('user-display-name');

let authMode = 'login';
let currentUser = null;

// Formulários e Listas
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryBudgetInput = document.getElementById('category-budget');
const categoriesContainer = document.getElementById('categories-container');
const categorySelect = document.getElementById('category-select');

const goalForm = document.getElementById('goal-form');
const goalTitleInput = document.getElementById('goal-title');
const goalTargetInput = document.getElementById('goal-target');
const goalsContainer = document.getElementById('goals-container');

// Core Dashboard / Movimentações
const transactionForm = document.getElementById('transaction-form');
const dateInput = document.getElementById('transaction-date');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const transactionList = document.getElementById('transaction-list');
const noTransactions = document.getElementById('no-transactions');

const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const insightTextEl = document.getElementById('insight-text');
const clearAllBtn = document.getElementById('clear-all');

const filterPeriod = document.getElementById('filter-period');
const filterTypeRadios = document.querySelectorAll('input[name="filter-type"]');
const exportCsvBtn = document.getElementById('export-csv-btn'); // Novo seletor do botão

let transactions = [];
let categories = []; 
let goals = [];
let financeChart;

// Alternador Login/Registro
authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    authAlert.classList.add('d-none');
    authForm.reset();
    if (authMode === 'login') {
        authMode = 'register';
        authTitle.innerText = 'Crie sua conta';
        authSubmitBtn.innerText = 'Cadastrar';
        nameGroup.classList.remove('d-none');
        authNameInput.setAttribute('required', 'required');
    } else {
        authMode = 'login';
        authTitle.innerText = 'Bem-vindo ao FinançasHub';
        authSubmitBtn.innerText = 'Entrar';
        nameGroup.classList.add('d-none');
        authNameInput.removeAttribute('required');
    }
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = authEmailInput.value.trim().toLowerCase();
    const password = authPasswordInput.value;
    let users = JSON.parse(localStorage.getItem('fh_users')) || [];

    if (authMode === 'register') {
        if (users.some(u => u.email === email)) {
            showAuthAlert('Este e-mail já existe.');
            return;
        }
        users.push({ name: authNameInput.value.trim(), email, password });
        localStorage.setItem('fh_users', JSON.stringify(users));
        alert('Conta criada! Faça login.');
        location.reload();
    } else {
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) { showAuthAlert('E-mail ou senha incorretos.'); return; }
        login(user);
    }
});

function showAuthAlert(msg) {
    authAlert.innerText = msg;
    authAlert.classList.remove('d-none');
}

let emailSanitizado = ""; // Crie esta variável global no topo do script.js

function login(user) {
    currentUser = user;
    sessionStorage.setItem('fh_logged_user', JSON.stringify(user));
    userDisplayName.innerText = user.name;
    
    // Sanitiza o e-mail globalmente aqui (substitui pontos por underscores)
    emailSanitizado = user.email.replace(/[.#$\[\]]/g, "_");
    
    authContainer.classList.add('d-none');
    appContainer.classList.remove('d-none');
    
    loadUserData();
}

document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
    sessionStorage.removeItem('fh_logged_user');
    location.reload();
}

// ==========================================
// OPERAÇÃO DOS DADOS DO USUÁRIO LOGADO
// ==========================================
function loadUserData() {
    // No evento de submit do categoryForm, substitua a linha do localStorage por:
    const emailSanitizado = currentUser.email.replace(/[.#$\[\]]/g, "_");
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/categories`), categories);

    // Na função window.removeCategory, substitua a linha por:
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/categories`), categories);

    // No evento de submit do transactionForm, substitua a inserção por:
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/transactions`), transactions);

    // Na função window.removeTransaction, substitua por:
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/transactions`), transactions);

    // No botão de limpar tudo (clearAllBtn), substitua por:
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/transactions`), null);

    // No evento de submit do goalForm, substitua por:
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/goals`), goals);
    
    const hoje = new Date().toISOString().split('T')[0];
    dateInput.value = hoje;
    filterPeriod.value = hoje.substring(0, 7);
    initChart();

    // 1. Escutar Transações em Tempo Real
    const txRef = window.fbRef(window.fbDB, `users/${emailSanitizado}/transactions`);
    window.fbOnValue(txRef, (snapshot) => {
        const data = snapshot.val();
        transactions = data ? Object.values(data) : [];
        renderTransactions();
        updateValues();
        renderGoals();
        renderCategories(); // Atualiza os medidores automaticamente ao receber dados
    });

    // 2. Escutar Categorias/Orçamentos em Tempo Real
    const catRef = window.fbRef(window.fbDB, `users/${emailSanitizado}/categories`);
    window.fbOnValue(catRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            categories = Object.values(data);
        } else {
            // Inicialização padrão caso o banco esteja vazio para este usuário
            categories = [
                { name: 'Salário', budget: 0 },
                { name: 'Alimentação', budget: 600 },
                { name: 'Moradia', budget: 1200 },
                { name: 'Lazer', budget: 300 }
            ];
            // Salva o padrão inicial no banco
            window.fbSet(catRef, categories);
        }
        renderCategories();
    });

    // 3. Escutar Metas em Tempo Real
    const goalsRef = window.fbRef(window.fbDB, `users/${emailSanitizado}/goals`);
    window.fbOnValue(goalsRef, (snapshot) => {
        const data = snapshot.val();
        goals = data ? Object.values(data) : [];
        renderGoals();
    });
}

// --- CATEGORIAS & BUDGETING ---
categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = categoryNameInput.value.trim();
    const budgetVal = parseFloat(categoryBudgetInput.value) || 0;
    
    const existingIndex = categories.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    
    if (existingIndex !== -1) {
        categories[existingIndex].budget = budgetVal;
    } else {
        categories.push({ name, budget: budgetVal });
    }
    
    localStorage.setItem(`cat_${currentUser.email}`, JSON.stringify(categories));
    categoryNameInput.value = '';
    categoryBudgetInput.value = '';
    
    renderCategories();
    renderTransactions();
});

function renderCategories() {
    categoriesContainer.innerHTML = '';
    categorySelect.innerHTML = '';
    
    const currentMonthStr = filterPeriod.value;

    if(categories.length === 0) {
        categoriesContainer.innerHTML = `<p class="text-muted small text-center py-4">Nenhum orçamento configurado.</p>`;
        return;
    }

    categories.forEach((cat, index) => {
        const totalSpent = transactions
            .filter(t => t.category === cat.name && t.type === 'expense' && t.date.startsWith(currentMonthStr))
            .reduce((sum, t) => sum + t.amount, 0);

        let progressHtml = '';
        
        if (cat.budget > 0) {
            const pct = Math.min(100, Math.round((totalSpent / cat.budget) * 100));
            let barColor = 'bg-primary';
            if (pct >= 100) barColor = 'bg-danger';
            else if (pct >= 80) barColor = 'bg-warning';

            progressHtml = `
                <div class="progress my-2" style="height: 8px;">
                    <div class="progress-bar ${barColor}" role="progressbar" style="width: ${pct}%"></div>
                </div>
                <div class="d-flex justify-content-between text-muted" style="font-size: 0.75rem;">
                    <span>Consumido: ${pct}%</span>
                    <span>Limite: ${cat.budget.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                </div>`;
        } else {
            progressHtml = `<div class="text-muted small my-1" style="font-size: 0.75rem;"><i class="bi bi-infinity"></i> Sem teto limite estipulado.</div>`;
        }

        const card = document.createElement('div');
        card.className = "border-bottom pb-3";
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-semibold"><i class="bi bi-bookmark-fill text-secondary me-2"></i>${cat.name}</span>
                <div class="d-flex align-items-center gap-3">
                    <span class="fw-bold text-dark small">${totalSpent.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                    <button class="btn btn-sm text-danger border-0 p-0" onclick="removeCategory(${index})"><i class="bi bi-trash"></i></button>
                </div>
            </div>
            ${progressHtml}`;
        categoriesContainer.appendChild(card);

        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.innerText = cat.name;
        categorySelect.appendChild(opt);
    });
}

window.removeCategory = function(index) {
    if(confirm("Remover esta categoria do painel de orçamentos?")) {
        categories.splice(index, 1);
        localStorage.setItem(`cat_${currentUser.email}`, JSON.stringify(categories));
        renderCategories();
    }
};

// --- TRANSAÇÕES & EXPORTAÇÃO CSV (NOVO) ---
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tx = {
        id: Date.now(),
        date: dateInput.value,
        amount: parseFloat(amountInput.value),
        type: typeInput.value,
        category: categorySelect.value
    };
    transactions.push(tx);
    window.fbSet(window.fbRef(window.fbDB, `users/${emailSanitizado}/transactions`), transactions);
    
    const tempDate = dateInput.value;
    transactionForm.reset();
    dateInput.value = tempDate;

    renderTransactions();
    updateValues();
    renderGoals();
    renderCategories();
});

function formatDateToBRL(dateString) {
    if(!dateString) return "---";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

filterPeriod.addEventListener('input', () => {
    renderTransactions();
    renderCategories();
});
filterTypeRadios.forEach(radio => radio.addEventListener('change', renderTransactions));

// Obtém a lista atualmente filtrada com base no estado dos seletores da UI
function getFilteredTransactions() {
    const selectedPeriod = filterPeriod.value;
    let selectedType = 'all';
    
    filterTypeRadios.forEach(radio => {
        if(radio.checked) selectedType = radio.value;
    });

    return transactions.filter(t => {
        const matchesPeriod = selectedPeriod ? t.date.startsWith(selectedPeriod) : true;
        const matchesType = selectedType === 'all' ? true : t.type === selectedType;
        return matchesPeriod && matchesType;
    });
}

function renderTransactions() {
    transactionList.innerHTML = '';
    const filteredTransactions = getFilteredTransactions();

    if (filteredTransactions.length === 0) {
        noTransactions.classList.remove('d-none');
        return;
    }
    noTransactions.classList.add('d-none');

    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredTransactions.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="fw-medium">${formatDateToBRL(t.date)}</td>
            <td><span class="badge bg-light text-dark border">${t.category}</span></td>
            <td class="${t.type === 'income' ? 'text-success' : 'text-danger'} fw-bold">
                ${t.type === 'income' ? '+' : '-'} ${t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
            </td>
            <td class="text-end">
                <button class="btn btn-sm text-danger p-0" onclick="removeTransaction(${t.id})"><i class="bi bi-x-circle fs-5"></i></button>
            </td>`;
        transactionList.appendChild(row);
    });
}

// Lógica de Geração de Relatório Personalizado e Estilizado para Excel
exportCsvBtn.addEventListener('click', () => {
    const dataToExport = getFilteredTransactions();

    if (dataToExport.length === 0) {
        alert("Não existem lançamentos no período e tipo selecionados para exportar.");
        return;
    }

    // Ordena por ordem cronológica
    dataToExport.sort((a, b) => new Date(a.date) - new Date(b.date));

    const periodoNome = filterPeriod.value || 'Geral';
    
    // Criamos a estrutura HTML/CSS que o Excel interpreta nativamente ao abrir como .xls
    let excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .title-card { background-color: #0f172a; color: #10b981; font-size: 16pt; font-weight: bold; text-align: center; height: 40px; }
            .subtitle-card { background-color: #1e293b; color: #94a3b8; font-size: 10pt; text-align: center; height: 25px; }
            th { background-color: #198754; color: white; font-weight: bold; text-align: center; height: 30px; border: 1px solid #1e293b; }
            td { font-size: 10pt; border: 1px solid #e2e8f0; height: 25px; }
            .date-col { text-align: center; mso-number-format:"Short Date"; }
            .cat-col { text-align: left; padding-left: 5px; }
            .type-col { text-align: center; font-weight: 500; }
            .income-val { color: #15803d; text-align: right; padding-right: 5px; mso-number-format:"\\R\\$\\ #\\,##0\\.00"; }
            .expense-val { color: #b91c1c; text-align: right; padding-right: 5px; mso-number-format:"\\R\\$\\ #\\,##0\\.00"; }
            .total-row { background-color: #f8fafc; font-weight: bold; height: 30px; border-top: 2px solid #0f172a; }
        </style>
    </head>
    <body>
        <table>
            <tr>
                <td colspan="4" class="title-card">FINANÇASHUB | RELATÓRIO DE MOVIMENTAÇÕES</td>
            </tr>
            <tr>
                <td colspan="4" class="subtitle-card">Período de Análise: ${periodoNome} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}</td>
            </tr>
            <tr></tr>
            
            <thead>
                <tr>
                    <th style="width: 120px;">Data</th>
                    <th style="width: 200px;">Categoria</th>
                    <th style="width: 120px;">Tipo</th>
                    <th style="width: 150px;">Valor</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalReceitas = 0;
    let totalDespesas = 0;

    dataToExport.forEach(t => {
        const isIncome = t.type === 'income';
        const tipoTexto = isIncome ? 'Receita' : 'Despesa';
        const classeValor = isIncome ? 'income-val' : 'expense-val';
        
        if (isIncome) totalReceitas += t.amount;
        else totalDespesas += t.amount;

        excelTemplate += `
            <tr>
                <td class="date-col">${formatDateToBRL(t.date)}</td>
                <td class="cat-col">${t.category}</td>
                <td class="type-col" style="color: ${isIncome ? '#15803d' : '#b91c1c'}">${tipoTexto}</td>
                <td class="${classeValor}">${t.amount}</td>
            </tr>
        `;
    });

    const saldoFinal = totalReceitas - totalDespesas;
    const classeSaldo = saldoFinal >= 0 ? 'income-val' : 'expense-val';

    // Adiciona linhas de resumo estilizadas no rodapé da tabela
    excelTemplate += `
                <tr></tr>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right; padding-right: 10px;">Total de Receitas:</td>
                    <td class="income-val">${totalReceitas}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right; padding-right: 10px;">Total de Despesas:</td>
                    <td class="expense-val">${totalDespesas}</td>
                </tr>
                <tr class="total-row" style="background-color: #e2e8f0;">
                    <td colspan="3" style="text-align: right; padding-right: 10px; font-size: 11pt;">Saldo Líquido:</td>
                    <td class="${classeSaldo}" style="font-size: 11pt;">${saldoFinal}</td>
                </tr>
            </tbody>
        </table>
    </body>
    </html>
    `;

    // Cria o Blob simulando um arquivo do Excel nativo
    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement("a");
    
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `financashub_painel_${periodoNome.replace('-', '_')}.xls`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

window.removeTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(`tx_${currentUser.email}`, JSON.stringify(transactions));
    renderTransactions();
    updateValues();
    renderGoals();
    renderCategories();
};

clearAllBtn.addEventListener('click', () => {
    if(confirm("Deseja apagar o histórico completo de lançamentos?")) {
        transactions = [];
        localStorage.removeItem(`tx_${currentUser.email}`);
        renderTransactions();
        updateValues();
        renderGoals();
        renderCategories();
    }
});

// --- METAS DE ECONOMIA ---
goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const goal = {
        id: Date.now(),
        title: goalTitleInput.value.trim(),
        target: parseFloat(goalTargetInput.value)
    };
    goals.push(goal);
    localStorage.setItem(`goals_${currentUser.email}`, JSON.stringify(goals));
    goalForm.reset();
    renderGoals();
});

function renderGoals() {
    goalsContainer.innerHTML = '';
    const netSavings = transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    const availableSavings = Math.max(0, netSavings);

    if(goals.length === 0) {
        goalsContainer.innerHTML = `<p class="text-muted small text-center py-4">Nenhuma meta estipulada no momento.</p>`;
        return;
    }

    goals.forEach(g => {
        const pct = Math.min(100, Math.round((availableSavings / g.target) * 100));
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="d-flex justify-content-between small fw-bold mb-1">
                <span>${g.title}</span>
                <span class="text-muted">${availableSavings.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} / ${g.target.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
            </div>
            <div class="progress" style="height: 10px;">
                <div class="progress-bar bg-warning text-dark progress-bar-striped" role="progressbar" style="width: ${pct}%"></div>
            </div>
            <div class="text-end mt-1 small text-muted">${pct}% Concluído</div>`;
        goalsContainer.appendChild(div);
    });
}

// --- CORE DASHBOARD MÉTODOS ---
function updateValues() {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const total = income - expense;

    totalBalanceEl.innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    totalIncomeEl.innerText = `+ ${income.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;
    totalExpenseEl.innerText = `- ${expense.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;

    if (financeChart) {
        financeChart.data.datasets[0].data = [income, expense];
        financeChart.update();
    }
    
    if(transactions.length === 0) insightTextEl.innerText = "Adicione transações nas abas laterais para gerar insights automáticos.";
    else if(total < 0) insightTextEl.innerText = "Alerta crítico! Suas despesas ultrapassaram as receitas acumuladas.";
    else if(expense > (income * 0.7)) insightTextEl.innerText = "Aviso: Você está comprometendo mais de 70% dos seus rendimentos.";
    else insightTextEl.innerText = "Ótimo trabalho! Margem de lucro saudável. Suas metas estão captando sua reserva.";
}

function initChart() {
    if(financeChart) return;
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const borderColor = currentTheme === 'dark' ? '#1e293b' : '#ffffff';

    financeChart = new Chart(ctx, {
        type: 'doughnut',
        data: { 
            labels: ['Receitas', 'Despesas'], 
            datasets: [{ 
                data: [0, 0], 
                backgroundColor: ['#198754', '#dc3545'], 
                borderWidth: 2,
                borderColor: borderColor
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { position: 'bottom', labels: { color: currentTheme === 'dark' ? '#f1f5f9' : '#2d3748' } } 
            } 
        }
    });
}

// ==========================================
// CONTROLE DO GERENCIADOR DE TEMAS (DARK MODE)
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = 'light';

    if (currentTheme !== 'dark') {
        newTheme = 'dark';
    }

    applyTheme(newTheme);
    localStorage.setItem('fh_theme', newTheme);
});

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        themeIcon.className = "bi bi-sun fs-5";
        themeToggleBtn.title = "Ativar Modo Claro";
    } else {
        themeIcon.className = "bi bi-moon-stars fs-5";
        themeToggleBtn.title = "Ativar Modo Escuro";
    }

    if (financeChart) {
        const isDark = theme === 'dark';
        financeChart.options.plugins.legend.labels.color = isDark ? '#f1f5f9' : '#2d3748';
        financeChart.data.datasets[0].borderColor = isDark ? '#1e293b' : '#ffffff';
        financeChart.update();
    }
}

// Boot / Session & Theme Check
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('fh_theme') || 'light';
    applyTheme(savedTheme);

    const loggedUser = sessionStorage.getItem('fh_logged_user');
    if (loggedUser) login(JSON.parse(loggedUser));
    
    const date = new Date();
    document.getElementById('current-date-badge').innerText = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
});

const API = "/api/proxy";

// --- FUNÇÃO AUXILIAR DE COMUNICAÇÃO ---
async function apiPost(payload) {
  try {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await resposta.json();
  } catch (erro) {
    console.error("Erro na requisição:", erro);
    return { status: "error", message: "Erro ao conectar com o servidor." };
  }
}

// --- LOGIN E SESSÃO ---
async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const resultado = document.getElementById("resultado");

  if (!email || !senha) {
    resultado.innerHTML = "Informe email e senha.";
    return;
  }

  resultado.innerHTML = "Entrando...";
  const dados = await apiPost({ acao: "login", email, senha });

  if (dados.status === "success") {
    localStorage.setItem("usuario", JSON.stringify(dados));
    carregarInterface(dados);
    abrirPagina("inicio");
  } else {
    resultado.innerHTML = dados.message || "Erro ao fazer login.";
  }
}

function carregarInterface(usuario) {
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("painel").style.display = "block";
  document.getElementById("usuarioNome").innerHTML = usuario.nome;
  document.getElementById("usuarioPerfil").innerHTML = usuario.perfil;

  const isAdmin = usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMINISTRATIVO";
  document.getElementById("menuAdmin").style.display = isAdmin ? "block" : "none";
}

function logout() {
  localStorage.removeItem("usuario");
  location.reload();
}

// --- NAVEGAÇÃO ---
function abrirPagina(pagina) {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (pagina === "inicio") {
    if (usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMINISTRATIVO") {
      carregarDashboardAdmin();
    } else {
      conteudo.innerHTML = `<h1>Bem-vindo, ${usuario.nome}</h1><div class="card"><p>Cooperativa: ${usuario.cooperativa}</p></div>`;
    }
  }
  if (pagina === "usuarios") telaUsuarios();
  if (pagina === "cooperativas") telaCooperativas();
  if (pagina === "conteudos") telaConteudos();
}

// --- DASHBOARD COM GRÁFICOS REAIS ---
async function carregarDashboardAdmin() {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  conteudo.innerHTML = `
    <div class="header-dash">
        <div class="boas-vindas">
            <h1>Olá, ${usuario.nome}! 👋</h1>
            <p>Bem-vindo ao painel administrativo</p>
        </div>
        <button onclick="carregarDashboardAdmin()" class="btn-atualizar">🔄 Atualizar dados</button>
    </div>

    <div class="grid-dashboard-premium">
      <div class="card-premium border-amarelo">
        <div class="card-icon bg-amarelo">👥</div>
        <div class="card-info"><p>Usuários</p><h2 id="totalUsuarios">0</h2><span>Total cadastrados</span></div>
      </div>
      <div class="card-premium border-verde">
        <div class="card-icon bg-verde">👤</div>
        <div class="card-info"><p>Usuários Ativos</p><h2 id="usuariosAtivos">0</h2><span>Ativos no sistema</span></div>
      </div>
      <div class="card-premium border-azul">
        <div class="card-icon bg-azul">👥</div>
        <div class="card-info"><p>Consultores</p><h2 id="consultores">0</h2><span>Consultores ativos</span></div>
      </div>
      <div class="card-premium border-roxo">
        <div class="card-icon bg-roxo">📍</div>
        <div class="card-info"><p>Regionais</p><h2 id="regionais">0</h2><span>Regionais ativos</span></div>
      </div>
      <div class="card-premium border-laranja">
        <div class="card-icon bg-laranja">🏢</div>
        <div class="card-info"><p>Cooperativas</p><h2 id="cooperativas">0</h2><span>Cadastradas</span></div>
      </div>
    </div>

    <div class="row-graficos">
        <div class="card card-grafico">
            <h3>📈 Resumo Geral</h3>
            <div class="chart-container"><canvas id="graficoLinha"></canvas></div>
            <div class="mini-stats">
                <div><small>Total</small><p id="miniTotal">0</p></div>
                <div><small>Ativos</small><p id="miniAtivos" style="color: #2ecc71;">0</p></div>
                <div><small>Inativos</small><p id="miniInativos" style="color: #e74c3c;">0</p></div>
            </div>
        </div>
        <div class="card card-grafico-pizza">
            <h3>🍕 Distribuição</h3>
            <div class="chart-container"><canvas id="graficoDonut"></canvas></div>
        </div>
    </div>
  `;

  const dados = await apiPost({ acao: "dashboardAdmin" });
  if (dados.status === "success") {
    // Atualiza números
    document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
    document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
    document.getElementById("consultores").innerText = dados.totalConsultores;
    document.getElementById("regionais").innerText = dados.totalRegionais;
    document.getElementById("cooperativas").innerText = dados.totalCooperativas;
    document.getElementById("miniTotal").innerText = dados.totalUsuarios;
    document.getElementById("miniAtivos").innerText = dados.usuariosAtivos;
    document.getElementById("miniInativos").innerText = (dados.totalUsuarios - dados.usuariosAtivos);

    // Renderiza Gráfico de Linha
    new Chart(document.getElementById('graficoLinha'), {
      type: 'line',
      data: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Novos Usuários',
          data: [1, 2, 1, 3, 2, 4, dados.totalUsuarios],
          borderColor: '#ffd000',
          backgroundColor: 'rgba(255, 208, 0, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Renderiza Gráfico Donut
    new Chart(document.getElementById('graficoDonut'), {
      type: 'doughnut',
      data: {
        labels: ['Consultores', 'Regionais', 'Outros'],
        datasets: [{
          data: [dados.totalConsultores, dados.totalRegionais, (dados.totalUsuarios - dados.totalConsultores - dados.totalRegionais)],
          backgroundColor: ['#3498db', '#9b59b6', '#ffd000'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    });
  }
}

function telaConteudos() {
    document.getElementById("conteudo").innerHTML = `<h1>Central do Consultor</h1><div class="card"><p>Materiais e Suporte...</p></div>`;
}

window.onload = function() {
  const usuario = localStorage.getItem("usuario");
  if (usuario) {
    carregarInterface(JSON.parse(usuario));
    abrirPagina("inicio");
  }
};

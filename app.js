const API = "/api/proxy";

// Variáveis globais para busca e cache
let usuariosLocal = [];
let cooperativasLocal = [];

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

/* --- LOGIN E SESSÃO --- */

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

  // Controle de menu Admin
  const menuAdmin = document.getElementById("menuAdmin");
  const isAdmin = usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMINISTRATIVO";
  menuAdmin.style.display = isAdmin ? "block" : "none";
}

function logout() {
  localStorage.removeItem("usuario");
  location.reload();
}

window.onload = function () {
  const usuario = localStorage.getItem("usuario");
  if (usuario) {
    carregarInterface(JSON.parse(usuario));
    abrirPagina("inicio");
  }
};

/* --- NAVEGAÇÃO --- */

function abrirPagina(pagina) {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  // Reset de classes ativas no menu (opcional)
  
  if (pagina === "inicio") {
    if (usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMINISTRATIVO") {
      carregarDashboardAdmin();
    } else {
      conteudo.innerHTML = `<h1>Bem-vindo, ${usuario.nome}</h1><div class="card"><p>Sua Cooperativa: ${usuario.cooperativa}</p></div>`;
    }
  }

  if (pagina === "usuarios") telaUsuarios();
  if (pagina === "cooperativas") telaCooperativas();
  
  if (pagina === "conteudos") {
    conteudo.innerHTML = `
      <h1>Central do Consultor</h1>
      <div class="central-container">
        <div class="row-apoio" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div class="card border-amarelo">
            <h3 style="color: #ffd000;">📢 NOVIDADES GPV / EVENTOS</h3>
            <div class="banner-simulado">BANNER DE CONTEÚDO</div>
          </div>
          <div class="card border-amarelo">
            <h3 style="color: #ffd000;">📚 MATERIAL DE APOIO</h3>
            <ul class="lista-apoio">
              <li>📄 <a href="#">Guia do Consultor</a></li>
              <li>📄 <a href="#">Links importantes e Aplicações utilizadas</a></li>
              <li>📄 <a href="#">Cadastrar Consultor</a></li>
            </ul>
          </div>
        </div>

        <div class="card card-suporte">
          <h3 style="color: #e74c3c; text-align: center; margin-bottom: 20px;">📞 CONTATOS IMPORTANTES E SUPORTE</h3>
          <div class="suporte-grid">
            <div class="assistencia-info">
              <p><strong>ASSISTÊNCIA 24H</strong></p>
              <p>0800 111 1414 | 0800 591 8357</p>
              <p>📱 (81) 9424-5276 (WhatsApp)</p>
            </div>
            <div class="whatsapp-botoes">
              <a href="https://wa.me/5581991223928" target="_blank" class="btn-whats">💬 CENTRAL DO CONSULTOR</a>
              <a href="https://wa.me/5581998657992" target="_blank" class="btn-whats">💬 CENTRAL DO ASSOCIADO</a>
            </div>
            <div></div> <!-- Espaço vazio onde era o e-mail -->
          </div>
        </div>
      </div>
    `;
  }
}

/* --- DASHBOARD PREMIUM (image_9b1203.jpg) --- */

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
            <div class="placeholder-grafico"><p>Gráfico em desenvolvimento</p></div>
            <div class="mini-stats">
                <div><small>Total</small><p id="miniTotal">0</p></div>
                <div><small>Ativos</small><p id="miniAtivos" style="color: #2ecc71;">0</p></div>
                <div><small>Inativos</small><p id="miniInativos" style="color: #e74c3c;">0</p></div>
            </div>
        </div>
        <div class="card card-grafico-pizza">
            <h3>🍕 Distribuição</h3>
            <div class="placeholder-pizza"><div class="donut-simulado"></div></div>
        </div>
    </div>
  `;

  const dados = await apiPost({ acao: "dashboardAdmin" });
  if (dados.status === "success") {
    document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
    document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
    document.getElementById("consultores").innerText = dados.totalConsultores;
    document.getElementById("regionais").innerText = dados.totalRegionais;
    document.getElementById("cooperativas").innerText = dados.totalCooperativas;
    document.getElementById("miniTotal").innerText = dados.totalUsuarios;
    document.getElementById("miniAtivos").innerText = dados.usuariosAtivos;
    document.getElementById("miniInativos").innerText = (dados.totalUsuarios - dados.usuariosAtivos);
  }
}

/* --- FUNÇÕES DE USUÁRIOS E COOPERATIVAS (Resumidas para o JS não ficar gigante) --- */

function telaUsuarios() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<h1>Usuários</h1><div class="card"><button onclick="carregarUsuarios()">Listar Usuários</button><div id="listaUsuarios"></div></div>`;
}

async function carregarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  lista.innerHTML = "Carregando...";
  const dados = await apiPost({ acao: "listarUsuarios" });
  if (dados.status === "success") {
    let html = "";
    dados.usuarios.forEach(u => {
      html += `<div style="padding:10px; border-bottom:1px solid #333;">${u.nome} - ${u.email}</div>`;
    });
    lista.innerHTML = html;
  }
}

function telaCooperativas() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<h1>Cooperativas</h1><div class="card"><button onclick="carregarCooperativas()">Listar Cooperativas</button><div id="listaCooperativas"></div></div>`;
}

async function carregarCooperativas() {
  const lista = document.getElementById("listaCooperativas");
  lista.innerHTML = "Carregando...";
  const dados = await apiPost({ acao: "listarCooperativas" });
  if (dados.status === "success") {
    let html = "";
    dados.cooperativas.forEach(c => {
      html += `<div style="padding:10px; border-bottom:1px solid #333;">${c.nome} - ${c.cidade}</div>`;
    });
    lista.innerHTML = html;
  }
}

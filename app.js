const API = "/api/proxy";

// --- AUXILIAR ---
async function apiPost(payload) {
  try {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await resposta.json();
  } catch (erro) {
    console.error("Erro:", erro);
    return { status: "error", message: "Erro de conexão." };
  }
}

// --- LOGIN ---
async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const resultado = document.getElementById("resultado");

  if (!email || !senha) {
    resultado.innerHTML = "Informe os dados.";
    return;
  }

  const dados = await apiPost({ acao: "login", email, senha });
  if (dados.status === "success") {
    localStorage.setItem("usuario", JSON.stringify(dados));
    location.reload(); 
  } else {
    resultado.innerHTML = dados.message;
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

// --- NAVEGAÇÃO (AQUI ESTAVA O ERRO) ---
function abrirPagina(pagina) {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (pagina === "inicio") {
    if (usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMINISTRATIVO") {
      carregarDashboardAdmin();
    } else {
      conteudo.innerHTML = `<h1>Olá, ${usuario.nome}</h1><div class="card">Bem-vindo ao portal.</div>`;
    }
  }
  // Chama as funções que o console disse que não existiam
  if (pagina === "usuarios") telaUsuarios();
  if (pagina === "cooperativas") telaCooperativas();
  if (pagina === "conteudos") telaConteudos();
}

// --- FUNÇÕES DE TELAS ---
async function telaUsuarios() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<h1>Gerenciamento de Usuários</h1><div class="card">Carregando lista...</div>`;
  const dados = await apiPost({ acao: "listarUsuarios" });
  if(dados.status === "success") {
    let html = `<h1>Usuários</h1><div class="card"><table><tr><th>Nome</th><th>Perfil</th></tr>`;
    dados.usuarios.forEach(u => {
      html += `<tr><td>${u.nome}</td><td>${u.perfil}</td></tr>`;
    });
    html += `</table></div>`;
    conteudo.innerHTML = html;
  }
}

async function telaCooperativas() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<h1>Cooperativas</h1><div class="card">Carregando...</div>`;
  const dados = await apiPost({ acao: "listarCooperativas" });
  if(dados.status === "success") {
    let html = `<h1>Cooperativas</h1><div class="card">`;
    dados.cooperativas.forEach(c => { html += `<p>🏢 ${c.nome} - ${c.cidade}</p>`; });
    html += `</div>`;
    conteudo.innerHTML = html;
  }
}

function telaConteudos() {
  document.getElementById("conteudo").innerHTML = `
    <h1>Central do Consultor</h1>
    <div class="card">
        <h3>Suporte 24h</h3>
        <p>WhatsApp: (81) 9424-5276</p>
        <a href="https://wa.me/5581991223928" class="btn-atualizar" style="display:inline-block; text-decoration:none; margin-top:10px;">Chamar Consultor</a>
    </div>`;
}

// --- DASHBOARD (GRÁFICOS) ---
async function carregarDashboardAdmin() {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  conteudo.innerHTML = `
    <div class="header-dash">
        <div><h1>Olá, ${usuario.nome}! 👋</h1><p>Painel administrativo</p></div>
        <button onclick="carregarDashboardAdmin()" class="btn-atualizar">🔄 Atualizar</button>
    </div>
    <div class="grid-dashboard-premium">
        <div class="card-premium border-amarelo"><div class="card-info"><p>Usuários</p><h2 id="totalUsuarios">0</h2></div></div>
        <div class="card-premium border-verde"><div class="card-info"><p>Ativos</p><h2 id="usuariosAtivos">0</h2></div></div>
    </div>
    <div class="row-graficos">
        <div class="card"><h3>📈 Resumo</h3><div style="height:200px"><canvas id="graficoLinha"></canvas></div></div>
        <div class="card"><h3>🍕 Distribuição</h3><div style="height:200px"><canvas id="graficoDonut"></canvas></div></div>
    </div>`;

  const dados = await apiPost({ acao: "dashboardAdmin" });
  if (dados.status === "success") {
    document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
    document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
    
    new Chart(document.getElementById('graficoLinha'), {
      type: 'line',
      data: { labels: ['S','T','Q','Q','S','S','D'], datasets: [{ label: 'Novos', data: [1,2,1,3,2,4,dados.totalUsuarios], borderColor: '#ffd000', fill: true, backgroundColor: 'rgba(255,208,0,0.1)' }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
    new Chart(document.getElementById('graficoDonut'), {
      type: 'doughnut',
      data: { labels: ['Cons.', 'Reg.'], datasets: [{ data: [dados.totalConsultores, dados.totalRegionais], backgroundColor: ['#3498db', '#9b59b6'] }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }
}

window.onload = function() {
  const usuario = localStorage.getItem("usuario");
  if (usuario) {
    carregarInterface(JSON.parse(usuario));
    abrirPagina("inicio");
  }
};

const API = "/api/proxy";

// Auxiliar para chamadas API
async function apiPost(payload) {
  try {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await resposta.json();
  } catch (erro) {
    return { status: "error", message: "Erro de conexão com o servidor." };
  }
}

// Controle de Login
async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const resultado = document.getElementById("resultado");

  if (!email || !senha) {
    resultado.innerHTML = "Preencha todos os campos.";
    return;
  }

  const dados = await apiPost({ acao: "login", email, senha });
  if (dados.status === "success") {
    localStorage.setItem("usuario", JSON.stringify(dados));
    location.reload(); // Recarrega para aplicar a interface
  } else {
    resultado.innerHTML = dados.message;
  }
}

function logout() {
  localStorage.removeItem("usuario");
  location.reload();
}

// Navegação entre abas
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
  if (pagina === "usuarios") telaUsuarios();
  if (pagina === "cooperativas") telaCooperativas();
  if (pagina === "conteudos") telaConteudos();
}

// --- TELAS QUE ESTAVAM FALTANDO (RESOLVE O ERRO DA IMAGE_90B3F7) ---

async function telaUsuarios() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<h1>Usuários</h1><div class="card">Carregando lista...</div>`;
  const dados = await apiPost({ acao: "listarUsuarios" });
  if(dados.status === "success") {
    let html = `<h1>Usuários</h1><div class="card"><table style="width:100%; border-collapse: collapse;">
                <tr style="text-align:left; border-bottom:1px solid #333"><th>Nome</th><th>Perfil</th></tr>`;
    dados.usuarios.forEach(u => {
      html += `<tr style="border-bottom:1px solid #222"><td style="padding:10px 0">${u.nome}</td><td>${u.perfil}</td></tr>`;
    });
    html += `</table></div>`;
    conteudo.innerHTML = html;
  }
}

async function telaCooperativas() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `<h1>Cooperativas</h1><div class="card">Buscando...</div>`;
  const dados = await apiPost({ acao: "listarCooperativas" });
  if(dados.status === "success") {
    let html = `<h1>Cooperativas</h1><div class="grid-dashboard-premium" style="grid-template-columns: 1fr 1fr;">`;
    dados.cooperativas.forEach(c => {
      html += `<div class="card-premium"><div><strong>${c.nome}</strong><br><small>${c.cidade}</small></div></div>`;
    });
    html += `</div>`;
    conteudo.innerHTML = html;
  }
}

function telaConteudos() {
  document.getElementById("conteudo").innerHTML = `
    <h1>Conteúdos</h1>
    <div class="card">
        <h3>Suporte Direto</h3>
        <p>Precisa de ajuda com o painel?</p>
        <a href="https://wa.me/5581991223928" class="btn-atualizar" style="display:inline-block; text-decoration:none; margin-top:10px">Chamar no WhatsApp</a>
    </div>`;
}

// Painel Principal com Gráficos
async function carregarDashboardAdmin() {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  
  conteudo.innerHTML = `
    <div class="header-dash">
        <div><h1>Olá, ${usuario.nome}! 👋</h1><p>Painel Administrativo</p></div>
        <button onclick="carregarDashboardAdmin()" class="btn-atualizar">🔄 Atualizar</button>
    </div>
    <div class="grid-dashboard-premium">
        <div class="card-premium border-amarelo"><div><p>Usuários</p><h2 id="totalUsuarios">0</h2></div></div>
        <div class="card-premium border-verde"><div><p>Ativos</p><h2 id="usuariosAtivos">0</h2></div></div>
    </div>
    <div class="row-graficos">
        <div class="card"><h3>📈 Tendência</h3><div style="height:200px"><canvas id="graficoLinha"></canvas></div></div>
        <div class="card"><h3>🍕 Distribuição</h3><div style="height:200px"><canvas id="graficoDonut"></canvas></div></div>
    </div>`;

  const dados = await apiPost({ acao: "dashboardAdmin" });
  if (dados.status === "success") {
    document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
    document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
    
    new Chart(document.getElementById('graficoLinha'), {
      type: 'line',
      data: { labels: ['S','T','Q','Q','S','S','D'], datasets: [{ label: 'Cadastros', data: [1,2,1,3,2,4,dados.totalUsuarios], borderColor: '#ffd000', backgroundColor: 'rgba(255,208,0,0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false }
    });

    new Chart(document.getElementById('graficoDonut'), {
      type: 'doughnut',
      data: { labels: ['Cons.', 'Reg.'], datasets: [{ data: [dados.totalConsultores, dados.totalRegionais], backgroundColor: ['#3498db', '#9b59b6'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
    });
  }
}

// Inicialização
window.onload = function() {
  const sessao = localStorage.getItem("usuario");
  if (sessao) {
    const user = JSON.parse(sessao);
    document.getElementById("telaLogin").style.display = "none";
    document.getElementById("painel").style.display = "block";
    document.getElementById("usuarioNome").innerText = user.nome;
    document.getElementById("usuarioPerfil").innerText = user.perfil;
    
    const isAdmin = user.perfil === "SUPER_ADMIN" || user.perfil === "ADMINISTRATIVO";
    document.getElementById("menuAdmin").style.display = isAdmin ? "block" : "none";
    
    abrirPagina("inicio");
  }
};

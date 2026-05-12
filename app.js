/* ... (restante do código anterior igual) ... */

async function carregarDashboardAdmin() {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  
  // Estrutura baseada na image_9b1203.jpg
  conteudo.innerHTML = `
    <div class="header-dash">
        <div class="boas-vindas">
            <h1>Olá, ${usuario.nome}! 👋</h1>
            <p>Bem-vindo ao painel administrativo</p>
        </div>
        <button onclick="carregarDashboardAdmin()" class="btn-atualizar">🔄 Atualizar dados</button>
    </div>

    <div class="grid-dashboard-premium">
      <!-- Card Usuários -->
      <div class="card-premium border-amarelo">
        <div class="card-icon bg-amarelo">👥</div>
        <div class="card-info">
            <p>Usuários</p>
            <h2 id="totalUsuarios">0</h2>
            <span>Total cadastrados</span>
        </div>
      </div>

      <!-- Card Usuários Ativos -->
      <div class="card-premium border-verde">
        <div class="card-icon bg-verde">👤</div>
        <div class="card-info">
            <p>Usuários Ativos</p>
            <h2 id="usuariosAtivos">0</h2>
            <span>Ativos no sistema</span>
        </div>
      </div>

      <!-- Card Consultores -->
      <div class="card-premium border-azul">
        <div class="card-icon bg-azul">👥</div>
        <div class="card-info">
            <p>Consultores</p>
            <h2 id="consultores">0</h2>
            <span>Consultores ativos</span>
        </div>
      </div>

      <!-- Card Regionais -->
      <div class="card-premium border-roxo">
        <div class="card-icon bg-roxo">📍</div>
        <div class="card-info">
            <p>Regionais</p>
            <h2 id="regionais">0</h2>
            <span>Regionais ativos</span>
        </div>
      </div>

      <!-- Card Cooperativas (Segunda linha na imagem) -->
      <div class="card-premium border-laranja">
        <div class="card-icon bg-laranja">🏢</div>
        <div class="card-info">
            <p>Cooperativas</p>
            <h2 id="cooperativas">0</h2>
            <span>Cooperativas cadastradas</span>
        </div>
      </div>
    </div>

    <!-- Seção de Gráficos (Simulada conforme a imagem) -->
    <div class="row-graficos">
        <div class="card card-grafico">
            <h3>📈 Resumo Geral</h3>
            <div class="placeholder-grafico">
                <p style="color:#666; font-size: 0.9rem;">Área reservada para gráfico de linha (Chart.js)</p>
            </div>
            <div class="mini-stats">
                <div><small>Total</small><p id="miniTotal">0</p></div>
                <div><small>Ativos</small><p id="miniAtivos" style="color: #2ecc71;">0</p></div>
                <div><small>Inativos</small><p id="miniInativos" style="color: #e74c3c;">0</p></div>
            </div>
        </div>

        <div class="card card-grafico-pizza">
            <h3>🍕 Distribuição por Perfil</h3>
            <div class="placeholder-pizza">
                <div class="donut-simulado"></div>
            </div>
        </div>
    </div>
  `;

  try {
    const dados = await apiPost({ acao: "dashboardAdmin" });
    if (dados.status === "success") {
      document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
      document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
      document.getElementById("consultores").innerText = dados.totalConsultores;
      document.getElementById("regionais").innerText = dados.totalRegionais;
      document.getElementById("cooperativas").innerText = dados.totalCooperativas;
      
      // Mini stats
      document.getElementById("miniTotal").innerText = dados.totalUsuarios;
      document.getElementById("miniAtivos").innerText = dados.usuariosAtivos;
      document.getElementById("miniInativos").innerText = (dados.totalUsuarios - dados.usuariosAtivos);
    }
  } catch (erro) { console.log(erro); }
}

/* ... (restante do código) ... */

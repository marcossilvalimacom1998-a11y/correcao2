document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('armarios-esquecidos');
  
  // 1. Carregar dados do Banco de Dados (SQLite)
  const dadosBanco = await window.api.getEsquecidos();
  const esquecidos = {};
  dadosBanco.forEach(item => {
      esquecidos[item.id] = item;
  });

  function criarArmariosEsquecidos() {
    container.innerHTML = '';
    // Reduzi para 30 ou o número que preferir, para não pesar a tela
    for (let i = 1; i <= 40; i++) { 
      const div = document.createElement('div');
      div.className = 'armario';
      div.id = `esquecido-${i}`;

      div.innerHTML = `
        <h3>Armário ${i}</h3>
        <input type="text" id="nome-esquecido-${i}" placeholder="Nome do Paciente" autocomplete="off">
        <input type="text" id="prontuario-esquecido-${i}" placeholder="Prontuário" autocomplete="off">
        <input type="text" id="itens-esquecido-${i}" placeholder="Itens Guardados" autocomplete="off">
        <div id="status-esquecido-${i}" class="status-info" style="margin: 5px 0; font-size: 0.9em; min-height: 20px;"></div>
        <div class="botoes">
          <button onclick="window.guardarEsquecido(${i})">📦 Guardar</button>
          <button onclick="window.descartarEsquecido(${i})">🗑️ Descartar</button>
        </div>
      `;

      container.appendChild(div);

      if (esquecidos[i]) {
        document.getElementById(`nome-esquecido-${i}`).value = esquecidos[i].nome || '';
        document.getElementById(`prontuario-esquecido-${i}`).value = esquecidos[i].prontuario || '';
        document.getElementById(`itens-esquecido-${i}`).value = esquecidos[i].itens || '';
        
        // Lógica de Vencimento (30 dias)
        // O banco retorna data_guardado como timestamp (inteiro)
        const dataGuardado = parseInt(esquecidos[i].data_guardado); 
        const trintaDiasMs = 30 * 24 * 60 * 60 * 1000;
        const agora = Date.now();
        const diff = agora - dataGuardado;
        
        const statusDiv = document.getElementById(`status-esquecido-${i}`);

        if (diff > trintaDiasMs) {
            div.classList.add('vencido');
            div.classList.remove('guardado');
            statusDiv.innerHTML = '<span style="color:red;font-weight:bold;">⚠️ PRAZO VENCIDO</span>';
        } else {
            div.classList.add('guardado');
            div.classList.remove('vencido');
            const diasRestantes = Math.ceil((trintaDiasMs - diff) / (1000 * 60 * 60 * 24));
            statusDiv.innerHTML = `<span style="color:green;">Expira em ${diasRestantes} dias</span>`;
        }
      }
    }
  }

  window.guardarEsquecido = async (id) => {
    const nome = document.getElementById(`nome-esquecido-${id}`).value.trim();
    const prontuario = document.getElementById(`prontuario-esquecido-${id}`).value.trim();
    const itens = document.getElementById(`itens-esquecido-${id}`).value.trim();
  
    if (!nome || !prontuario || !itens) {
      alert('Preencha todos os campos para guardar.');
      return;
    }
  
    const dados = {
      id,
      nome,
      prontuario,
      itens,
      data: Date.now() // Salva timestamp atual
    };
  
    try {
        await window.api.saveEsquecido(dados);
        esquecidos[id] = { ...dados, data_guardado: dados.data }; // Atualiza memória local
        criarArmariosEsquecidos(); // Atualiza UI
        alert('Item registrado com sucesso.');
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar no banco.');
    }
  };

  window.descartarEsquecido = async (id) => {
    if (confirm("Tem certeza que deseja descartar/entregar este item?")) {
      try {
          await window.api.deleteEsquecido(id);
          delete esquecidos[id];
          criarArmariosEsquecidos();
          
          // Limpa campos
          document.getElementById(`nome-esquecido-${id}`).value = '';
          document.getElementById(`prontuario-esquecido-${id}`).value = '';
          document.getElementById(`itens-esquecido-${id}`).value = '';
      } catch (err) {
          console.error(err);
          alert('Erro ao remover do banco.');
      }
    }

    if (confirm("Tem certeza que deseja descartar/entregar este item?")) {
  try {
      // 1. Salvar no histórico ANTES de deletar
      const item = esquecidos[id];
      if (item) {
          await window.api.addHistorico('esquecido', id, 'Descarte/Entrega', { 
              nome: item.nome, 
              prontuario: item.prontuario,
              itens: item.itens
          });
      }

      // 2. Deletar
      await window.api.deleteEsquecido(id);
      delete esquecidos[id];
      criarArmariosEsquecidos();
      
      // ... limpar campos ...
  } catch (err) {
      console.error(err);
      alert('Erro ao remover do banco.');
  }
}
    
  };

  window.filtrarEsquecidos = () => {
    const filtro = document.getElementById('search-esquecidos').value.toLowerCase().trim();
    for (let i = 1; i <= 40; i++) {
        const div = document.getElementById(`esquecido-${i}`);
        if (!div) continue;
        
        const nome = (document.getElementById(`nome-esquecido-${i}`)?.value || '').toLowerCase();
        const prontuario = (document.getElementById(`prontuario-esquecido-${i}`)?.value || '').toLowerCase();
        
        if (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) {
            div.style.display = 'flex';
        } else {
            div.style.display = 'none';
        }
    }
  };

  criarArmariosEsquecidos();

window.exportarEsquecidos = () => {
    const dados = [];
    for (let i = 1; i <= 40; i++) {
        const nome = document.getElementById(`nome-esquecido-${i}`)?.value;
        if (nome) {
            // Pega o status visual (vencido ou não)
            const statusDiv = document.getElementById(`status-esquecido-${i}`);
            const statusTexto = statusDiv?.innerText || 'Ativo';
            
            dados.push({
                Armário: i,
                Nome: nome,
                Prontuário: document.getElementById(`prontuario-esquecido-${i}`)?.value,
                Itens: document.getElementById(`itens-esquecido-${i}`)?.value,
                Situação: statusTexto.includes('VENCIDO') ? 'VENCIDO' : 'No prazo'
            });
        }
    }
    if (dados.length === 0) return alert("Nada para exportar.");
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Esquecidos");
    XLSX.writeFile(wb, "Itens_Esquecidos.xlsx");
};
  
});



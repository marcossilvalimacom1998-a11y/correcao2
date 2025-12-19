// esquecidos.js - Controle de Itens Esquecidos
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('armarios-esquecidos');
  
  // 1. Carregar dados do Banco com tratamento robusto
  const response = await window.api.getEsquecidos();
  const esquecidosCache = {};
  
  if (response.success) {
      response.data.forEach(item => {
          esquecidosCache[item.id] = item;
      });
  } else {
      console.error("Erro ao carregar itens esquecidos:", response.error);
      alert("Aviso: Não foi possível carregar a lista de itens esquecidos.");
  }

  // 2. Renderização Otimizada da Grade (40 armários para itens esquecidos)
  function criarGradeEsquecidos() {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= 40; i++) {
      const div = document.createElement('div');
      div.className = 'armario';
      div.id = `esquecido-${i}`;

      const dados = esquecidosCache[i] || {};
      const temItem = !!esquecidosCache[i];

      div.innerHTML = `
        <h3>Armário ${i}</h3>
        <div class="inputs">
            <input type="text" id="nome-esquecido-${i}" placeholder="Nome do Paciente" autocomplete="off" value="${dados.nome || ''}">
            <input type="text" id="prontuario-esquecido-${i}" placeholder="Prontuário" autocomplete="off" value="${dados.prontuario || ''}">
            <input type="text" id="itens-esquecido-${i}" placeholder="Itens Guardados" autocomplete="off" value="${dados.itens || ''}">
        </div>
        <div id="status-esquecido-${i}" class="status-info" style="margin: 5px 0; font-size: 0.9em; min-height: 20px;"></div>
        <div class="botoes">
          <button onclick="window.guardarEsquecido(${i})">📦 Guardar</button>
          <button onclick="window.descartarEsquecido(${i})">🗑️ Descartar</button>
        </div>
      `;

      if (temItem) {
        atualizarStatusVisual(div, i, dados.data_guardado);
      }

      fragment.appendChild(div);
    }
    container.appendChild(fragment);
  }

  // Função auxiliar para calcular vencimento (30 dias)
  function atualizarStatusVisual(elemento, id, timestamp) {
    const statusDiv = elemento.querySelector(`#status-esquecido-${id}`);
    const dataGuardado = parseInt(timestamp);
    const trintaDiasMs = 30 * 24 * 60 * 60 * 1000;
    const agora = Date.now();
    const diff = agora - dataGuardado;

    if (diff > trintaDiasMs) {
        elemento.classList.add('vencido');
        statusDiv.innerHTML = '<span style="color:red;font-weight:bold;">⚠️ PRAZO VENCIDO</span>';
    } else {
        elemento.classList.add('guardado');
        const diasRestantes = Math.ceil((trintaDiasMs - diff) / (1000 * 60 * 60 * 24));
        statusDiv.innerHTML = `<span style="color:green;">Expira em ${diasRestantes} dias</span>`;
    }
  }

  // 3. Função para Guardar Item Esquecido
  window.guardarEsquecido = async (id) => {
    const payload = {
      id,
      nome: document.getElementById(`nome-esquecido-${id}`).value.trim(),
      prontuario: document.getElementById(`prontuario-esquecido-${id}`).value.trim(),
      itens: document.getElementById(`itens-esquecido-${id}`).value.trim(),
      data: Date.now()
    };
  
    if (!payload.nome || !payload.prontuario || !payload.itens) {
      alert('Preencha todos os campos para guardar o item.');
      return;
    }
  
    try {
        const res = await window.api.saveEsquecido(payload);
        if (res.success) {
            esquecidosCache[id] = { ...payload, data_guardado: payload.data };
            criarGradeEsquecidos(); // Re-renderiza para atualizar cores e cronómetro
            alert(`Item no armário ${id} registado com sucesso.`);
        } else {
            alert("Erro ao guardar: " + res.error);
        }
    } catch (err) {
        console.error(err);
        alert('Erro na comunicação com o banco de dados.');
    }
  };

  // 4. Função para Descartar/Entregar Item
  window.descartarEsquecido = async (id) => {
    const item = esquecidosCache[id];
    if (!item) {
        alert("Este armário já está vazio.");
        return;
    }

    if (confirm(`Confirmar o descarte ou entrega dos itens do armário ${id}?`)) {
      try {
          // 1. Registar no histórico antes de eliminar
          await window.api.addHistorico('esquecido', id, 'Descarte/Entrega', { 
              nome: item.nome, 
              prontuario: item.prontuario,
              itens: item.itens
          });

          // 2. Eliminar do banco
          const res = await window.api.deleteEsquecido(id);
          
          if (res.success) {
              delete esquecidosCache[id];
              
              // Limpar interface
              const div = document.getElementById(`esquecido-${id}`);
              div.classList.remove('guardado', 'vencido');
              div.querySelector(`#status-esquecido-${id}`).innerHTML = '';
              ['nome-esquecido-', 'prontuario-esquecido-', 'itens-esquecido-'].forEach(p => {
                  document.getElementById(p + id).value = '';
              });
              
              alert(`Armário ${id} limpo e histórico registado.`);
          }
      } catch (err) {
          console.error(err);
          alert('Erro ao processar o descarte.');
      }
    }
  };

  // 5. Filtro de Busca
  window.filtrarEsquecidos = () => {
    const filtro = document.getElementById('search-esquecidos').value.toLowerCase().trim();
    for (let i = 1; i <= 40; i++) {
        const div = document.getElementById(`esquecido-${i}`);
        if (!div) continue;
        
        const nome = (document.getElementById(`nome-esquecido-${i}`)?.value || '').toLowerCase();
        const prontuario = (document.getElementById(`prontuario-esquecido-${i}`)?.value || '').toLowerCase();
        
        div.style.display = (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) ? 'flex' : 'none';
    }
  };

  // 6. Exportação Excel
  window.exportarEsquecidos = () => {
    const dadosParaExportar = [];
    for (let i = 1; i <= 40; i++) {
        const item = esquecidosCache[i];
        if (item) {
            const statusDiv = document.getElementById(`status-esquecido-${i}`);
            const situacao = statusDiv?.innerText || 'Ativo';
            
            dadosParaExportar.push({
                Armário: i,
                Paciente: item.nome,
                Prontuário: item.prontuario,
                Itens: item.itens,
                Situação: situacao.includes('VENCIDO') ? 'VENCIDO' : 'No prazo'
            });
        }
    }
    
    if (dadosParaExportar.length === 0) return alert("Não há itens esquecidos para exportar.");
    
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Esquecidos");
    XLSX.writeFile(wb, "Itens_Esquecidos.xlsx");
  };

  criarGradeEsquecidos();
});

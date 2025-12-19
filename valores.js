// valores.js - Controle de Pertences de Valor
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('armarios-valores');
  
  // 1. Carregar dados do Banco com tratamento robusto
  const response = await window.api.getValores();
  const armariosAtivos = {};
  
  if (response.success) {
      // Filtra apenas os que estão "guardados" para a visualização inicial
      response.data.forEach(item => {
          if (item.status === 'guardado') {
              armariosAtivos[item.id] = item;
          }
      });
  } else {
      console.error("Erro ao carregar valores:", response.error);
      alert("Não foi possível carregar os pertences de valor.");
  }

  // 2. Renderização Otimizada da Grade
  function criarGradeValores() {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= 300; i++) {
      const div = document.createElement('div');
      div.className = 'armario';
      div.id = `valor-${i}`;

      const dados = armariosAtivos[i] || {};
      const isGuardado = !!armariosAtivos[i];

      div.innerHTML = `
        <h3>Armário ${i}</h3>
        <div class="inputs">
            <input type="text" id="nome-valor-${i}" placeholder="Nome do Paciente" autocomplete="off" value="${dados.nome || ''}">
            <input type="text" id="prontuario-valor-${i}" placeholder="Prontuário" autocomplete="off" value="${dados.prontuario || ''}">
            <input type="text" id="itens-valor-${i}" placeholder="Itens Guardados" autocomplete="off" value="${dados.itens || ''}">
            <input type="text" id="devolver-valor-${i}" placeholder="Devolvido a" value="${dados.devolver_para || ''}">
        </div>
        <div class="botoes">
          <button onclick="window.guardarValor(${i})">📦 Guardar</button>
          <button onclick="window.devolverValor(${i})">✅ Devolvido</button>
          <button onclick="window.historicoValor(${i})">📜 Histórico</button>
        </div>
      `;

      if (isGuardado) div.classList.add('guardado');
      fragment.appendChild(div);
    }
    container.appendChild(fragment);
  }

  // 3. Função para Guardar Item
  window.guardarValor = async (id) => {
    const payload = {
      id,
      nome: document.getElementById(`nome-valor-${id}`).value.trim(),
      prontuario: document.getElementById(`prontuario-valor-${id}`).value.trim(),
      itens: document.getElementById(`itens-valor-${id}`).value.trim(),
      data: Date.now(),
      status: 'guardado'
    };
    
    if (!payload.nome || !payload.prontuario || !payload.itens) {
      alert('Preencha Nome, Prontuário e Itens para guardar.');
      return;
    }

    try {
        const res = await window.api.saveValor(payload);
        if (res.success) {
            // No banco robusto, chamamos o histórico manualmente para Valores/Esquecidos
            await window.api.addHistorico('valor', id, 'Guardou', payload);
            
            armariosAtivos[id] = payload;
            document.getElementById(`valor-${id}`).classList.add('guardado');
            alert(`Itens do armário ${id} guardados.`);
        } else {
            alert("Erro ao salvar: " + res.error);
        }
    } catch (e) {
        console.error(e);
        alert('Erro na comunicação com o sistema.');
    }
  };

  // 4. Função para Devolver Item
  window.devolverValor = async (id) => {
    const devolverPara = document.getElementById(`devolver-valor-${id}`).value.trim();
    
    if (!devolverPara) {
      alert('Informe quem está recebendo os itens.');
      return;
    }

    const dadosAtuais = armariosAtivos[id];
    const payload = { id, status: 'devolvido', devolver: devolverPara };
    
    try {
        const res = await window.api.saveValor(payload);
        if (res.success) {
            // Registra histórico com os detalhes do que estava guardado + quem recebeu
            await window.api.addHistorico('valor', id, 'Devolveu', { 
                ...dadosAtuais, 
                devolvido_a: devolverPara 
            });
            
            delete armariosAtivos[id];
            
            // Limpa campos e UI
            document.getElementById(`valor-${id}`).classList.remove('guardado');
            ['nome-valor-', 'prontuario-valor-', 'itens-valor-', 'devolver-valor-'].forEach(p => {
                document.getElementById(p + id).value = '';
            });
            alert(`Devolução do armário ${id} concluída.`);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao processar devolução.');
    }
  };

  // 5. Histórico de Valores
  window.historicoValor = async (id) => {
    const res = await window.api.getHistorico('valor', id);
    
    if (!res.success || res.data.length === 0) {
        alert('Sem histórico para este armário.');
        return;
    }

    const modal = document.getElementById('modal-historico');
    const texto = document.getElementById('historico-texto');
    
    let conteudo = `HISTÓRICO DE VALORES - ARMÁRIO ${id}\n\n`;
    res.data.forEach(h => {
        const det = JSON.parse(h.detalhes);
        const dataF = new Date(h.data).toLocaleString('pt-BR');
        conteudo += `[${dataF}] ${h.acao.toUpperCase()}\n`;
        conteudo += `Paciente: ${det.nome || '-'} | Itens: ${det.itens || '-'}\n`;
        if (det.devolvido_a) conteudo += `Devolvido para: ${det.devolvido_a}\n`;
        conteudo += `--------------------------\n`;
    });

    texto.textContent = conteudo;
    modal.style.display = 'block';
  };

  // 6. Filtro de Busca
  window.filtrarValores = () => {
    const filtro = document.getElementById('search-valores').value.toLowerCase().trim();
    for (let i = 1; i <= 300; i++) {
        const div = document.getElementById(`valor-${i}`);
        if (!div) continue;

        const nome = (document.getElementById(`nome-valor-${i}`)?.value || '').toLowerCase();
        const prontuario = (document.getElementById(`prontuario-valor-${i}`)?.value || '').toLowerCase();
        
        div.style.display = (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) ? 'flex' : 'none';
    }
  };

  // 7. Exportação
  window.exportarValores = () => {
    const dados = [];
    for (let i = 1; i <= 300; i++) {
        const nome = document.getElementById(`nome-valor-${i}`)?.value;
        if (nome) {
            dados.push({
                Armário: i,
                Paciente: nome,
                Prontuário: document.getElementById(`prontuario-valor-${i}`)?.value,
                Itens: document.getElementById(`itens-valor-${i}`)?.value,
                Status: armariosAtivos[i] ? 'Guardado' : 'Entregue'
            });
        }
    }
    if (dados.length === 0) return alert("Não há dados de valores para exportar.");
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Valores");
    XLSX.writeFile(wb, "Controle_Valores.xlsx");
  };

  criarGradeValores();
});

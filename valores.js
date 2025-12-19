document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('armarios-valores');
  
  // Carregar do Banco de Dados
  const dadosBanco = await window.api.getValores();
  const armarios = {};
  dadosBanco.forEach(item => {
      // Filtra apenas os que estão guardados para exibir na grade ativa
      if(item.status === 'guardado') armarios[item.id] = item;
  });

  function criarArmarios() {
    container.innerHTML = '';
    for (let i = 1; i <= 300; i++) {
      const div = document.createElement('div');
      div.className = 'armario';
      div.id = `valor-${i}`;

      div.innerHTML = `
        <h3>Armário ${i}</h3>
        <input type="text" id="nome-valor-${i}" placeholder="Nome do Paciente" autocomplete="off">
        <input type="text" id="prontuario-valor-${i}" placeholder="Prontuário" autocomplete="off">
        <input type="text" id="itens-valor-${i}" placeholder="Itens Guardados" autocomplete="off">
        <input type="text" id="devolver-valor-${i}" placeholder="Devolvido a">
        <div class="botoes">
          <button onclick="window.guardarValor(${i})">📦 Guardar</button>
          <button onclick="window.devolverValor(${i})">✅ Devolvido</button>
          <button onclick="window.historicoValor(${i})">📜 Histórico</button>
        </div>
      `;
      container.appendChild(div);

      if (armarios[i]) {
        document.getElementById(`nome-valor-${i}`).value = armarios[i].nome;
        document.getElementById(`prontuario-valor-${i}`).value = armarios[i].prontuario;
        document.getElementById(`itens-valor-${i}`).value = armarios[i].itens;
        div.classList.add('guardado');
      }
    }
  }

  window.guardarValor = async (id) => {
    const nome = document.getElementById(`nome-valor-${id}`).value.trim();
    const prontuario = document.getElementById(`prontuario-valor-${id}`).value.trim();
    const itens = document.getElementById(`itens-valor-${id}`).value.trim();
    
    if (!nome || !prontuario || !itens) {
      alert('Preencha todos os campos.');
      return;
    }

    const dados = { id, nome, prontuario, itens, data: Date.now() };
    
    try {
        await window.api.saveValor(dados);
        // DESCOMENTADO: Agora salva o histórico corretamente
        await window.api.addHistorico('valor', id, 'Guardou', dados);
        
        // Atualiza localmente
        armarios[id] = dados;
        document.getElementById(`valor-${id}`).classList.add('guardado');
        alert('Item guardado com sucesso!');
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar.');
    }
  };

  window.devolverValor = async (id) => {
    const devolverPara = document.getElementById(`devolver-valor-${id}`).value.trim();
    if (!devolverPara) {
      alert('Preencha "Devolvido a" antes de finalizar.');
      return;
    }

    const dados = { id, status: 'devolvido', devolver: devolverPara };
    
    try {
        await window.api.saveValor(dados);
        // DESCOMENTADO: Registra quem recebeu a devolução
        await window.api.addHistorico('valor', id, 'Devolveu', { ...armarios[id], devolvido_a: devolverPara });
        
        // Limpa UI
        delete armarios[id];
        criarArmarios();
    } catch (e) {
        console.error(e);
        alert('Erro ao devolver.');
    }
  };

  window.historicoValor = async (id) => {
    try {
        const historico = await window.api.getHistorico('valor', id);
        
        if (!historico || historico.length === 0) {
            alert('Nenhum histórico encontrado.');
            return;
        }

        const modal = document.getElementById('modal-historico');
        const texto = document.getElementById('historico-texto');
        
        let conteudo = `Histórico de Valores - Armário ${id}:\n\n`;
        historico.forEach(h => {
            const det = JSON.parse(h.detalhes);
            const dataFormatada = new Date(h.data).toLocaleString('pt-BR');
            conteudo += `[${dataFormatada}] - ${h.acao.toUpperCase()}\n`;
            conteudo += `Nome: ${det.nome || '-'} | Pront: ${det.prontuario || '-'}\n`;
            conteudo += `Itens: ${det.itens || '-'}\n`;
            if (det.devolvido_a) conteudo += `Devolvido a: ${det.devolvido_a}\n`;
            conteudo += `--------------------------\n`;
        });

        texto.textContent = conteudo;
        modal.style.display = 'block';
    } catch (e) {
        console.error(e);
        alert('Erro ao buscar histórico.');
    }
  };

  window.exportarValores = () => {
    const dados = [];
    for (let i = 1; i <= 300; i++) {
        const nome = document.getElementById(`nome-valor-${i}`)?.value;
        if (nome) {
            dados.push({
                Armário: i,
                Nome: nome,
                Prontuário: document.getElementById(`prontuario-valor-${i}`)?.value,
                Itens: document.getElementById(`itens-valor-${i}`)?.value,
                Status: 'Guardado'
            });
        }
    }
    if (dados.length === 0) return alert("Nada para exportar.");
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Valores");
    XLSX.writeFile(wb, "Pertences_Valor.xlsx");
  };

  // ADICIONADO: Função de filtro que faltava
  window.filtrarValores = () => {
    const filtro = document.getElementById('search-valores').value.toLowerCase().trim();
    for (let i = 1; i <= 300; i++) {
        const div = document.getElementById(`valor-${i}`);
        if (!div) continue;

        const nome = (document.getElementById(`nome-valor-${i}`)?.value || '').toLowerCase();
        const prontuario = (document.getElementById(`prontuario-valor-${i}`)?.value || '').toLowerCase();
        
        if (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) {
            div.style.display = 'flex';
        } else {
            div.style.display = 'none';
        }
    }
  };

  criarArmarios();
});

// urgencia.js (Setor de Urgência)
document.addEventListener('DOMContentLoaded', async () => {
    const armariosGrid = document.getElementById('urgencia-grid');
    
    // 1. Carregar dados do Banco de Dados
    const dadosBanco = await window.api.getArmarios(); 
    const armarios = {};
    dadosBanco.forEach(row => {
        armarios[row.id] = row;
    });

    // 2. Criar Grade de Armários (Urgência)
    for (let i = 1; i <= 300; i++) {
        const armario = document.createElement('div');
        armario.classList.add('armario');
        armario.id = `armario-urgencia-${i}`; // ID de elemento único
        
        armario.innerHTML = `
            <h3>Urgência - Armário ${i}</h3>
            <div class="inputs">
                <input type="text" id="nome-urgencia-${i}" placeholder="Nome do Paciente" autocomplete="off">
                <input type="text" id="prontuario-urgencia-${i}" placeholder="Nº do Prontuário" autocomplete="off">
                <input type="text" id="objetos-urgencia-${i}" placeholder="Objetos no Armário" autocomplete="off">
                <input type="text" id="recebido-urgencia-${i}" placeholder="Devolvido a">
            </div>
            <div class="botoes">
                <button onclick="window.mudarStatusUrgencia(${i}, 'emprestado')">🔄 Em Uso</button>
                <button onclick="window.mudarStatusUrgencia(${i}, 'devolvido-total')">✔️ Devolvido</button>
                <button onclick="window.consultarHistoricoUrgencia(${i})">📜 Histórico</button>
            </div>
        `;

        armariosGrid.appendChild(armario);

        // Preencher dados se existirem no banco e forem 'emprestado'
        if (armarios[i] && armarios[i].status === 'emprestado') {
            document.getElementById(`nome-urgencia-${i}`).value = armarios[i].nome || '';
            document.getElementById(`prontuario-urgencia-${i}`).value = armarios[i].prontuario || '';
            document.getElementById(`objetos-urgencia-${i}`).value = armarios[i].objetos || '';
            document.getElementById(`recebido-urgencia-${i}`).value = armarios[i].recebido_por || '';
            armario.classList.add('emprestado');
        } else if (armarios[i] && armarios[i].status === 'devolvido-total') {
            // Opcional: mostrar últimos dados ou manter limpo
            armario.classList.add('devolvido-total');
        }
    }

    // 3. Função Global para mudar status (Nome alterado para evitar conflito)
    window.mudarStatusUrgencia = async (id, status) => {
        const nome = document.getElementById(`nome-urgencia-${id}`).value.trim();
        const prontuario = document.getElementById(`prontuario-urgencia-${id}`).value.trim();
        const objetos = document.getElementById(`objetos-urgencia-${id}`).value.trim();
        const recebido = document.getElementById(`recebido-urgencia-${id}`).value.trim();

        // Validação básica
        if (status === 'emprestado' && (!nome || !prontuario || !objetos)) {
            alert('Preencha Nome, Prontuário e Objetos.');
            return;
        }
        if (status === 'devolvido-total' && !recebido) {
            alert('Informe quem recebeu a devolução.');
            return;
        }

        // Objeto de dados
        const dadosArmario = {
            id: id,
            nome,
            prontuario,
            objetos,
            recebido: recebido,
            status,
            data: new Date().toISOString()
        };

        try {
            // Salva no SQLite
            await window.api.saveArmario(dadosArmario);
            
            // IMPORTANTE: Salvando com o tipo 'urgencia' no histórico
            await window.api.addHistorico('urgencia', id, status === 'emprestado' ? 'Empréstimo' : 'Devolução', dadosArmario);

            // Atualiza UI
            const el = document.getElementById(`armario-urgencia-${id}`);
            el.className = 'armario ' + status;
            
            if (status === 'devolvido-total') {
                document.getElementById(`nome-urgencia-${id}`).value = '';
                document.getElementById(`prontuario-urgencia-${id}`).value = '';
                document.getElementById(`objetos-urgencia-${id}`).value = '';
                document.getElementById(`recebido-urgencia-${id}`).value = '';
            }
            
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar no banco de dados.');
        }
    };

    // 4. Consulta de Histórico (Filtra por 'urgencia')
    window.consultarHistoricoUrgencia = async (id) => {
        try {
            const historico = await window.api.getHistorico('urgencia', id);
            
            if (!historico || historico.length === 0) {
                alert('Nenhum histórico encontrado para este armário na Urgência.');
                return;
            }

            const modal = document.getElementById('modal-historico');
            const texto = document.getElementById('historico-texto');
            
            let conteudo = `Histórico Urgência - Armário ${id}:\n\n`;
            historico.forEach(h => {
                const det = JSON.parse(h.detalhes);
                const dataFormatada = new Date(h.data).toLocaleString('pt-BR');
                conteudo += `[${dataFormatada}] - ${h.acao.toUpperCase()}\n`;
                conteudo += `Nome: ${det.nome || '-'} | Pront: ${det.prontuario || '-'}\n`;
                if(det.recebido) conteudo += `Recebido por: ${det.recebido}\n`;
                conteudo += `--------------------------\n`;
            });

            texto.textContent = conteudo;
            modal.style.display = 'block';
        } catch (e) {
            console.error(e);
            alert('Erro ao buscar histórico.');
        }
    };

    // Fechar modal (igual ao seu original)
    document.querySelector('.close').onclick = () => document.getElementById('modal-historico').style.display = 'none';
    window.onclick = (event) => {
        if (event.target == document.getElementById('modal-historico')) {
            document.getElementById('modal-historico').style.display = 'none';
        }
    };

    // 5. Filtro de Busca exclusivo para Urgência
    window.filtrarArmariosUrgencia = () => {
        const filtro = document.getElementById('search-urgencia').value.toLowerCase().trim();
        for (let i = 1; i <= 300; i++) {
            const nome = (document.getElementById(`nome-urgencia-${i}`)?.value || '').toLowerCase();
            const prontuario = (document.getElementById(`prontuario-urgencia-${i}`)?.value || '').toLowerCase();
            const div = document.getElementById(`armario-urgencia-${i}`);
            
            if (div) {
                div.style.display = (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) ? 'flex' : 'none';
            }
        }
    };

//Exportação (Recuperando dados da tela para o Excel)
window.exportarDados = async () => {
    const dados = [];
    
    // Varre os inputs da tela (que já estão sincronizados com o banco ao carregar)
    for (let i = 1; i <= 300; i++) {
        const nome = document.getElementById(`nome-urgencia-${i}`)?.value;
        const prontuario = document.getElementById(`prontuario-urgencia-${i}`)?.value;
        const status = document.getElementById(`armario-urgencia-${i}`)?.classList.contains('emprestado') ? 'Em Uso' : 'Livre';
        
        if (nome || prontuario) {
            dados.push({ Armário: i, Nome: nome, Prontuário: prontuario, Status: status });
        }
    }

    if (dados.length === 0) return alert("Nada para exportar.");

    // Usa a biblioteca XLSX já importada no HTML
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Armários");
    XLSX.writeFile(wb, "Controle_Armarios_URGENCIA.xlsx");
};

});
// script.js (Armários Padrão)
document.addEventListener('DOMContentLoaded', async () => {
    const armariosGrid = document.getElementById('armarios-grid');
    
    // 1. Carregar dados do Banco de Dados (SQLite) via API
    // Transforma o array do banco em um objeto para fácil acesso
    const dadosBanco = await window.api.getArmarios(); 
    const armarios = {};
    dadosBanco.forEach(row => {
        armarios[row.id] = row;
    });

    // 2. Criar Grade de Armários
    for (let i = 1; i <= 300; i++) {
        const armario = document.createElement('div');
        armario.classList.add('armario');
        armario.id = `armario-${i}`;
        
        // HTML structure (mantido o seu)
        armario.innerHTML = `
            <h3>Armário ${i}</h3>
            <div class="inputs">
                <input type="text" id="nome-${i}" placeholder="Nome do Paciente" autocomplete="off">
                <input type="text" id="prontuario-${i}" placeholder="Nº do Prontuário" autocomplete="off">
                <input type="text" id="objetos-${i}" placeholder="Objetos no Armário" autocomplete="off">
                <input type="text" id="recebido-${i}" placeholder="Devolvido a">
            </div>
            <div class="botoes">
                <button onclick="window.mudarStatus(${i}, 'emprestado')">🔄 Em Uso</button>
                <button onclick="window.mudarStatus(${i}, 'devolvido-total')">✔️ Devolvido</button>
                <button onclick="window.consultarHistorico(${i})">📜 Histórico</button>
            </div>
        `;

        armariosGrid.appendChild(armario);

        // Preencher dados se existirem no banco
        if (armarios[i] && armarios[i].status === 'emprestado') {
            document.getElementById(`nome-${i}`).value = armarios[i].nome || '';
            document.getElementById(`prontuario-${i}`).value = armarios[i].prontuario || '';
            document.getElementById(`objetos-${i}`).value = armarios[i].objetos || '';
            document.getElementById(`recebido-${i}`).value = armarios[i].recebido_por || ''; // Note a mudança de chave
            armario.classList.add('emprestado');
        } else if (armarios[i] && armarios[i].status === 'devolvido-total') {
            // Opcional: mostrar últimos dados ou manter limpo
            armario.classList.add('devolvido-total');
        }
    }

    // 3. Função Global para mudar status
    window.mudarStatus = async (id, status) => {
        const nome = document.getElementById(`nome-${id}`).value.trim();
        const prontuario = document.getElementById(`prontuario-${id}`).value.trim();
        const objetos = document.getElementById(`objetos-${id}`).value.trim();
        const recebido = document.getElementById(`recebido-${id}`).value.trim();

        // Validação básica
        if (status === 'emprestado' && (!nome || !prontuario || !objetos)) {
            alert('Preencha Nome, Prontuário e Objetos para emprestar.');
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
            recebido: recebido, // map to 'recebido_por' no backend
            status,
            data: new Date().toISOString()
        };

        try {
            // Salva no SQLite
            await window.api.saveArmario(dadosArmario);
            
            // Salva no Histórico SQLite
            await window.api.addHistorico('padrao', id, status === 'emprestado' ? 'Empréstimo' : 'Devolução', dadosArmario);

            // Atualiza UI
            const el = document.getElementById(`armario-${id}`);
            el.className = 'armario ' + status; // Remove outras classes e add a nova
            
            if (status === 'devolvido-total') {
                // Limpar campos visuais se devolvido? Normalmente sim.
                document.getElementById(`nome-${id}`).value = '';
                document.getElementById(`prontuario-${id}`).value = '';
                document.getElementById(`objetos-${id}`).value = '';
                document.getElementById(`recebido-${id}`).value = '';
            }
            
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar no banco de dados.');
        }
    };

    // 4. Consulta de Histórico via SQLite
    window.consultarHistorico = async (id) => {
        try {
            const historico = await window.api.getHistorico('padrao', id);
            
            if (!historico || historico.length === 0) {
                alert('Nenhum histórico encontrado.');
                return;
            }

            const modal = document.getElementById('modal-historico');
            const texto = document.getElementById('historico-texto');
            
            let conteudo = `Histórico Armário ${id}:\n\n`;
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

    // 1. Filtro de Busca
window.filtrarArmarios = () => {
    const filtro = document.getElementById('search').value.toLowerCase().trim();
    for (let i = 1; i <= 300; i++) {
        const nome = (document.getElementById(`nome-${i}`)?.value || '').toLowerCase();
        const prontuario = (document.getElementById(`prontuario-${i}`)?.value || '').toLowerCase();
        const div = document.getElementById(`armario-${i}`);
        
        if (div) {
            // Se filtro vazio, mostra tudo. Se não, busca nome ou prontuário
            div.style.display = (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) ? 'flex' : 'none';
        }
    }
};

// 2. Exportação (Recuperando dados da tela para o Excel)
window.exportarDados = async () => {
    const dados = [];
    
    // Varre os inputs da tela (que já estão sincronizados com o banco ao carregar)
    for (let i = 1; i <= 300; i++) {
        const nome = document.getElementById(`nome-${i}`)?.value;
        const prontuario = document.getElementById(`prontuario-${i}`)?.value;
        const status = document.getElementById(`armario-${i}`)?.classList.contains('emprestado') ? 'Em Uso' : 'Livre';
        
        if (nome || prontuario) {
            dados.push({ Armário: i, Nome: nome, Prontuário: prontuario, Status: status });
        }
    }

    if (dados.length === 0) return alert("Nada para exportar.");

    // Usa a biblioteca XLSX já importada no HTML
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Armários");
    XLSX.writeFile(wb, "Controle_Armarios.xlsx");
};

});


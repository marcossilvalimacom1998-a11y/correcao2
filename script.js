// script.js - Controle de Armários (Recepção Principal)
document.addEventListener('DOMContentLoaded', async () => {
    const armariosGrid = document.getElementById('armarios-grid');
    
    // 1. Carregar dados do Banco de Dados com tratamento de erro
    const response = await window.api.getArmarios(); 
    const armarios = {};
    
    if (response.success) {
        response.data.forEach(row => {
            armarios[row.id] = row;
        });
    } else {
        console.error("Erro ao carregar armários:", response.error);
        alert("Aviso: Não foi possível carregar os dados do banco.");
    }

    // 2. Criar Grade de Armários (300 unidades)
    const fragment = document.createDocumentFragment(); // Otimização de performance
    for (let i = 1; i <= 300; i++) {
        const armario = document.createElement('div');
        armario.classList.add('armario');
        armario.id = `armario-${i}`;
        
        const dados = armarios[i] || {};
        const isEmprestado = dados.status === 'emprestado';

        armario.innerHTML = `
            <h3>Armário ${i}</h3>
            <div class="inputs">
                <input type="text" id="nome-${i}" placeholder="Nome do Paciente" autocomplete="off" value="${isEmprestado ? (dados.nome || '') : ''}">
                <input type="text" id="prontuario-${i}" placeholder="Nº do Prontuário" autocomplete="off" value="${isEmprestado ? (dados.prontuario || '') : ''}">
                <input type="text" id="objetos-${i}" placeholder="Objetos no Armário" autocomplete="off" value="${isEmprestado ? (dados.objetos || '') : ''}">
                <input type="text" id="recebido-${i}" placeholder="Devolvido a" value="${isEmprestado ? (dados.recebido_por || '') : ''}">
            </div>
            <div class="botoes">
                <button onclick="window.mudarStatus(${i}, 'emprestado')">🔄 Em Uso</button>
                <button onclick="window.mudarStatus(${i}, 'devolvido-total')">✔️ Devolvido</button>
                <button onclick="window.consultarHistorico(${i})">📜 Histórico</button>
            </div>
        `;

        if (isEmprestado) armario.classList.add('emprestado');
        fragment.appendChild(armario);
    }
    armariosGrid.appendChild(fragment);

    // 3. Função Global para mudar status (Sincronizada com Database Robusto)
    window.mudarStatus = async (id, status) => {
        const payload = {
            id: id,
            nome: document.getElementById(`nome-${id}`).value.trim(),
            prontuario: document.getElementById(`prontuario-${id}`).value.trim(),
            objetos: document.getElementById(`objetos-${id}`).value.trim(),
            recebido: document.getElementById(`recebido-${id}`).value.trim(),
            status: status,
            data: new Date().toISOString()
        };

        // Validações
        if (status === 'emprestado' && (!payload.nome || !payload.prontuario || !payload.objetos)) {
            alert('Erro: Nome, Prontuário e Objetos são obrigatórios para empréstimo.');
            return;
        }
        if (status === 'devolvido-total' && !payload.recebido) {
            alert('Erro: Informe quem recebeu a devolução.');
            return;
        }

        try {
            // No banco robusto, saveArmario já trata o Histórico automaticamente por transação
            const result = await window.api.saveArmario(payload);
            
            if (result.success) {
                const el = document.getElementById(`armario-${id}`);
                el.className = 'armario ' + (status === 'emprestado' ? 'emprestado' : '');
                
                if (status === 'devolvido-total') {
                    // Limpar campos visuais após devolução
                    ['nome-', 'prontuario-', 'objetos-', 'recebido-'].forEach(p => {
                        document.getElementById(p + id).value = '';
                    });
                    alert(`Armário ${id} liberado com sucesso!`);
                } else {
                    alert(`Armário ${id} registrado: Em Uso.`);
                }
            } else {
                alert("Erro ao salvar: " + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Erro crítico na comunicação com o banco.');
        }
    };

    // 4. Consulta de Histórico
    window.consultarHistorico = async (id) => {
        const response = await window.api.getHistorico('padrao', id);
        
        if (!response.success || response.data.length === 0) {
            alert('Nenhum histórico encontrado para o armário ' + id);
            return;
        }

        const modal = document.getElementById('modal-historico');
        const texto = document.getElementById('historico-texto');
        
        let conteudo = `HISTÓRICO - ARMÁRIO ${id}\n\n`;
        response.data.forEach(h => {
            const det = JSON.parse(h.detalhes);
            const dataF = new Date(h.data).toLocaleString('pt-BR');
            conteudo += `[${dataF}] ${h.acao.toUpperCase()}\n`;
            conteudo += `Paciente: ${det.nome || '-'} | Pront: ${det.prontuario || '-'}\n`;
            if(det.recebido) conteudo += `Responsável pela devolução: ${det.recebido}\n`;
            conteudo += `--------------------------\n`;
        });

        texto.textContent = conteudo;
        modal.style.display = 'block';
    };

    // Fechar Modal
    document.querySelector('.close').onclick = () => document.getElementById('modal-historico').style.display = 'none';
    window.onclick = (e) => { if (e.target.id === 'modal-historico') e.target.style.display = 'none'; };

    // Filtro de Busca
    window.filtrarArmarios = () => {
        const filtro = document.getElementById('search').value.toLowerCase().trim();
        for (let i = 1; i <= 300; i++) {
            const nome = (document.getElementById(`nome-${i}`)?.value || '').toLowerCase();
            const prontuario = (document.getElementById(`prontuario-${i}`)?.value || '').toLowerCase();
            const div = document.getElementById(`armario-${i}`);
            if (div) {
                div.style.display = (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) ? 'flex' : 'none';
            }
        }
    };

    // Exportação Excel
    window.exportarDados = () => {
        const dados = [];
        for (let i = 1; i <= 300; i++) {
            const nome = document.getElementById(`nome-${i}`)?.value;
            if (nome) {
                dados.push({
                    Armário: i,
                    Nome: nome,
                    Prontuário: document.getElementById(`prontuario-${i}`)?.value,
                    Status: document.getElementById(`armario-${i}`).classList.contains('emprestado') ? 'Em Uso' : 'Liberado'
                });
            }
        }
        if (dados.length === 0) return alert("Não há dados para exportar.");
        const ws = XLSX.utils.json_to_sheet(dados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Recepção Principal");
        XLSX.writeFile(wb, "Controle_Armarios_Principal.xlsx");
    };
});

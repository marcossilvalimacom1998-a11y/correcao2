// database.js (VERSÃO COMPLETA E ROBUSTA)
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = process.env.NODE_ENV === 'development' 
  ? 'armarios.db' 
  : path.join(app.getPath('userData'), 'armarios.db');

const db = new Database(dbPath);

function inicializarBancoDeDados() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS armarios (
          id INTEGER PRIMARY KEY,
          nome TEXT,
          prontuario TEXT,
          objetos TEXT,
          recebido_por TEXT,
          status TEXT,
          data_atualizacao TEXT
      );

      CREATE TABLE IF NOT EXISTS historico (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo_armario TEXT, 
          armario_id INTEGER,
          data TEXT,
          acao TEXT, 
          detalhes TEXT 
      );
      
      CREATE TABLE IF NOT EXISTS itens_esquecidos (
          id INTEGER PRIMARY KEY,
          nome TEXT,
          prontuario TEXT,
          itens TEXT,
          data_guardado INTEGER,
          status TEXT
      );
      
      CREATE TABLE IF NOT EXISTS armarios_valores (
          id INTEGER PRIMARY KEY,
          nome TEXT,
          prontuario TEXT,
          itens TEXT,
          devolver_para TEXT,
          status TEXT,
          data_registro INTEGER
      );
    `);
    console.log('Banco de dados pronto.');
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
  }
}

// Auxiliar para respostas padronizadas
const response = (success, data = null, error = null) => ({ success, data, error });

// Transação para Armários Padrão (Salva dado + Histórico juntos)
const saveArmarioTransaction = db.transaction((data) => {
  db.prepare(`
    INSERT OR REPLACE INTO armarios (id, nome, prontuario, objetos, recebido_por, status, data_atualizacao)
    VALUES (@id, @nome, @prontuario, @objetos, @recebido, @status, @data)
  `).run(data);
  
  db.prepare(`INSERT INTO historico (tipo_armario, armario_id, data, acao, detalhes) VALUES (?, ?, ?, ?, ?)`)
    .run('padrao', data.id, new Date().toISOString(), data.status === 'emprestado' ? 'Empréstimo' : 'Devolução', JSON.stringify(data));
});

module.exports = {
  inicializarBancoDeDados,

  // Armários Padrão
  getArmariosPadrao: () => {
    try { return response(true, db.prepare('SELECT * FROM armarios').all()); }
    catch (e) { return response(false, null, e.message); }
  },
  saveArmario: (data) => {
    try { saveArmarioTransaction(data); return response(true); }
    catch (e) { return response(false, null, e.message); }
  },

  // Histórico Genérico (USADO POR VALORES E ESQUECIDOS)
  registrarHistorico: (tipo, id, acao, detalhes) => {
    try {
      db.prepare(`INSERT INTO historico (tipo_armario, armario_id, data, acao, detalhes) VALUES (?, ?, ?, ?, ?)`)
        .run(tipo, id, new Date().toISOString(), acao, JSON.stringify(detalhes));
      return response(true);
    } catch (e) { return response(false, null, e.message); }
  },
  getHistorico: (tipo, id) => {
    try { return response(true, db.prepare('SELECT * FROM historico WHERE tipo_armario = ? AND armario_id = ? ORDER BY data DESC').all(tipo, id)); }
    catch (e) { return response(false, null, e.message); }
  },

  // Valores
  getValores: () => {
    try { return response(true, db.prepare('SELECT * FROM armarios_valores').all()); }
    catch (e) { return response(false, null, e.message); }
  },
  saveValor: (data) => {
    try {
      if (data.status === 'devolvido') {
        db.prepare(`UPDATE armarios_valores SET status = 'devolvido', devolver_para = ? WHERE id = ?`).run(data.devolver, data.id);
      } else {
        db.prepare(`INSERT OR REPLACE INTO armarios_valores (id, nome, prontuario, itens, devolver_para, status, data_registro) VALUES (@id, @nome, @prontuario, @itens, '', 'guardado', @data)`).run(data);
      }
      return response(true);
    } catch (e) { return response(false, null, e.message); }
  },

  // Esquecidos
  getEsquecidos: () => {
    try { return response(true, db.prepare('SELECT * FROM itens_esquecidos').all()); }
    catch (e) { return response(false, null, e.message); }
  },
  saveEsquecido: (data) => {
    try {
      db.prepare(`INSERT OR REPLACE INTO itens_esquecidos (id, nome, prontuario, itens, data_guardado, status) VALUES (@id, @nome, @prontuario, @itens, @data, 'ativo')`).run(data);
      return response(true);
    } catch (e) { return response(false, null, e.message); }
  },
  deleteEsquecido: (id) => {
    try { db.prepare('DELETE FROM itens_esquecidos WHERE id = ?').run(id); return response(true); }
    catch (e) { return response(false, null, e.message); }
  }
};
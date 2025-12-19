// database.js
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Garante que o banco fique salvo na pasta de dados do usuário (mais seguro para builds)
const dbPath = process.env.NODE_ENV === 'development' 
  ? 'armarios.db' 
  : path.join(app.getPath('userData'), 'armarios.db');

const db = new Database(dbPath); // verbose removido para produção

function inicializarBancoDeDados() {
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
        tipo_armario TEXT, -- 'padrao', 'tempo', 'valor', 'esquecido'
        armario_id INTEGER,
        data TEXT,
        acao TEXT, -- 'emprestou', 'devolveu', 'guardou'
        detalhes TEXT -- JSON stringificado com os dados
    );
    
    -- Tabela unificada para Itens Esquecidos (exemplo de otimização)
    CREATE TABLE IF NOT EXISTS itens_esquecidos (
        id INTEGER PRIMARY KEY,
        nome TEXT,
        prontuario TEXT,
        itens TEXT,
        data_guardado INTEGER, -- Timestamp é melhor para cálculos
        status TEXT
    );
    
    -- Tabela para Valores
    CREATE TABLE IF NOT EXISTS armarios_valores (
        id INTEGER PRIMARY KEY,
        nome TEXT,
        prontuario TEXT,
        itens TEXT,
        devolver_para TEXT,
        status TEXT,
        data_registro INTEGER
    );

    -- Tabela para Temporizados
    CREATE TABLE IF NOT EXISTS armarios_temporizados (
        id INTEGER PRIMARY KEY,
        nome TEXT,
        prontuario TEXT,
        status TEXT,
        inicio_timestamp INTEGER
    );
  `);
  console.log('Banco de dados conectado em:', dbPath);
}

// --- Funções CRUD Genéricas para Robustez ---

// Armários Padrão
function getArmariosPadrao() {
  return db.prepare('SELECT * FROM armarios').all();
}

function saveArmarioPadrao(id, data) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO armarios (id, nome, prontuario, objetos, recebido_por, status, data_atualizacao)
    VALUES (@id, @nome, @prontuario, @objetos, @recebido, @status, @data)
  `);
  return stmt.run(data);
}

// Histórico (Unificado para ser mais fácil gerenciar)
function registrarHistorico(tipo, id, acao, detalhes) {
  const stmt = db.prepare(`
    INSERT INTO historico (tipo_armario, armario_id, data, acao, detalhes)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(tipo, id, new Date().toISOString(), acao, JSON.stringify(detalhes));
}

function getHistorico(tipo, id) {
  return db.prepare('SELECT * FROM historico WHERE tipo_armario = ? AND armario_id = ? ORDER BY data DESC').all(tipo, id);
}

// Temporizados
function getTemporizados() {
  return db.prepare('SELECT * FROM armarios_temporizados').all();
}
function saveTemporizado(data) {
    // Se status for devolvido, deletamos ou atualizamos. Aqui vou manter o registro mas mudar status.
    if(data.status === 'devolvido') {
        return db.prepare('DELETE FROM armarios_temporizados WHERE id = ?').run(data.id);
    }
    const stmt = db.prepare(`INSERT OR REPLACE INTO armarios_temporizados (id, nome, prontuario, status, inicio_timestamp) VALUES (@id, @nome, @prontuario, @status, @timestamp)`);
    return stmt.run(data);
}

// --- PERTENCES DE VALOR ---
function getValores() {
  return db.prepare('SELECT * FROM armarios_valores').all();
}

function saveValor(data) {
  // Se for devolução, podemos optar por remover da tabela ativa ou apenas marcar status
  if (data.status === 'devolvido') {
      const stmt = db.prepare(`
        UPDATE armarios_valores 
        SET status = 'devolvido', devolver_para = @devolver 
        WHERE id = @id
      `);
      return stmt.run({ id: data.id, devolver: data.devolver });
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO armarios_valores (id, nome, prontuario, itens, devolver_para, status, data_registro)
    VALUES (@id, @nome, @prontuario, @itens, '', 'guardado', @data)
  `);
  return stmt.run(data);
}

// --- ITENS ESQUECIDOS ---
function getEsquecidos() {
  return db.prepare('SELECT * FROM itens_esquecidos').all();
}

function saveEsquecido(data) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO itens_esquecidos (id, nome, prontuario, itens, data_guardado, status)
    VALUES (@id, @nome, @prontuario, @itens, @data, 'ativo')
  `);
  return stmt.run(data);
}

function deleteEsquecido(id) {
  return db.prepare('DELETE FROM itens_esquecidos WHERE id = ?').run(id);
}

// Exportar todas as funções necessárias
module.exports = {
  inicializarBancoDeDados,
  getArmariosPadrao,
  saveArmarioPadrao,
  registrarHistorico,
  getHistorico,
  getTemporizados,
  saveTemporizado,
  getValores,
  saveValor,
  getEsquecidos,
  saveEsquecido,
  deleteEsquecido,
  db // Exportamos o DB cru apenas se precisar de queries manuais rápidas, mas evite usar no front
};
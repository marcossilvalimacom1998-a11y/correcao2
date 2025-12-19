const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dbManager = require('./database'); // Importa nosso novo arquivo

// Inicializa o banco ao abrir o app
dbManager.inicializarBancoDeDados();

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'), // Corrigido nome do ícone
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Segurança: Mantenha false
      contextIsolation: true  // Segurança: Mantenha true
    }
  });

  win.loadFile('controle-armario.html');
}

app.whenReady().then(() => {
  // --- IPC Handlers (Comunicação Front <-> Back) ---
  
  // Padrão
  ipcMain.handle('get-armarios', () => dbManager.getArmariosPadrao());
  ipcMain.handle('save-armario', (event, data) => dbManager.saveArmarioPadrao(data.id, data));
  
  // Histórico
  ipcMain.handle('add-historico', (event, {tipo, id, acao, detalhes}) => dbManager.registrarHistorico(tipo, id, acao, detalhes));
  ipcMain.handle('get-historico', (event, {tipo, id}) => dbManager.getHistorico(tipo, id));

  // Temporizados
  ipcMain.handle('get-temporizados', () => dbManager.getTemporizados());
  ipcMain.handle('save-temporizado', (event, data) => dbManager.saveTemporizado(data));

  // --- Valores ---
  ipcMain.handle('get-valores', () => dbManager.getValores());
  ipcMain.handle('save-valor', (event, data) => dbManager.saveValor(data));

  // --- Esquecidos ---
  ipcMain.handle('get-esquecidos', () => dbManager.getEsquecidos());
  ipcMain.handle('save-esquecido', (event, data) => dbManager.saveEsquecido(data));
  ipcMain.handle('delete-esquecido', (event, id) => dbManager.deleteEsquecido(id));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Armários Padrão
    getArmarios: () => ipcRenderer.invoke('get-armarios'),
    saveArmario: (data) => ipcRenderer.invoke('save-armario', data),
    
    // Histórico Global
    addHistorico: (tipo, id, acao, detalhes) => ipcRenderer.invoke('add-historico', {tipo, id, acao, detalhes}),
    getHistorico: (tipo, id) => ipcRenderer.invoke('get-historico', {tipo, id}),

    // Temporizados
    getTemporizados: () => ipcRenderer.invoke('get-temporizados'),
    saveTemporizado: (data) => ipcRenderer.invoke('save-temporizado', data),

    // Valores
    getValores: () => ipcRenderer.invoke('get-valores'),
    saveValor: (data) => ipcRenderer.invoke('save-valor', data),

    // Esquecidos
    getEsquecidos: () => ipcRenderer.invoke('get-esquecidos'),
    saveEsquecido: (data) => ipcRenderer.invoke('save-esquecido', data),
    deleteEsquecido: (id) => ipcRenderer.invoke('delete-esquecido', id)


});

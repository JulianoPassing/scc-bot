const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'auto-atendimento',
  description: 'Sistema de auto-atendimento com fluxos automatizados para Limbo e Guincho',
  enabled: true,
  
  async initialize(client) {
    console.log('[Auto-Atendimento] Módulo inicializado');
  }
};


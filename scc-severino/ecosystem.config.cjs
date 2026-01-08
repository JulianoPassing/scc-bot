module.exports = {
  apps: [{
    name: 'scc-severino',
    script: 'index.js',
    
    // Reinício automático
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Reiniciar em caso de crash
    restart_delay: 5000, // Espera 5 segundos antes de reiniciar
    max_restarts: 10, // Máximo de 10 reinícios em sequência
    min_uptime: '10s', // Se rodar menos de 10s, conta como crash
    
    // Variáveis de ambiente
    env: {
      NODE_ENV: 'production'
    },
    
    // Logs
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    
    // Ignorar arquivos de dados nos logs
    ignore_watch: ['node_modules', 'logs', '*.json']
  }]
};

const path = require('path');

module.exports = {
    name: 'drogas',
    description: 'Módulo para monitorar logs de drogas e verificar cargos dos usuários',
    
    load: function(client) {
        try {
            const modulePath = path.join(__dirname, 'index.js');
            const module = require(modulePath);
            
            if (module && typeof module.init === 'function') {
                module.init(client);
                console.log(`✅ Módulo ${this.name} carregado com sucesso!`);
                return true;
            } else {
                console.error(`❌ Erro ao carregar módulo ${this.name}: função init não encontrada`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Erro ao carregar módulo ${this.name}:`, error);
            return false;
        }
    },
    
    unload: function(client) {
        try {
            // Remover listeners específicos do módulo se necessário
            console.log(`✅ Módulo ${this.name} descarregado com sucesso!`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao descarregar módulo ${this.name}:`, error);
            return false;
        }
    }
};

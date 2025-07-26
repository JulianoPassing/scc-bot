/**
 * Gerenciador de cooldown para o sistema de tickets
 */
export class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Verifica se um usuário está em cooldown
   * @param {string} userId - ID do usuário
   * @param {number} cooldownTime - Tempo de cooldown em milissegundos
   * @returns {number|null} - Tempo restante em segundos ou null se não estiver em cooldown
   */
  checkCooldown(userId, cooldownTime = 5000) {
    const key = `ticket_cooldown_${userId}`;
    const lastTime = this.cooldowns.get(key);
    
    if (!lastTime) return null;
    
    const timeLeft = lastTime + cooldownTime - Date.now();
    if (timeLeft <= 0) {
      this.cooldowns.delete(key);
      return null;
    }
    
    return Math.ceil(timeLeft / 1000);
  }

  /**
   * Define um cooldown para um usuário
   * @param {string} userId - ID do usuário
   * @param {number} cooldownTime - Tempo de cooldown em milissegundos
   */
  setCooldown(userId, cooldownTime = 5000) {
    const key = `ticket_cooldown_${userId}`;
    this.cooldowns.set(key, Date.now());
    
    // Limpar cooldown após o tempo especificado
    setTimeout(() => {
      this.cooldowns.delete(key);
    }, cooldownTime);
  }

  /**
   * Remove o cooldown de um usuário
   * @param {string} userId - ID do usuário
   */
  removeCooldown(userId) {
    const key = `ticket_cooldown_${userId}`;
    this.cooldowns.delete(key);
  }

  /**
   * Limpa todos os cooldowns
   */
  clearAllCooldowns() {
    this.cooldowns.clear();
  }

  /**
   * Obtém estatísticas dos cooldowns ativos
   * @returns {Object} - Estatísticas dos cooldowns
   */
  getStats() {
    return {
      activeCooldowns: this.cooldowns.size,
      totalUsers: new Set([...this.cooldowns.keys()].map(key => key.replace('ticket_cooldown_', ''))).size
    };
  }
}

// Instância global do gerenciador de cooldown
export const cooldownManager = new CooldownManager(); 
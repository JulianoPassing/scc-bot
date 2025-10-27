// Gerenciador de estados de conversação para auto-atendimento
class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  /**
   * Cria uma nova conversação
   * @param {string} channelId - ID do canal do ticket
   * @param {string} userId - ID do usuário
   * @param {string} type - Tipo de atendimento (limbo/guincho)
   */
  createConversation(channelId, userId, type) {
    this.conversations.set(channelId, {
      userId,
      type,
      step: 'initial', // initial, waiting_description, waiting_print, waiting_id, waiting_id_plate, waiting_alive_check, waiting_verification
      data: {},
      createdAt: new Date()
    });
  }

  /**
   * Obtém uma conversação
   * @param {string} channelId - ID do canal
   * @returns {Object|null} Dados da conversação
   */
  getConversation(channelId) {
    return this.conversations.get(channelId) || null;
  }

  /**
   * Atualiza o passo da conversação
   * @param {string} channelId - ID do canal
   * @param {string} step - Novo passo
   * @param {Object} data - Dados adicionais
   */
  updateStep(channelId, step, data = {}) {
    const conversation = this.conversations.get(channelId);
    if (conversation) {
      conversation.step = step;
      conversation.data = { ...conversation.data, ...data };
    }
  }

  /**
   * Remove uma conversação
   * @param {string} channelId - ID do canal
   */
  removeConversation(channelId) {
    this.conversations.delete(channelId);
  }

  /**
   * Verifica se existe conversação ativa no canal
   * @param {string} channelId - ID do canal
   * @returns {boolean}
   */
  hasConversation(channelId) {
    return this.conversations.has(channelId);
  }

  /**
   * Limpa conversações antigas (mais de 24 horas)
   */
  cleanOldConversations() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [channelId, conversation] of this.conversations.entries()) {
      if (now - conversation.createdAt > maxAge) {
        this.conversations.delete(channelId);
      }
    }
  }
}

// Singleton instance
const conversationManager = new ConversationManager();

// Limpa conversações antigas a cada hora
setInterval(() => {
  conversationManager.cleanOldConversations();
}, 60 * 60 * 1000);

export default conversationManager;


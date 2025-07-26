import { CATEGORY_CONFIG } from '../config.js';

/**
 * Verifica se um canal é um ticket válido
 * @param {string} channelName - Nome do canal
 * @returns {boolean} True se for um ticket válido
 */
export function isValidTicketChannel(channelName) {
  return Object.values(CATEGORY_CONFIG).some(config => 
    channelName.startsWith(config.emoji)
  );
}

/**
 * Obtém a categoria de um ticket baseado no nome do canal
 * @param {string} channelName - Nome do canal
 * @returns {string|null} Nome da categoria ou null se não encontrada
 */
export function getTicketCategoryFromName(channelName) {
  for (const [categoriaKey, config] of Object.entries(CATEGORY_CONFIG)) {
    if (channelName.startsWith(config.emoji)) {
      return categoriaKey;
    }
  }
  return null;
}

/**
 * Verifica se um membro tem permissão para acessar uma categoria específica
 * @param {GuildMember} member - Membro do servidor
 * @param {string} categoria - Nome da categoria
 * @returns {boolean} True se o membro tem permissão
 */
export function hasCategoryAccess(member, categoria) {
  const config = CATEGORY_CONFIG[categoria];
  if (!config) return false;

  return config.staffRoles.some(roleId => 
    member.roles.cache.has(roleId)
  );
}

/**
 * Obtém o emoji da categoria baseado no nome do canal
 * @param {string} channelName - Nome do canal
 * @returns {string} Emoji da categoria ou string vazia
 */
export function getCategoryEmoji(channelName) {
  for (const config of Object.values(CATEGORY_CONFIG)) {
    if (channelName.startsWith(config.emoji)) {
      return config.emoji;
    }
  }
  return '';
}

/**
 * Formata o nome de um ticket
 * @param {string} categoria - Nome da categoria
 * @param {string} username - Nome do usuário
 * @returns {string} Nome formatado do ticket
 */
export function formatTicketName(categoria, username) {
  const config = CATEGORY_CONFIG[categoria];
  if (!config) return `ticket-${username}`;
  
  return `${config.emoji}${categoria}-${username.toLowerCase()}`;
} 
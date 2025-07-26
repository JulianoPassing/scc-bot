import { CATEGORY_CONFIG, CREATOR_PERMISSIONS, STAFF_PERMISSIONS } from '../config.js';

/**
 * Cria as permissões para um ticket baseado na categoria
 * @param {string} categoria - Nome da categoria (suporte, bugs, boost, etc.)
 * @param {string} creatorId - ID do criador do ticket
 * @returns {Array} Array de permissionOverwrites para o canal
 */
export function createTicketPermissions(categoria, creatorId) {
  const config = CATEGORY_CONFIG[categoria];
  if (!config) {
    throw new Error(`Categoria '${categoria}' não encontrada na configuração`);
  }

  const permissionOverwrites = [
    // Negar acesso para @everyone
    {
      id: '0', // @everyone role ID
      deny: ['ViewChannel']
    },
    // Permissões para o criador do ticket
    {
      id: creatorId,
      allow: Object.keys(CREATOR_PERMISSIONS).filter(perm => CREATOR_PERMISSIONS[perm])
    }
  ];

  // Adicionar permissões para todos os cargos de staff da categoria
  config.staffRoles.forEach(roleId => {
    permissionOverwrites.push({
      id: roleId,
      allow: Object.keys(STAFF_PERMISSIONS).filter(perm => STAFF_PERMISSIONS[perm])
    });
  });

  return permissionOverwrites;
}

/**
 * Verifica se uma categoria está cheia (máximo de 50 canais)
 * @param {string} categoriaId - ID da categoria
 * @param {Guild} guild - Objeto guild do Discord
 * @returns {boolean} True se a categoria estiver cheia
 */
export async function isCategoryFull(categoriaId, guild) {
  try {
    const category = await guild.channels.fetch(categoriaId);
    if (!category || category.type !== 4) return false; // 4 = CategoryChannel
    
    const channelsInCategory = guild.channels.cache.filter(
      channel => channel.parentId === categoriaId
    );
    
    return channelsInCategory.size >= 50; // Limite máximo do Discord
  } catch (error) {
    console.error('Erro ao verificar se categoria está cheia:', error);
    return false;
  }
}

/**
 * Obtém a categoria correta para criar o ticket
 * Se a categoria original estiver cheia, retorna null para criar no topo
 * @param {string} categoria - Nome da categoria
 * @param {Guild} guild - Objeto guild do Discord
 * @returns {string|null} ID da categoria ou null para criar no topo
 */
export async function getTicketCategory(categoria, guild) {
  const config = CATEGORY_CONFIG[categoria];
  if (!config) return null;

  const isFull = await isCategoryFull(config.id, guild);
  return isFull ? null : config.id;
}

/**
 * Verifica se um usuário tem permissão para acessar uma categoria específica
 * @param {GuildMember} member - Membro do servidor
 * @param {string} categoria - Nome da categoria
 * @returns {boolean} True se o membro tem permissão
 */
export function hasCategoryPermission(member, categoria) {
  const config = CATEGORY_CONFIG[categoria];
  if (!config) return false;

  return config.staffRoles.some(roleId => 
    member.roles.cache.has(roleId)
  );
}

/**
 * Obtém todas as categorias que um membro tem acesso
 * @param {GuildMember} member - Membro do servidor
 * @returns {Array} Array com nomes das categorias que o membro tem acesso
 */
export function getMemberCategories(member) {
  return Object.keys(CATEGORY_CONFIG).filter(categoria => 
    hasCategoryPermission(member, categoria)
  );
} 
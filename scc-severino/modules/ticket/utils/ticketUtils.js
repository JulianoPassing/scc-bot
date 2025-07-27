import { CATEGORY_CONFIG, CREATOR_PERMISSIONS, STAFF_PERMISSIONS } from '../config.js';

/**
 * Herda as permissões da categoria pai para o canal do ticket
 * @param {Guild} guild - Objeto guild do Discord
 * @param {string} categoriaId - ID da categoria
 * @returns {Array} Array de permissionOverwrites herdadas da categoria
 */
export async function inheritCategoryPermissions(guild, categoriaId) {
  try {
    const category = await guild.channels.fetch(categoriaId);
    if (!category || category.type !== 4) { // 4 = CategoryChannel
      console.warn(`Categoria ${categoriaId} não encontrada ou não é uma categoria válida`);
      return [];
    }

    // Obter as permissões da categoria
    const categoryPermissions = category.permissionOverwrites.cache.map(overwrite => ({
      id: overwrite.id,
      allow: overwrite.allow.toArray(),
      deny: overwrite.deny.toArray()
    }));

    return categoryPermissions;
  } catch (error) {
    console.error('Erro ao herdar permissões da categoria:', error);
    return [];
  }
}

/**
 * Cria as permissões completas para um ticket, combinando permissões da categoria com permissões específicas
 * @param {Guild} guild - Objeto guild do Discord
 * @param {string} categoriaId - ID da categoria
 * @param {string} creatorId - ID do criador do ticket
 * @returns {Array} Array de permissionOverwrites para o canal
 */
export async function createTicketPermissionsWithInheritance(guild, categoriaId, creatorId) {
  const permissionOverwrites = [];

  // 1. Herdar permissões da categoria
  const inheritedPermissions = await inheritCategoryPermissions(guild, categoriaId);
  permissionOverwrites.push(...inheritedPermissions);

  // 2. Negar acesso para @everyone (sobrescreve herança se necessário)
  const everyoneOverwrite = {
    id: guild.roles.everyone,
    deny: ['ViewChannel']
  };
  
  // Verificar se já existe uma permissão para @everyone na herança
  const existingEveryoneIndex = permissionOverwrites.findIndex(p => p.id === guild.roles.everyone.id);
  if (existingEveryoneIndex !== -1) {
    // Mesclar com as permissões existentes
    const existing = permissionOverwrites[existingEveryoneIndex];
    permissionOverwrites[existingEveryoneIndex] = {
      id: guild.roles.everyone,
      allow: existing.allow.filter(perm => !everyoneOverwrite.deny.includes(perm)),
      deny: [...new Set([...existing.deny, ...everyoneOverwrite.deny])]
    };
  } else {
    permissionOverwrites.push(everyoneOverwrite);
  }

  // 3. Adicionar permissões específicas para o criador do ticket
  const creatorOverwrite = {
    id: creatorId,
    allow: Object.keys(CREATOR_PERMISSIONS).filter(perm => CREATOR_PERMISSIONS[perm])
  };
  
  // Verificar se já existe uma permissão para o criador na herança
  const existingCreatorIndex = permissionOverwrites.findIndex(p => p.id === creatorId);
  if (existingCreatorIndex !== -1) {
    // Mesclar com as permissões existentes
    const existing = permissionOverwrites[existingCreatorIndex];
    permissionOverwrites[existingCreatorIndex] = {
      id: creatorId,
      allow: [...new Set([...existing.allow, ...creatorOverwrite.allow])],
      deny: existing.deny.filter(perm => !creatorOverwrite.allow.includes(perm))
    };
  } else {
    permissionOverwrites.push(creatorOverwrite);
  }

  return permissionOverwrites;
}

/**
 * Cria um canal de ticket com herança de permissões da categoria
 * @param {Guild} guild - Objeto guild do Discord
 * @param {string} channelName - Nome do canal
 * @param {string} categoriaId - ID da categoria
 * @param {string} creatorId - ID do criador do ticket
 * @param {string} topic - Tópico do canal
 * @returns {TextChannel} Canal criado
 */
export async function createTicketChannelWithInheritance(guild, channelName, categoriaId, creatorId, topic) {
  try {
    // Obter permissões com herança
    const permissionOverwrites = await createTicketPermissionsWithInheritance(guild, categoriaId, creatorId);

    // Criar o canal
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: 0, // GuildText
      parent: categoriaId,
      topic: topic,
      permissionOverwrites: permissionOverwrites
    });

    return ticketChannel;
  } catch (error) {
    console.error('Erro ao criar canal do ticket com herança de permissões:', error);
    throw error;
  }
}

/**
 * Verifica se um membro tem permissão para acessar uma categoria específica
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
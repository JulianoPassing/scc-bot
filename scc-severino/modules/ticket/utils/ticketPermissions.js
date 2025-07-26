import { TICKET_PERMISSIONS, CREATOR_PERMISSIONS, STAFF_PERMISSIONS } from '../config.js';

/**
 * Configura as permissões de um canal de ticket
 * @param {TextChannel} channel - O canal do ticket
 * @param {string} categoriaTipo - O tipo da categoria (suporte, bugs, etc.)
 * @param {string} userId - ID do criador do ticket
 */
export async function configurarPermissoesTicket(channel, categoriaTipo, userId) {
  const categoria = TICKET_PERMISSIONS[categoriaTipo];
  if (!categoria) {
    throw new Error(`Categoria inválida: ${categoriaTipo}`);
  }

  console.log(`Configurando permissões para ticket ${channel.name} da categoria ${categoriaTipo}`);

  // Limpar todas as permissões existentes primeiro
  await channel.permissionOverwrites.set([]);
  console.log('Permissões existentes removidas');

  // Configurar permissões para @everyone (negar acesso - canal privado)
  await channel.permissionOverwrites.create(channel.guild.roles.everyone, {
    deny: ['ViewChannel']
  });
  console.log('Permissão @everyone configurada (canal privado)');

  // Configurar permissões para o criador do ticket
  await channel.permissionOverwrites.create(userId, {
    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks']
  });
  console.log(`Permissões do criador configuradas para ${userId}`);

  // Configurar permissões para todos os cargos de staff da categoria
  for (const roleId of categoria.staffRoles) {
    try {
      await channel.permissionOverwrites.create(roleId, {
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks', 'ManageMessages']
      });
      console.log(`Permissões aplicadas para cargo ${roleId} no ticket ${channel.name}`);
    } catch (error) {
      console.error(`Erro ao aplicar permissões para cargo ${roleId}:`, error);
    }
  }
}

/**
 * Verifica se um usuário tem permissão para acessar um ticket
 * @param {GuildMember} member - O membro a ser verificado
 * @param {string} categoriaTipo - O tipo da categoria do ticket
 * @returns {boolean} - True se tem permissão, false caso contrário
 */
export function verificarPermissaoTicket(member, categoriaTipo) {
  const categoria = TICKET_PERMISSIONS[categoriaTipo];
  if (!categoria) return false;

  // Verificar se o membro tem algum dos cargos de staff da categoria
  return categoria.staffRoles.some(roleId => 
    member.roles.cache.has(roleId)
  );
}

/**
 * Obtém informações de uma categoria de ticket
 * @param {string} categoriaTipo - O tipo da categoria
 * @returns {Object|null} - Informações da categoria ou null se não existir
 */
export function obterCategoriaTicket(categoriaTipo) {
  return TICKET_PERMISSIONS[categoriaTipo] || null;
}

/**
 * Lista todas as categorias disponíveis
 * @returns {Object} - Todas as categorias de ticket
 */
export function listarCategorias() {
  return TICKET_PERMISSIONS;
}

/**
 * Verifica se um cargo tem permissão para uma categoria específica
 * @param {string} roleId - ID do cargo
 * @param {string} categoriaTipo - Tipo da categoria
 * @returns {boolean} - True se tem permissão, false caso contrário
 */
export function cargoTemPermissao(roleId, categoriaTipo) {
  const categoria = TICKET_PERMISSIONS[categoriaTipo];
  if (!categoria) return false;
  
  return categoria.staffRoles.includes(roleId);
} 
// Configuração das categorias de tickets
export const CATEGORY_CONFIG = {
  suporte: {
    id: '1386490182085382294',
    name: 'Suporte',
    emoji: '📁',
    description: 'Suporte técnico e ajuda geral',
    staffRoles: [
      '1204393192284229692', // Cargo de Suporte
      '1046404063673192542', // Cargo de Staff
      '1277638402019430501', // Cargo de Moderador
      '1226903187055972484', // Cargo de Admin
      '1226907937117569128', // Cargo de Gerente
      '1230131375965737044', // Cargo de Supervisor
      '1046404063522197521'  // Cargo de Owner
    ]
  },
  bugs: {
    id: '1386490279384846418',
    name: 'Reportar Bugs',
    emoji: '🦠',
    description: 'Reportar erros e problemas técnicos',
    staffRoles: [
      '1204393192284229692', // Cargo de Suporte
      '1046404063673192542', // Cargo de Staff
      '1277638402019430501', // Cargo de Moderador
      '1226903187055972484', // Cargo de Admin
      '1226907937117569128', // Cargo de Gerente
      '1230131375965737044', // Cargo de Supervisor
      '1046404063522197521'  // Cargo de Owner
    ]
  },
  boost: {
    id: '1386490600353828884',
    name: 'Boost',
    emoji: '🚀',
    description: 'Suporte para membros boosters',
    staffRoles: [
      '1204393192284229692', // Cargo de Suporte
      '1046404063673192542', // Cargo de Staff
      '1277638402019430501', // Cargo de Moderador
      '1226903187055972484', // Cargo de Admin
      '1226907937117569128', // Cargo de Gerente
      '1230131375965737044', // Cargo de Supervisor
      '1046404063522197521'  // Cargo de Owner
    ]
  },
  casas: {
    id: '1386490752485294150',
    name: 'Casas',
    emoji: '🏠',
    description: 'Questões relacionadas a casas e propriedades',
    staffRoles: [
      '1311023008495698081', // Cargo específico de Casas
      '1046404063522197521'  // Cargo de Owner
    ]
  },
  doacoes: {
    id: '1386490511606419578',
    name: 'Doações',
    emoji: '💎',
    description: 'Assuntos relacionados a doações',
    staffRoles: [
      '1046404063522197521'  // Cargo de Owner
    ]
  },
  denuncias: {
    id: '1386490428404138054',
    name: 'Denúncias',
    emoji: '⚠️',
    description: 'Reportar infrações e problemas de conduta',
    staffRoles: [
      '1277638402019430501', // Cargo de Moderador
      '1226903187055972484', // Cargo de Admin
      '1046404063522197521'  // Cargo de Owner
    ]
  }
};

// Permissões para o criador do ticket
export const CREATOR_PERMISSIONS = {
  ViewChannel: true,
  SendMessages: true,
  ReadMessageHistory: true,
  AttachFiles: true,
  EmbedLinks: true,
  UseExternalEmojis: true,
  AddReactions: true
};

// Permissões para a equipe de staff
export const STAFF_PERMISSIONS = {
  ViewChannel: true,
  SendMessages: true,
  ReadMessageHistory: true,
  AttachFiles: true,
  EmbedLinks: true,
  UseExternalEmojis: true,
  AddReactions: true,
  ManageMessages: true,
  ManageChannels: true
}; 
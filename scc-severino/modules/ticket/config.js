// Configuração das categorias de tickets
export const CATEGORY_CONFIG = {
  suporte: {
    id: '1386490182085382294',
    name: 'Suporte',
    emoji: '📁',
    description: 'Suporte técnico e ajuda geral',
    staffRoles: [
      // Adicione aqui os IDs dos cargos que têm acesso aos tickets de suporte
      // Exemplo: '1234567890123456789'
    ]
  },
  bugs: {
    id: '1386490279384846418',
    name: 'Reportar Bugs',
    emoji: '🦠',
    description: 'Reportar erros e problemas técnicos',
    staffRoles: [
      // Adicione aqui os IDs dos cargos que têm acesso aos tickets de bugs
    ]
  },
  boost: {
    id: '1386490600353828884',
    name: 'Boost',
    emoji: '🚀',
    description: 'Suporte para membros boosters',
    staffRoles: [
      // Adicione aqui os IDs dos cargos que têm acesso aos tickets de boost
    ]
  },
  casas: {
    id: '1386490752485294150',
    name: 'Casas',
    emoji: '🏠',
    description: 'Questões relacionadas a casas e propriedades',
    staffRoles: [
      // Adicione aqui os IDs dos cargos que têm acesso aos tickets de casas
    ]
  },
  doacoes: {
    id: '1386490511606419578',
    name: 'Doações',
    emoji: '💎',
    description: 'Assuntos relacionados a doações',
    staffRoles: [
      // Adicione aqui os IDs dos cargos que têm acesso aos tickets de doações
    ]
  },
  denuncias: {
    id: '1386490428404138054',
    name: 'Denúncias',
    emoji: '⚠️',
    description: 'Reportar infrações e problemas de conduta',
    staffRoles: [
      // Adicione aqui os IDs dos cargos que têm acesso aos tickets de denúncias
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
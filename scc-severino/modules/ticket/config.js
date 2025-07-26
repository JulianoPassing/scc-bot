// Configuração das categorias de tickets e suas permissões
export const CATEGORY_CONFIG = {
  suporte: {
    id: '1386490182085382294',
    emoji: '📁',
    nome: 'Suporte',
    desc: 'Suporte técnico e ajuda geral',
    staffRoles: [
      '1204393192284229692',
      '1046404063673192542', 
      '1277638402019430501',
      '1226903187055972484',
      '1226907937117569128',
      '1230131375965737044',
      '1046404063522197521'
    ]
  },
  bugs: {
    id: '1386490279384846418',
    emoji: '🦠',
    nome: 'Reportar Bugs',
    desc: 'Reportar erros e problemas técnicos',
    staffRoles: [
      '1204393192284229692',
      '1046404063673192542',
      '1277638402019430501', 
      '1226903187055972484',
      '1226907937117569128',
      '1230131375965737044',
      '1046404063522197521'
    ]
  },
  boost: {
    id: '1386490600353828884',
    emoji: '🚀',
    nome: 'Boost',
    desc: 'Suporte para membros boosters',
    staffRoles: [
      '1204393192284229692',
      '1046404063673192542',
      '1277638402019430501',
      '1226903187055972484', 
      '1226907937117569128',
      '1230131375965737044',
      '1046404063522197521'
    ]
  },
  casas: {
    id: '1386490752485294150',
    emoji: '🏠',
    nome: 'Casas',
    desc: 'Questões relacionadas a casas e propriedades',
    staffRoles: [
      '1311023008495698081',
      '1046404063522197521'
    ]
  },
  doacoes: {
    id: '1386490511606419578',
    emoji: '💎',
    nome: 'Doações',
    desc: 'Assuntos relacionados a doações',
    staffRoles: [
      '1046404063522197521'
    ]
  },
  denuncias: {
    id: '1386490428404138054',
    emoji: '⚠️',
    nome: 'Denúncias',
    desc: 'Reportar infrações e problemas de conduta',
    staffRoles: [
      '1277638402019430501',
      '1226903187055972484',
      '1046404063522197521'
    ]
  }
};

// Permissões para o criador do ticket
export const CREATOR_PERMISSIONS = {
  ViewChannel: true,
  SendMessages: true,
  ReadMessageHistory: true,
  AttachFiles: true,
  EmbedLinks: true
};

// Permissões para staff (todos os cargos com permissão)
export const STAFF_PERMISSIONS = {
  ViewChannel: true,
  SendMessages: true,
  ReadMessageHistory: true,
  AttachFiles: true,
  EmbedLinks: true,
  ManageMessages: true,
  ManageChannels: true
};

// Canal de logs
export const LOG_CHANNEL_ID = '1386491920313745418'; 
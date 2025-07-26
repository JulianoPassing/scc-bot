// Configuração de permissões dos tickets
export const TICKET_PERMISSIONS = {
  // CATEGORIA SUPORTE
  suporte: {
    categoriaId: '1386490182085382294',
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
  
  // CATEGORIA BUGS
  bugs: {
    categoriaId: '1386490279384846418',
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
  
  // CATEGORIA BOOST
  boost: {
    categoriaId: '1386490600353828884',
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
  
  // CATEGORIA CASAS
  casas: {
    categoriaId: '1386490752485294150',
    emoji: '🏠',
    nome: 'Casas',
    desc: 'Questões relacionadas a casas e propriedades',
    staffRoles: [
      '1311023008495698081',
      '1046404063522197521'
    ]
  },
  
  // CATEGORIA DOAÇÕES
  doacoes: {
    categoriaId: '1386490511606419578',
    emoji: '💎',
    nome: 'Doações',
    desc: 'Assuntos relacionados a doações',
    staffRoles: [
      '1046404063522197521'
    ]
  },
  
  // CATEGORIA DENÚNCIAS
  denuncias: {
    categoriaId: '1386490428404138054',
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

// Permissões do criador do ticket (conforme especificado)
export const CREATOR_PERMISSIONS = {
  ViewChannel: true,        // Ver canal
  SendMessages: true,       // Enviar mensagens
  ReadMessageHistory: true, // Ver histórico
  AttachFiles: true,        // Enviar anexos
  EmbedLinks: true          // Enviar links
};

// Permissões básicas para staff (apenas o necessário para trabalhar)
export const STAFF_PERMISSIONS = {
  ViewChannel: true,        // Ver canal
  SendMessages: true,       // Enviar mensagens
  ReadMessageHistory: true, // Ver histórico
  AttachFiles: true,        // Enviar anexos
  EmbedLinks: true,         // Enviar links
  ManageMessages: true      // Gerenciar mensagens (para deletar spam, etc.)
}; 
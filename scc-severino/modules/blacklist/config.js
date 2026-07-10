export const config = {
  // IDs dos servidores
  mainGuildId: '1046404063287332936', // Servidor que tem o cargo blacklist
  ilegalGuildId: '1414984054406774987', // Servidor onde as msgs são verificadas
  
  // ID do canal onde o bot deve monitorar menções
  monitorChannelId: '1515000143957721098', // Canal que verifica msgs enviadas pelo player

  // Canal do servidor principal onde "." dispara verificação do autor
  dotCheckChannelId: '1046404065690652745',
  
  // ID do cargo de blacklist
  blacklistRoleId: '1412754856690581515', // Cargo de blacklist
  
  // Mensagem de resposta
  blacklistMessage: 'Este usuario esta em BlackList'
};

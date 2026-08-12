export const config = {
  // Servidor onde o staff executa os comandos e recebe os avisos
  staffGuildId: '1046404063287332936',
  commandsChannelId: '1537130119506829332',
  staffRoleId: '1046404063673192546',

  // Servidor/canal das logs de login (webhook Captain Hook)
  loginGuildId: '1313305951004135434',
  loginChannelId: '1459464917416415316',
  loginWebhookId: '1459464952472539243',

  // TEMPORÁRIO: loga no console + envia resumo no canal de comandos
  // para cada mensagem lida no canal de login. Desligar depois do teste.
  debug: true,
};

import { Events } from 'discord.js';

const setupBateBapoModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== '1046404065690652745') return;
    if (message.content.trim() === '.') {
      await message.reply('Se for pra contratação, me contrata também, **Noel 🎅🏻** me escravizou aqui.');
      return;
    }
    const contentLower = message.content.trim().toLowerCase();
    if (["off", "offline", "caiu"].includes(contentLower)) {
      await message.reply(
        'Tente acessar pelo https://discord.com/channels/1046404063287332936/1046404064004558923 , caso não resolva, tenta fazer os procedimentos de https://discord.com/channels/1046404063287332936/1332835981874827304 .\nCaso persista https://discord.com/channels/1046404063287332936/1387031132343763086 ou entrar na call https://discord.com/channels/1046404063287332936/1046404065241862193 .'
      );
      return;
    }
    if (contentLower === 'connect') {
      await message.reply('Segue connect do servidor, cole no F8.\n```connect jogar.streetcarclub.com.br```');
      return;
    }
    if (["emprego", "empregos"].includes(contentLower)) {
      await message.reply('Dúvidas referente a empregos, se for sobre pagamento ou qual melhor, você deve perguntar dentro do RP.\nEsse tipo de pergunta, pode acarretar em punições.\nAqui tem alguns tutorias https://discord.com/channels/1046404063287332936/1317105357453266995 .');
      return;
    }
    if (["chave", "chaves"].includes(contentLower)) {
      await message.reply('Se sua dúvida for referente a passar chaves, o comando "darchaves id" no F8.');
      return;
    }
    if (["comando", "comandos"].includes(contentLower)) {
      await message.reply('Aqui temos alguns comandos. https://discord.com/channels/1046404063287332936/1215334046108754002');
      return;
    }
    if (contentLower === 'veloster') {
      await message.reply('**Ficha Técnica do Veloster**\n* **Velocidade Máxima**: 90 km/h\n* **Potência**: 49 CV\n* **Desempenho**: Mais fraco que uma CG 125cc\n* **Aceleração**: 0 a 100 km/h… nunca, provavelmente nunca vai acontecer.');
      return;
    }
    if (["tem medico?", "tem médico?"].includes(contentLower)) {
      await message.reply('Aqui vai ser difícil de você encontrar, deve procurar dentro do RP.');
      return;
    }
    if (["tem adm on?", "tem algum adm on?", "staff on?"].includes(contentLower)) {
      await message.reply('Entre na call https://discord.com/channels/1046404063287332936/1046404065241862193 e sera atendido em breve, se algum dos nossos Staff\'s estiverem disponiveis.');
      return;
    }
    if (contentLower === 'an') {
      await message.reply('Oruuaammm');
      return;
    }
    if (contentLower === 'noel') {
      await message.reply('Esse cara é fod# de mais, meu patrão!');
      return;
    }
  });
};
export default setupBateBapoModule; 
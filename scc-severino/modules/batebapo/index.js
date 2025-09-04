import { Events } from 'discord.js';

const setupBateBapoModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== '1046404065690652745') return;
    
    // Resposta para "."
    if (message.content.trim() === '.') {
      await message.reply('Se for pra contratação, me contrata também, **Noel 🎅🏻** me escravizou aqui.');
    }
    
    // Resposta para "staff on"
    if (message.content.toLowerCase().trim() === 'staff on') {
      await message.reply('Se estiver precisando de ajuda, <@1387031132343763086> ou entre no canal <#1046404065241862193> e aguarde.');
    }
    
    // Resposta para "comando" ou "comandos"
    if (message.content.toLowerCase().trim() === 'comando' || message.content.toLowerCase().trim() === 'comandos') {
      await message.reply('Se sua duvida for referente a comandos da cidade, temos alguns aqui <#1215334046108754002>');
    }
    
    // Resposta para "limbo"
    if (message.content.toLowerCase().trim() === 'limbo') {
      await message.reply('Se está com problemas de renderização, teste <#1332833912698834996>');
    }
    
    // Resposta para "RR"
    if (message.content.toLowerCase().trim() === 'rr') {
      await message.reply('Se sua dúvida for referente aos horários de RR, temos aqui <#1369722870820900995>');
    }
    
    // Resposta para "tutorial" ou "tutoriais"
    if (message.content.toLowerCase().trim() === 'tutorial' || message.content.toLowerCase().trim() === 'tutoriais') {
      await message.reply('Se sua dúvida for referente a tutorias da cidade, aqui temos alguns <#1317105357453266995>');
    }
    
    // Resposta para "caiu", "F" ou "servidor ta off"
    if (message.content.toLowerCase().trim() === 'caiu' || 
        message.content.toLowerCase().trim() === 'f' || 
        message.content.toLowerCase().includes('servidor ta off')) {
      await message.reply('Tente acessar pelo <#1046404064004558923>, caso não resolva, tenta fazer os procedimentos de <#1332835981874827304>.\nCaso persista <@1387031132343763086> ou entrar na call <#1046404065241862193>.');
    }
    
    // Resposta para "An"
    if (message.content.toLowerCase().trim() === 'an') {
      await message.reply('Oruuaammm');
    }
    
    // Resposta para "emprego" ou "empregos"
    if (message.content.toLowerCase().trim() === 'emprego' || message.content.toLowerCase().trim() === 'empregos') {
      await message.reply('Dúvidas referente a empregos, se for sobre pagamento ou qual melhor, você deve perguntar dentro do RP.\nEsse tipo de pergunta, pode acarretar em punições.\nAqui tem alguns tutorias <#1317105357453266995>.');
    }
    
    // Resposta para "connect"
    if (message.content.toLowerCase().trim() === 'connect') {
      await message.reply('Segue connect do servidor, cole no F8.\n```connect jogar.streetcarclub.com.br```');
    }
    
    // Resposta para "veloster"
    if (message.content.toLowerCase().trim() === 'veloster') {
      await message.reply('**Ficha Técnica do Veloster**\n* **Velocidade Máxima**: 90 km/h\n* **Potência**: 49 CV\n* **Desempenho**: Mais fraco que uma CG 125cc\n* **Aceleração**: 0 a 100 km/h… nunca, provavelmente nunca vai acontecer.');
    }
    
    // Resposta para "Noel"
    if (message.content.toLowerCase().trim() === 'noel') {
      await message.reply('Noel é foda! 🎅🏻');
    }
    
    // Resposta para mensagens contendo "wipe"
    if (message.content.toLowerCase().includes('wipe')) {
      await message.reply('**🗓️ Wipe previsto para 07/09**\n\n📋 Mais informações e spoilers em: https://discord.com/channels/1046404063287332936/1406109950769627176\n\n*Lembrando: o Noel é foda e o PH é uma moça.*');
    }
    
    // Resposta para "PH"
    if (message.content.toLowerCase().trim() === 'ph') {
      await message.reply('**🏳️‍🌈 PH, esse se deita com iguais**');
    }
    
    // Resposta para "abuser"
    if (message.content.toLowerCase().includes('abuser')) {
      await message.reply('**🎅🏻 Provavelmente você está falando do Noel**');
    }
  });
};
export default setupBateBapoModule; 
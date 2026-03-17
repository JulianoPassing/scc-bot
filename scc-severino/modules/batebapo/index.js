import { Events } from 'discord.js';

// Módulo Bate-Bapo - Respostas automáticas no canal de suporte
const setupBateBapoModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== '1046404065690652745') return;
    
    // Ignora membros staff (cargo 1046404063673192546)
    if (message.member?.roles.cache.has('1046404063673192546')) return;
    
    // Resposta para "." (mensagem exata)
    if (message.content.trim() === '.') {
      await message.reply('Se for pra contratação, me contrata também, **Noel 🎅🏻** me escravizou aqui.');
    }
    
    // Resposta para "staff" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('staff')) {
      await message.reply('Se estiver precisando de ajuda abra um ticket no canal <#1387031132343763086> ou entre no canal <#1046404065241862193> e aguarde.');
    }
    
    // Resposta para "comando" ou "comandos" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('comando') || message.content.toLowerCase().includes('comandos')) {
      await message.reply('Se sua duvida for referente a comandos da cidade, temos alguns aqui <#1215334046108754002>');
    }
    
    // Resposta para "limbo" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('limbo')) {
      await message.reply('Se está com problemas de renderização, teste <#1332833912698834996>');
    }
    
    // Resposta para "RR" (palavra isolada)
    if (/\brr\b/i.test(message.content)) {
      await message.reply('Se sua dúvida for referente aos horários de RR, temos aqui <#1369722870820900995>');
    }
    
    // Resposta para "tutorial" ou "tutoriais" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('tutorial') || message.content.toLowerCase().includes('tutoriais')) {
      await message.reply('Se sua dúvida for referente a tutorias da cidade, aqui temos alguns <#1317105357453266995>');
    }
    
    // Resposta para "caiu", "F" ou "servidor ta off"
    if (message.content.toLowerCase().includes('caiu') || 
        message.content.toLowerCase().trim() === 'f' || 
        message.content.toLowerCase().includes('servidor ta off')) {
      await message.reply('Tente acessar pelo <#1046404064004558923>, caso não resolve, tente fazer os procedimentos do <#1332835981874827304>. Caso persista abra um ticket <#1387031132343763086>, ou entre na call <#1046404065241862193> e aguarde.');
    }
    
    // Resposta para "an" (mensagem exata)
    if (message.content.toLowerCase().trim() === 'an') {
      await message.reply('Oruuaammm');
    }
    
    // Resposta para "emprego" ou "empregos" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('emprego') || message.content.toLowerCase().includes('empregos')) {
      await message.reply('Dúvidas referente a empregos, se for sobre pagamento ou qual melhor, você deve perguntar dentro do RP.\nEsse tipo de pergunta, pode acarretar em punições.\nAqui tem alguns tutorias <#1317105357453266995>.');
    }
    
    // Resposta para "connect" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('connect')) {
      await message.reply('Segue connect do servidor, cole no F8.\n```connect 96vylk```');
    }
    
    // Resposta para "fila" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('fila')) {
      await message.reply('Se vc está travado na fila, clique no X e tente entrar novamente. 🎅🏻');
    }
    
    // Resposta para "veloster" (mensagem exata)
    if (message.content.toLowerCase().trim() === 'veloster') {
      await message.reply('**Ficha Técnica do Veloster**\n* **Velocidade Máxima**: 90 km/h\n* **Potência**: 49 CV\n* **Desempenho**: Mais fraco que uma CG 125cc\n* **Aceleração**: 0 a 100 km/h… nunca, provavelmente nunca vai acontecer.');
    }
    
    // Resposta para "noel" (mensagem exata)
    if (message.content.toLowerCase().trim() === 'noel') {
      await message.reply('Noel deve estar pensando em como derrubar a cidade hoje');
    }
    
    // Resposta para "ph" (mensagem exata)
    if (message.content.toLowerCase().trim() === 'ph') {
      await message.reply('🏳️‍🌈 PH, esse se deita com iguais!');
    }
    
    // Resposta para "jeeh" (mensagem exata)
    if (message.content.toLowerCase().trim() === 'jeeh') {
      await message.reply('🐊 JEEEEHCARE! 🐊');
    }
    
    // Resposta para "abuser" (inclui em qualquer parte)
    if (message.content.toLowerCase().includes('abuser')) {
      await message.reply('🎅🏻 Abuser? Provavelmente você está falando do Noel');
    }
    
    // Resposta para "jack" (mensagem exata)
    if (message.content.toLowerCase().trim() === 'jack') {
      await message.reply('Jack, esse cara é o melhor em sortear o caneco!');
    }
    
    // Comando especial do usuário 405487427327885313
    if (message.author.id === '405487427327885313' && 
        message.content.toLowerCase().includes('pega o') && 
        message.content.toLowerCase().includes('severino, mostra quem manda')) {
      
      // Encontra a menção na mensagem
      const mention = message.mentions.users.first();
      if (mention) {
        try {
          // Altera o apelido do usuário mencionado
          const currentNickname = message.guild.members.cache.get(mention.id).nickname || mention.username;
          const newNickname = `${currentNickname} - Danada do Noel`;
          await message.guild.members.cache.get(mention.id).setNickname(newNickname);
          await message.reply(`**Agora vc é uma danada do Noel** ${mention}`);
        } catch (error) {
          console.error('Erro ao alterar apelido:', error);
          await message.reply('**❌ Não foi possível alterar o apelido do usuário.**');
        }
      } else {
        await message.reply('**❌ Você precisa mencionar um usuário para usar este comando.**');
      }
    }
  });
};
export default setupBateBapoModule;

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';

const SUGGESTION_CHANNEL_ID = '1336660114249224262';
const VOTES_CHANNEL_ID = '1410612496947216485';
const VOTES_FILE = './modules/sugestoes-ilegal/votes.json';

const votos = new Map();
const logsMessages = new Map();

const saveVotes = () => {
  try {
    const votesData = {};
    for (const [messageId, voteData] of votos.entries()) {
      votesData[messageId] = {
        yes: Array.from(voteData.yes),
        no: Array.from(voteData.no)
      };
    }
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votesData, null, 2));
  } catch (error) {
    console.error('Erro ao salvar votos:', error);
  }
};

const loadVotes = () => {
  try {
    if (fs.existsSync(VOTES_FILE)) {
      const votesData = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
      for (const [messageId, voteData] of Object.entries(votesData)) {
        votos.set(messageId, {
          yes: new Set(voteData.yes),
          no: new Set(voteData.no)
        });
      }
      console.log(`✅ Votos carregados: ${Object.keys(votesData).length} sugestões ilegais`);
    }
  } catch (error) {
    console.error('Erro ao carregar votos:', error);
  }
};

const setupSugestoesIlegalModule = function(client) {
  console.log('🚨 Iniciando módulo sugestoes-ilegal...');
  
  // Carregar votos existentes
  loadVotes();
  
  // Evento para mensagens no canal de sugestões ilegais
  client.on('messageCreate', async (message) => {
    // Verificar se é bot ou não é o canal correto
    if (message.author.bot) return;
    if (message.channel.id !== SUGGESTION_CHANNEL_ID) return;
    
    console.log(`🚨 Nova mensagem no canal de sugestões ilegais: ${message.content}`);
    
    try {
      const conteudo = message.content;
      
      // Deletar a mensagem original
      await message.delete();
      
      // Criar embed da sugestão ilegal
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setAuthor({
          name: `${message.author.username} - ${message.author.id}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 })
        })
        .setTitle('🚨 Sugestão Ilegal')
        .setDescription(`
\`\`\`sugestao-ilegal
${conteudo}
\`\`\`
`)
        .addFields(
          { name: '👤 Autor', value: `<@${message.author.id}>`, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ 
          text: 'Sistema de Sugestões Ilegais • SCC', 
          iconURL: message.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      // Criar botões de votação
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('vote_yes')
          .setLabel('👍 (0) - 0%')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('vote_no')
          .setLabel('👎 (0) - 0%')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );
      
      // Enviar a sugestão com botões
      const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
      
      // Inicializar votos para esta mensagem
      votos.set(sentMessage.id, { yes: new Set(), no: new Set() });
      saveVotes();
      
      console.log(`✅ Sugestão ilegal criada com sucesso: ${sentMessage.id}`);
      
      // Criar thread para debate
      try {
        await sentMessage.startThread({
          name: `💬 Debate: ${conteudo.substring(0, 50)}${conteudo.length > 50 ? '...' : ''}`,
          autoArchiveDuration: 60,
          reason: 'Tópico de debate criado automaticamente para a sugestão ilegal'
        });
        console.log(`✅ Thread criado para a sugestão ilegal`);
      } catch (threadError) {
        console.error('❌ Erro ao criar thread:', threadError);
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar sugestão ilegal:', error);
    }
  });
  
  // Evento para interações com botões
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const { customId, message, user } = interaction;
    if (!['vote_yes', 'vote_no'].includes(customId)) return;
    
    console.log(`🗳️ Voto registrado: ${customId} na sugestão ${message.id} por ${user.username}`);
    
    try {
      // Inicializar votos se não existir
      if (!votos.has(message.id)) {
        votos.set(message.id, { yes: new Set(), no: new Set() });
      }
      
      const voto = votos.get(message.id);
      
      // Remover voto anterior do usuário
      voto.yes.delete(user.id);
      voto.no.delete(user.id);
      
      // Adicionar novo voto
      if (customId === 'vote_yes') voto.yes.add(user.id);
      if (customId === 'vote_no') voto.no.add(user.id);
      
      // Salvar votos
      saveVotes();
      
      // Calcular contadores
      const totalVotos = voto.yes.size + voto.no.size;
      const porcentagemSim = totalVotos > 0 ? Math.round((voto.yes.size / totalVotos) * 100) : 0;
      const porcentagemNao = totalVotos > 0 ? Math.round((voto.no.size / totalVotos) * 100) : 0;
      
      // Atualizar botões com novos contadores
      const row = ActionRowBuilder.from(message.components[0]);
      row.components[0].setLabel(`👍 (${voto.yes.size}) - ${porcentagemSim}%`);
      row.components[1].setLabel(`👎 (${voto.no.size}) - ${porcentagemNao}%`);
      
      // Atualizar a interação PRIMEIRO
      await interaction.update({ components: [row] });
      
      // Enviar log para canal de logs (após atualizar a interação)
      try {
        const votesChannel = interaction.guild.channels.cache.get(VOTES_CHANNEL_ID);
        if (votesChannel) {
          let logMessageId = logsMessages.get(message.id);
          let logMessage = null;
          
          if (logMessageId) {
            try {
              logMessage = await votesChannel.messages.fetch(logMessageId);
            } catch (error) {
              logsMessages.delete(message.id);
              logMessageId = null;
            }
          }
          
          const votesEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('📊 Votação da Sugestão Ilegal')
            .setDescription(`**Sugestão:** ${message.embeds[0].description}`)
            .addFields(
              { name: '👤 Autor Original', value: message.embeds[0].fields.find(f => f.name.includes('Autor'))?.value || 'N/A', inline: true },
              { name: '📅 Data', value: message.embeds[0].fields.find(f => f.name.includes('Data'))?.value || 'N/A', inline: true },
              { name: '📈 Total de Votos', value: `${totalVotos}`, inline: true }
            )
            .setFooter({ text: `Sugestão Ilegal ID: ${message.id}` })
            .setTimestamp();
          
          if (voto.yes.size > 0) {
            const votantesSim = Array.from(voto.yes).map(id => `<@${id}>`).join(', ');
            votesEmbed.addFields({ 
              name: `✅ Votaram Sim (${voto.yes.size}) - ${porcentagemSim}%`, 
              value: votantesSim, 
              inline: false 
            });
          }
          
          if (voto.no.size > 0) {
            const votantesNao = Array.from(voto.no).map(id => `<@${id}>`).join(', ');
            votesEmbed.addFields({ 
              name: `❌ Votaram Não (${voto.no.size}) - ${porcentagemNao}%`, 
              value: votantesNao, 
              inline: false 
            });
          }
          
          if (logMessage) {
            await logMessage.edit({ embeds: [votesEmbed] });
          } else {
            const newLogMessage = await votesChannel.send({ embeds: [votesEmbed] });
            logsMessages.set(message.id, newLogMessage.id);
          }
        }
      } catch (logError) {
        console.error('❌ Erro ao enviar log de votação:', logError);
        // Não re-lançar o erro para não interferir na interação
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar voto:', error);
      
      // Verificar se a interação ainda não foi reconhecida
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ content: 'Erro ao processar seu voto. Tente novamente.', ephemeral: true });
        } catch (replyError) {
          console.error('❌ Erro ao responder à interação:', replyError);
        }
      } else {
        // Se já foi reconhecida, tentar editar a resposta
        try {
          await interaction.editReply({ content: 'Erro ao processar seu voto. Tente novamente.' });
        } catch (editError) {
          console.error('❌ Erro ao editar resposta:', editError);
        }
      }
    }
  });
  
  console.log('🚨 Módulo sugestoes-ilegal configurado com sucesso!');
};

export default setupSugestoesIlegalModule;

require('dotenv').config();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SUGGESTION_CHANNEL_ID = '1395117926402756669';
const VOTES_CHANNEL_ID = '1395118049115246825';

const setupSugestoesModule = function(client) {
  // Lógica de votação
  const votos = new Map(); // Map<messageId, {yes: Set<userId>, no: Set<userId>}>
  const logsMessages = new Map(); // Map<suggestionId, logMessageId>

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== SUGGESTION_CHANNEL_ID) return;

    try {
      const conteudo = message.content;
      await message.delete();

      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setAuthor({
          name: `${message.author.username} - ${message.author.id}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 })
        })
        .setTitle('💡 Sugestão')
        .setDescription(`\n${conteudo}\n`)
        .addFields(
          { name: '👤 Autor', value: `<@${message.author.id}>`, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ 
          text: 'Sistema de Sugestões • SCC', 
          iconURL: message.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();

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

      const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
      votos.set(sentMessage.id, { yes: new Set(), no: new Set() });
      try {
        await sentMessage.startThread({
          name: `💬 Debate: ${conteudo.substring(0, 50)}${conteudo.length > 50 ? '...' : ''}`,
          autoArchiveDuration: 60,
          reason: 'Tópico de debate criado automaticamente para a sugestão'
        });
      } catch (threadError) {
        console.error('Erro ao criar tópico de debate:', threadError);
      }
    } catch (error) {
      console.error('Erro ao processar sugestão:', error);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, message, user } = interaction;
    if (!['vote_yes', 'vote_no'].includes(customId)) return;
    try {
      if (!votos.has(message.id)) {
        votos.set(message.id, { yes: new Set(), no: new Set() });
      }
      const voto = votos.get(message.id);
      voto.yes.delete(user.id);
      voto.no.delete(user.id);
      if (customId === 'vote_yes') voto.yes.add(user.id);
      if (customId === 'vote_no') voto.no.add(user.id);
      const row = ActionRowBuilder.from(message.components[0]);
      const totalVotos = voto.yes.size + voto.no.size;
      const porcentagemSim = totalVotos > 0 ? Math.round((voto.yes.size / totalVotos) * 100) : 0;
      const porcentagemNao = totalVotos > 0 ? Math.round((voto.no.size / totalVotos) * 100) : 0;
      row.components[0].setLabel(`👍 (${voto.yes.size}) - ${porcentagemSim}%`);
      row.components[1].setLabel(`👎 (${voto.no.size}) - ${porcentagemNao}%`);
      await interaction.update({ components: [row] });
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
          .setColor('#0099FF')
          .setTitle('📊 Votação da Sugestão')
          .setDescription(`**Sugestão:** ${message.embeds[0].description}`)
          .addFields(
            { name: '👤 Autor Original', value: message.embeds[0].fields.find(f => f.name.includes('Autor'))?.value || 'N/A', inline: true },
            { name: '📅 Data', value: message.embeds[0].fields.find(f => f.name.includes('Data'))?.value || 'N/A', inline: true },
            { name: '📈 Total de Votos', value: `${totalVotos}`, inline: true }
          )
          .setFooter({ text: `Sugestão ID: ${message.id}` })
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
    } catch (error) {
      console.error('Erro ao processar voto:', error);
      await interaction.reply({ content: 'Erro ao processar seu voto. Tente novamente.', ephemeral: true });
    }
  });
};
export default setupSugestoesModule; 
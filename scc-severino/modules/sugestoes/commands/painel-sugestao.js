import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
  data: {
    name: 'painel-sugestao',
    description: 'Cria um painel de sugestões para o servidor',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages
  },
  
  async execute(message, args, client) {
    try {
      // Pegar a sugestão dos argumentos
      const sugestao = args.join(' ');
      
      if (!sugestao) {
        await message.reply('❌ Por favor, forneça uma sugestão. Exemplo: `!painel-sugestao Adicionar mais canais de carros`');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setTitle('💡 Nova Sugestão')
        .setDescription(`**Sugestão:** ${sugestao}`)
        .addFields(
          { name: '📊 Votos', value: '👍 **0** | 👎 **0** (Total: 0)', inline: false },
          { name: '📝 Como votar?', value: 'Clique em 👍 para concordar ou 👎 para discordar da sugestão.', inline: false }
        )
        .setFooter({ text: 'Street Car Club • Sistema de Sugestões' })
        .setTimestamp();

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('vote_yes')
            .setLabel('👍 Concordo')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('vote_no')
            .setLabel('👎 Discordo')
            .setStyle(ButtonStyle.Danger)
        );

      await message.channel.send({
        embeds: [embed],
        components: [buttons]
      });

      // Deletar o comando original
      if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.delete().catch(() => {});
      }

    } catch (error) {
      console.error('[SUGESTOES][PAINEL] Erro:', error);
      await message.reply('❌ Ocorreu um erro ao criar o painel de sugestões.');
    }
  }
}; 
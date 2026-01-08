import { MessageFlags } from 'discord.js';

export const name = 'interactionCreate';

export const execute = async function(interaction) {
  try {
    if (interaction.isButton()) {
      const { customId, user, guild } = interaction;

      // Verificar se é o botão de resgatar tag da temporada
      if (customId === 'resgatar_tag_season') {
        const member = await guild.members.fetch(user.id);
        const roleId = '1406086032989880350';

        // Verificar se o usuário já tem o cargo
        if (member.roles.cache.has(roleId)) {
          await interaction.reply({ 
            content: '❌ Você já possui esta tag da temporada!', 
            flags: MessageFlags.Ephemeral 
          });
          return;
        }

        try {
          // Adicionar o cargo ao usuário
          await member.roles.add(roleId);
          
          await interaction.reply({ 
            content: '🎉 Parabéns! Você resgatou com sucesso sua Tag da Temporada 04! 🏆', 
            flags: MessageFlags.Ephemeral 
          });
        } catch (error) {
          console.error('Erro ao adicionar cargo:', error);
          await interaction.reply({ 
            content: '❌ Ocorreu um erro ao adicionar a tag. Entre em contato com a equipe.', 
            flags: MessageFlags.Ephemeral 
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro no evento interactionCreate do módulo tagseason:', error);
  }
};

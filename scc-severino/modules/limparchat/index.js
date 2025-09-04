import { Events } from 'discord.js';

const setupLimparchatModule = function(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Verifica se é o comando !limparchat
    if (message.content.toLowerCase().trim() === '!limparchat') {
      // IDs dos cargos permitidos
      const allowedRoles = ['1046404063689977985', '1046404063689977984'];
      
      // Verifica se o usuário tem um dos cargos permitidos
      const hasPermission = message.member.roles.cache.some(role => 
        allowedRoles.includes(role.id)
      );
      
      if (!hasPermission) {
        await message.reply('**❌ Você não tem permissão para usar este comando.**');
        return;
      }
      
      try {
        // Confirmação antes de limpar
        const confirmMessage = await message.reply('**⚠️ Tem certeza que deseja limpar TODAS as mensagens deste canal? Digite `CONFIRMAR` em 10 segundos para prosseguir.**');
        
        // Coleta de confirmação
        const filter = (response) => {
          return response.author.id === message.author.id && 
                 response.content.toUpperCase() === 'CONFIRMAR';
        };
        
        const collector = message.channel.createMessageCollector({ 
          filter, 
          time: 10000, 
          max: 1 
        });
        
        collector.on('collect', async (response) => {
          try {
            // Deleta a mensagem de confirmação
            await confirmMessage.delete();
            await response.delete();
            
            // Mensagem de início da limpeza
            const startMessage = await message.channel.send('**🧹 Iniciando limpeza do canal...**');
            
            // Busca e deleta TODAS as mensagens do canal
            let deletedCount = 0;
            let lastMessageId = null;
            let attempts = 0;
            const maxAttempts = 100; // Limite de segurança
            
            while (attempts < maxAttempts) {
              const messages = await message.channel.messages.fetch({ 
                limit: 100, 
                before: lastMessageId 
              });
              
              if (messages.size === 0) break;
              
              // Tenta deletar todas as mensagens em lote primeiro
              try {
                await message.channel.bulkDelete(messages);
                deletedCount += messages.size;
              } catch (error) {
                // Se bulk delete falhar, deleta uma por uma
                for (const msg of messages.values()) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    // Pausa menor para mensagens individuais
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (deleteError) {
                    // Ignora erros de mensagens que não podem ser deletadas
                    console.log(`Não foi possível deletar mensagem: ${msg.id}`);
                  }
                }
              }
              
              lastMessageId = messages.last().id;
              attempts++;
              
              // Pausa menor para ser mais rápido
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Deleta a mensagem de início
            await startMessage.delete();
            
            // Verificação final - tenta deletar qualquer mensagem restante
            try {
              const remainingMessages = await message.channel.messages.fetch({ limit: 50 });
              if (remainingMessages.size > 0) {
                for (const msg of remainingMessages.values()) {
                  try {
                    await msg.delete();
                    deletedCount++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                  } catch (error) {
                    // Ignora erros
                  }
                }
              }
            } catch (error) {
              // Ignora erros da verificação final
            }
            
            // Mensagem final
            await message.channel.send(`**✅ Canal limpo com sucesso! ${deletedCount} mensagens foram removidas.**`);
            
          } catch (error) {
            console.error('Erro ao limpar canal:', error);
            await message.channel.send('**❌ Ocorreu um erro ao limpar o canal.**');
          }
        });
        
        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            await confirmMessage.edit('**⏰ Tempo esgotado. Operação cancelada.**');
          }
        });
        
      } catch (error) {
        console.error('Erro no comando limparchat:', error);
        await message.reply('**❌ Ocorreu um erro ao processar o comando.**');
      }
    }
  });
};

export default setupLimparchatModule;

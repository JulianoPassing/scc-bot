export default {
    name: 'teste-liberacao',
    description: 'Comando de teste para o módulo de liberação',
    async execute(message, args, client) {
        try {
            // Verificar se está no canal correto
            if (message.channel.id !== '1317096106844225586') {
                return message.reply('❌ Este comando só funciona no canal de liberação!');
            }
            
            // Enviar mensagem de teste
            const testMessage = await message.channel.send({
                content: `🧪 **Teste do módulo de liberação**\n\nEste é um teste para verificar se o módulo está funcionando.\nReaja com ✅ para testar a liberação.`
            });
            
            // Adicionar reação de teste
            await testMessage.react('✅');
            
            message.reply('✅ Teste iniciado! Reaja com ✅ na mensagem acima para testar.');
            
        } catch (error) {
            console.error('❌ Erro no teste:', error);
            message.reply('❌ Erro ao executar teste: ' + error.message);
        }
    }
}; 
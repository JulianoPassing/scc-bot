export default {
    name: 'liberar',
    description: 'Libera um usuário específico',
    async execute(message, args, client) {
        try {
            // Verificar se está no canal correto
            if (message.channel.id !== '1317096106844225586') {
                return message.reply('❌ Este comando só funciona no canal de liberação!');
            }
            
            // Verificar se foi mencionado um usuário
            const user = message.mentions.users.first();
            if (!user) {
                return message.reply('❌ Por favor, mencione um usuário para liberar! Exemplo: `!liberar @usuario`');
            }
            
            // Verificar se foi fornecido um nome
            const nome = args.slice(1).join(' ');
            if (!nome) {
                return message.reply('❌ Por favor, forneça um nome! Exemplo: `!liberar @usuario Nome do Usuario`');
            }
            
            const guild = message.guild;
            const member = await guild.members.fetch(user.id);
            
            // Processar o nome (mesma lógica do evento)
            let processedName = nome
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/`/g, '')
                .replace(/__/g, '')
                .replace(/#/g, '')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (processedName.length > 32) {
                processedName = processedName.substring(0, 29) + '...';
            }
            
            // Cargos
            const cargoAdicionar = '1317086939555434557';
            const cargoRemover = '1263487190575349892';
            
            // Alterar nickname do usuário
            await member.setNickname(processedName);
            
            // Adicionar cargo
            await member.roles.add(cargoAdicionar);
            
            // Remover cargo
            await member.roles.remove(cargoRemover);
            
            console.log(`✅ Usuário ${user.tag} liberado manualmente!`);
            
            // Enviar mensagem de confirmação
            await message.channel.send({
                content: `✅ **Liberação manual realizada com sucesso!**\n👤 **Usuário:** ${user}\n📝 **Nome alterado para:** ${processedName}\n➕ **Cargo adicionado:** <@&${cargoAdicionar}>\n➖ **Cargo removido:** <@&${cargoRemover}>`
            });
            
        } catch (error) {
            console.error('❌ Erro ao processar liberação manual:', error);
            message.reply('❌ Erro ao processar liberação: ' + error.message);
        }
    }
}; 
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
            
            // Verificar permissões do bot
            const botMember = guild.members.cache.get(message.client.user.id);
            const hasManageNicknames = botMember.permissions.has('ManageNicknames');
            const hasManageRoles = botMember.permissions.has('ManageRoles');
            
            console.log(`🔐 Permissões do bot: ManageNicknames=${hasManageNicknames}, ManageRoles=${hasManageRoles}`);
            
            // Cargos
            const cargoAdicionar = '1317086939555434557';
            const cargoRemover = '1263487190575349892';
            
            // Alterar nickname do usuário (se tiver permissão)
            if (hasManageNicknames) {
                await member.setNickname(processedName);
                console.log(`✅ Nickname alterado para: ${processedName}`);
            } else {
                console.log(`❌ Bot não tem permissão para alterar nickname`);
            }
            
            // Adicionar cargo (se tiver permissão)
            if (hasManageRoles) {
                await member.roles.add(cargoAdicionar);
                console.log(`✅ Cargo adicionado: ${cargoAdicionar}`);
            } else {
                console.log(`❌ Bot não tem permissão para adicionar cargos`);
            }
            
            // Remover cargo (se tiver permissão)
            if (hasManageRoles) {
                await member.roles.remove(cargoRemover);
                console.log(`✅ Cargo removido: ${cargoRemover}`);
            } else {
                console.log(`❌ Bot não tem permissão para remover cargos`);
            }
            
            console.log(`✅ Usuário ${user.tag} liberado manualmente!`);
            
            // Preparar mensagem de confirmação
            let confirmMessage = `✅ **Liberação manual processada!**\n👤 **Usuário:** ${user}\n📝 **Nome processado:** ${processedName}\n`;
            
            if (hasManageNicknames) {
                confirmMessage += `✅ **Nickname alterado**\n`;
            } else {
                confirmMessage += `❌ **Nickname não alterado** (sem permissão)\n`;
            }
            
            if (hasManageRoles) {
                confirmMessage += `➕ **Cargo adicionado:** <@&${cargoAdicionar}>\n➖ **Cargo removido:** <@&${cargoRemover}>`;
            } else {
                confirmMessage += `❌ **Cargos não alterados** (sem permissão)`;
            }
            
            // Enviar mensagem de confirmação
            await message.channel.send({
                content: confirmMessage
            });
            
        } catch (error) {
            console.error('❌ Erro ao processar liberação manual:', error);
            message.reply('❌ Erro ao processar liberação: ' + error.message);
        }
    }
}; 
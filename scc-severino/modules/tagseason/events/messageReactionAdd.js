module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        // Verifica se a reação é parcial e busca a reação completa
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Erro ao buscar reação:', error);
                return;
            }
        }

        // Verifica se é a mensagem específica
        if (reaction.message.id !== '1406087068437708913') {
            return;
        }

        // Verifica se é o emoji correto (🎉)
        if (reaction.emoji.name !== 'tada') {
            return;
        }

        // Verifica se é o canal correto
        if (reaction.message.channel.id !== '1406085682639671468') {
            return;
        }

        try {
            // Busca o membro do servidor
            const member = await reaction.message.guild.members.fetch(user.id);
            
            // Adiciona o cargo
            await member.roles.add('1406086032989880350');
            
            console.log(`✅ Cargo adicionado para ${user.tag} (${user.id}) no módulo tagseason`);
            
            // Envia mensagem de confirmação (opcional)
            const channel = reaction.message.channel;
            await channel.send({
                content: `🎉 Parabéns <@${user.id}>! Você recebeu o cargo de participante da temporada!`,
                allowedMentions: { users: [user.id] }
            });
            
        } catch (error) {
            console.error('Erro ao adicionar cargo no módulo tagseason:', error);
        }
    }
};

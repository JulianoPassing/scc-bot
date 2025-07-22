module.exports = function setupBoostModule(client) {
  // Dicionário para armazenar o status de boost dos membros
  const boostStatus = {};

  client.on('ready', () => {
    for (const guild of client.guilds.cache.values()) {
      for (const member of guild.members.cache.values()) {
        boostStatus[member.id] = member.premiumSince !== null;
      }
    }
  });

  client.on('guildMemberUpdate', (before, after) => {
    const beforeBoost = before.premiumSince !== null;
    const afterBoost = after.premiumSince !== null;

    // Se o usuário tinha boost e agora não tem mais
    if (beforeBoost && !afterBoost) {
      const channel = after.guild.channels.cache.get('1395730474806153257');
      if (channel) {
        channel.send(`${after} removeu o boost do servidor 😢`);
      }
    }
    boostStatus[after.id] = afterBoost;
  });
} 
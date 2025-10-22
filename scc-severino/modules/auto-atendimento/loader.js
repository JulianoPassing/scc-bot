const fs = require('fs');
const path = require('path');

module.exports = {
  loadCommands(client, commands) {
    const commandsPath = path.join(__dirname, 'commands');
    
    if (!fs.existsSync(commandsPath)) {
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if (command.data && command.execute) {
        commands.set(command.data.name, command);
        console.log(`[Auto-Atendimento] Comando carregado: ${command.data.name}`);
      }
    }
  },

  loadEvents(client) {
    const eventsPath = path.join(__dirname, 'events');
    
    if (!fs.existsSync(eventsPath)) {
      return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, file));
      const eventName = file.split('.')[0];

      if (event.execute) {
        client.on(eventName, (...args) => event.execute(...args, client));
        console.log(`[Auto-Atendimento] Evento carregado: ${eventName}`);
      }
    }
  }
};


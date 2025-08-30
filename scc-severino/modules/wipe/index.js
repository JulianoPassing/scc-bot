import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const setupWipeModule = async function(client) {
  // Coleção de comandos
  if (!client.commands) client.commands = new Collection();

  // Carregar comandos
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(filePath);
      if (command && command.data && command.data.name) {
        client.commands.set(command.data.name, command);
      }
    }
  }
};

export default setupWipeModule;

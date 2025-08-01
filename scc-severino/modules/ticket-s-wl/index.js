import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const setupTicketSWLModule = async function(client) {
  // Coleção de comandos
  if (!client.commands) client.commands = new Collection();

  // Carregar comandos
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(pathToFileURL(filePath).href);
      if (command && command.data && command.data.name) {
        client.commands.set(command.data.name, command);
      }
    }
  }

  // Carregar eventos
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = await import(pathToFileURL(filePath).href);
      if (event && event.name && typeof event.execute === 'function') {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
      }
    }
  }

  // Eventos são registrados diretamente no bot.js deste módulo, mas para integração, devem ser migrados para cá se necessário.
  // Se houver eventos customizados, adapte aqui.
};
export default setupTicketSWLModule; 
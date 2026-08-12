import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadRegistrados } from './utils/storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const setupAvisoLoginModule = async function (client) {
  if (!client.commands) client.commands = new Collection();

  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(filePath);
      if (command?.data?.name) {
        client.commands.set(command.data.name, command);
        console.log(`✅ [aviso-login] Comando carregado: !${command.data.name}`);
      }
    }
  }

  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = await import(filePath);
      if (event?.name && typeof event.execute === 'function') {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`✅ [aviso-login] Evento carregado: ${event.name}`);
      }
    }
  }

  const registrados = loadRegistrados();
  console.log(
    `🔔 Módulo aviso-login ativo — ${Object.keys(registrados).length} ID(s) registrados`
  );
};

export default setupAvisoLoginModule;

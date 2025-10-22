import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function setupAutoAtendimentoModule(client) {
  console.log('📦 Configurando módulo Auto-Atendimento...');

  // Carregar comandos
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      try {
        const commandModule = await import(`./commands/${file}`);
        const command = commandModule.default;
        
        if (command && command.data && command.execute) {
          client.commands.set(command.data.name, command);
          console.log(`[Auto-Atendimento] Comando carregado: ${command.data.name}`);
        }
      } catch (error) {
        console.error(`[Auto-Atendimento] Erro ao carregar comando ${file}:`, error);
      }
    }
  }

  // Carregar eventos
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      try {
        const eventModule = await import(`./events/${file}`);
        const event = eventModule.default;
        const eventName = file.split('.')[0];

        if (event && event.execute) {
          client.on(eventName, (...args) => event.execute(...args, client));
          console.log(`[Auto-Atendimento] Evento carregado: ${eventName}`);
        }
      } catch (error) {
        console.error(`[Auto-Atendimento] Erro ao carregar evento ${file}:`, error);
      }
    }
  }

  console.log('✅ Módulo Auto-Atendimento configurado com sucesso!');
}


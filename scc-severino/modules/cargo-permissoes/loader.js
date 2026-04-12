import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function loadCargoPermissoes(client) {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) {
    console.warn('[cargo-permissoes] Pasta commands não encontrada.');
    return;
  }

  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    try {
      const mod = await import(path.join(commandsPath, file));
      const cmd = mod.default;
      if (cmd?.name && typeof cmd.execute === 'function') {
        client.commands.set(cmd.name, cmd);
        console.log(`✅ [cargo-permissoes] Comando: ${cmd.name}`);
      }
    } catch (err) {
      console.error(`❌ [cargo-permissoes] Erro ao carregar ${file}:`, err);
    }
  }
  console.log('✅ Módulo cargo-permissoes carregado.');
}

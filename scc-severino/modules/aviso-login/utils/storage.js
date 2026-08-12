import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'registrados.json');

const ensureFile = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
};

export const loadRegistrados = () => {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('[aviso-login] Erro ao carregar registrados:', error);
    return {};
  }
};

export const saveRegistrados = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[aviso-login] Erro ao salvar registrados:', error);
  }
};

export const addRegistrado = (discordId, addedBy) => {
  const data = loadRegistrados();
  if (data[discordId]) {
    return { ok: false, reason: 'already', entry: data[discordId] };
  }

  data[discordId] = {
    addedBy,
    addedAt: new Date().toISOString(),
  };
  saveRegistrados(data);
  return { ok: true, entry: data[discordId] };
};

export const removeRegistrado = (discordId) => {
  const data = loadRegistrados();
  if (!data[discordId]) {
    return { ok: false, reason: 'not_found' };
  }

  delete data[discordId];
  saveRegistrados(data);
  return { ok: true };
};

export const listRegistrados = () => {
  const data = loadRegistrados();
  return Object.entries(data).map(([discordId, entry]) => ({
    discordId,
    ...entry,
  }));
};

export const isRegistrado = (discordId) => {
  const data = loadRegistrados();
  return Boolean(data[discordId]);
};

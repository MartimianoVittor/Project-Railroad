import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const diretorio = new URL('../tests/', import.meta.url);
const arquivos = readdirSync(diretorio)
    .filter((nome) => nome.endsWith('.mjs') && nome !== 'apoioBanco.mjs')
    .sort()
    .map((nome) => fileURLToPath(new URL(nome, diretorio)));

const resultado = spawnSync(process.execPath, ['--test', ...arquivos], { stdio: 'inherit' });
if (resultado.error) throw resultado.error;
process.exitCode = resultado.status ?? 1;

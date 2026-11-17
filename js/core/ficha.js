// Compatibilidade com a Etapa 2: regras de ficha e personagem ficam em módulos distintos.
export { validarFicha, normalizarFicha } from './validacao.js';
export { coletarPersonagem, restaurarPersonagem, observarPersonagem } from '../modules/personagem.js';

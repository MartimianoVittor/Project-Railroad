// Compatibilidade com a Etapa 2: regras de ficha e personagem ficam em módulos distintos.
export { validarFicha, normalizarFicha } from './validacao.js?v=1.4.21';
export { coletarPersonagem, restaurarPersonagem, observarPersonagem } from '../modules/personagem.js?v=1.4.21';

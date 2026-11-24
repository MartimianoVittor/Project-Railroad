export const tituloValido = (valor) => String(valor || '').trim().slice(0, 120) || 'Novo personagem';
export const tituloDoPersonagem = (dados) => tituloValido(dados.personagem?.['nome-personagem'] || 'Ficha importada');

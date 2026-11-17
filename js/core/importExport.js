import { normalizarFicha } from './validacao.js';
/** Remove caracteres incompatíveis com nomes de arquivo, preservando acentos. */
function nomeParaArquivo(valor, alternativa) {
    const nome = String(valor ?? '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/[. ]+$/g, '');
    return nome || alternativa;
}
export function baixarFicha(dados) {
    const ficha = normalizarFicha(dados);
    const conteudo = JSON.stringify(ficha, null, 2);
    const blob = new Blob([conteudo], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const jogador = nomeParaArquivo(ficha.nome, 'Jogador');
    const personagem = nomeParaArquivo(ficha.personagem?.['nome-personagem'], 'Personagem');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${jogador}(${personagem}).json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function interpretarArquivo(texto) {
    return normalizarFicha(JSON.parse(texto));
}

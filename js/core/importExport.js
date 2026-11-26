import { normalizarFicha, validarArquivoFicha } from './validacao.js?v=1.4.26';
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
    if (typeof texto !== 'string' || new TextEncoder().encode(texto).length > 20 * 1024 * 1024)
        throw new Error('O arquivo JSON deve ter no máximo 20 MB.');
    let dados;
    try { dados = JSON.parse(texto); }
    catch { throw new Error('O arquivo selecionado não contém um JSON válido.'); }
    return normalizarFicha(validarArquivoFicha(dados));
}

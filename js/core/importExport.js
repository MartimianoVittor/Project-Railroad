import { normalizarFicha } from './validacao.js';

export function baixarFicha(dados) {
    const conteudo = JSON.stringify(normalizarFicha(dados), null, 2);
    const blob = new Blob([conteudo], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const limparNome = (nome, padrao) =>
        (nome || '').trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .replace(/[. ]+$/g, '') || padrao;
    const jogador = limparNome(dados.nome, 'Jogador');
    const personagem = limparNome(
        dados.personagem?.['nome-personagem'],
        'Personagem'
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${jogador} (${personagem}).json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function interpretarArquivo(texto) { return normalizarFicha(JSON.parse(texto)); }

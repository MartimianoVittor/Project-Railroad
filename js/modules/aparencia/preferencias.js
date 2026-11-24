/**
 * Aparência da interface, independente do conteúdo das fichas.
 * Os identificadores correspondem às classes CSS do kit fornecido.
 * Não é permitido injetar classes/URLs arbitrárias a partir do armazenamento.
 */
const BOTOES = Object.freeze([
    ['cartucho-45', 'Munição .45'],
    ['cartucho-12', 'Munição calibre 12'],
    ['faca-bowie', 'Faca Bowie'],
]);
const RETRATOS = Object.freeze([
    ['estrela-de-xerife', 'Estrela de xerife'],
    ['cartaz-de-procurado', 'Cartaz de procurado'],
    ['camafeu-de-latao', 'Camafeu de latão'],
    ['moldura-de-latao', 'Moldura de latão'],
    ['tambor-de-revolver', 'Tambor de revólver'],
    ['placa-de-ferrovia', 'Placa de ferrovia'],
]);
const FUNDOS = Object.freeze([
    ['pergaminho', 'Pergaminho'],
    ['tabua', 'Tábua de saloon'],
    ['couro', 'Couro escuro'],
    ['mapa-topografico', 'Mapa topográfico'],
    ['latao', 'Latão hachurado'],
    ['terracota', 'Terracota'],
    ['ferrovia', 'Trilhos de ferrovia'],
    ['jornal', 'Jornal antigo'],
    ['aco-envelhecido', 'Aço envelhecido'],
]);
const BORDAS = Object.freeze([
    ['latonada', 'Borda latonada'],
    ['cartaz', 'Cartaz duplo'],
    ['ornamental', 'Gravura ornamental'],
    ['ferro-rebitado', 'Ferro rebitado'],
    ['ferrovia', 'Borda de ferrovia'],
    ['cantoneiras', 'Cantoneiras de cobre'],
    ['costura', 'Costura de sela'],
    ['chanfrada', 'Moldura chanfrada'],
    ['filete', 'Filete dourado'],
]);

export const OPCOES_VISUAIS = Object.freeze({
    botao: BOTOES,
    retratoJogador: RETRATOS,
    retratoPersonagem: RETRATOS,
    fundoTela: FUNDOS,
    fundoCartao: FUNDOS,
    borda: BORDAS,
});

const CHAVE = 'railroad_jogador_aparencia_v2';
const CHAVE_ANTIGA = 'railroad_jogador_aparencia_v1';
export const PADRAO = Object.freeze({
    ...Object.fromEntries(Object.entries(OPCOES_VISUAIS).map(([categoria, opcoes]) => [categoria, opcoes[0][0]])),
    retratoPersonagem: 'cartaz-de-procurado',
});

export function validarPreferencias(entrada) {
    const objeto = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? { ...entrada } : {};
    if (objeto.borda === 'hachurada') objeto.borda = 'ornamental';
    return Object.fromEntries(Object.keys(PADRAO).map((categoria) => [
        categoria,
        OPCOES_VISUAIS[categoria].some(([id]) => id === objeto[categoria]) ? objeto[categoria] : PADRAO[categoria],
    ]));
}

/** Converte a atualização anterior sem modificar ou sobrescrever as fichas. */
export function migrarPreferenciasAnteriores(entrada) {
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { ...PADRAO };
    const mapas = {
        botao: { bowie: 'faca-bowie', calibre12: 'cartucho-12' },
        retrato: {
            estrela: 'estrela-de-xerife', procurado: 'cartaz-de-procurado',
            camafeu: 'camafeu-de-latao', cobre: 'moldura-de-latao',
            tambor: 'tambor-de-revolver', ferrovia: 'placa-de-ferrovia',
        },
        fundo: { camafeu: 'couro', topografica: 'mapa-topografico' },
    };
    const botao = mapas.botao[entrada.botao] || entrada.botao;
    const retrato = mapas.retrato[entrada.retrato] || entrada.retrato;
    const fundo = mapas.fundo[entrada.fundo] || entrada.fundo;
    return validarPreferencias({
        botao,
        retratoJogador: retrato,
        retratoPersonagem: retrato,
        fundoTela: fundo,
        fundoCartao: PADRAO.fundoCartao,
        borda: entrada.borda,
    });
}

export function recuperarPreferencias(armazenamento) {
    try {
        const atual = armazenamento.getItem(CHAVE);
        if (atual !== null) return validarPreferencias(JSON.parse(atual));
        return migrarPreferenciasAnteriores(JSON.parse(armazenamento.getItem(CHAVE_ANTIGA) || 'null'));
    } catch (erro) {
        console.warn('Railroad: não foi possível ler as preferências visuais.', erro);
        return { ...PADRAO };
    }
}

export function guardarPreferencias(armazenamento, escolhas) {
    if (!armazenamento) throw new Error('Armazenamento local bloqueado');
    armazenamento.setItem(CHAVE, JSON.stringify(escolhas));
}

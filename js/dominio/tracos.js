// Os IDs são os mesmos nos JSONs, no seletor de rolagem e na consulta do Mestre.
export const TRACOS = [
    ['traco-1', 'Sangue Quente'], ['traco-2', 'Mira Afiada'],
    ['traco-3', 'Guerreiro Ancestral'], ['traco-4', 'Amigo Kaboom'],
    ['traco-5', 'Orelha Em Pé'], ['traco-6', 'Passos Na Sombra'],
    ['traco-7', 'Poeira e Ossos'], ['traco-8', 'Rédea e Sela'],
    ['traco-9', 'Língua de Trapo'], ['traco-10', 'Agourento e Carrancudo'],
    ['traco-11', 'Cachola Cheia'], ['traco-12', 'Grande Maioral'],
];
export const DADOS_POR_NIVEL = [4, 6, 8, 12];

export function facesDoTraco(marcas) {
    return DADOS_POR_NIVEL[marcas.lastIndexOf(true)] ?? 0;
}

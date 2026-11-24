import { normalizarFicha } from './validacao.js?v=1.4.18';

/** Os módulos de tela só editam seus próprios campos da ficha carregada. */
export function criarEditorFicha({ jogador, personagem, inventario, quadro }) {
    let origem = normalizarFicha({});

    function carregarFicha(dados) {
        origem = normalizarFicha(dados);
        jogador.restaurarJogador(origem);
        personagem.restaurarPersonagem(origem);
        inventario.restaurarInventario(origem.inventario);
        quadro?.restaurarQuadro(origem);
    }

    function coletarFicha() {
        const pessoa = personagem.coletarPersonagem();
        const itens = inventario.coletarInventario();
        return normalizarFicha({
            ...origem, ...jogador.coletarJogador(), ...quadro?.coletarQuadro(),
            personagem: {
                ...origem.personagem, ...pessoa,
                marcadores: { ...origem.personagem.marcadores, ...pessoa.marcadores },
            },
            inventario: {
                ...origem.inventario, ...itens,
                rolagens: { ...origem.inventario.rolagens, ...itens.rolagens },
            },
        });
    }

    return { carregarFicha, coletarFicha };
}

/** Inicialização dos módulos de jogo e do gerenciador de fichas. */
import { normalizarFicha } from './core/validacao.js';
import { baixarFicha, interpretarArquivo } from './core/importExport.js';
import { coletarPersonagem, restaurarPersonagem, observarPersonagem } from './modules/personagem.js';
import { coletarJogador, restaurarJogador, iniciarJogador } from './modules/jogador.js';
import { iniciarQuadro } from './modules/quadro/index.js';
import { coletarInventario, restaurarInventario, iniciarInventario } from './modules/inventario.js';
import { criarGerenciadorFichas } from './modules/fichas.js';

let quadro = null;
let fichas = null;

function coletarFicha() {
    return normalizarFicha({
        ...coletarJogador(),
        ...(quadro?.coletarQuadro() || { desenhoCanvas: '', itensQuadro: [] }),
        personagem: coletarPersonagem(),
        inventario: coletarInventario(),
    });
}

function carregarFicha(dados) {
    const ficha = normalizarFicha(dados);
    restaurarJogador(ficha);
    restaurarPersonagem(ficha);
    restaurarInventario(ficha.inventario);
    quadro?.restaurarQuadro(ficha);
}

function iniciar() {
    const agendarSalvamento = () => fichas?.agendarSalvamento();
    const salvarAgora = () => fichas?.salvarAgora();

    quadro = iniciarQuadro({ agendarSalvamento, salvarDadosFicha: salvarAgora });
    iniciarJogador(agendarSalvamento);
    observarPersonagem(agendarSalvamento);
    iniciarInventario(agendarSalvamento);

    fichas = criarGerenciadorFichas({
        coletarFicha, carregarFicha, normalizarFicha,
        baixarFicha, interpretarArquivo,
    });
    void fichas.iniciar();
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
else
    iniciar();

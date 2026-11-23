/**
 * Ponto de entrada do Railroad Jogador.
 *
 * Os controles de Conta, Ficha e Local são registrados antes do carregamento
 * dos módulos de jogo. Um erro em uma área da ficha não bloqueia os painéis.
 */
import { normalizarFicha } from './core/validacao.js';
import { baixarFicha, interpretarArquivo } from './core/importExport.js';
import { criarGerenciadorFichas } from './modules/fichas.js?v=1.4.16';

let modulos = null;
let quadro = null;
let fichas = null;

function coletarFicha() {
    if (!modulos) throw new Error('Os campos da ficha ainda estão sendo preparados.');

    return normalizarFicha({
        ...modulos.jogador.coletarJogador(),
        ...(quadro?.coletarQuadro() || { desenhoCanvas: '', itensQuadro: [] }),
        personagem: modulos.personagem.coletarPersonagem(),
        inventario: modulos.inventario.coletarInventario(),
    });
}

function carregarFicha(dados) {
    if (!modulos) throw new Error('Os campos da ficha ainda estão sendo preparados.');

    const ficha = normalizarFicha(dados);
    modulos.jogador.restaurarJogador(ficha);
    modulos.personagem.restaurarPersonagem(ficha);
    modulos.inventario.restaurarInventario(ficha.inventario);
    quadro?.restaurarQuadro(ficha);
}

async function iniciar() {
    const agendarSalvamento = () => fichas?.agendarSalvamento();
    const salvarAgora = () => fichas?.salvarAgora();

    // A interface de gestão permanece utilizável mesmo se um módulo da ficha falhar.
    fichas = criarGerenciadorFichas({
        coletarFicha, carregarFicha, normalizarFicha,
        baixarFicha, interpretarArquivo,
    });
    fichas.registrarEventos();

    try {
        const [jogador, personagem, inventario, moduloQuadro, visual] = await Promise.all([
            import('./modules/jogador.js?v=1.2.5'),
            import('./modules/personagem.js?v=1.2.5'),
            import('./modules/inventario.js?v=1.2.5'),
            import('./modules/quadro/index.js?v=1.4.5'),
            import('./modules/personalizacao.js?v=1.4.16'),
        ]);

        visual.iniciarPersonalizacao();
        modulos = { jogador, personagem, inventario };
        quadro = moduloQuadro.iniciarQuadro({
            agendarSalvamento,
            salvarDadosFicha: salvarAgora,
        });
        jogador.iniciarJogador(agendarSalvamento);
        personagem.observarPersonagem(agendarSalvamento);
        inventario.iniciarInventario(agendarSalvamento);

        await fichas.iniciar();
    } catch (erro) {
        console.error('Railroad: falha ao iniciar os campos da ficha.', erro);
        const status = document.getElementById('status-salvamento');
        if (status) status.textContent = 'Erro ao carregar a ficha. Consulte o Console (F12).';
        const aviso = document.getElementById('mensagem-conta');
        if (aviso) aviso.textContent =
            'Os painéis continuam disponíveis, mas ocorreu um erro ao carregar a ficha.';
    }
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => { void iniciar(); }, { once: true });
else
    void iniciar();

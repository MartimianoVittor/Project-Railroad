/**
 * Ponto de entrada do Railroad Jogador.
 *
 * Os controles de Conta, Ficha e Local são registrados antes do carregamento
 * dos módulos de jogo. Um erro em uma área da ficha não bloqueia os painéis.
 */
import { criarEditorFicha } from './core/editorFicha.js?v=1.4.25';
import { normalizarFicha } from './core/validacao.js?v=1.4.25';
import { baixarFicha, interpretarArquivo } from './core/importExport.js?v=1.4.25';
import { criarGerenciadorFichas } from './modules/fichas.js?v=1.4.25';

let editor;
let fichas;

function editorAtual() {
    if (!editor) throw new Error('Os campos da ficha ainda estão sendo preparados.');
    return editor;
}

async function iniciar() {
    const agendarSalvamento = () => fichas?.agendarSalvamento();
    const salvarAgora = () => fichas?.salvarAgora();

    // A interface de gestão permanece utilizável mesmo se um módulo da ficha falhar.
    fichas = criarGerenciadorFichas({
        coletarFicha: () => editorAtual().coletarFicha(),
        carregarFicha: (dados) => editorAtual().carregarFicha(dados), normalizarFicha,
        baixarFicha, interpretarArquivo,
    });
    fichas.registrarEventos();

    try {
        const aparencia = import('./modules/personalizacao.js?v=1.4.25')
            .then((modulo) => modulo.iniciarPersonalizacao())
            .catch((erro) => console.warn('Railroad: não foi possível aplicar a aparência.', erro));
        const [jogador, personagem, inventario, moduloQuadro] = await Promise.all([
            import('./modules/jogador.js?v=1.4.25'),
            import('./modules/personagem.js?v=1.4.25'),
            import('./modules/inventario.js?v=1.4.25'),
            import('./modules/quadro/index.js?v=1.4.25'),
        ]);

        for (const id of ['nome-jogador', 'nome-personagem', 'tracos-personagem', 'rolagem-traco', 'lista-itens', 'quadro-rpg']) {
            if (!document.getElementById(id)) throw new Error(`Campo da ficha ausente: #${id}. Recarregue a página.`);
        }
        const quadro = moduloQuadro.iniciarQuadro({
            agendarSalvamento,
            salvarDadosFicha: salvarAgora,
        });
        editor = criarEditorFicha({ jogador, personagem, inventario, quadro });
        jogador.iniciarJogador(agendarSalvamento);
        personagem.observarPersonagem(agendarSalvamento);
        inventario.iniciarInventario(agendarSalvamento);

        await aparencia;
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

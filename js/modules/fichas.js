import { supabaseConfigurado } from '../config/supabase.js?v=1.4.19';
import { obterSupabase } from '../services/supabaseClient.js?v=1.4.19';
import { criarRepositorioLocal } from '../services/fichasLocais.js?v=1.4.19';
import { comProcessamento } from '../utils/processamento.js?v=1.4.19';
import { criarConta } from './fichas/conta.js?v=1.4.19';
import { registrarEventosFicha } from './fichas/eventos.js?v=1.4.19';
import { criarGestaoLocal } from './fichas/locais.js?v=1.4.19';
import { chaveUltima, criarGestaoOnline } from './fichas/online.js?v=1.4.19';
import { criarPaineisFicha } from './fichas/paineis.js?v=1.4.19';
import { criarSalvamento } from './fichas/salvamento.js?v=1.4.19';

/** Coordena a ficha aberta. A conta conectada pode continuar editando uma ficha local. */
export function criarGerenciadorFichas({
    coletarFicha, carregarFicha, normalizarFicha, baixarFicha, interpretarArquivo,
    conectar = obterSupabase, configurado = supabaseConfigurado, repositorioLocal = criarRepositorioLocal(),
}) {
    const estado = {
        usuario: null, geracaoConta: 0, modoEdicao: 'local', fichaLocal: null, fichaNuvem: null,
        repositorioNuvem: null, painelConvites: null, preparando: true, armazenamentoPronto: false,
    };
    const paineis = criarPaineisFicha(estado);
    const salvamento = criarSalvamento({ estado, coletarFicha, repositorioLocal, informar: paineis.estadoSalvamento });
    const editor = { estado, paineis, salvamento, repositorioLocal, carregarFicha, normalizarFicha, interpretarArquivo };
    const locais = criarGestaoLocal(editor);
    const online = criarGestaoOnline({ ...editor, restaurarLocal: locais.restaurarLocal });
    const conta = criarConta({ estado, paineis, configurado, conectar, aoMudarConta, concluirSalvamento: salvamento.concluir });
    let eventosRegistrados = false;
    let inicializacao;

    function abrirOnline() {
        paineis.fecharPaineis();
        paineis.painelOnline.showModal();
        if (estado.usuario) void paineis.executar(paineis.painelOnline, online.atualizarListaOnline, 'Carregando fichas…');
        else paineis.mensagem('mensagem-fichas', 'Abra Conta para entrar com Google e gerenciar suas fichas online.');
    }

    function abrirConta() {
        paineis.fecharPaineis();
        paineis.painelConta.showModal();
        if (estado.usuario) void paineis.executar(paineis.painelConta, online.atualizarListaOnline, 'Atualizando convites…');
        else paineis.mensagem('mensagem-conta', configurado()
            ? (conta.ultimoErro() || 'Entre com Google para participar de mesas e enviar fichas.')
            : 'Configure o Supabase para usar sua conta online.');
    }

    function abrirLocais() {
        paineis.fecharPaineis();
        locais.desenharListaLocal();
        informarEstadoLocal();
        paineis.painelLocal.showModal();
    }

    function informarEstadoLocal() {
        const texto = estado.preparando ? 'Preparando as fichas deste navegador…'
            : estado.armazenamentoPronto ? 'Importe ou exporte arquivos JSON e gerencie fichas locais.'
            : 'Armazenamento local indisponível. Você pode exportar a ficha aberta.';
        paineis.mensagem('mensagem-locais', texto);
    }

    async function aoMudarConta(usuario) {
        if ((usuario?.id ?? null) === (estado.usuario?.id ?? null)) return;
        // Captura os campos ainda visíveis antes de restaurar a ficha da outra conta.
        const gravacao = salvamento.pendente() ? salvamento.salvarAgora() : Promise.resolve(true);
        salvamento.descartarAgendado();
        const geracao = ++estado.geracaoConta;
        estado.usuario = usuario;
        estado.painelConvites?.limpar();
        locais.restaurarLocal();
        paineis.fecharPaineis();
        const gravou = await gravacao;
        if (geracao !== estado.geracaoConta) return;
        if (!gravou) paineis.mensagem('mensagem-locais', 'Não foi possível gravar a edição anterior no navegador.', true);
        if (!usuario) return;
        const chave = chaveUltima(usuario.id);
        const ultima = localStorage.getItem(chave);
        if (ultima) {
            try { await online.abrirFichaOnline(ultima); return; }
            catch (erro) {
                if (geracao !== estado.geracaoConta) return;
                console.warn('Última ficha não disponível:', erro);
                // Uma falha de conexão não deve apagar a seleção da próxima tentativa.
            }
        }
        if (geracao === estado.geracaoConta) abrirOnline();
    }

    function exportarFicha() {
        if (estado.preparando) {
            paineis.mensagem('mensagem-locais', 'Aguarde o carregamento da ficha para exportar.');
            return;
        }
        const dados = normalizarFicha(coletarFicha());
        const id = estado.modoEdicao === 'local' ? estado.fichaLocal?.id : estado.fichaNuvem?.id;
        baixarFicha({ ...dados, railroadId: id });
    }

    function registrarEventos() {
        if (eventosRegistrados) return;
        eventosRegistrados = true;
        registrarEventosFicha({ estado, paineis, salvamento, conta, locais, online, abrirConta, abrirOnline, abrirLocais, exportarFicha });
    }

    async function preparar() {
        try {
            await comProcessamento('Preparando Railroad…', async () => {
                await repositorioLocal.migrarAntiga(normalizarFicha);
                locais.restaurarLocal();
                await repositorioLocal.flush();
                estado.armazenamentoPronto = true;
            }, { bloquear: false });
        } catch (erro) {
            console.error('Falha ao preparar as fichas locais.', erro);
            paineis.estadoSalvamento('Falha no armazenamento local; exporte suas fichas JSON');
            return;
        } finally {
            estado.preparando = false;
            paineis.atualizarInterface();
            if (paineis.painelLocal.open) {
                locais.desenharListaLocal();
                informarEstadoLocal();
            }
        }
        await conta.iniciar();
    }

    function iniciar() {
        registrarEventos();
        inicializacao ??= preparar();
        return inicializacao;
    }

    return { iniciar, registrarEventos, agendarSalvamento: salvamento.agendarSalvamento,
        salvarAgora: salvamento.salvarAgora, apagarLocalAtual: locais.apagarLocalAtual };
}

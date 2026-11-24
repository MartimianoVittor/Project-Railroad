import { porId } from '../../utils/dom.js?v=1.4.21';
import { comProcessamento } from '../../utils/processamento.js?v=1.4.21';
import { criarRepositorioFichas } from '../../services/fichasRepository.js?v=1.4.21';
import { criarRepositorioMesas } from '../../services/mesasRepository.js?v=1.4.21';
import { criarPainelConvitesMesa } from '../convitesMesa.js?v=1.4.21';

export function criarConta({ estado, paineis, configurado, conectar, aoMudarConta, concluirSalvamento }) {
    let conexao;
    let erroConexao = '';
    const { painelConta, mensagem, executar, estadoSalvamento } = paineis;

    function obterConexao() {
        if (!configurado()) throw new Error('Preencha a URL e a chave pública em js/config/supabase.js.');
        conexao ??= Promise.resolve().then(conectar).then((cliente) => {
            if (!cliente?.auth) throw new Error('O cliente Supabase não pôde ser inicializado.');
            estado.repositorioNuvem = criarRepositorioFichas(cliente);
            estado.painelConvites = criarPainelConvitesMesa({
                repositorio: criarRepositorioMesas(cliente),
                executarAcao: (acao, texto) => executar(painelConta, acao, texto),
            });
            erroConexao = '';
            return cliente;
        }).catch((erro) => {
            conexao = null;
            erroConexao = `Falha ao conectar ao Supabase: ${erro.message}. Tente novamente.`;
            throw new Error(erroConexao, { cause: erro });
        });
        return conexao;
    }

    async function entrarGoogle() {
        mensagem('mensagem-conta', 'Conectando ao Google…');
        const botao = porId('entrar-google');
        botao.disabled = true;
        try {
            const cliente = await obterConexao();
            const { error } = await cliente.auth.signInWithOAuth({
                provider: 'google', options: { redirectTo: `${location.origin}${location.pathname}` },
            });
            if (error) throw error;
            mensagem('mensagem-conta', 'Autenticação iniciada. Se a página não mudar, verifique se o navegador bloqueou o acesso ao Google.');
        } finally { botao.disabled = false; }
    }

    async function sairGoogle() {
        if (!(await concluirSalvamento()) && !confirm(
            'Há um rascunho sem sincronizar. Ele continuará neste navegador. Deseja sair?'
        )) return;
        const cliente = await obterConexao();
        const { error } = await cliente.auth.signOut();
        if (error) throw error;
        await aoMudarConta(null);
        paineis.fecharPaineis();
    }

    function falhou(erro) {
        console.warn('Supabase indisponível; a ficha local continuará funcionando.', erro);
        estadoSalvamento('Nuvem indisponível; você pode continuar no modo local');
        mensagem('mensagem-conta', erroConexao || `Erro na autenticação: ${erro.message}`, true);
    }

    async function iniciar() {
        if (!configurado()) return;
        const discreto = { bloquear: false };
        try {
            const cliente = await comProcessamento('Conectando ao banco…', obterConexao, discreto);
            let houveEvento = false;
            cliente.auth.onAuthStateChange((evento, sessao) => {
                if (evento !== 'SIGNED_IN' && evento !== 'SIGNED_OUT') return;
                houveEvento = true;
                const usuario = evento === 'SIGNED_IN' ? sessao?.user : null;
                // A biblioteca precisa concluir seu próprio evento antes de consultarmos fichas.
                queueMicrotask(() => { void aoMudarConta(usuario ?? null).catch(falhou); });
            });
            const sessao = await comProcessamento('Verificando conta…', () => cliente.auth.getSession(), discreto);
            if (houveEvento) return;
            if (sessao.error) throw sessao.error;
            if (!sessao.data.session) return;
            const resposta = await comProcessamento('Verificando conta…', () => cliente.auth.getUser(), discreto);
            if (houveEvento) return;
            if (resposta.error) throw resposta.error;
            if (resposta.data.user) await aoMudarConta(resposta.data.user);
        } catch (erro) { falhou(erro); }
    }

    return { iniciar, entrarGoogle, sairGoogle, ultimoErro: () => erroConexao };
}

import { confirmar, solicitar } from '../../utils/dialogos.js?v=1.4.26';
import { porId } from '../../utils/dom.js?v=1.4.26';
import { tituloDoPersonagem, tituloValido } from './titulos.js?v=1.4.26';

export function criarGestaoLocal({ estado, paineis, salvamento, repositorioLocal, carregarFicha, normalizarFicha, interpretarArquivo }) {
    const { painelLocal, mensagem, atualizarInterface, desenharLinha, fecharPaineis, estadoSalvamento } = paineis;
    const concluirSalvamento = salvamento.concluir;
    const fichaVazia = () => normalizarFicha({ versao: 3 });

    function selecionarLocalPadrao() {
        const id = repositorioLocal.ativa();
        const primeiro = repositorioLocal.listar()[0];
        return repositorioLocal.obter(id) || (primeiro && repositorioLocal.obter(primeiro.id))
            || repositorioLocal.criar('Ficha local', fichaVazia());
    }

    function mostrarLocal(registro) {
        estado.fichaLocal = registro;
        repositorioLocal.selecionar(registro.id);
        estado.modoEdicao = 'local';
        estado.fichaNuvem = null;
        carregarFicha(normalizarFicha(registro.dados));
        atualizarInterface();
        estadoSalvamento('Ficha salva neste navegador');
    }

    function restaurarLocal() {
        mostrarLocal(selecionarLocalPadrao());
    }

    function desenharListaLocal() {
        const lista = porId('lista-fichas-locais');
        lista.replaceChildren();
        for (const ficha of repositorioLocal.listar()) {
            const ativa = estado.modoEdicao === 'local' && ficha.id === estado.fichaLocal?.id;
            lista.append(desenharLinha(ficha, painelLocal, [
                [ativa ? 'Aberta' : 'Abrir', () => abrirFichaLocal(ficha.id), ativa, 'amarelo'],
                ['Duplicar', () => duplicarLocal(ficha), false, 'amarelo'],
                ['Renomear', () => renomearLocal(ficha)],
                ['Excluir local', () => excluirLocal(ficha), false, 'vermelho'],
            ], ativa));
        }
    }

    async function abrirFichaLocal(id) {
        if (!(await concluirSalvamento()))
            return mensagem('mensagem-locais', 'Não foi possível guardar a ficha atual.', true);
        const registro = repositorioLocal.obter(id);
        if (!registro) throw new Error('Ficha local não encontrada.');
        mostrarLocal(registro);
        fecharPaineis();
    }

    async function criarEAbrir(titulo, dados) {
        const geracao = estado.geracaoConta;
        const registro = repositorioLocal.criar(tituloValido(titulo), dados);
        await repositorioLocal.flush();
        if (geracao !== estado.geracaoConta) return;
        mostrarLocal(registro);
        fecharPaineis();
    }

    async function criarFichaLocal(titulo, dados) {
        if (!estado.armazenamentoPronto) throw new Error('O armazenamento local ainda não está disponível.');
        if (!(await concluirSalvamento())) throw new Error('Salve sua ficha atual antes de criar outra.');
        await criarEAbrir(titulo, dados ?? normalizarFicha({ personagem: { 'nome-personagem': titulo } }));
    }

    async function renomearLocal(ficha) {
        const titulo = await solicitar('Novo nome da ficha local:', ficha.titulo);
        if (titulo === null) return;
        if (!titulo.trim()) throw new Error('O nome não pode ficar vazio.');
        repositorioLocal.renomear(ficha.id, titulo);
        await repositorioLocal.flush();
        if (estado.fichaLocal?.id === ficha.id)
            estado.fichaLocal.titulo = tituloValido(titulo);
        atualizarInterface();
        desenharListaLocal();
    }

    async function duplicarLocal(ficha) {
        if (!(await concluirSalvamento())) throw new Error('Não foi possível salvar a ficha atual.');
        const registro = repositorioLocal.obter(ficha.id);
        await criarEAbrir(`${registro.titulo} (cópia)`, normalizarFicha(registro.dados));
    }

    async function excluirLocal(ficha) {
        if (!await confirmar(`Remover "${ficha.titulo}" deste navegador? A nuvem não será alterada.`))
            return;
        if (estado.modoEdicao === 'local' && estado.fichaLocal?.id === ficha.id) {
            salvamento.descartarAgendado();
        }
        repositorioLocal.excluir(ficha.id);
        if (estado.fichaLocal?.id === ficha.id) {
            const substituta = selecionarLocalPadrao();
            if (estado.modoEdicao === 'local') mostrarLocal(substituta);
            else {
                estado.fichaLocal = substituta;
                repositorioLocal.selecionar(substituta.id);
            }
        }
        await repositorioLocal.flush();
        atualizarInterface();
        desenharListaLocal();
        mensagem('mensagem-locais', 'Ficha excluída apenas deste navegador.');
    }
    async function importarArquivoLocal(arquivo) {
        const dados = interpretarArquivo(await arquivo.text());
        await criarFichaLocal(tituloDoPersonagem(dados), dados);
        estadoSalvamento('JSON importado para este navegador');
    }
    /** Remove a cópia deste navegador, inclusive quando a ficha aberta é online. */
    async function apagarLocalAtual() {
        if (estado.modoEdicao === 'nuvem') {
            if (!await confirmar('Descartar apenas o rascunho deste navegador? A ficha salva no banco permanecerá intacta.'))
                return;
            salvamento.descartarAgendado();
            const uid = estado.usuario.id;
            const id = estado.fichaNuvem.id;
            const geracao = estado.geracaoConta;
            await salvamento.aguardarEnvios();
            if (geracao !== estado.geracaoConta) return;
            repositorioLocal.apagarRascunho(uid, id);
            await repositorioLocal.flush();
            if (geracao !== estado.geracaoConta) return;
            restaurarLocal();
            await repositorioLocal.flush();
            if (geracao === estado.geracaoConta) estadoSalvamento('Rascunho local removido; dados online preservados');
        } else {
            if (!await confirmar('Apagar esta ficha somente do navegador? O banco de dados não será alterado.'))
                return;
            const id = estado.fichaLocal.id;
            const geracao = estado.geracaoConta;
            salvamento.descartarAgendado();
            repositorioLocal.excluir(id);
            const nova = repositorioLocal.criar('Ficha local', fichaVazia());
            repositorioLocal.selecionar(nova.id);
            await repositorioLocal.flush();
            if (geracao !== estado.geracaoConta) return;
            mostrarLocal(nova);
            estadoSalvamento('Ficha removida apenas deste navegador');
        }
    }

    return { restaurarLocal, desenharListaLocal, criarFichaLocal, importarArquivoLocal, apagarLocalAtual };
}

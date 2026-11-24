import { porId } from '../../utils/dom.js?v=1.4.21';
import { identificarArquivo } from '../../services/identidadeImportacao.js?v=1.4.21';
import { tituloDoPersonagem, tituloValido } from './titulos.js?v=1.4.21';

export const chaveUltima = (uid) => `railroad_ultima_ficha:${uid}`;

export function criarGestaoOnline({ estado, paineis, salvamento, repositorioLocal, carregarFicha, normalizarFicha, interpretarArquivo, restaurarLocal }) {
    const { painelOnline, mensagem, atualizarInterface, desenharLinha, fecharPaineis, estadoSalvamento } = paineis;
    const concluirSalvamento = salvamento.concluir;

    function desenharListaOnline(fichas) {
        const lista = porId('lista-fichas');
        lista.replaceChildren();
        if (!fichas.length) {
            const item = document.createElement('li');
            item.textContent = 'Nenhuma ficha online ainda. Crie uma ficha aqui ou importe um JSON em Local.';
            lista.append(item);
        }
        for (const ficha of fichas) {
            const ativa = estado.modoEdicao === 'nuvem' && ficha.id === estado.fichaNuvem?.id;
            lista.append(desenharLinha(ficha, painelOnline, [
                [ativa ? 'Aberta' : 'Abrir', () => abrirFichaOnline(ficha.id), ativa, 'amarelo'],
                ['Duplicar', () => duplicarOnline(ficha), false, 'amarelo'],
                ['Renomear', () => renomearOnline(ficha)],
                ['Excluir na nuvem', () => excluirOnline(ficha), false, 'vermelho'],
            ], ativa));
        }
    }

    async function atualizarListaOnline() {
        if (!estado.usuario || !estado.repositorioNuvem) return;
        const geracao = estado.geracaoConta;
        const uid = estado.usuario.id;
        mensagem('mensagem-fichas', 'Consultando fichas…');
        let fichas = [];
        try {
            fichas = await estado.repositorioNuvem.listar();
            if (geracao !== estado.geracaoConta) return;
            desenharListaOnline(fichas);
            mensagem('mensagem-fichas', `${fichas.length} ficha(s) online na sua conta.`);
        } catch (erro) {
            if (geracao !== estado.geracaoConta) return;
            mensagem('mensagem-fichas', `Falha ao listar fichas: ${erro.message}`, true);
        }

        if (geracao !== estado.geracaoConta) return;
        try {
            await estado.painelConvites?.atualizar(uid, fichas);
        } catch (erro) {
            if (geracao !== estado.geracaoConta) return;
            console.warn('Não foi possível consultar os convites das campanhas.', erro);
            mensagem('mensagem-conta',
                `As fichas estão disponíveis, mas os convites de mesa não puderam ser carregados: ${erro.message}`, true);
        }
    }

    async function abrirFichaOnline(id) {
        const geracao = estado.geracaoConta;
        if (!(await concluirSalvamento()))
            throw new Error('Não foi possível salvar a ficha atual; tente novamente.');
        if (geracao !== estado.geracaoConta || !estado.usuario) return;
        const registro = await estado.repositorioNuvem.obter(id);
        if (geracao !== estado.geracaoConta) return;
        const rascunho = repositorioLocal.lerRascunho(estado.usuario.id, id);
        estado.fichaNuvem = { id: registro.id, titulo: registro.titulo, updated_at: registro.updated_at };
        estado.modoEdicao = 'nuvem';
        carregarFicha(normalizarFicha(rascunho?.dados || registro.dados));
        localStorage.setItem(chaveUltima(estado.usuario.id), id);
        atualizarInterface();
        estadoSalvamento(rascunho ? 'Rascunho local aguardando sincronização' : 'Ficha salva na nuvem');
        if (rascunho) salvamento.programarEnvio();
        fecharPaineis();
    }

    async function criarOnline(titulo, dados = null) {
        const geracao = estado.geracaoConta;
        if (!(await concluirSalvamento()))
            throw new Error('Salve a ficha atual antes de continuar.');
        const nova = dados || normalizarFicha({
            versao: 3, personagem: { 'nome-personagem': titulo },
        });
        if (geracao !== estado.geracaoConta || !estado.usuario) return;
        const registro = await estado.repositorioNuvem.criar(estado.usuario.id, tituloValido(titulo), nova);
        if (geracao === estado.geracaoConta) await abrirFichaOnline(registro.id);
    }

    async function renomearOnline(ficha) {
        const titulo = prompt('Novo nome da ficha online:', ficha.titulo);
        if (titulo === null) return;
        if (!titulo.trim()) throw new Error('O nome não pode ficar vazio.');
        const geracao = estado.geracaoConta;
        await estado.repositorioNuvem.renomear(ficha.id, tituloValido(titulo));
        if (geracao !== estado.geracaoConta) return;
        if (estado.fichaNuvem?.id === ficha.id) {
            estado.fichaNuvem.titulo = tituloValido(titulo);
            atualizarInterface();
        }
        await atualizarListaOnline();
    }

    async function duplicarOnline(ficha) {
        const geracao = estado.geracaoConta;
        if (!(await concluirSalvamento()))
            throw new Error('Não foi possível salvar a ficha atual.');
        if (geracao !== estado.geracaoConta) return;
        const registro = await estado.repositorioNuvem.obter(ficha.id);
        if (geracao !== estado.geracaoConta) return;
        const rascunho = repositorioLocal.lerRascunho(estado.usuario.id, ficha.id);
        await criarOnline(`${ficha.titulo} (cópia)`, normalizarFicha(rascunho?.dados || registro.dados));
    }

    async function excluirOnline(ficha) {
        if (!confirm(`Excluir "${ficha.titulo}" PERMANENTEMENTE do banco de dados?`))
            return;
        const uid = estado.usuario.id;
        const geracao = estado.geracaoConta;
        if (estado.fichaNuvem?.id === ficha.id) {
            if (salvamento.pendente() && !(await salvamento.salvarAgora())) return;
            salvamento.descartarAgendado();
        }
        await salvamento.aguardarEnvios();
        if (geracao !== estado.geracaoConta) return;
        try { await estado.repositorioNuvem.excluir(ficha.id); }
        catch (erro) {
            if (geracao === estado.geracaoConta && estado.fichaNuvem?.id === ficha.id) salvamento.programarEnvio();
            throw erro;
        }
        repositorioLocal.apagarRascunho(uid, ficha.id);
        await repositorioLocal.flush();
        if (geracao !== estado.geracaoConta) return;
        if (estado.fichaNuvem?.id === ficha.id) {
            salvamento.descartarAgendado();
            localStorage.removeItem(chaveUltima(estado.usuario.id));
            restaurarLocal();
        }
        await atualizarListaOnline();
    }
    async function importarArquivoOnline(arquivo) {
        const geracao = estado.geracaoConta;
        if (!estado.usuario)
            throw new Error('Entre com Google antes de importar para a nuvem.');
        const texto = await arquivo.text();
        const dados = interpretarArquivo(texto);
        const { principal, anterior } = await identificarArquivo(dados, texto);
        if (geracao !== estado.geracaoConta) return;
        const resultado = await estado.repositorioNuvem.criarImportada(
            estado.usuario.id, tituloDoPersonagem(dados), dados, principal, anterior
        );
        if (geracao !== estado.geracaoConta) return;
        if (resultado.duplicada) {
            await atualizarListaOnline();
            mensagem('mensagem-locais',
                `A ficha "${resultado.registro.titulo}" já foi importada para esta conta. Nenhuma duplicata foi criada.`);
            return;
        }
        await abrirFichaOnline(resultado.registro.id);
    }

    return { abrirFichaOnline, atualizarListaOnline, criarOnline, importarArquivoOnline };
}

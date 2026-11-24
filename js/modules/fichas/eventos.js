import { porId } from '../../utils/dom.js?v=1.4.21';

export function registrarEventosFicha({
    estado, paineis, salvamento, conta, locais, online,
    abrirConta, abrirOnline, abrirLocais, exportarFicha,
}) {
    const { painelConta, painelOnline, painelLocal, fecharPaineis, executar, mensagem } = paineis;
    const { entrarGoogle, sairGoogle } = conta;
    const { criarFichaLocal, importarArquivoLocal } = locais;
    const { atualizarListaOnline, criarOnline, importarArquivoOnline } = online;

    const ausentes = [];
    const escutar = (id, evento, acao) => {
        const elemento = porId(id);
        if (!elemento) {
            ausentes.push(id);
            return;
        }
        elemento.addEventListener(evento, acao);
    };

    escutar('btn-minhas-fichas', 'click', abrirOnline);
    escutar('btn-conta', 'click', abrirConta);
    escutar('abrir-conta-de-fichas', 'click', abrirConta);
    escutar('btn-fichas-locais', 'click', abrirLocais);
    escutar('fechar-painel-fichas', 'click', fecharPaineis);
    escutar('fechar-painel-conta', 'click', fecharPaineis);
    escutar('fechar-painel-locais', 'click', fecharPaineis);
    escutar('entrar-google', 'click', () => { void executar(painelConta, entrarGoogle, 'Conectando à conta…'); });
    escutar('sair-google', 'click', () => { void executar(painelConta, sairGoogle, 'Encerrando sessão…'); });
    escutar('atualizar-convites-mesa', 'click', () => {
        void executar(painelConta, atualizarListaOnline, 'Atualizando convites…');
    });
    escutar('copiar-codigo-jogador', 'click', () => {
        void executar(painelConta, async () => {
            if (!estado.usuario) return;
            if (navigator.clipboard?.writeText)
                await navigator.clipboard.writeText(estado.usuario.id);
            else
                prompt('Copie seu código de jogador:', estado.usuario.id);
            mensagem('mensagem-conta', 'Código de jogador pronto para enviar ao mestre.');
        });
    });

    escutar('form-criar-ficha', 'submit', (evento) => {
        evento.preventDefault();
        void executar(painelOnline, async () => {
            await criarOnline(porId('nome-nova-ficha').value);
            porId('nome-nova-ficha').value = '';
        }, 'Criando ficha…');
    });
    escutar('form-criar-local', 'submit', (evento) => {
        evento.preventDefault();
        void executar(painelLocal, async () => {
            await criarFichaLocal(porId('nome-nova-local').value);
            porId('nome-nova-local').value = '';
        }, 'Criando ficha local…');
    });

    escutar('exportar-json', 'click', exportarFicha);

    for (const [botao, input, painel, importar] of [
        ['importar-json-local', 'input-importar-local', painelLocal, importarArquivoLocal],
        ['importar-ficha-local', 'input-importar-online', painelLocal, importarArquivoOnline],
    ]) {
        escutar(botao, 'click', () => porId(input)?.click());
        escutar(input, 'change', (evento) => {
            const arquivo = evento.target.files?.[0];
            evento.target.value = '';
            if (arquivo) void executar(painel, () => importar(arquivo), 'Importando ficha…');
        });
    }

    const salvarAoSair = () => {
        if (salvamento.pendente()) void salvamento.salvarAgora();
    };
    window.addEventListener('pagehide', salvarAoSair);
    // Retoma o rascunho automaticamente quando a conexão volta.
    window.addEventListener('online', () => salvamento.tentarSincronizar());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') salvarAoSair();
    });

    if (ausentes.length) {
        const ids = [...new Set(ausentes)];
        console.warn('Railroad: controles ausentes no HTML:', ids);
        mensagem(
            'mensagem-conta',
            `Alguns controles não foram encontrados: ${ids.map((id) => `#${id}`).join(', ')}. ` +
                'Atualize todos os arquivos HTML do projeto.',
            true
        );
    }

}

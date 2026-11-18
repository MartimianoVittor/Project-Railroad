/**
 * Montagem das páginas e dos diálogos do Railroad Jogador.
 *
 * A barra lateral é parte fixa do index.html: Conta, Ficha e Local não
 * dependem de uma segunda requisição para aparecerem.
 */
(async () => {
    const VERSAO = '1.2.5';
    const alvos = [...document.querySelectorAll('[data-include]')];
    const dialogosEssenciais = new Set([
        'html/dialogs/conta.html',
        'html/dialogs/fichas.html',
        'html/dialogs/local.html',
    ]);

    const componentesObrigatorios = {
        'index.html': ['btn-conta', 'btn-minhas-fichas', 'btn-fichas-locais'],
        'html/dialogs/conta.html': ['painel-conta', 'entrar-google', 'mensagem-conta'],
        'html/dialogs/fichas.html': ['painel-fichas', 'abrir-conta-de-fichas'],
        'html/dialogs/local.html': ['painel-locais', 'exportar-json'],
    };

    const componentesDaFicha = {
        'html/jogador.html': ['nome-jogador'],
        'html/personagem.html': ['nome-personagem'],
        'html/inventario.html': ['rolagem-traco'],
        'html/quadro.html': ['quadro-rpg'],
    };

    function avisoInicializacao(texto) {
        console.error('Railroad:', texto);
        const aviso = document.createElement('p');
        aviso.className = 'aviso-inicializacao';
        aviso.setAttribute('role', 'alert');
        aviso.textContent = texto;
        document.body.prepend(aviso);
    }

    try {
        // Requisita os fragmentos em paralelo, mas um erro em uma página não
        // impede que os controles da conta sejam inicializados.
        const resultados = await Promise.allSettled(alvos.map(async (alvo) => {
            const caminho = alvo.dataset.include;
            const resposta = await fetch(`${caminho}?v=${VERSAO}`, { cache: 'no-store' });
            if (!resposta.ok)
                throw new Error(`Não foi possível carregar ${caminho} (HTTP ${resposta.status})`);
            return { alvo, caminho, html: await resposta.text() };
        }));

        const falhas = [];
        for (const resultado of resultados) {
            if (resultado.status === 'fulfilled') {
                const { alvo, html } = resultado.value;
                alvo.innerHTML = html;
            } else {
                falhas.push(resultado.reason.message);
            }
        }

        if (falhas.length) {
            const essenciaisAusentes = alvos.some((alvo, indice) =>
                resultados[indice].status === 'rejected'
                && dialogosEssenciais.has(alvo.dataset.include)
            );
            if (essenciaisAusentes)
                throw new Error(`Falha ao carregar os painéis: ${falhas.join('; ')}`);
            avisoInicializacao(`Uma página não pôde ser carregada: ${falhas.join('; ')}`);
        }

        for (const [caminho, ids] of Object.entries(componentesObrigatorios)) {
            const ausentes = ids.filter((id) => !document.getElementById(id));
            if (ausentes.length)
                throw new Error(
                    `Interface incompleta (${caminho}): ${ausentes.map((id) => `#${id}`).join(', ')}. `
                    + 'Verifique se os arquivos pertencem à mesma versão.'
                );
        }

        for (const [caminho, ids] of Object.entries(componentesDaFicha)) {
            const ausentes = ids.filter((id) => !document.getElementById(id));
            if (ausentes.length)
                console.warn(`Railroad: campos não encontrados em ${caminho}: ${ausentes.join(', ')}`);
        }

        window.dispatchEvent(new Event('railroad:fragmentos-carregados'));
        await import('./main.js?v=1.2.5');
    } catch (erro) {
        avisoInicializacao(`Não foi possível iniciar o Railroad: ${erro.message}`);
    }
})();

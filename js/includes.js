/**
 * Montagem das páginas e dos diálogos do Railroad Jogador.
 *
 * A barra lateral é parte fixa do index.html: Conta, Ficha e Local não
 * dependem de uma segunda requisição para aparecerem.
 */
(async () => {
    const VERSAO = '1.4.10';
    const dialogosEssenciais = new Set([
        'html/dialogs/conta.html',
        'html/dialogs/fichas.html',
        'html/dialogs/local.html',
    ]);

    const componentesObrigatorios = {
        'index.html': ['btn-conta', 'btn-minhas-fichas', 'btn-fichas-locais'],
        'html/dialogs/conta.html': ['painel-conta', 'entrar-google', 'mensagem-conta', 'personalizacao'],
        'html/dialogs/fichas.html': ['painel-fichas', 'abrir-conta-de-fichas'],
        'html/dialogs/local.html': ['painel-locais', 'exportar-json'],
    };

    const componentesDaFicha = {
        'html/jogador.html': ['nome-jogador'],
        'html/personagem.html': ['nome-personagem'],
        'html/inventario.html': ['rolagem-traco'],
        'html/quadro.html': ['quadro-rpg'],
        'html/personalizacao.html': ['rr-opcoes-botoes', 'rr-opcoes-retratos-jogador', 'rr-opcoes-fundos-cartao', 'rr-restaurar-aparencia'],
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
        // Os diálogos podem conter fragmentos aninhados (Conta → Personalização).
        // Carrega os arquivos por níveis, sem duplicar nós ou repetir uma requisição.
        const falhas = [];
        let essenciaisAusentes = false;
        for (let nivel = 0; nivel < 5; nivel += 1) {
            const alvos = [...document.querySelectorAll('[data-include]')];
            if (!alvos.length) break;
            const resultados = await Promise.allSettled(alvos.map(async (alvo) => {
                const caminho = alvo.dataset.include;
                const resposta = await fetch(`${caminho}?v=${VERSAO}`, { cache: 'no-store' });
                if (!resposta.ok)
                    throw new Error(`Não foi possível carregar ${caminho} (HTTP ${resposta.status})`);
                return { alvo, caminho, html: await resposta.text() };
            }));
            resultados.forEach((resultado, indice) => {
                const alvo = alvos[indice];
                const caminho = alvo.dataset.include;
                // Descarta o marcador após a tentativa para não criar ciclos.
                alvo.removeAttribute('data-include');
                if (resultado.status === 'fulfilled') {
                    alvo.innerHTML = resultado.value.html;
                } else {
                    falhas.push(resultado.reason.message);
                    if (dialogosEssenciais.has(caminho)) essenciaisAusentes = true;
                }
            });
        }
        if (document.querySelector('[data-include]'))
            throw new Error('Excesso de níveis em fragmentos HTML aninhados.');
        if (essenciaisAusentes)
            throw new Error(`Falha ao carregar os painéis: ${falhas.join('; ')}`);
        if (falhas.length)
            avisoInicializacao(`Uma página não pôde ser carregada: ${falhas.join('; ')}`);

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
        await import('./main.js?v=1.4.14');
    } catch (erro) {
        avisoInicializacao(`Não foi possível iniciar o Railroad: ${erro.message}`);
    }
})();

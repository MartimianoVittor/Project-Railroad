/* Navegação por páginas: mesma estrutura no desktop e no celular. */
(() => {
    const paginas = ['jogador', 'personagem', 'inventario', 'quadro-mobile'];
    const seletorPaginas = paginas.map((id) => `#${id}`).join(', ');
    const mediaMobile = window.matchMedia('(max-width: 768px)');
    const painelAcoes = document.getElementById('acoes-mobile');
    const fundoAcoes = document.getElementById('fundo-acoes-mobile');
    const botaoAcoes = document.getElementById('abrir-acoes-mobile');
    const botaoFechar = document.getElementById('fechar-acoes-mobile');
    let focoAnterior = null;

    function exibirAcoes(aberto) {
        if (!painelAcoes || !fundoAcoes || !botaoAcoes || !botaoFechar) return;
        painelAcoes.hidden = !aberto;
        fundoAcoes.hidden = !aberto;
        botaoAcoes.setAttribute('aria-expanded', String(aberto));
        if (aberto) {
            focoAnterior = document.activeElement;
            botaoFechar.focus();
        } else if (painelAcoes.contains(document.activeElement)) {
            focoAnterior?.focus();
        }
    }

    function organizarRolagens() {
        const rolagens = document.querySelector('.inventario-rolagens');
        const personagem = document.getElementById('personagem');
        const inventario = document.getElementById('inventario');
        if (!rolagens || !personagem || !inventario) return;

        const destino = mediaMobile.matches ? personagem : inventario;
        if (rolagens.parentElement !== destino) {
            if (mediaMobile.matches) personagem.append(rolagens);
            else inventario.prepend(rolagens);
        }
        rolagens.classList.toggle('rolagens-no-personagem', mediaMobile.matches);
    }

    // O quadro é um único componente: fica ao lado do Jogador no desktop
    // e ocupa sua própria página apenas em telas pequenas.
    function posicionarQuadro() {
        const conteudo = document.getElementById('quadro-rpg')?.closest('.col');
        const destino = mediaMobile.matches
            ? document.getElementById('quadro-mobile')
            : document.querySelector('#alvo-quadro-desktop .fragmento-quadro');

        if (conteudo && destino && conteudo.parentElement !== destino)
            destino.append(conteudo);
    }

    function ativarPagina(id, atualizarUrl = false) {
        const paginaSolicitada = paginas.includes(id) ? id : 'jogador';
        const pagina = !mediaMobile.matches && paginaSolicitada === 'quadro-mobile'
            ? 'jogador'
            : paginaSolicitada;

        posicionarQuadro();
        document.querySelectorAll(seletorPaginas).forEach((secao) => {
            const ativa = secao.id === pagina;
            secao.classList.toggle('ativa', ativa);
            secao.classList.toggle('tela-mobile-ativa', ativa);
            secao.hidden = !ativa;
            secao.setAttribute('aria-hidden', String(!ativa));
            secao.inert = !ativa;
            if (ativa) secao.scrollTop = 0;
        });
        document.querySelectorAll('[data-aba]').forEach((aba) => {
            const ativa = aba.dataset.aba === pagina;
            aba.classList.toggle('ativa', ativa);
            if (ativa) aba.setAttribute('aria-current', 'page');
            else aba.removeAttribute('aria-current');
        });
        if ((atualizarUrl || pagina !== paginaSolicitada) && location.hash !== `#${pagina}`)
            history.replaceState(null, '', `#${pagina}`);
        exibirAcoes(false);
        // Com os cartões sem rolagem própria, voltar ao topo ao trocar de aba.
        if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
        window.dispatchEvent(new CustomEvent('railroad:pagina-alterada', { detail: { pagina } }));
    }

    document.addEventListener('click', (evento) => {
        const aba = evento.target.closest('[data-aba]');
        if (!aba || !paginas.includes(aba.dataset.aba)) return;
        evento.preventDefault();
        ativarPagina(aba.dataset.aba, true);
    });

    botaoAcoes?.addEventListener('click', () => exibirAcoes(painelAcoes.hidden));
    botaoFechar?.addEventListener('click', () => exibirAcoes(false));
    fundoAcoes?.addEventListener('click', () => exibirAcoes(false));
    document.addEventListener('keydown', (evento) => {
        if (!painelAcoes || painelAcoes.hidden) return;
        if (evento.key === 'Escape') exibirAcoes(false);
        if (evento.key !== 'Tab') return;
        const controles = [...painelAcoes.querySelectorAll('button:not([disabled])')];
        const primeiro = controles[0];
        const ultimo = controles.at(-1);
        if (evento.shiftKey && document.activeElement === primeiro) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primeiro.focus();
        }
    });

    for (const [mobile, desktop] of [
        ['fichas-mobile', 'btn-minhas-fichas'],
        ['conta-mobile', 'btn-conta'],
        ['locais-mobile', 'btn-fichas-locais'],
    ]) {
        document.getElementById(mobile)?.addEventListener('click', () => {
            exibirAcoes(false);
            document.getElementById(desktop)?.click();
        });
    }

    window.addEventListener('railroad:fragmentos-carregados', () => {
        posicionarQuadro();
        organizarRolagens();
        ativarPagina(location.hash.slice(1));
    });
    window.addEventListener('hashchange', () => ativarPagina(location.hash.slice(1)));
    mediaMobile.addEventListener('change', () => {
        posicionarQuadro();
        organizarRolagens();
        ativarPagina(location.hash.slice(1));
    });
})();

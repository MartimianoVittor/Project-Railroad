const CLASSIFICACOES = Object.freeze({
    botao: 'rr-botao--',
    retrato: 'rr-retrato--',
    fundo: 'rr-fundo--',
    borda: 'rr-borda--',
});

/** Atualiza classes de uma família sem remover classes funcionais de outros módulos. */
function aplicarVariante(elemento, prefixo, opcao) {
    if (!elemento) return;
    for (const classe of [...elemento.classList]) {
        if (classe.startsWith(prefixo)) elemento.classList.remove(classe);
    }
    elemento.classList.add(prefixo + opcao);
}

const SELETOR_CARTOES = [
    '#jogador > .fragmento-coluna > .col',
    '#jogador > .painel-quadro-jogador',
    '#personagem > .col',
    '#inventario > .col',
    '#inventario > .inventario-itens',
    '#quadro-mobile > .col',
].join(', ');

export function personalizarCartoes(preferencias) {
    // O quadro muda de contêiner conforme a largura da tela. Remova temas
    // residuais dos cartões que deixaram de ser alvos antes de reaplicar.
    document.querySelectorAll('#jogador .rr-moldura-alvo, #quadro-mobile .rr-moldura-alvo').forEach((cartao) => {
        if (cartao.matches(SELETOR_CARTOES)) return;
        cartao.classList.remove('rr-moldura-alvo', 'rr-leitura-automatica');
        for (const classe of [...cartao.classList]) {
            if (classe.startsWith(CLASSIFICACOES.fundo) || classe.startsWith(CLASSIFICACOES.borda)) {
                cartao.classList.remove(classe);
            }
        }
    });
    document.querySelectorAll(SELETOR_CARTOES).forEach((cartao) => {
        cartao.classList.add('rr-moldura-alvo');
        aplicarVariante(cartao, CLASSIFICACOES.fundo, preferencias.fundoCartao);
        aplicarVariante(cartao, CLASSIFICACOES.borda, preferencias.borda);
        // A paleta é determinada pelo fundo do cartão, não por uma opção extra.
        cartao.classList.add('rr-leitura-automatica');
    });
}

function personalizarRetrato(secao, variante) {
    const moldura = document.querySelector(`${secao} .label-retrato`);
    if (!moldura) return;
    aplicarVariante(moldura, CLASSIFICACOES.retrato, variante);
    moldura.classList.add('rr-retrato');
    moldura.querySelector('.circulo-interno')?.classList.add('rr-retrato__foto');
}

/** Somente os três links que selecionam as páginas no menu desktop. */
const SELETOR_BOTOES = '.barra-lateral .menu-navegacao a.btn-nav[data-aba]';

function personalizarBotoes(preferencias) {
    document.querySelectorAll(SELETOR_BOTOES).forEach((link) => {
        link.classList.add('rr-botao-nav', 'rr-botao');
        aplicarVariante(link, CLASSIFICACOES.botao, preferencias.botao);
    });
}

const SELETOR_JANELAS = 'dialog.painel-fichas';

export function personalizarJanelas(preferencias) {
    document.querySelectorAll(SELETOR_JANELAS).forEach((janela) => {
        janela.classList.add('rr-moldura-alvo', 'rr-leitura-automatica');
        aplicarVariante(janela, CLASSIFICACOES.fundo, preferencias.fundoCartao);
        aplicarVariante(janela, CLASSIFICACOES.borda, preferencias.borda);
    });
}

function atualizarPrevia(preferencias) {
    const familias = { fundoTela: 'fundo', botao: 'botao', retratoJogador: 'retrato', retratoPersonagem: 'retrato' };
    for (const [categoria, familia] of Object.entries(familias)) {
        document.querySelectorAll(`[data-previa="${categoria}"]`).forEach(elemento => {
            aplicarVariante(elemento, CLASSIFICACOES[familia], preferencias[categoria]);
        });
    }
    const cartao = document.querySelector('[data-previa="cartao"]');
    aplicarVariante(cartao, CLASSIFICACOES.fundo, preferencias.fundoCartao);
    aplicarVariante(cartao, CLASSIFICACOES.borda, preferencias.borda);
}

export function atualizarVisual(preferencias) {
    aplicarVariante(document.body, CLASSIFICACOES.fundo, preferencias.fundoTela);
    personalizarCartoes(preferencias);
    personalizarJanelas(preferencias);
    personalizarRetrato('#jogador', preferencias.retratoJogador);
    personalizarRetrato('#personagem', preferencias.retratoPersonagem);
    personalizarBotoes(preferencias);
    atualizarPrevia(preferencias);

    document.querySelectorAll('#personalizacao input[data-rr-categoria]').forEach((input) => {
        input.checked = preferencias[input.dataset.rrCategoria] === input.value;
        input.closest('.rr-opcao-visual')?.classList.toggle('selecionada', input.checked);
    });
}

export function criarOpcao(categoria, valor, titulo) {
    const label = document.createElement('label');
    label.className = 'rr-opcao-visual';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `rr-aparencia-${categoria}`;
    input.value = valor;
    input.dataset.rrCategoria = categoria;
    const amostra = document.createElement('span');
    amostra.className = 'rr-amostra';
    amostra.dataset.modelo = valor;
    amostra.setAttribute('aria-hidden', 'true');

    if (categoria === 'botao') {
        amostra.classList.add('rr-amostra-botao');
        amostra.classList.add('rr-botao', `rr-botao--${valor}`);
        amostra.textContent = 'Escolher';
    } else if (categoria.startsWith('retrato')) {
        amostra.classList.add('rr-amostra-retrato');
        amostra.classList.add('rr-retrato', `rr-retrato--${valor}`);
    } else if (categoria.startsWith('fundo')) {
        amostra.classList.add('rr-amostra-fundo');
        amostra.classList.add(`rr-fundo--${valor}`);
        amostra.textContent = 'RAILROAD';
    } else {
        amostra.classList.add('rr-amostra-borda');
        amostra.classList.add(`rr-borda--${valor}`);
        amostra.textContent = 'Cartão';
    }
    const nome = document.createElement('span');
    nome.className = 'rr-opcao-nome';
    nome.textContent = titulo;
    label.append(input, amostra, nome);
    return label;
}

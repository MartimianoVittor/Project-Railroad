import { obterSupabase } from '../services/supabaseClient.js';
import { criarRepositorioPreferencias } from '../services/preferenciasRepository.js';

/**
 * Aparência da interface, independente do conteúdo das fichas.
 * Os identificadores correspondem às classes CSS do kit fornecido.
 * Não é permitido injetar classes/URLs arbitrárias a partir do armazenamento.
 */
const BOTOES = Object.freeze([
    ['cartucho-45', 'Munição .45'],
    ['cartucho-12', 'Munição calibre 12'],
    ['faca-bowie', 'Faca Bowie'],
]);
const RETRATOS = Object.freeze([
    ['estrela-de-xerife', 'Estrela de xerife'],
    ['cartaz-de-procurado', 'Cartaz de procurado'],
    ['camafeu-de-latao', 'Camafeu de latão'],
    ['moldura-de-latao', 'Moldura de latão'],
    ['tambor-de-revolver', 'Tambor de revólver'],
    ['placa-de-ferrovia', 'Placa de ferrovia'],
]);
const FUNDOS = Object.freeze([
    ['pergaminho', 'Pergaminho'],
    ['tabua', 'Tábua de saloon'],
    ['couro', 'Couro escuro'],
    ['mapa-topografico', 'Mapa topográfico'],
    ['latao', 'Latão hachurado'],
    ['terracota', 'Terracota'],
    ['ferrovia', 'Trilhos de ferrovia'],
    ['jornal', 'Jornal antigo'],
    ['aco-envelhecido', 'Aço envelhecido'],
]);
const BORDAS = Object.freeze([
    ['latonada', 'Borda latonada'],
    ['cartaz', 'Cartaz duplo'],
    ['ornamental', 'Gravura ornamental'],
    ['ferro-rebitado', 'Ferro rebitado'],
    ['ferrovia', 'Borda de ferrovia'],
    ['cantoneiras', 'Cantoneiras de cobre'],
    ['costura', 'Costura de sela'],
    ['chanfrada', 'Moldura chanfrada'],
    ['filete', 'Filete dourado'],
]);

export const OPCOES_VISUAIS = Object.freeze({
    botao: BOTOES,
    retratoJogador: RETRATOS,
    retratoPersonagem: RETRATOS,
    fundoTela: FUNDOS,
    fundoCartao: FUNDOS,
    borda: BORDAS,
});

const CHAVE = 'railroad_jogador_aparencia_v2';
const CHAVE_ANTIGA = 'railroad_jogador_aparencia_v1';
const PADRAO = Object.freeze({
    ...Object.fromEntries(Object.entries(OPCOES_VISUAIS).map(([categoria, opcoes]) => [categoria, opcoes[0][0]])),
    retratoPersonagem: 'cartaz-de-procurado',
});
const CLASSIFICACOES = Object.freeze({
    botao: 'rr-botao--',
    retrato: 'rr-retrato--',
    fundo: 'rr-fundo--',
    borda: 'rr-borda--',
});
let preferencias = { ...PADRAO };

export function validarPreferencias(entrada) {
    const objeto = entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? { ...entrada } : {};
    if (objeto.borda === 'hachurada') objeto.borda = 'ornamental';
    return Object.fromEntries(Object.keys(PADRAO).map((categoria) => [
        categoria,
        OPCOES_VISUAIS[categoria].some(([id]) => id === objeto[categoria]) ? objeto[categoria] : PADRAO[categoria],
    ]));
}

/** Converte a atualização anterior sem modificar ou sobrescrever as fichas. */
export function migrarPreferenciasAnteriores(entrada) {
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { ...PADRAO };
    const mapas = {
        botao: { bowie: 'faca-bowie', calibre12: 'cartucho-12' },
        retrato: {
            estrela: 'estrela-de-xerife', procurado: 'cartaz-de-procurado',
            camafeu: 'camafeu-de-latao', cobre: 'moldura-de-latao',
            tambor: 'tambor-de-revolver', ferrovia: 'placa-de-ferrovia',
        },
        fundo: { camafeu: 'couro', topografica: 'mapa-topografico' },
    };
    const botao = mapas.botao[entrada.botao] || entrada.botao;
    const retrato = mapas.retrato[entrada.retrato] || entrada.retrato;
    const fundo = mapas.fundo[entrada.fundo] || entrada.fundo;
    return validarPreferencias({
        botao,
        retratoJogador: retrato,
        retratoPersonagem: retrato,
        fundoTela: fundo,
        fundoCartao: PADRAO.fundoCartao,
        borda: entrada.borda,
    });
}

function recuperarPreferencias(armazenamento) {
    try {
        const atual = armazenamento.getItem(CHAVE);
        if (atual !== null) return validarPreferencias(JSON.parse(atual));
        return migrarPreferenciasAnteriores(JSON.parse(armazenamento.getItem(CHAVE_ANTIGA) || 'null'));
    } catch (erro) {
        console.warn('Railroad: não foi possível ler as preferências visuais.', erro);
        return { ...PADRAO };
    }
}

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

function personalizarCartoes() {
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

function personalizarBotoes() {
    document.querySelectorAll(SELETOR_BOTOES).forEach((link) => {
        link.classList.add('rr-botao-nav', 'rr-botao');
        aplicarVariante(link, CLASSIFICACOES.botao, preferencias.botao);
    });
}

function atualizarPrevia() {
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

function atualizarVisual() {
    aplicarVariante(document.body, CLASSIFICACOES.fundo, preferencias.fundoTela);
    personalizarCartoes();
    personalizarRetrato('#jogador', preferencias.retratoJogador);
    personalizarRetrato('#personagem', preferencias.retratoPersonagem);
    personalizarBotoes();
    atualizarPrevia();

    document.querySelectorAll('#personalizacao input[data-rr-categoria]').forEach((input) => {
        input.checked = preferencias[input.dataset.rrCategoria] === input.value;
        input.closest('.rr-opcao-visual')?.classList.toggle('selecionada', input.checked);
    });
}

function criarOpcao(categoria, valor, titulo) {
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

export function iniciarPersonalizacao(armazenamento = null) {
    if (!armazenamento) {
        try { armazenamento = window.localStorage; }
        catch { /* Sem armazenamento, a interface permanece utilizável. */ }
    }
    preferencias = armazenamento ? recuperarPreferencias(armazenamento) : { ...PADRAO };
    const painel = document.getElementById('personalizacao');
    if (!painel) return;
    for (const [categoria, opcoes] of Object.entries(OPCOES_VISUAIS)) {
        const grade = painel.querySelector(`[data-opcoes="${categoria}"]`);
        if (grade) grade.replaceChildren(...opcoes.map(([valor, titulo]) => criarOpcao(categoria, valor, titulo)));
    }
    atualizarVisual();

    window.addEventListener('railroad:pagina-alterada', personalizarCartoes);
    const status = document.getElementById('rr-status-aparencia');
    const botaoSalvar = document.getElementById('rr-salvar-aparencia');
    const botaoRestaurar = document.getElementById('rr-restaurar-aparencia');
    const botaoFechar = document.getElementById('rr-fechar-aparencia');
    let confirmadas = { ...preferencias };
    let usuarioId = null;
    let geracao = 0;
    let ocupado = false;
    let carregando = false;
    let falhaCarga = false;
    function atualizarControles() {
        botaoSalvar.disabled = ocupado || carregando || falhaCarga;
        botaoRestaurar.disabled = ocupado || carregando;
        botaoFechar.disabled = ocupado;
        painel.querySelectorAll('input[data-rr-categoria]').forEach(input => {
            input.disabled = ocupado || carregando;
        });
    }
    async function repositorio() {
        const cliente = await obterSupabase();
        if (!cliente) throw new Error('Supabase não configurado');
        return criarRepositorioPreferencias(cliente);
    }
    async function sincronizar(id, forcar = false) {
        if (id === usuarioId && !forcar) return;
        const atual = ++geracao;
        usuarioId = id;
        ocupado = false;
        falhaCarga = false;
        carregando = Boolean(id);
        // Nunca exibir preferências da conta anterior durante a troca.
        confirmadas = id ? { ...PADRAO } : (armazenamento ? recuperarPreferencias(armazenamento) : { ...PADRAO });
        preferencias = { ...confirmadas };
        atualizarVisual();
        atualizarControles();
        status.textContent = id ? 'Carregando preferências da conta…' : '';
        if (!id) return;
        try {
            const remoto = await (await repositorio()).carregar(id);
            if (atual !== geracao) return;
            confirmadas = remoto ? validarPreferencias(remoto) : { ...PADRAO };
            preferencias = { ...confirmadas };
            atualizarVisual();
            status.textContent = '';
        } catch (erro) {
            if (atual !== geracao) return;
            falhaCarga = true;
            status.textContent = 'Não foi possível carregar as preferências. Feche e abra novamente para tentar.';
            console.warn('Railroad: falha ao carregar aparência.', erro);
        } finally {
            if (atual === geracao) { carregando = false; atualizarControles(); }
        }
    }
    document.addEventListener('railroad:auth', evento => {
        void sincronizar(evento.detail.usuarioId ?? null);
    });
    document.querySelectorAll('[data-abrir-personalizacao]').forEach(botao => botao.addEventListener('click', () => {
        if (painel.open) return;
        preferencias = { ...confirmadas };
        atualizarVisual();
        if (falhaCarga) void sincronizar(usuarioId, true);
        else if (!carregando) status.textContent = '';
        painel.showModal();
    }));
    botaoFechar.addEventListener('click', () => painel.close());
    painel.addEventListener('cancel', evento => { if (ocupado) evento.preventDefault(); });
    painel.addEventListener('close', () => {
        preferencias = { ...confirmadas };
        atualizarVisual();
    });
    botaoSalvar.addEventListener('click', async () => {
        if (ocupado || carregando || falhaCarga) return;
        const atual = geracao;
        const id = usuarioId;
        const escolhas = { ...preferencias };
        ocupado = true;
        atualizarControles();
        status.textContent = 'Salvando…';
        try {
            if (id) await (await repositorio()).salvar(id, escolhas);
            else {
                if (!armazenamento) throw new Error('Armazenamento local bloqueado');
                armazenamento.setItem(CHAVE, JSON.stringify(escolhas));
            }
            if (atual !== geracao) return;
            confirmadas = escolhas;
            status.textContent = id ? 'Preferências salvas na conta.' : 'Preferências salvas neste navegador.';
            painel.close();
        } catch (erro) {
            if (atual !== geracao) return;
            status.textContent = 'Não foi possível salvar. Suas escolhas continuam na prévia; tente novamente.';
            console.warn('Railroad: falha ao salvar aparência.', erro);
        } finally {
            if (atual === geracao) { ocupado = false; atualizarControles(); }
        }
    });
    painel.addEventListener('change', evento => {
        if (ocupado || carregando) return;
        const input = evento.target.closest('input[data-rr-categoria]');
        if (!input?.checked) return;
        const categoria = input.dataset.rrCategoria;
        if (!OPCOES_VISUAIS[categoria]?.some(([valor]) => valor === input.value)) return;
        preferencias[categoria] = input.value;
        atualizarVisual();
    });
    botaoRestaurar.addEventListener('click', () => {
        preferencias = { ...PADRAO };
        atualizarVisual();
    });
}

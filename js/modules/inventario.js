/** Inventário único: itens, armas, munição e rolagem genérica. */
const ARMAS = ['primaria', 'secundaria'];
const DISTANCIAS = ['corpo', 'curta', 'media', 'longa'];
const DADOS_POR_NIVEL = [4, 6, 8, 12];
const LIMITE_MUNICAO = 99;
const IDS = [
    'rolagem-traco',
    'rolagem-bonus',
    'espaco-maximo-jogador',
    'espaco-maximo-montaria',
    ...ARMAS.flatMap((arma) => [
        `arma-${arma}`,
        `municao-${arma}`,
        ...DISTANCIAS.map((distancia) => `bonus-${arma}-${distancia}`),
    ]),
];
let itens = [];
let agendarSalvamento = () => { };
const elemento = (id) => document.getElementById(id);
const limitarMunicao = (valor) => Math.max(0, Math.min(LIMITE_MUNICAO, Number.parseInt(valor, 10) || 0));
function coletarControles() {
    return Object.fromEntries(IDS.map((id) => [id, elemento(id)?.value ?? '']));
}
export function coletarInventario() {
    return {
        itens: itens.map((item) => ({
            ...item,
            quantidade: numeroInteiro(item.quantidade),
            tamanho: numeroInteiro(item.tamanho),
            local: item.local === '' ? '' : (item.local === 'montaria' ? 'montaria' : 'jogador'),
        })),
        rolagens: {
            ...coletarControles(),
            'espaco-maximo-jogador': String(numeroInteiro(elemento('espaco-maximo-jogador')?.value)),
            'espaco-maximo-montaria': String(numeroInteiro(elemento('espaco-maximo-montaria')?.value)),
        },
    };
}
export function listarItens() {
    return itens.map((item) => ({ ...item }));
}
/** Converte o valor para um inteiro não negativo. */
function numeroInteiro(valor) {
    const numero = Number(String(valor ?? '').trim().replace(',', '.'));
    return Number.isFinite(numero) ? Math.max(0, Math.trunc(numero)) : 0;
}
/** Calcula o espaço total ocupado pelos itens. */
function atualizarEspacoOcupado() {
    const totais = { jogador: 0, montaria: 0 };
    for (const item of itens) {
        const local = item.local;
        if (!Object.hasOwn(totais, local))
            continue;
        totais[local] += numeroInteiro(item.quantidade) * numeroInteiro(item.tamanho);
    }
    for (const local of Object.keys(totais)) {
        const campo = elemento(`espaco-ocupado-${local}`);
        if (campo)
            campo.value = String(totais[local]);
    }
}
/** Cria o marcador de localização, independente da imagem usada no CSS. */
function criarCelulaLocal(item, local, icone, titulo) {
    const celula = document.createElement('td');
    celula.className = `celula-local-item celula-local-${local}`;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `botao-local-item icone-${icone}`;
    botao.dataset.local = local;
    botao.title = titulo;
    botao.setAttribute('aria-label', titulo);
    botao.setAttribute('aria-pressed', String(item.local === local));

    botao.addEventListener('click', () => {
        item.local = item.local === local ? '' : local;

        // A localização, não a classe do ícone, define o estado salvo.
        celula.parentElement?.querySelectorAll('.botao-local-item').forEach((controle) => {
            controle.setAttribute('aria-pressed', String(controle.dataset.local === item.local));
        });

        atualizarEspacoOcupado();
        agendarSalvamento();
    });

    celula.append(botao);
    return celula;
}

function criarCelula(item, campo, rotulo, tipo = 'text') {
    const celula = document.createElement('td');
    const input = document.createElement('input');
    input.type = tipo;
    input.value = item[campo] ?? '';
    input.setAttribute('aria-label', rotulo);
    input.dataset.campoItem = campo;
    if (campo === 'quantidade') {
        input.min = '0';
        input.step = '1';
    }
    if (campo === 'tamanho') {
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.inputMode = 'numeric';
        input.placeholder = '0';
    }
    input.addEventListener('input', () => {
        item[campo] = input.value;
        if (campo === 'quantidade' || campo === 'tamanho') {
            atualizarEspacoOcupado();
        }
        agendarSalvamento();
    });
    if (campo === 'quantidade' || campo === 'tamanho') {
        input.addEventListener('change', () => {
            const inteiro = numeroInteiro(input.value);
            input.value = String(inteiro);
            item[campo] = inteiro;
            atualizarEspacoOcupado();
            agendarSalvamento();
        });
    }
    celula.append(input);
    return celula;
}
function renderizarItens() {
    const corpo = elemento('lista-itens');
    if (!corpo)
        return;
    corpo.replaceChildren();
    itens.forEach((item, indice) => {
        const linha = document.createElement('tr');
        linha.append(
            criarCelulaLocal(item, 'jogador', 'chapeu', 'Chapéu: carregado pelo jogador'),
            criarCelulaLocal(item, 'montaria', 'alforge', 'Alforge: carregado pela montaria'),
            criarCelula(item, 'nome', 'Nome do item'),
            criarCelula(item, 'quantidade', 'Quantidade do item', 'number'),
            criarCelula(item, 'tamanho', 'Tamanho do item'),
            criarCelula(item, 'descricao', 'Descrição do item')
        );
        const celulaAcoes = document.createElement('td');
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'botao-remover-item';
        remover.textContent = '×';
        remover.title = 'Remover item';
        remover.setAttribute('aria-label', `Remover item ${indice + 1}`);
        remover.addEventListener('click', () => {
            itens.splice(indice, 1);
            renderizarItens();
            agendarSalvamento();
        });
        celulaAcoes.append(remover);
        linha.append(celulaAcoes);
        corpo.append(linha);
    });
    atualizarEspacoOcupado();
}
function valorRestaurado(dados, id) {
    let valor = dados?.rolagens?.[id];
    // Compatibilidade com fichas antigas, que guardavam um bônus por arma.
    if (valor === undefined && id.startsWith('bonus-') && id.split('-').length === 3) {
        valor = dados?.rolagens?.[`bonus-${id.split('-')[1]}`];
    }
    return valor;
}
export function restaurarInventario(dados) {
    itens = Array.isArray(dados?.itens)
        ? dados.itens.filter((item) => item && typeof item === 'object').map((item) => ({
            ...item,
            quantidade: numeroInteiro(item.quantidade),
            tamanho: numeroInteiro(item.tamanho),
            local: item.local === '' ? '' : (item.local === 'montaria' ? 'montaria' : 'jogador'),
        }))
        : [];
    for (const id of IDS) {
        const campo = elemento(id);
        if (!campo)
            continue;
        let valor = valorRestaurado(dados, id);
        // Fichas antigas guardavam uma capacidade única.
        if (valor === undefined && id === 'espaco-maximo-jogador') {
            valor = dados?.rolagens?.['espaco-maximo'];
        }
        if (typeof valor === 'string' || typeof valor === 'number') {
            campo.value = id.startsWith('espaco-maximo-') ? String(numeroInteiro(valor)) : String(valor);
        }
        else if (campo.tagName === 'SELECT') {
            campo.value = id === 'rolagem-bonus' ? '0' : '';
        }
        else {
            campo.value = id.startsWith('espaco-maximo-') ? '0'
                : id.startsWith('bonus-') || id.startsWith('municao-') ? '0' : '';
        }
    }
    renderizarItens();
    document.querySelectorAll('.resultado-rolagem').forEach((saida) => {
        saida.textContent = '';
    });
}
function dadoDoTraco(grupo) {
    const marcadores = [...document.querySelectorAll('#personagem .check-tracos[data-grupo]')]
        .filter((marcador) => marcador.dataset.grupo === grupo);
    return Math.max(0, ...marcadores.map((marcador, indice) => valorDadoMarcado(marcador, indice)));
}
function valorDadoMarcado(marcador, indice) {
    return marcador.checked ? DADOS_POR_NIVEL[indice] : 0;
}
function rolarTraco() {
    const saida = elemento('resultado-traco');
    const grupo = elemento('rolagem-traco')?.value;
    if (!saida)
        return;
    if (!grupo) {
        saida.textContent = 'Escolha um traço antes de rolar.';
        return;
    }
    const faces = dadoDoTraco(grupo);
    if (!faces) {
        saida.textContent = 'Este traço não possui dados marcados.';
        return;
    }
    const sorteio = new Uint32Array(1);
    crypto.getRandomValues(sorteio);
    const dado = 1 + Math.floor((sorteio[0] / 4294967296) * faces);
    const bonus = Number(elemento('rolagem-bonus')?.value) || 0;
    saida.textContent = `d${faces}: ${dado} ${bonus < 0 ? '−' : '+'} ${Math.abs(bonus)} = ${dado + bonus}`;
}
function iniciarContadorMunicao() {
    document.addEventListener('click', (event) => {
        const botao = event.target.closest('[data-municao][data-direcao]');
        if (!botao)
            return;
        const campo = elemento(`municao-${botao.dataset.municao}`);
        if (!campo)
            return;
        const incremento = Number(botao.dataset.direcao);
        campo.value = String(limitarMunicao(limitarMunicao(campo.value) + incremento));
        agendarSalvamento();
    });
    document.addEventListener('change', (event) => {
        const campo = event.target;
        if (!campo.matches('.municao-valor'))
            return;
        campo.value = String(limitarMunicao(campo.value));
        agendarSalvamento();
    });
}
export function iniciarInventario(agendar) {
    agendarSalvamento = agendar;
    const area = elemento('inventario');
    if (!area)
        return;
    // Os campos são movidos entre Inventário e Personagem no layout mobile.
    document.addEventListener('input', (event) => {
        if (event.target.matches('.campo-inventario'))
            agendarSalvamento();
    });
    document.addEventListener('change', (event) => {
        if (event.target.matches('.campo-inventario'))
            agendarSalvamento();
    });
    elemento('adicionar-item')?.addEventListener('click', () => {
        itens.push({ nome: '', quantidade: 1, tamanho: 0, descricao: '', preco: 0, local: 'jogador' });
        renderizarItens();
        agendarSalvamento();
        elemento('lista-itens')?.lastElementChild?.querySelector('input')?.focus();
    });
    for (const local of ['jogador', 'montaria']) {
        const campo = elemento(`espaco-maximo-${local}`);
        campo?.addEventListener('input', agendarSalvamento);
        campo?.addEventListener('change', () => {
            campo.value = String(numeroInteiro(campo.value));
            agendarSalvamento();
        });
    }
    iniciarContadorMunicao();
    document.querySelector('[data-rolagem="traco"]')?.addEventListener('click', rolarTraco);
}

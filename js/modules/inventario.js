import { ARMAS, DISTANCIAS, inteiroNaoNegativo, normalizarInventario } from '../dominio/inventario.js?v=1.4.21';
import { porId } from '../utils/dom.js?v=1.4.21';
import { criarTabelaItens } from './inventario/itens.js?v=1.4.21';
import { iniciarRolagem } from './inventario/rolagem.js?v=1.4.21';

const LIMITE_MUNICAO = 99;
const limitarMunicao = (valor) => Math.max(0, Math.min(LIMITE_MUNICAO, Number.parseInt(valor, 10) || 0));
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

let agendarSalvamento = () => {};
const tabela = criarTabelaItens(() => agendarSalvamento());

export function listarItens() {
    return tabela.listar();
}

export function coletarInventario() {
    const rolagens = Object.fromEntries(IDS.map((id) => [id, porId(id)?.value ?? '']));
    for (const local of ['jogador', 'montaria']) {
        const id = 'espaco-maximo-' + local;
        rolagens[id] = String(inteiroNaoNegativo(rolagens[id]));
    }
    return { itens: listarItens(), rolagens };
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
    const inventario = normalizarInventario(dados);
    tabela.restaurar(inventario.itens);
    for (const id of IDS) {
        const campo = porId(id);
        if (!campo)
            continue;
        let valor = valorRestaurado(inventario, id);
        // Fichas antigas guardavam uma capacidade única.
        if (valor === undefined && id === 'espaco-maximo-jogador') {
            valor = inventario.rolagens['espaco-maximo'];
        }
        if (typeof valor === 'string' || typeof valor === 'number') {
            campo.value = id.startsWith('espaco-maximo-') ? String(inteiroNaoNegativo(valor)) : String(valor);
        }
        else if (campo.tagName === 'SELECT') {
            campo.value = id === 'rolagem-bonus' ? '0' : '';
        }
        else {
            campo.value = id.startsWith('espaco-maximo-') ? '0'
                : id.startsWith('bonus-') || id.startsWith('municao-') ? '0' : '';
        }
    }
    document.querySelectorAll('.resultado-rolagem').forEach((saida) => {
        saida.textContent = '';
    });
}

function iniciarContadorMunicao() {
    document.addEventListener('click', (event) => {
        const botao = event.target.closest('[data-municao][data-direcao]');
        if (!botao)
            return;
        const campo = porId(`municao-${botao.dataset.municao}`);
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
    const area = porId('inventario');
    if (!area)
        return;
    // Os campos são movidos entre Inventário e Personagem no layout mobile.
    const aoEditar = (evento) => {
        if (evento.target.matches('.campo-inventario')) agendarSalvamento();
    };
    document.addEventListener('input', aoEditar);
    document.addEventListener('change', aoEditar);
    porId('adicionar-item')?.addEventListener('click', tabela.adicionar);
    for (const local of ['jogador', 'montaria']) {
        const campo = porId(`espaco-maximo-${local}`);
        campo?.addEventListener('input', agendarSalvamento);
        campo?.addEventListener('change', () => {
            campo.value = String(inteiroNaoNegativo(campo.value));
            agendarSalvamento();
        });
    }
    iniciarContadorMunicao();
    iniciarRolagem();
}

import { DADOS_POR_NIVEL, TRACOS } from '../dominio/tracos.js?v=1.4.26';
import { elemento, porId } from '../utils/dom.js?v=1.4.26';
import { criarRetrato } from './retrato.js?v=1.4.26';

const retrato = criarRetrato('personagem');
const CAMPOS = [
    'nome-personagem', 'apelido-personagem', 'profissao-personagem', 'lingua-personagem',
    'fama', 'palavra', 'dinheiro', 'bio-personagem',
];
const MARCADORES = '#personagem .check-caveira[data-grupo], #personagem .check-tracos[data-grupo]';

function linhaTraco([grupo, nome]) {
    const linha = elemento('div', 'linha-check linha-traco');
    const dados = elemento('div', 'tracos-box');
    for (const faces of DADOS_POR_NIVEL) {
        const rotulo = elemento('label', 'marcador-dado');
        rotulo.title = `${nome} — d${faces}`;
        const campo = elemento('input', 'check-tracos');
        campo.type = 'checkbox';
        campo.dataset.grupo = grupo;
        campo.setAttribute('aria-label', `${nome}, d${faces}`);
        const icone = elemento('span', 'marcador-dado-visual');
        icone.setAttribute('aria-hidden', 'true');
        rotulo.append(campo, icone);
        dados.append(rotulo);
    }
    linha.append(elemento('label', 'nome-traco', nome + ':'), dados);
    return linha;
}

function montarTracos() {
    const grade = porId('tracos-personagem');
    if (!grade) return;
    const cabecalho = elemento('div', 'cabecalho-tracos');
    cabecalho.setAttribute('aria-hidden', 'true');
    cabecalho.append(elemento('span', '', 'TRAÇOS'), ...DADOS_POR_NIVEL.map((faces) => elemento('span', '', 'd' + faces)));
    grade.replaceChildren(cabecalho, ...TRACOS.map(linhaTraco));
}

export function coletarPersonagem() {
    const personagem = {};
    for (const id of CAMPOS) {
        const campo = porId(id);
        if (campo) personagem[id] = campo.value;
    }
    const marcadores = {};
    for (const campo of document.querySelectorAll(MARCADORES)) {
        (marcadores[campo.dataset.grupo] ??= []).push(campo.checked);
    }
    return { ...personagem, foto: retrato.coletar(), marcadores };
}

export function restaurarPersonagem(ficha) {
    const personagem = ficha?.personagem || {};
    for (const id of CAMPOS) {
        const campo = porId(id);
        if (campo) campo.value = typeof personagem[id] === 'string' ? personagem[id] : '';
    }
    const posicoes = {};
    for (const campo of document.querySelectorAll(MARCADORES)) {
        const grupo = campo.dataset.grupo;
        const indice = posicoes[grupo] ?? 0;
        campo.checked = personagem.marcadores?.[grupo]?.[indice] === true;
        posicoes[grupo] = indice + 1;
    }
    retrato.restaurar(personagem.foto);
}

export function observarPersonagem(agendar) {
    montarTracos();
    for (const id of CAMPOS) porId(id)?.addEventListener('input', agendar);
    for (const campo of document.querySelectorAll(MARCADORES)) campo.addEventListener('change', agendar);
    retrato.observar(agendar);
}

import { porId } from '../utils/dom.js?v=1.4.25';
import { criarRetrato } from './retrato.js?v=1.4.25';

const retrato = criarRetrato('jogador');
const CAMPOS = [['nome-jogador', 'nome'], ['apelido-jogador', 'apelido'], ['bio-jogador', 'bio']];

export function iniciarJogador(agendar) {
    retrato.observar(agendar);
    for (const [id] of CAMPOS) porId(id)?.addEventListener('input', agendar);
}

export function coletarJogador() {
    const dados = Object.fromEntries(CAMPOS.map(([id, chave]) => [chave, porId(id)?.value || '']));
    return { ...dados, fotoPerfil: retrato.coletar() };
}

export function restaurarJogador(ficha) {
    for (const [id, chave] of CAMPOS) {
        const campo = porId(id);
        if (campo) campo.value = typeof ficha[chave] === 'string' ? ficha[chave] : '';
    }
    retrato.restaurar(ficha.fotoPerfil);
}

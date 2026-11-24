import { facesDoTraco, TRACOS } from '../../dominio/tracos.js?v=1.4.19';
import { elemento, porId } from '../../utils/dom.js?v=1.4.19';

function rolarTraco() {
    const saida = porId('resultado-traco');
    const grupo = porId('rolagem-traco')?.value;
    if (!saida)
        return;
    if (!grupo) {
        saida.textContent = 'Escolha um traço antes de rolar.';
        return;
    }
    const marcas = Array.from(document.querySelectorAll('#personagem .check-tracos[data-grupo]'))
        .filter((campo) => campo.dataset.grupo === grupo)
        .map((campo) => campo.checked);
    const faces = facesDoTraco(marcas);
    if (!faces) {
        saida.textContent = 'Este traço não possui dados marcados.';
        return;
    }
    const sorteio = new Uint32Array(1);
    crypto.getRandomValues(sorteio);
    const dado = 1 + Math.floor((sorteio[0] / 4294967296) * faces);
    const bonus = Number(porId('rolagem-bonus')?.value) || 0;
    saida.textContent = `d${faces}: ${dado} ${bonus < 0 ? '−' : '+'} ${Math.abs(bonus)} = ${dado + bonus}`;
}

export function iniciarRolagem() {
    const seletor = porId('rolagem-traco');
    if (seletor) {
        const opcoes = TRACOS.map(([id, nome]) => {
            const opcao = elemento('option', '', nome);
            opcao.value = id;
            return opcao;
        });
        seletor.append(...opcoes);
    }
    document.querySelector('[data-rolagem="traco"]')?.addEventListener('click', rolarTraco);
}

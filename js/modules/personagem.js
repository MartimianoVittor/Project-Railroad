const SELETOR_MARCADORES = '#personagem .check-caveira[data-grupo], #personagem .check-tracos[data-grupo]';

function coletarMarcadores() {
    const marcadores = {};
    for (const input of document.querySelectorAll(SELETOR_MARCADORES)) {
        const grupo = input.dataset.grupo;
        (marcadores[grupo] ??= []).push(input.checked);
    }
    return marcadores;
}

function restaurarMarcadores(marcadores) {
    const posicoes = {};
    for (const input of document.querySelectorAll(SELETOR_MARCADORES)) {
        const grupo = input.dataset.grupo;
        const indice = posicoes[grupo] ?? 0;
        posicoes[grupo] = indice + 1;
        input.checked = Array.isArray(marcadores?.[grupo]) && marcadores[grupo][indice] === true;
    }
}

const CAMPOS = ['nome-personagem', 'apelido-personagem', 'profissao-personagem', 'lingua-personagem', 'fama', 'palavra', 'dinheiro', 'bio-personagem'];
export function coletarPersonagem() {
    const personagem = {};
    for (const id of CAMPOS) {
        const campo = document.getElementById(id);
        if (campo) personagem[id] = campo.value;
    }
    const foto = document.getElementById('foto-personagem');
    if (foto && !foto.src.startsWith('blob:')) personagem.foto = foto.getAttribute('src') || '';
    personagem.marcadores = coletarMarcadores();
    return personagem;
}
export function restaurarPersonagem(dados) {
    const personagem = dados?.personagem || {};
    for (const id of CAMPOS) {
        const campo = document.getElementById(id);
        if (campo) campo.value = typeof personagem[id] === 'string' ? personagem[id] : '';
    }
    restaurarMarcadores(personagem.marcadores);
    const foto = document.getElementById('foto-personagem');
    if (foto) foto.src = (typeof personagem.foto === 'string' && personagem.foto && !personagem.foto.startsWith('blob:')) ? personagem.foto : 'assets/imgs/imagemPersonagemPlaceholder.png';
}
export function observarPersonagem(agendar) {
    for (const id of CAMPOS) {
        const campo = document.getElementById(id);
        if (campo) campo.addEventListener('input', agendar);
    }
    document.querySelectorAll(SELETOR_MARCADORES).forEach(input => {
        input.addEventListener('change', agendar);
    });
    const inputFoto = document.getElementById('escolher-foto-personagem');
    const foto = document.getElementById('foto-personagem');
    inputFoto?.addEventListener('change', () => {
        const arquivo = inputFoto.files?.[0];
        if (!arquivo) return;
        if (!arquivo.type.startsWith('image/')) { alert('Selecione uma imagem válida.'); inputFoto.value = ''; return; }
        const leitor = new FileReader();
        leitor.onload = () => { if (foto) foto.src = leitor.result; agendar(); };
        leitor.onerror = () => alert('Não foi possível carregar a foto do personagem.');
        leitor.readAsDataURL(arquivo);
    });
}

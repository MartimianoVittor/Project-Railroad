/** Porta de entrada. Reutiliza o fluxo de OAuth existente em Conta. */
(() => {
    const entrada = document.getElementById('tela-entrada-jogador');
    const google = document.getElementById('entrada-google');
    const local = document.getElementById('entrada-local');
    const status = document.getElementById('entrada-jogador-status');
    let escolhaLocal = false;
    function atualizar(autenticado) {
        const exibir = !autenticado && !escolhaLocal;
        document.body.classList.toggle('entrada-pendente', exibir);
        entrada.hidden = !exibir;
        if (!autenticado && exibir) status.textContent = 'Entre para sincronizar suas fichas ou use uma ficha local.';
    }
    document.addEventListener('railroad:auth', evento => atualizar(evento.detail.autenticado));
    local.addEventListener('click', () => { escolhaLocal = true; atualizar(false); });
    google.addEventListener('click', () => {
        const botao = document.getElementById('entrar-google');
        if (!botao) { status.textContent = 'Aguarde a inicialização e tente novamente.'; return; }
        status.textContent = 'Abrindo a autenticação com Google…';
        botao.click();
    });
    // O fluxo de autenticação pode falhar (rede/configuração). O acesso local permanece disponível.
    window.addEventListener('pageshow', () => { if (!escolhaLocal && !entrada.hidden) status.textContent = 'Entre com Google ou continue com ficha local.'; });
})();

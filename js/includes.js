/* Monta os fragmentos HTML antes de executar o módulos da aplicação.
   Manter os IDs originais garante que os listeners encontrem seus elementos. */
(async () => {
    const alvos = [...document.querySelectorAll('[data-include]')];
    try {
        const fragmentos = await Promise.all(alvos.map(async alvo => {
            const caminho = alvo.dataset.include;
            const resposta = await fetch(caminho);
            if (!resposta.ok) throw new Error(`${caminho}: HTTP ${resposta.status}`);
            return resposta.text();
        }));
        alvos.forEach((alvo, i) => { alvo.innerHTML = fragmentos[i]; });
        // Um único quadro/canvas: no celular ele sai da coluna Jogador e vira tela própria.
        window.dispatchEvent(new Event('railroad:fragmentos-carregados'));
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'js/main.js';
        document.body.append(script);
    } catch (erro) {
        console.error('Railroad: não foi possível carregar os fragmentos.', erro);
        const aviso = document.createElement('p');
        aviso.textContent = 'Erro ao carregar a ficha. Execute o projeto com um servidor local (ex.: Live Server).';
        aviso.setAttribute('role', 'alert');
        document.body.prepend(aviso);
    }
})();

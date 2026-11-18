const STATUS_ENVIO = {
    pendente: 'Aguardando aprovação do mestre',
    aprovada: 'Aprovada para a campanha',
    recusada: 'Não aprovada pelo mestre',
};

function elemento(tag, classe, texto) {
    const criado = document.createElement(tag);
    if (classe) criado.className = classe;
    if (texto !== undefined) criado.textContent = texto;
    return criado;
}

/** Interface isolada das ações locais e do salvamento das fichas. */
export function criarPainelConvitesMesa({ repositorio, executarAcao }) {
    const lista = document.getElementById('lista-convites-mesas');
    const codigoJogador = document.getElementById('codigo-jogador-mesas');

    let usuarioId = null;
    let fichasOnline = [];
    let versaoConsulta = 0;

    function limpar() {
        versaoConsulta++;
        usuarioId = null;
        fichasOnline = [];
        lista.replaceChildren();
        codigoJogador.textContent = '—';
    }

    function acao(operacao) {
        void executarAcao(async () => {
            await operacao();
            if (usuarioId) await atualizar(usuarioId, fichasOnline);
        });
    }

    function criarBotao(rotulo, operacao) {
        const botao = elemento('button', 'botao-mesa', rotulo);
        botao.type = 'button';
        botao.addEventListener('click', () => acao(operacao));
        return botao;
    }

    function desenharConvite(convite) {
        const linha = elemento('li', 'cartao-convite-mesa');
        const cabecalho = elemento('div', 'cabecalho-convite-mesa');
        const titulo = elemento('h4', '', convite.campanha_nome);
        const status = elemento('span', `status-mesa status-${convite.status}`,
            convite.status === 'pendente' ? 'Convite recebido'
                : convite.status === 'aceito' ? 'Participando da mesa' : 'Convite recusado');
        cabecalho.append(titulo, status);
        linha.append(cabecalho);

        if (convite.status === 'pendente') {
            linha.append(elemento('p', 'dica-fichas',
                'O mestre convidou você para esta campanha. Aceitar não compartilha automaticamente nenhuma ficha.'));
            const controles = elemento('div', 'acoes-convite-mesa');
            controles.append(
                criarBotao('Aceitar ingresso', () => repositorio.responderConvite(convite.convite_id, true)),
                criarBotao('Recusar', () => repositorio.responderConvite(convite.convite_id, false)),
            );
            linha.append(controles);
        } else if (convite.status === 'aceito') {
            desenharFichasEnviadas(linha, convite);
        } else {
            linha.append(elemento('p', 'dica-fichas',
                'Você recusou o convite. Caso mude de ideia, peça ao mestre um novo convite.'));
        }
        return linha;
    }

    function desenharFichasEnviadas(linha, convite) {
        const envios = convite.envios || [];
        const introducao = elemento('p', 'dica-fichas',
            'Envie uma ou mais fichas online. O mestre poderá consultar os dados compartilhados de Jogador, Personagem e Inventário. Seu quadro de ideias permanece privado.');
        linha.append(introducao);

        const enviadas = elemento('ul', 'lista-envios-mesa');
        for (const envio of envios) {
            const item = elemento('li', 'envio-mesa');
            const informacao = elemento('div', 'informacoes-envio');
            informacao.append(
                elemento('strong', '', envio.titulo),
                elemento('small', `estado-envio estado-${envio.status}`,
                    STATUS_ENVIO[envio.status] || 'Status desconhecido'),
            );
            item.append(informacao,
                criarBotao('Retirar ficha', () => repositorio.retirarFicha(envio.envio_id)));
            enviadas.append(item);
        }
        if (envios.length) linha.append(enviadas);

        const idsEnviados = new Set(envios.map((envio) => envio.ficha_id));
        const disponiveis = fichasOnline.filter((ficha) => !idsEnviados.has(ficha.id));
        if (!disponiveis.length) {
            linha.append(elemento('p', 'dica-fichas',
                'Não há outras fichas online disponíveis para enviar. Crie uma ficha em Fichas ou importe um JSON em Local.'));
            return;
        }

        const formulario = elemento('form', 'form-enviar-ficha');
        const rotulo = elemento('label', '', 'Ingressar com ficha');
        const seletor = elemento('select', 'seletor-ficha-mesa');
        seletor.required = true;
        seletor.setAttribute('aria-label', 'Escolha a ficha online para enviar à campanha');
        const inicial = elemento('option', '', 'Selecione uma ficha online');
        inicial.value = '';
        seletor.append(inicial);
        for (const ficha of disponiveis) {
            const opcao = elemento('option', '', ficha.titulo);
            opcao.value = ficha.id;
            seletor.append(opcao);
        }
        rotulo.append(seletor);
        const enviar = elemento('button', 'botao-mesa botao-mesa-destaque', 'Enviar ao mestre');
        enviar.type = 'submit';
        formulario.append(rotulo, enviar);
        formulario.addEventListener('submit', (evento) => {
            evento.preventDefault();
            if (!seletor.value) return;
            acao(() => repositorio.enviarFicha(convite.convite_id, seletor.value));
        });
        linha.append(formulario);
    }

    async function atualizar(idUsuario, fichas) {
        usuarioId = idUsuario;
        fichasOnline = fichas;
        codigoJogador.textContent = idUsuario;
        const versao = ++versaoConsulta;

        const convites = await repositorio.listarConvites() || [];
        if (versao !== versaoConsulta || idUsuario !== usuarioId) return;

        const completos = await Promise.all(convites.map(async (convite) => ({
            ...convite,
            envios: convite.status === 'aceito'
                ? await repositorio.listarFichasEnviadas(convite.convite_id) || [] : [],
        })));
        if (versao !== versaoConsulta || idUsuario !== usuarioId) return;

        lista.replaceChildren();
        if (!completos.length) {
            const vazio = elemento('li', 'sem-convites-mesa',
                'Você ainda não recebeu convites. Envie seu código de jogador ao mestre para ser convidado.');
            lista.append(vazio);
            return;
        }

        const ordem = { pendente: 0, aceito: 1, recusado: 2 };
        completos.sort((a, b) => (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9));
        completos.forEach((convite) => lista.append(desenharConvite(convite)));
    }

    return { atualizar, limpar };
}

import { espacoOcupado, inteiroNaoNegativo } from '../../dominio/inventario.js?v=1.4.19';
import { porId } from '../../utils/dom.js?v=1.4.19';

export function criarTabelaItens(aoAlterar) {
    let itens = [];

    function atualizarEspacoOcupado() {
        for (const [local, total] of Object.entries(espacoOcupado(itens))) {
            const campo = porId(`espaco-ocupado-${local}`);
            if (campo) campo.value = String(total);
        }
    }

    /** Cria um botão para selecionar onde o item é carregado. */
    function criarBotaoLocal(item, local, icone, titulo) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = `botao-local-item icone-${icone}`;
        botao.dataset.local = local;
        botao.title = titulo;
        botao.setAttribute('aria-label', titulo);
        botao.setAttribute('aria-pressed', String(item.local === local));

        botao.addEventListener('click', () => {
            // Somente um local pode estar selecionado; clicar novamente desmarca.
            item.local = item.local === local ? '' : local;
            botao.closest('.local-item-controles')?.querySelectorAll('.botao-local-item')
                .forEach((controle) => {
                    controle.setAttribute('aria-pressed', String(controle.dataset.local === item.local));
                });
            atualizarEspacoOcupado();
            aoAlterar();
        });

        return botao;
    }

    /** Os dois ícones compartilham a coluna Local, inclusive no mobile. */
    function criarCelulaLocal(item) {
        const celula = document.createElement('td');
        celula.className = 'celula-local-item';

        const controles = document.createElement('div');
        controles.className = 'local-item-controles';
        controles.setAttribute('role', 'group');
        controles.setAttribute('aria-label', 'Local do item');
        controles.append(
            criarBotaoLocal(item, 'jogador', 'chapeu', 'Chapéu: carregado pelo personagem'),
            criarBotaoLocal(item, 'montaria', 'alforge', 'Alforge: carregado pela montaria')
        );
        celula.append(controles);
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
            aoAlterar();
        });
        if (campo === 'quantidade' || campo === 'tamanho') {
            input.addEventListener('change', () => {
                const inteiro = inteiroNaoNegativo(input.value);
                input.value = String(inteiro);
                item[campo] = inteiro;
                atualizarEspacoOcupado();
                aoAlterar();
            });
        }
        celula.append(input);
        return celula;
    }
    function renderizarItens() {
        const corpo = porId('lista-itens');
        if (!corpo)
            return;
        corpo.replaceChildren();
        itens.forEach((item, indice) => {
            const linha = document.createElement('tr');
            linha.append(
                criarCelulaLocal(item),
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
                aoAlterar();
            });
            celulaAcoes.append(remover);
            linha.append(celulaAcoes);
            corpo.append(linha);
        });
        atualizarEspacoOcupado();
    }

    function restaurar(lista) {
        itens = lista.map((item) => ({
            ...item, quantidade: inteiroNaoNegativo(item.quantidade), tamanho: inteiroNaoNegativo(item.tamanho),
        }));
        renderizarItens();
    }

    function adicionar() {
        itens.push({ nome: '', quantidade: 1, tamanho: 0, descricao: '', preco: 0, local: 'jogador' });
        renderizarItens();
        aoAlterar();
        porId('lista-itens')?.lastElementChild?.querySelector('input')?.focus();
    }

    function listar() {
        return itens.map((item) => ({
            ...item, quantidade: inteiroNaoNegativo(item.quantidade), tamanho: inteiroNaoNegativo(item.tamanho),
        }));
    }

    return { restaurar, listar, adicionar };
}

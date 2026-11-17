/** Ações de arquivo; o gerenciador decide entre modo local e conta Google. */
export function iniciarSidebar({ coletarFicha, baixarFicha, interpretarArquivo, importarFicha, apagarAtual, mostrarErro }) {
    document.getElementById('btn-exportar')?.addEventListener('click', () => {
        try {
            baixarFicha(coletarFicha());
        } catch (erro) {
            mostrarErro('Não foi possível exportar a ficha.', erro);
        }
    });

    document.getElementById('input-importar')?.addEventListener('change', async (evento) => {
        const arquivo = evento.target.files?.[0];
        if (!arquivo)
            return;
        try {
            let ficha;
            try {
                ficha = interpretarArquivo(await arquivo.text());
            } catch (erro) {
                mostrarErro('O arquivo selecionado não é um JSON válido do Railroad.', erro);
                return;
            }
            try {
                await importarFicha(ficha);
                alert('Ficha importada com sucesso!');
            } catch (erro) {
                mostrarErro('Não foi possível salvar a ficha importada. Confira a conexão e o banco de dados.', erro);
            }
        } finally {
            evento.target.value = '';
        }
    });

    document.getElementById('btn-apagar-ficha')?.addEventListener('click', () => {
        void apagarAtual();
    });
}

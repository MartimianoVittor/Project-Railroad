export function arquivoParaDataURL(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(new Error('Erro ao ler arquivo.'));
        leitor.readAsDataURL(arquivo);
    });
}
export function mostrarErro(mensagem, erro) {
    console.error(mensagem, erro || '');
    alert(mensagem);
}

import { arquivoParaDataURL, mostrarErro } from '../utils/arquivos.js?v=1.4.21';
import { porId } from '../utils/dom.js?v=1.4.21';

const RETRATO_VAZIO = 'assets/imgs/retrato-vazio.svg';

export function criarRetrato(tipo, lerImagem = arquivoParaDataURL) {
    let requisicao = 0;
    const foto = () => porId(`foto-${tipo}`);

    function restaurar(valor) {
        requisicao++;
        const imagem = foto();
        if (imagem) imagem.src = typeof valor === 'string' && valor && !valor.startsWith('blob:') ? valor : RETRATO_VAZIO;
    }

    function coletar() {
        const src = foto()?.getAttribute('src') || '';
        return src.startsWith('blob:') ? '' : src;
    }

    function observar(agendar) {
        const campo = porId(`escolher-foto-${tipo}`);
        campo?.addEventListener('change', async () => {
            const arquivo = campo.files?.[0];
            if (!arquivo) return;
            const atual = ++requisicao;
            campo.value = '';
            if (!arquivo.type.startsWith('image/')) return alert('Selecione uma imagem válida.');
            try {
                const src = await lerImagem(arquivo);
                const imagem = foto();
                if (atual !== requisicao || !imagem) return;
                imagem.src = src;
                agendar();
            } catch (erro) {
                if (atual === requisicao) mostrarErro('Não foi possível carregar a foto.', erro);
            }
        });
    }

    return { coletar, restaurar, observar };
}

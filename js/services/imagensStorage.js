/**
 * Imagens privadas no Supabase Storage.
 * O JSON contém referências estáveis (rr-storage:...), nunca URLs assinadas.
 * Imagens antigas em data:image continuam legíveis até o próximo salvamento remoto.
 * Nenhuma imagem é excluída automaticamente: falhas de RPC não perdem o original.
 */
export const BUCKET_IMAGENS = 'railroad-imagens';
export const PREFIXO_IMAGEM = 'rr-storage:';
export const MAX_IMAGEM_BYTES = 8 * 1024 * 1024;

const TIPOS = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' });
const RE_DATA = /^data:image\/(png|jpeg|webp|gif);base64,([a-z0-9+/=]+)$/i;
const RE_CAMINHO = /^(?:fichas\/[a-f0-9-]{36}|campanhas\/[a-f0-9-]{36}\/(?:npcs|sessoes|estados)\/[a-z0-9-]{1,100})\/[a-f0-9-]{36}\.(?:png|jpg|webp|gif)$/i;
const RE_ESCOPO = /^(?:fichas\/[a-f0-9-]{36}|campanhas\/[a-f0-9-]{36}\/(?:npcs|sessoes|estados)\/[a-z0-9-]{1,100})$/i;
const urlsParaReferencia = new Map();
const instancias = new WeakMap();

export function caminhoImagem(valor) {
    if (typeof valor !== 'string' || !valor.startsWith(PREFIXO_IMAGEM)) return '';
    const caminho = valor.slice(PREFIXO_IMAGEM.length);
    return RE_CAMINHO.test(caminho) ? caminho : '';
}

export function imagemSegura(valor) {
    return typeof valor === 'string' && (
        RE_DATA.test(valor) || Boolean(caminhoImagem(valor)) || urlsParaReferencia.has(valor)
        || /^assets\/imgs\/[\w./-]+\.(?:png|jpe?g|webp|gif|svg)$/i.test(valor)
    );
}

export function possuiImagensParaMigrar(documento, escopo) {
    if (typeof documento === 'string') {
        const valor = urlsParaReferencia.get(documento) || documento;
        const caminho = caminhoImagem(valor);
        return /^data:image\//i.test(valor) || Boolean(caminho && !caminho.startsWith(`${escopo}/`));
    }
    if (Array.isArray(documento)) return documento.some((item) => possuiImagensParaMigrar(item, escopo));
    return Boolean(documento && typeof documento === 'object' &&
        Object.values(documento).some((item) => possuiImagensParaMigrar(item, escopo)));
}

export function normalizarReferencias(documento) {
    if (typeof documento === 'string') return urlsParaReferencia.get(documento) || documento;
    if (Array.isArray(documento)) return documento.map(normalizarReferencias);
    if (documento && typeof documento === 'object') {
        return Object.fromEntries(Object.entries(documento).map(([k, v]) => [k, normalizarReferencias(v)]));
    }
    return documento;
}

function dadosDaImagem(dataURL) {
    const correspondencia = RE_DATA.exec(dataURL);
    if (!correspondencia) throw new Error('Imagem embutida inválida. Formatos permitidos: PNG, JPEG, WebP e GIF.');
    const extensao = correspondencia[1].toLowerCase() === 'jpeg' ? 'jpg' : correspondencia[1].toLowerCase();
    // Atob trabalha com texto base64, que não deve exceder o limite configurado.
    if (correspondencia[2].length > Math.ceil(MAX_IMAGEM_BYTES / 3) * 4 + 4)
        throw new Error('Imagem acima de 8 MiB. Comprima a imagem antes de salvar na nuvem.');
    const binario = atob(correspondencia[2]);
    if (binario.length > MAX_IMAGEM_BYTES)
        throw new Error('Imagem acima de 8 MiB. Comprima a imagem antes de salvar na nuvem.');
    const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
    return { bytes, mime: TIPOS[extensao], extensao };
}

function uuid() {
    if (!globalThis.crypto?.randomUUID) throw new Error('A conexão segura (HTTPS) é necessária para enviar imagens.');
    return globalThis.crypto.randomUUID();
}

async function transformar(valor, converter) {
    if (typeof valor === 'string') return converter(valor);
    if (Array.isArray(valor)) return Promise.all(valor.map((item) => transformar(item, converter)));
    if (valor && typeof valor === 'object') {
        const pares = await Promise.all(Object.entries(valor)
            .map(async ([chave, filho]) => [chave, await transformar(filho, converter)]));
        return Object.fromEntries(pares);
    }
    return valor;
}

/** Uma instância por cliente; os mapas guardam apenas hashes e links temporários. */
export function obterImagensStorage(cliente) {
    if (!cliente) throw new Error('Conexão do Supabase indisponível para imagens.');
    if (instancias.has(cliente)) return instancias.get(cliente);
    const arquivosEnviados = new Map();
    const enviosPendentes = new Map();
    const urlsAssinadas = new Map();
    const assinaturasPendentes = new Map();
    const armazenamento = cliente.storage?.from?.(BUCKET_IMAGENS);
    const exigirArmazenamento = () => {
        if (!armazenamento) throw new Error('Supabase Storage indisponível. Instale a migração SQL 016.');
        return armazenamento;
    };

    async function enviarBlob(blob, escopo, extensao, chave) {
        if (!RE_ESCOPO.test(escopo)) throw new Error('Destino de imagem inválido.');
        if (blob.size > MAX_IMAGEM_BYTES) throw new Error('Imagem acima de 8 MiB.');
        if (arquivosEnviados.has(chave)) return arquivosEnviados.get(chave);
        if (enviosPendentes.has(chave)) return enviosPendentes.get(chave);
        const tarefa = (async () => {
            const caminho = `${escopo}/${uuid()}.${extensao}`;
            const { error } = await exigirArmazenamento().upload(caminho, blob, {
                contentType: TIPOS[extensao], upsert: false, cacheControl: '3600',
            });
            if (error) throw new Error(`Falha no upload da imagem: ${error.message}`);
            const referencia = PREFIXO_IMAGEM + caminho;
            arquivosEnviados.set(chave, referencia);
            return referencia;
        })();
        enviosPendentes.set(chave, tarefa);
        try { return await tarefa; }
        finally { enviosPendentes.delete(chave); }
    }

    async function enviarDataURL(dataURL, escopo) {
        const { bytes, mime, extensao } = dadosDaImagem(dataURL);
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
            (b) => b.toString(16).padStart(2, '0')).join('');
        return enviarBlob(new Blob([bytes], { type: mime }), escopo, extensao, `${escopo}:${hash}`);
    }

    async function prepararDocumento(documento, escopo, { copiarDeOutroEscopo = true } = {}) {
        return transformar(documento, async (valor) => {
            const original = urlsParaReferencia.get(valor) || valor;
            if (/^data:image\//i.test(original)) return enviarDataURL(original, escopo);
            const caminho = caminhoImagem(original);
            if (!caminho || !copiarDeOutroEscopo || caminho.startsWith(`${escopo}/`)) return original;
            // Duplicação de personagem ou sessão: não vincular a cópia ao original.
            const chave = `${escopo}:copia:${caminho}`;
            if (arquivosEnviados.has(chave)) return arquivosEnviados.get(chave);
            const { data, error } = await exigirArmazenamento().download(caminho);
            if (error || !data) throw new Error(`Não foi possível copiar a imagem de origem: ${error?.message || caminho}`);
            const extensao = caminho.split('.').at(-1).toLowerCase();
            return enviarBlob(data, escopo, extensao, chave);
        });
    }

    async function resolverDocumento(documento) {
        return transformar(documento, async (valor) => {
            const caminho = caminhoImagem(valor);
            if (!caminho) return valor;
            const existente = urlsAssinadas.get(caminho);
            if (existente && existente.validoAte > Date.now()) return existente.url;
            if (assinaturasPendentes.has(caminho)) return assinaturasPendentes.get(caminho);
            const tarefa = (async () => {
                const { data, error } = await exigirArmazenamento().createSignedUrl(caminho, 3600);
                if (error || !data?.signedUrl)
                    throw new Error(`Não foi possível acessar imagem privada: ${error?.message || caminho}`);
                const url = data.signedUrl;
                urlsParaReferencia.set(url, valor);
                urlsAssinadas.set(caminho, { url, validoAte: Date.now() + 55 * 60 * 1000 });
                return url;
            })();
            assinaturasPendentes.set(caminho, tarefa);
            try { return await tarefa; }
            finally { assinaturasPendentes.delete(caminho); }
        });
    }

    /** Manutenção após salvamento confirmado; RLS verifica idade e referências. */
    async function limparImagensObsoletasDaFicha(fichaId) {
        if (!/^[a-f0-9-]{36}$/i.test(fichaId)) throw new Error('Ficha inválida.');
        const storage = exigirArmazenamento();
        const prefixo = `fichas/${fichaId}`;
        const limite = Date.now() - 30 * 86400000;
        for (let pagina = 0; pagina < 30; pagina++) {
            const { data, error } = await storage.list(prefixo, { limit: 100, offset: pagina * 100 });
            if (error) throw new Error(`Falha ao listar imagens: ${error.message}`);
            for (const arquivo of data || []) {
                if (!arquivo.id || !arquivo.created_at || Date.parse(arquivo.created_at) >= limite) continue;
                const caminho = `${prefixo}/${arquivo.name}`;
                if (RE_CAMINHO.test(caminho)) await storage.remove([caminho]);
            }
            if (!data || data.length < 100) break;
        }
    }

    async function incorporarDocumento(documento) {
        // Exportação JSON portável: restaurar data URLs apenas no arquivo exportado.
        return transformar(normalizarReferencias(documento), async (valor) => {
            const caminho = caminhoImagem(valor);
            if (!caminho) return valor;
            const { data, error } = await exigirArmazenamento().download(caminho);
            if (error || !data) throw new Error(`Não foi possível incluir uma imagem no backup: ${error?.message || caminho}`);
            if (data.size > MAX_IMAGEM_BYTES) throw new Error('Arquivo de imagem acima de 8 MiB.');
            return new Promise((resolve, reject) => {
                const leitor = new FileReader();
                leitor.onload = () => resolve(leitor.result);
                leitor.onerror = () => reject(new Error('Falha ao montar o backup da imagem.'));
                leitor.readAsDataURL(data);
            });
        });
    }

    const instancia = { prepararDocumento, resolverDocumento, incorporarDocumento, limparImagensObsoletasDaFicha };
    instancias.set(cliente, instancia);
    return instancia;
}

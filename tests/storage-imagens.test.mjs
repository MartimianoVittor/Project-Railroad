import test from 'node:test';
import assert from 'node:assert/strict';
import { obterImagensStorage, caminhoImagem, imagemSegura, normalizarReferencias,
    possuiImagensParaMigrar } from '../js/services/imagensStorage.js';
const FICHA_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FICHA_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const amostra = 'data:image/png;base64,' + btoa('imagem-de-teste');
function clienteFake({ falharUpload = false, falharLeitura = false } = {}) {
    const arquivos = new Map();
    const uploads = [];
    const cliente = { storage: { from(bucket) {
        assert.equal(bucket, 'railroad-imagens');
        return {
            async upload(path, blob, opcoes) {
                await new Promise((resolver) => setTimeout(resolver, 2));
                uploads.push({ path, blob, opcoes });
                if (falharUpload) return { data: null, error: { message: 'Upload negado' } };
                arquivos.set(path, blob);
                return { data: { path }, error: null };
            },
            async createSignedUrl(path) {
                return falharLeitura ? { data: null, error: { message: 'Negado' } }
                    : { data: { signedUrl: `https://example.supabase.co/storage/v1/object/sign/railroad-imagens/${path}?token=abc` }, error: null };
            },
            async download(path) {
                return { data: arquivos.get(path), error: arquivos.has(path) ? null : { message: 'Ausente' } };
            },
        };
    } } };
    return { cliente, arquivos, uploads };
}

test('imagem Base64 vira referência privada e não duplica upload na mesma ficha', async () => {
    const fake = clienteFake();
    const imagens = obterImagensStorage(fake.cliente);
    const original = { pessoa: { foto: amostra }, quadro: { imagem: amostra } };
    assert.equal(possuiImagensParaMigrar(original, `fichas/${FICHA_A}`), true);
    const migrado = await imagens.prepararDocumento(original, `fichas/${FICHA_A}`);
    assert.equal(fake.uploads.length, 1);
    assert.equal(fake.uploads[0].opcoes.upsert, false);
    assert.equal(fake.uploads[0].opcoes.contentType, 'image/png');
    assert.ok(migrado.pessoa.foto.startsWith(`rr-storage:fichas/${FICHA_A}/`));
    assert.equal(migrado.quadro.imagem, migrado.pessoa.foto);
    assert.equal(original.pessoa.foto, amostra, 'documento original imutável');
    assert.equal(possuiImagensParaMigrar(migrado, `fichas/${FICHA_A}`), false);
    const resolvido = await imagens.resolverDocumento(migrado);
    assert.ok(resolvido.pessoa.foto.startsWith('https://'));
    assert.equal(normalizarReferencias(resolvido).pessoa.foto, migrado.pessoa.foto);
    assert.deepEqual(await imagens.prepararDocumento(resolvido, `fichas/${FICHA_A}`), migrado);
    assert.equal(fake.uploads.length, 1);
});

test('cópia de ficha guarda arquivo independente e pode ser exportada com imagem', async () => {
    const { cliente, uploads } = clienteFake();
    const imagens = obterImagensStorage(cliente);
    const primeira = await imagens.prepararDocumento({ foto: amostra }, `fichas/${FICHA_A}`);
    const outra = await imagens.prepararDocumento(primeira, `fichas/${FICHA_B}`);
    assert.notEqual(outra.foto, primeira.foto);
    assert.equal(uploads.length, 2);
    assert.equal(possuiImagensParaMigrar(primeira, `fichas/${FICHA_B}`), true);
    const leitorOriginal = globalThis.FileReader;
    globalThis.FileReader = class {
        readAsDataURL(blob) {
            blob.arrayBuffer().then((buffer) => {
                this.result = `data:${blob.type};base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`;
                this.onload();
            }).catch((erro) => this.onerror(erro));
        }
    };
    try {
        assert.deepEqual(await imagens.incorporarDocumento(outra), { foto: amostra });
    } finally { globalThis.FileReader = leitorOriginal; }
});

test('erros de Storage preservam documentos e impedem gravação com link falso', async () => {
    const { cliente } = clienteFake({ falharUpload: true });
    const imagens = obterImagensStorage(cliente);
    const original = { foto: amostra };
    await assert.rejects(() => imagens.prepararDocumento(original, `fichas/${FICHA_A}`), /Upload negado/);
    assert.deepEqual(original, { foto: amostra });
    await assert.rejects(() => imagens.prepararDocumento(
        { foto: 'data:image/svg+xml;base64,AAAA' }, `fichas/${FICHA_A}`), /Formatos permitidos/);
    assert.equal(caminhoImagem('rr-storage:../../chave'), '');
    assert.equal(imagemSegura('javascript:alert(1)'), false);
});

test('links temporários só são emitidos após autorização do servidor', async () => {
    const { cliente } = clienteFake({ falharLeitura: true });
    const imagens = obterImagensStorage(cliente);
    const texto = `rr-storage:fichas/${FICHA_A}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png`;
    await assert.rejects(() => imagens.resolverDocumento({ foto: texto }), /Não foi possível acessar/);
});

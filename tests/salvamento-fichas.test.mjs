import assert from 'node:assert/strict';
import test from 'node:test';
import { criarSalvamento } from '../js/modules/fichas/salvamento.js';
import { criarRepositorioLocal } from '../js/services/fichasLocais.js';
import { criarBancoEmMemoria } from './apoioBanco.mjs';

function armazenamentoEmMemoria() {
    const valores = new Map();
    return {
        getItem: (chave) => valores.get(chave) ?? null,
        setItem: (chave, valor) => valores.set(chave, valor),
        removeItem: (chave) => valores.delete(chave),
        key: (indice) => [...valores.keys()][indice],
        get length() { return valores.size; },
    };
}

async function preparar(t, salvar) {
    const local = criarRepositorioLocal(armazenamentoEmMemoria(), async () => criarBancoEmMemoria());
    await local.migrarAntiga((dados) => dados);
    const estado = {
        modoEdicao: 'nuvem', usuario: { id: 'A' }, geracaoConta: 1,
        fichaNuvem: { id: 'ficha' }, repositorioNuvem: { salvar },
    };
    let formulario;
    const avisos = [];
    const api = criarSalvamento({
        estado, repositorioLocal: local, coletarFicha: () => ({ nome: formulario }),
        informar: (texto) => avisos.push(texto),
    });
    t.after(() => api.descartarAgendado());
    async function editar(nome) {
        formulario = nome;
        api.agendarSalvamento();
        assert.equal(await api.salvarAgora(), true);
    }
    return { estado, local, api, editar, avisos };
}

test('uma gravação em andamento respeita a edição seguinte e confirma cada versão uma vez', async (t) => {
    const inicio = Promise.withResolvers();
    const resposta = Promise.withResolvers();
    const enviados = [];
    const { editar, api, local } = await preparar(t, async (id, dados) => {
        enviados.push([id, dados.nome]);
        if (enviados.length === 1) {
            inicio.resolve();
            await resposta.promise;
        }
    });
    await editar('Primeiro');
    const gravacao = api.concluir();
    await inicio.promise;
    await editar('Segundo');
    assert.equal(local.lerRascunho('A', 'ficha').dados.nome, 'Segundo');
    resposta.resolve();
    assert.equal(await gravacao, true);
    assert.deepEqual(enviados, [['ficha', 'Primeiro'], ['ficha', 'Segundo']]);
    assert.equal(local.lerRascunho('A', 'ficha'), null);
});

test('a resposta da conta anterior não remove o rascunho nem muda o aviso da conta aberta', async (t) => {
    const inicio = Promise.withResolvers();
    const resposta = Promise.withResolvers();
    const { editar, api, local, estado, avisos } = await preparar(t, async () => {
        inicio.resolve();
        await resposta.promise;
    });
    await editar('Alice');
    const gravacao = api.concluir();
    await inicio.promise;
    api.descartarAgendado();
    estado.usuario = { id: 'B' };
    estado.geracaoConta++;
    await editar('Beatriz');
    const totalAvisos = avisos.length;
    resposta.resolve();
    assert.equal(await gravacao, false);
    assert.equal(local.lerRascunho('A', 'ficha'), null);
    assert.equal(local.lerRascunho('B', 'ficha').dados.nome, 'Beatriz');
    assert.equal(avisos.length, totalAvisos);
});

test('perder conexão conserva o rascunho até uma nova tentativa bem-sucedida', async (t) => {
    let offline = true;
    const { editar, api, local } = await preparar(t, async () => {
        if (offline) throw new Error('rede interrompida');
    });
    t.mock.method(console, 'warn', () => {});
    await editar('Rascunho');
    assert.equal(await api.concluir(), false);
    assert.equal(local.lerRascunho('A', 'ficha').dados.nome, 'Rascunho');
    offline = false;
    assert.equal(await api.concluir(), true);
    assert.equal(local.lerRascunho('A', 'ficha'), null);
});

test('a fila local repete a gravação que falhou e abre a versão mais recente após recarregar', async () => {
    const banco = criarBancoEmMemoria();
    const memoria = armazenamentoEmMemoria();
    let indisponivel = true;
    const abrir = async () => ({
        ...banco, async gravarFicha(ficha) {
            if (indisponivel) throw new Error('disco temporariamente indisponível');
            await banco.gravarFicha(ficha);
        },
    });
    const local = criarRepositorioLocal(memoria, abrir);
    await local.migrarAntiga((dados) => dados);
    const ficha = local.criar('Original', { edicao: 1 });
    await assert.rejects(local.flush(), /disco temporariamente/);
    local.salvar(ficha.id, { edicao: 2 });
    await assert.rejects(local.flush(), /disco temporariamente/);
    indisponivel = false;
    await local.flush();
    const reaberto = criarRepositorioLocal(memoria, abrir);
    await reaberto.migrarAntiga((dados) => dados);
    assert.deepEqual(reaberto.obter(ficha.id).dados, { edicao: 2 });
});

test('ao voltar a conexão, o rascunho pode ser sincronizado sem nova edição', async (t) => {
    let disponivel = false;
    let envios = 0;
    const { editar, api, local } = await preparar(t, async () => {
        envios++;
        if (!disponivel) throw new Error('offline');
        return { updated_at: '2026-10-02T10:00:00.000Z' };
    });
    t.mock.method(console, 'warn', () => {});
    await editar('Versão pendente');
    assert.equal(await api.concluir(), false);
    assert.equal(envios, 1);
    disponivel = true;
    api.tentarSincronizar();
    await api.aguardarEnvios();
    assert.equal(envios, 2);
    assert.equal(local.lerRascunho('A', 'ficha'), null);
});

test('conflito de edição preserva o rascunho e bloqueia reenvio automático', async (t) => {
    let envios = 0;
    const { editar, api, local, avisos } = await preparar(t, async () => {
        envios++;
        const erro = new Error('Alteração externa');
        erro.code = 'FICHA_EM_CONFLITO';
        throw erro;
    });
    t.mock.method(console, 'warn', () => {});
    await editar('Minha alteração');
    assert.equal(await api.concluir(), false);
    api.tentarSincronizar();
    await api.aguardarEnvios();
    assert.equal(envios, 1);
    assert.equal(local.lerRascunho('A', 'ficha').dados.nome, 'Minha alteração');
    assert.ok(avisos.some((mensagem) => mensagem.includes('Conflito')));
});

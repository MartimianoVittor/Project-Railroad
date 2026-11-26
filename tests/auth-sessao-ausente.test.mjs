import test from 'node:test';
import assert from 'node:assert/strict';
import { criarConta } from '../js/modules/fichas/conta.js';

const erroSessao = () => Object.assign(new Error('Auth session missing!'), { name: 'AuthSessionMissingError' });

function preparar(auth) {
    // O painel de convites apenas consulta esses elementos durante sua inicialização.
    globalThis.document = {
        getElementById: () => ({ replaceChildren() {}, textContent: '' }),
    };
    const mudancas = [];
    const avisos = [];
    let fechamentos = 0;
    let chamadasConexao = 0;
    const estado = { usuario: { id: 'antigo' } };
    const paineis = {
        painelConta: {},
        executar: async (_painel, acao) => acao(),
        fecharPaineis: () => { fechamentos++; },
        mensagem: (_id, texto) => avisos.push(texto),
        estadoSalvamento: () => {},
    };
    const conta = criarConta({
        estado, paineis, configurado: () => true,
        conectar: async () => { chamadasConexao++; return { auth }; },
        aoMudarConta: async (usuario) => { mudancas.push(usuario); estado.usuario = usuario; },
        concluirSalvamento: async () => true,
    });
    return { conta, estado, mudancas, avisos, get fechamentos() { return fechamentos; }, get chamadasConexao() { return chamadasConexao; } };
}

test('logout com sessão válida invoca o Supabase e limpa o estado local', async () => {
    let chamadas = 0;
    const teste = preparar({
        getSession: async () => ({ data: { session: { access_token: 'token' } }, error: null }),
        signOut: async () => { chamadas++; return { error: null }; },
    });
    await teste.conta.sairGoogle();
    assert.equal(chamadas, 1);
    assert.deepEqual(teste.mudancas, [null]);
    assert.equal(teste.fechamentos, 1);
});

test('logout após expiração não envia /logout sem sessão', async () => {
    let chamadas = 0;
    const teste = preparar({
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => { chamadas++; return { error: null }; },
    });
    await teste.conta.sairGoogle();
    assert.equal(chamadas, 0);
    assert.equal(teste.estado.usuario, null);
    assert.equal(teste.fechamentos, 1);
});

test('getSession com AuthSessionMissingError é tratado como sessão encerrada', async () => {
    const teste = preparar({ getSession: async () => { throw erroSessao(); }, signOut: async () => { throw Error('não deve executar'); } });
    await teste.conta.sairGoogle();
    assert.deepEqual(teste.mudancas, [null]);
});

test('signOut pode retornar ou lançar AuthSessionMissingError durante corrida de sessão', async () => {
    for (const forma of ['retorno', 'excecao']) {
        const teste = preparar({
            getSession: async () => ({ data: { session: { access_token: 'antigo' } }, error: null }),
            signOut: async () => {
                if (forma === 'excecao') throw erroSessao();
                return { error: erroSessao() };
            },
        });
        await teste.conta.sairGoogle();
        assert.deepEqual(teste.mudancas, [null]);
        assert.equal(teste.fechamentos, 1);
    }
});

test('permissão negada real não é ocultada nem tratada como logout concluído', async () => {
    for (const origem of ['getSession', 'signOut']) {
        const erro = Object.assign(new Error('Acesso negado'), { status: 403, code: 'permission_denied' });
        const teste = preparar({
            getSession: async () => origem === 'getSession'
                ? { data: { session: null }, error: erro }
                : { data: { session: { access_token: 'token' } }, error: null },
            signOut: async () => ({ error: erro }),
        });
        await assert.rejects(teste.conta.sairGoogle(), /Acesso negado/);
        assert.equal(teste.fechamentos, 0);
        assert.equal(teste.estado.usuario?.id, 'antigo');
    }
});

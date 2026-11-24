# Correção da auditoria — Railroad Jogador 1.4.18

Esta atualização parte **exclusivamente** do arquivo `ProjectRailroad(10).zip`. Copie os arquivos deste pacote sobre a raiz atual do Jogador (preservando as pastas).

## Exclusões necessárias

ZIPs de atualização não removem arquivos antigos automaticamente. Rode na raiz do projeto `node scripts/limpar-residuos-mestre.mjs` **antes de publicar**, ou remova manualmente os seis caminhos abaixo:

- `js/mesa.js`
- `js/modules/contaMestre.js`
- `js/modules/personalizacaoMestre.js`
- `css/janelas-personalizadas.css`
- `css/tema/molduras.css`
- `css/tema/texturas.css`

**Não remova a pasta `css/tema/` inteira.** `botoes.css`, `retratos.css`, `fundos.css` e `bordas.css` são importados por `css/kit-western.css` e pertencem ao Jogador.

## Publicação

1. Sobreponha os arquivos do patch sobre a versão 10.
2. Execute `npm run preparar:publicacao` com Node 22+ (inclui exclusões, atualização de cache e testes).
3. Faça commit incluindo arquivos alterados **e exclusões**, depois publique no GitHub Pages.
4. Em dois dispositivos, confirme login, abertura, edição, importação e salvamento de fichas. Verifique a configuração do Supabase antes de usar edição simultânea online.

## Mudanças

- Teste incorreto do Mestre substituído por testes de janelas do Jogador.
- Todas as janelas de gestão acompanham o fundo e a borda dos cartões; campos e textos seguem a paleta de leitura, preservando as amostras de personalização.
- Importação JSON reforçada, preservando formatos antigos e campos adicionais.
- Salvamento otimista por revisão `updated_at`: conflitos com outros dispositivos preservam o rascunho local e exigem conciliação manual.
- Tentativas limitadas de sincronização e retomada ao voltar a conexão.
- Versão única `1.4.18` em CSS, scripts, módulos e fragmentos para reduzir mistura de cache no GitHub Pages.
- Atualização da arquitetura e checklist de RLS. Nenhuma migração automática ou alteração do banco foi executada.

**Limites de validação:** não foi possível abrir o aplicativo completo no Chromium neste ambiente (bloqueio de acesso ao servidor local). Testes de Node e verificações estáticas não certificam OAuth, RLS nem o Supabase de produção.

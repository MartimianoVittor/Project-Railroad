# Railroad Jogador 1.4.26 — refatoração de integridade

Esta versão é baseada no ZIP `ProjectRailroad.zip` da plataforma **Jogador**.

## Correções

- `css/layout.css` restaurado do arquivo versionado no próprio Git (`HEAD`): recupera os estilos de layout exigidos por `css/main.css`.
- Removidos arquivos desconectados da inicialização: `css/identidade-railroad.css`, `js/mobile.js` e `js/core/ficha.js`. `js/navegacao.js` continua sendo o único controlador mobile.
- Os dois retratos de reserva foram comprimidos como WebP (93% de qualidade). Os novos caminhos são utilizados pelo CSS; caminhos PNG antigos de fichas salvas continuam funcionando por normalização em `js/modules/retrato.js`.
- A publicação não exclui mais arquivos automaticamente. `npm run limpar:legado` apenas lista resíduos e `npm run limpar:legado -- --aplicar` exclui os seis arquivos antigos **somente** se os hashes SHA-256 corresponderem às versões auditadas. Os arquivos personalizados ou alterados são preservados.
- A migração SQL 013 ausente não é recriada. Os dois testes de inspeção dela são identificados como ignorados, com motivo explícito. O comando `npm run verificar:sql` exige a presença do arquivo oficial.
- Adicionados validadores automáticos de recursos locais (`scripts/verificar-recursos.mjs`) e sintaxe de JS (`scripts/verificar-sintaxe.mjs`). Novos testes verificam conectividade dos recursos, layout e compatibilidade de imagens antigas.
- Versão de cache local atualizada para **1.4.26**.

## Verificações executadas

- `npm run validar`: **51 testes aprovados, 0 falhas, 2 ignorados** (SQL 013 ausente).
- **120** referências locais resolvidas; **35** CSS e **50** JS alcançáveis na inicialização.
- Sintaxe validada: **86/86** arquivos JavaScript de aplicação, scripts e testes.
- `npm run preparar:publicacao`: passou, com versionamento unificado e sem remoções automáticas.

O navegador automático e as conexões locais foram bloqueados neste ambiente; por isso, os fluxos visuais e o Supabase remoto não foram homologados aqui.

## Aplicação sem perder o Git

1. Faça um commit ou cópia de segurança da pasta atual.
2. Se usar o **ZIP incremental**, extraia seus arquivos na raiz da pasta do projeto, mantendo os diretórios. O pacote não contém `.git` e, portanto, preserva seu histórico.
3. Rode `npm.cmd run limpar:legado` para prévia da limpeza; se o relatório identificar arquivos conhecidos e você concordar, execute `npm.cmd run limpar:legado -- --aplicar`. A limpeza recusa excluir arquivos com conteúdo modificado.
4. Execute `npm.cmd run validar` e `npm.cmd run preparar:publicacao`.
5. Reinicie o Live Server, force atualização (`Ctrl + Shift + R`) e confira Login, Fichas, Jogador, Personagem, Inventário, Quadro, Conta e Personalização, em desktop e mobile.
6. Para validar o Supabase, recupere a migração oficial `supabase/013_integridade_fichas.sql`, execute `npm.cmd run verificar:sql` e teste os fluxos com duas contas isoladas.

Se usar o ZIP **completo**, extraia para uma nova pasta, em vez de sobrepor a pasta antiga. A pasta `.git` contida é a do ZIP original; caso já tenha commits locais mais recentes, preserve sua `.git` atual e prefira o pacote incremental.

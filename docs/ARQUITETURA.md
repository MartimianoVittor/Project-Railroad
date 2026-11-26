# Manutenção do Railroad Jogador

O Jogador é uma aplicação estática. O navegador carrega HTML, CSS e módulos JavaScript diretamente. O projeto usa IndexedDB para fichas locais e rascunhos, e Supabase para autenticação, fichas online, convites de mesa e preferências da conta.

## Onde editar

| Alteração | Ponto de entrada |
| --- | --- |
| Campos do Jogador ou do Personagem | `html/jogador.html`, `html/personagem.html` e seus controladores em `js/modules/` |
| Nomes dos traços, IDs e dados por nível | `js/dominio/tracos.js`, usado pelos marcadores e pelo seletor de rolagem |
| Quantidade, tamanho, carga e local dos itens | `js/dominio/inventario.js` |
| Tabela de itens e rolagem | `js/modules/inventario/itens.js` e `rolagem.js`. O controlador `js/modules/inventario.js` liga os campos ao editor. |
| Quadros, imagens, desenho e ferramentas | `js/modules/quadro/index.js` reúne os componentes de `js/modules/quadro/` |
| Nome do arquivo exportado e leitura de JSON | `js/core/importExport.js` |
| Login, listagem, importação e salvamento | `js/modules/fichas/`. Os eventos de cada botão estão em `eventos.js`. |
| Persistência local e online | `js/services/fichasLocais.js`, `bancoLocal.js` e `fichasRepository.js` |
| Convites e vínculos com mesas | `js/modules/convitesMesa.js` e `js/services/mesasRepository.js` |
| Opções de personalização e prévia | `js/modules/aparencia/preferencias.js` define as opções e a migração. `visual.js` aplica a escolha a cartões, retratos, abas e amostras. |
| Artes, estilos e celular | `assets/western/kit/` contém as artes. `css/tema/` contém as artes/variantes compartilhadas (e é necessária ao Jogador), `css/aparencia/` aplica as preferências e `css/mobile.css` e `css/mobile-ajustes.css` adaptam a interface ao celular. |

## Abertura e edição de uma ficha

1. `index.html` contém a navegação. `js/includes.js` carrega os fragmentos de `html/`, incluindo os diálogos, e inicia `js/main.js`.
2. `main.js` registra os controles de conta e fichas e monta os módulos de edição. `js/core/editorFicha.js` distribui os dados carregados entre os módulos e reúne o que cada um editou.
3. `js/modules/fichas.js` guarda a seleção atual. O jogador pode estar conectado enquanto edita uma ficha local. O destino do salvamento depende da ficha aberta.
4. Uma edição agenda a gravação em `js/modules/fichas/salvamento.js`. A ficha local vai para o IndexedDB. A online ganha primeiro um rascunho no mesmo banco, identificado por usuário e ficha. O envio ao Supabase remove apenas a versão que o servidor confirmou.
5. Ao abrir ou duplicar outra ficha, o gerenciador aguarda a conclusão da gravação. Se uma sincronização falhar, o rascunho fica disponível para uma nova tentativa (inclusive quando a conexão volta). A gravação online usa a revisão numérica `revisao` confirmada pelas RPCs `salvar_ficha_jogador` e `renomear_ficha_jogador` para impedir sobrescritas concorrentes. Em caso de conflito, o rascunho local é preservado.

## Dados existentes

A entrada aceita JSONs de versões 1, 2 e 3 e também os arquivos antigos sem número de versão. A representação de saída segue a versão 3. O inventário antigo podia ser uma lista. Hoje ele reúne `itens` e `rolagens`. Um item sem quantidade assume uma unidade. Uma quantidade explícita igual a zero continua zero.

Preserve os IDs dos traços, como `traco-1`, ao mudar os rótulos visíveis. Os marcadores e as fichas compartilhadas usam esses identificadores. Ao acrescentar um campo, trate a ausência dele na restauração e atualize a coleta no mesmo módulo. O editor mantém os campos adicionais da ficha carregada ao reunir as alterações.

O banco IndexedDB se chama `railroad_fichas` e contém as coleções `fichas` e `rascunhos`. A migração do armazenamento antigo fica em `js/services/migracaoFichasLocais.js`. Cada cópia antiga é removida depois que a gravação correspondente termina.

A exportação produz `Jogador(Personagem).json` com os nomes da ficha. Ao importar na nuvem, o aplicativo usa o `railroadId` quando presente. Para arquivos anteriores, calcula uma assinatura do conteúdo e consulta também a assinatura usada pela versão antiga.

## Executar e verificar

Na raiz do projeto, rode `python -m http.server 8000` e abra `http://localhost:8000/`. O Live Server também pode servir essa pasta. Os caminhos relativos dos fragmentos, módulos, estilos e imagens permitem publicar o diretório inteiro sob o caminho do repositório no GitHub Pages.

Execute `npm run validar` com Node.js 22 ou superior para conferir recursos, sintaxe e testes. Use `npm.cmd run validar` no PowerShell caso a execução do arquivo `npm.ps1` esteja bloqueada. A execução de `npm test` permanece disponível isoladamente. Os testes usam o executor nativo do Node, com o IndexedDB e as chamadas ao Supabase simulados. Para isolar um cenário, execute, por exemplo, `node --test tests/salvamento-fichas.test.mjs`.

As opções da conexão ficam em `js/config/supabase.js`. O cliente usa a chave pública do projeto. As permissões de leitura e escrita dependem das políticas configuradas no banco.

## Publicação e compatibilidade

`npm run preparar:publicacao` sincroniza os parâmetros `?v=` de todos os scripts e estilos locais usando `package.json.version` e executa a validação, sem excluir arquivos. Para ver resíduos conhecidos de versões anteriores, execute `npm run limpar:legado` (somente prévia); para remover apenas os arquivos cuja assinatura é idêntica à da versão antiga, use `npm run limpar:legado -- --aplicar`. No GitHub Pages, publique o resultado inteiro. O carregador de fragmentos `js/includes.js` transmite a revisão a cada fragmento HTML. O versionador evita combinar módulos de deploys diferentes no cache do navegador.

As janelas do Jogador utilizam `js/modules/aparencia/visual.js` e `css/janelas-jogador.css` para herdar a mesma textura, borda e paleta de leitura da ficha. Não use `js/modules/personalizacaoMestre.js` nem `css/janelas-personalizadas.css` aqui; pertencem ao projeto Mestre.

Os dados continuam no formato de ficha v3. Importações externas são validadas em `js/core/validacao.js` antes da normalização. O PostgreSQL deve permitir atualização de `fichas.updated_at` e manter RLS; consulte `docs/SEGURANCA_SUPABASE.md`.

## Dependências do banco de dados não incluídas no ZIP

A migração `supabase/013_integridade_fichas.sql` não acompanha este pacote. Os testes que verificam seu texto são **ignorados com justificativa explícita** quando o arquivo está ausente; esse resultado não comprova que as RPCs nem as políticas RLS estão corretas no servidor. `npm run verificar:sql` falha deliberadamente se a migração não estiver presente. Recupere a versão oficial da migração e verifique sua aplicação no projeto Supabase antes de homologar recursos online. Nunca recrie a migração a partir de expressões regulares de testes.

## Recursos e compatibilidade

A versão 1.4.26 restaura `css/layout.css` do histórico Git. Os retratos decorativos de reserva são WebP, mantendo o desenho anterior e reduzindo o download; caminhos PNG legados em fichas são convertidos em tempo de restauração. `js/mobile.js` foi substituído pela navegação unificada `js/navegacao.js`; `js/core/ficha.js` e `css/identidade-railroad.css` eram módulos desconectados da inicialização. O script `verificar-recursos.mjs` verifica os grafos de carregamento e referências locais para detectar regressões.

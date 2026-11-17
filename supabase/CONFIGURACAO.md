# Railroad — configurar login Google e fichas privadas

A integração já está programada no frontend, mas **não está conectada a nenhum
projeto Supabase**. É necessário executar estes passos para ativá-la.

## 1. Criar o backend

1. Crie um projeto em https://supabase.com/dashboard.
2. No **SQL Editor**, execute `supabase/001_fichas_privadas.sql`.
3. Em **Authentication → Providers → Google**, configure o provedor Google.
   No Google Cloud Console, crie as credenciais OAuth para aplicação Web.
   O **redirect URI autorizado no Google** deve ser o callback do Supabase,
   normalmente `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
   O Client Secret do Google fica **somente no painel do Supabase**.
4. Em **Authentication → URL Configuration**, adicione a URL exata do Railroad
   à lista de redirecionamentos permitidos, por exemplo:
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
   Para testar com Live Server, adicione também a URL local completa,
   como `http://127.0.0.1:5500/` (ajuste à porta e ao caminho reais).

Documentação oficial:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/database/postgres/row-level-security

## 2. Configurar o frontend

No arquivo `js/config/supabase.js`, preencha **somente os valores públicos**:

```js
export const SUPABASE = Object.freeze({
    url: 'https://SEU-PROJETO.supabase.co',
    publishableKey: 'sb_publishable_SUA_CHAVE_PUBLICA',
});
```

Uma chave `anon` legada também funciona. **Nunca** use `service_role`,
`sb_secret_...`, senhas ou Client Secret do Google no JavaScript, no GitHub
ou no HTML. A proteção das fichas é feita pelas políticas RLS do banco.

O projeto continua sendo um site estático: pode ser servido por GitHub Pages.
Para testes locais, use um servidor HTTP (ex.: Live Server); `file://` não
funciona para os fragmentos HTML e módulos JavaScript.

## 3. Usar o sistema

- **Sem login:** o Railroad mantém a ficha antiga no `localStorage`, com
  importação e exportação JSON como antes.
- **Com Google:** o botão **Minhas fichas** abre a lista da conta. Você pode
  criar, abrir, renomear, duplicar, excluir e importar fichas JSON.
- **Migrar a ficha local:** depois do login, use **Importar minha ficha local
  para a conta**. Nada é enviado automaticamente.
- **Salvamento:** alterações são armazenadas em rascunho local por usuário e
  ficha e enviadas à nuvem com atraso curto. Veja o estado de sincronização
  na interface. Se a rede falhar, o rascunho fica no navegador e é tentado
  novamente quando a ficha for aberta.
- **Importação JSON com login:** cria uma **nova ficha**; não substitui a
  ficha que já está aberta.
- **Exportação JSON:** continua funcionando independentemente do login.

O título na lista de fichas é independente do campo "Nome" do personagem.
Renomear na lista não altera automaticamente o personagem.

## 4. Privacidade e permissões

- `public.fichas` usa `usuario_id` + políticas **RLS** para restringir
  SELECT/INSERT/UPDATE/DELETE ao dono autenticado.
- `public.ficha_permissoes` está preparada para papéis `leitor` e `editor`,
  mas **não concede acesso a ninguém nesta etapa**. Compartilhamento com
  mestres e jogadores precisará de uma migração de políticas e interface.
- Teste as políticas com **duas contas Google diferentes** antes de publicar:
  cada conta deve listar somente suas próprias fichas; não deve conseguir
  acessar, alterar nem excluir um ID pertencente à outra conta.
- Rascunhos locais e arquivos JSON **não são criptografados** pelo Railroad.
  Evite computadores compartilhados e trate exportações como dados pessoais.
- Retratos e quadro atualmente são armazenados como imagens em base64 dentro
  do JSON. Arquivos grandes podem exceder limites de armazenamento/requisição.
  Uma etapa futura deve migrar essas imagens para Supabase Storage privado.
- A versão atual usa a estratégia "última gravação prevalece" quando uma
  ficha é editada simultaneamente em dispositivos diferentes. Antes de liberar
  colaboração, implementar controle de versão/conflitos.

## 5. Publicação sem perder histórico Git

Não substitua a pasta inteira do repositório. Use o ZIP incremental,
extraindo os arquivos por cima do projeto clonado e **preservando `.git/`**.
Depois:

```bash
git status
git add .
git commit -m "Adiciona login Google e fichas privadas com Supabase"
git push origin main
```

Não é necessário `git push --force`.

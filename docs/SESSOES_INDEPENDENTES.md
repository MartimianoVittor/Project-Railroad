# Contas independentes — Railroad Jogador

A autenticação do Railroad Mestre e do Railroad Jogador usa chaves distintas no armazenamento do navegador (`storageKey` do Supabase Auth). Isso permite contas diferentes nas duas plataformas, inclusive quando compartilham a mesma origem.

**Importante:** sessões anteriores guardadas na chave padrão do Supabase não são importadas automaticamente. Após atualizar, será necessário entrar novamente em cada plataforma.

O navegador pode compartilhar a sessão do **Google** entre sites; isso não é a mesma coisa que a sessão do Supabase. Para selecionar outra conta Google durante o OAuth, use a seleção de contas do Google quando apresentada.

Não apague automaticamente as chaves antigas: outros aplicativos que usam o mesmo Supabase podem depender delas.

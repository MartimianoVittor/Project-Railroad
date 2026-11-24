# Railroad Jogador — Ajuste da Personalização com referência no Mestre

Esta atualização deve ser aplicada **depois** de `Railroad_Jogador_Correcao_Personalizacao_Imagem_PATCH.zip`.

## Mudanças

- Os painéis de opções usam a mesma hierarquia de contraste da Personalização do Mestre: fundo de pergaminho, títulos castanhos e amostras bege com seleção destacada.
- As regras de leitura dos demais diálogos deixam de sobrescrever os elementos da Personalização.
- A prévia preserva as cores reais do fundo escolhido, sem herdar as cores dos painéis de opções.
- Espaçamento e rolagem ajustados para evitar legendas cortadas; versão de cache sincronizada para `1.4.20`.
- Testes de regressão de contraste adicionados.

## Aplicação

Extraia os arquivos na raiz do projeto, mantendo os caminhos. Depois execute:

```powershell
npm.cmd run preparar:publicacao
npm.cmd test
```

Não é necessária migração do Supabase. A aparência final deve ser conferida no navegador após a publicação.

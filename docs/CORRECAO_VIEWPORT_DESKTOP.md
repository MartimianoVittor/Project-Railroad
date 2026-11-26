# Confinamento das fichas no desktop — Railroad Jogador 1.4.26

## Problemas corrigidos

1. A folha `css/cartoes-colunas.css` permite alturas naturais e rolagem no documento inteiro. Em larguras de 900–1024 px, os cartões faziam a página deslocar ao usar a roda do mouse.
2. Os wrappers de `html/personagem.html` e `html/inventario.html` perdiam o atributo `data-include` após o carregamento; o seletor que os tornava transparentes deixava então de funcionar. Isso impedia que as fichas recebessem corretamente a altura de `#area-fichas`.
3. O Quadro alterna entre desktop e mobile sem trocar seu bitmap. A altura mínima legada, combinada com dimensões naturais do contêiner, podia deixar a página maior que a área disponível.

## Solução

- Os wrappers possuem agora a classe permanente `fragmento-pagina`, com `display: contents` mesmo após a remoção de `data-include`.
- `css/viewport-desktop.css` é importado por último e limita o desktop ao espaço visível, mantendo cartões individuais com rolagem apenas quando o conteúdo não couber.
- O Quadro usa a altura disponível do cartão, independentemente da resolução do bitmap carregado. O bitmap e as coordenadas do desenho **não são alterados**.
- Em telas de até 768 px, a rolagem natural dos cartões mobile permanece intacta.

## Verificações

- `npm.cmd run validar` — verificador de recursos, sintaxe, suíte de testes; 54 passaram, 0 falhas, 2 ignorados por dependerem de SQL ausente.
- Geometria CSS examinada em Chromium com HTML/CSS localmente montados, nos tamanhos 1440×900, 1366×768, 1024×720, 900×720 e 800×640: deslocamento do documento = 0.
- Um bitmap de 8400×4800 pixels não deslocou o Quadro para fora da viewport nem perdeu as dimensões após alternar duas vezes entre mobile e desktop.
- A viewport mobile de 375×812 continuou permitindo a rolagem vertical natural.

## Conferência manual recomendada

1. Abra as páginas Jogador, Personagem e Inventário em 1366×768 e em uma janela desktop menor; passe a roda do mouse sobre o fundo e sobre os cartões.
2. Confirme que o conjunto de cartões fica parado e que, quando algum cartão tiver conteúdo longo, a rolagem ocorre **dentro dele**.
3. Abra uma ficha com Quadro antigo, redimensione o navegador, abra no celular e volte ao desktop; confira que a moldura não cresce e que o desenho continua presente.
4. Realize o mesmo teste com as preferências visuais (temas e molduras) aplicadas, já que a simulação local não incluiu conexão real com Supabase.

O conteúdo salvo das fichas, o canvas original e as migrações SQL não foram modificados.

/** Remove apenas arquivos órfãos da plataforma Mestre, sem tocar nos assets compartilhados. */
import { unlinkSync, existsSync } from 'node:fs';
const exclusivasMestre = [
    'js/mesa.js',
    'js/modules/contaMestre.js',
    'js/modules/personalizacaoMestre.js',
    'css/janelas-personalizadas.css',
    // Estas duas folhas NÃO são importadas por kit-western.css;
    // tema/{botoes,retratos,fundos,bordas}.css são necessárias e permanecem.
    'css/tema/molduras.css',
    'css/tema/texturas.css',
];
for (const caminho of exclusivasMestre) {
    const url = new URL('../' + caminho, import.meta.url);
    if (existsSync(url)) {
        unlinkSync(url);
        console.log(`Removido arquivo exclusivo do Mestre: ${caminho}`);
    }
}

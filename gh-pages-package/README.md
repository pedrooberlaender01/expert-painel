Este pacote serve para hospedar o frontend no GitHub Pages sem alterar o código principal.

Passo a passo:
1) Rode o build do projeto:
   npm run build
2) Copie o conteúdo da pasta dist para esta pasta:
   gh-pages-package
3) No repositório do GitHub, faça commit do conteúdo desta pasta na branch gh-pages.
4) Em Settings → Pages, selecione a branch gh-pages e a pasta / (root).

Observações:
- O backend continua funcionando via Supabase (não há servidor próprio neste projeto).
- Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu ambiente de build antes de gerar o dist.

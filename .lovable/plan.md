# Visita técnica: só upload final, até 50 MB

## 1. Remover fotos por porta
- Na conclusão da visita, tirar o campo "Fotos *" de cada porta (botão "Adicionar fotos" e as miniaturas).
- Deixar de exigir "pelo menos uma foto da porta" para concluir.
- Parar de enviar fotos por porta ao salvar.
- Fotos de porta antigas, de visitas já concluídas, continuam salvas e aparecem na visualização e no PDF, sem alterações.
- A única exigência de mídia passa a ser o upload final (fotos ou vídeos).

## 2. Upload final com até 50 MB
- A tela já aceita até 50 MB, mas o servidor pode recusar antes disso. Vou definir 50 MB como limite do armazenamento das mídias finais (`visitas-tecnicas-midias`).
- Mensagens claras quando um arquivo passar de 50 MB ou o envio falhar por tamanho.

## Detalhes técnicos
- `VisitaTecnicaConclusao.tsx`: remover o bloco de fotos do `PortaForm` (linhas ~1220-1260), a validação na linha 371 e o loop de upload para `visitas-tecnicas-fotos` (~482-495). Manter a leitura de `visitas_tecnicas_portas_fotos` para os registros antigos.
- Bucket: aplicar `file_size_limit = 50MB` em `visitas-tecnicas-midias` usando a ferramenta de bucket. Se o limite geral do projeto for menor que 50 MB (o projeto usa um backend Supabase próprio), ele precisa ser aumentado nas configurações de Storage do Supabase. Se for o caso, aviso você.
- Tratar o erro "Payload too large" no upload com uma mensagem amigável.

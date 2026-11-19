# Architecture rules

- Keep quote preview and download on the same PDF generator; shared layout prevents divergent documents.
- Generate technical door drawings from quote dimensions and keep each drawing on its own page to preserve readability.

- Items added to an order after its factory orders exist are synced into the matching sector order by a DB trigger on pedido_linhas; avoids missing lines in soldagem/perfiladeira/separacao.

BEGIN;

-- A limpeza autorizada é exclusiva da Elian e dos testes realizados até 27/11/2026.
DELETE FROM "NotaFiscal" AS nota
USING "Empresa" AS empresa
WHERE nota."empresaId" = empresa.id
  AND regexp_replace(empresa.cnpj, '[^0-9]', '', 'g') = '65718887000101'
  AND nota.ambiente = 'HOMOLOGACAO'
  AND nota."criadoEm" < TIMESTAMP '2026-11-28 03:00:00';

DELETE FROM "NotaFiscalServico" AS nota
USING "Empresa" AS empresa
WHERE nota."empresaId" = empresa.id
  AND regexp_replace(empresa.cnpj, '[^0-9]', '', 'g') = '65718887000101'
  AND nota.ambiente = 'HOMOLOGACAO'
  AND nota."criadoEm" < TIMESTAMP '2026-11-28 03:00:00';

COMMIT;

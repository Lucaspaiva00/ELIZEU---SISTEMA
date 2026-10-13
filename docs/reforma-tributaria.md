# Preparação fiscal — Elian Sigs

Análise em 12/10/2026 (Brasil). Base: main fa90baa101fb68e832c3020fe2da32f55456b4bf.

## Situação encontrada

A main já continha CST/cClassTrib IBS/CBS, CST/cClassTrib/percentual IS no produto e três alíquotas padrão com rtcAtivo na empresa. O snapshot guardava esses campos, mas montarPayloadFocus omitia todos os novos tributos. A validação anterior verificava formato e prefixo, sem comprovar existência na tabela oficial. Não há motor tributário por operação/vigência. Venda faturada movimenta estoque e financeiro e pode chamar emissão automática conforme configuração; esta etapa não ativa essa opção.

## Fontes verificadas

- Receita Federal — transição: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda
- CGIBS — comunicado de 30/09/2026 sobre Simples e regime regular: https://www.cgibs.gov.br/embora-os-periodos-sejam-parecidos-tratam-de-escolhas-diferentes-por-isso-e-importante-entender-cada-situacao
- Portal NF-e — Notas Técnicas: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D
- SVRS — catálogo oficial: https://dfe-portal.svrs.rs.gov.br/DFE/ClassificacaoTributaria
- Focus — referência de campos: https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html
- Focus — endpoint e referência completa: https://doc.focusnfe.com.br/reference/emitir_nfe
- Legislação a conferir na parametrização contábil: EC 132/2023; LC 214/2025, com alterações da LC 227/2026; regras CGSN vigentes.

O Portal NF-e indexa a NT 2025.002 v1.52 publicada em 01/10/2026. Há comunicado oficial de postergação de implantação de NTs para 26/10 em homologação e 16/11 em produção. O acesso ao PDF pelo Portal sofreu redirecionamento/recaptcha nesta análise: não afirmar auditoria integral das 94 páginas nem codificar cronograma de validação por rejeição sem obter o PDF e schemas correspondentes. Guias comerciais com cronogramas antigos não prevalecem sobre comunicados oficiais.

## Transição

2026 é o ano de teste: CBS 0,9% e IBS 0,1%, com condições legais para dispensa de recolhimento. Estes percentuais não foram configurados no ERP. Em 2027/2028, CBS substitui PIS/Cofins, IBS permanece em fase inicial e IS entra em vigor nos casos legais. ICMS/ISS são reduzidos durante 2029–2032, com substituição integral em 2033. Guardar dados antigos para histórico e operações de transição; não significa enviar os mesmos grupos indiscriminadamente em todos os anos.

Simples: confirmar regime real, CRT e opção pelo DAS ou apuração regular IBS/CBS. O comunicado CGIBS de 30/09/2026 distingue ingresso/retorno ao Simples (até 15/10/2026) da opção pelo regime regular IBS/CBS para janeiro–junho/2027 (até 30/10/2026). Não deduzir opção pelo nome da empresa nem usar a alíquota de exemplo como regra do Elizeu.

## Arquitetura proposta (próxima implementação)

Esta é uma decisão de arquitetura do ERP; as tags XML são fatos documentados, a distribuição interna abaixo é proposta técnica.

| Camada | Responsabilidade |
| --- | --- |
| Produto | NCM, unidade, origem, eventual CEST; classificação IBS/CBS sugerida para operação padrão. Não prova benefício ou incidência de IS. |
| Empresa | Regime/CRT confirmado, modalidade de apuração IBS/CBS com vigência e evidência contábil; liberação de produção após homologação. |
| Destinatário | CPF/CNPJ, condição fiscal, local de destino/entrega e dados exigidos para operações especiais. Não presumir não contribuinte só por ausência de IE. |
| Operação/regra | CFOP efetivo, finalidade, destino, regime, vigência inicial/final, fundamento legal, enquadramento e parâmetros aplicáveis. Seleção inequívoca, sem defaults silenciosos. |
| Item da NF-e | CST/cClassTrib resolvidos, bases, percentuais, valores, reduções, diferimentos, tributação regular, créditos e grupos monofásicos/IS quando exigidos. Snapshot imutável da regra e catálogo usados. |
| Documento | Grupos totais, finalidade, referências e informações adicionais; versão de leiaute e data efetiva de emissão. |

CEST e benefício fiscal não são sinônimos de cClassTrib e não devem ser preenchidos pelo NCM sem enquadramento. Não acrescentados nesta etapa: exigem análise do catálogo de mercadorias e regras estaduais. A classificação definitiva pertence ao item da operação; um padrão no produto é apenas sugestão.

Não criar um único campo genérico “redução de base”: distinguir a regra e os indicadores oficiais de redução de base e de alíquota. Diferimento tem percentuais/valores por tributo e competência. Crédito presumido exige enquadramento próprio. Monofasia tem estruturas distintas, inclusive quantidade e valores específicos. IS admite percentual ou alíquota específica; apenas percentual no produto não cobre todo o leiaute.

A referência Focus já contém os grupos IBS/CBS e IS, além de reduções, diferimento, tributação regular e monofasia. Os campos atuais do ERP precisam de adaptador explícito para a API. Não enviar apenas nomes de cadastro nem copiar bases e totais de exemplos. Antes do cálculo: implementar composição da base, rateio de descontos/frete/despesas, arredondamento, tratamentos condicionais e reconciliação dos totais, com testes e validação do XML retornado.

## Entrega desta etapa

- Catálogo oficial consultado integrado: 173 classificações, com origem, hash do HTML, descrições, vigências e indicadores. Selects expõem apenas classificações vigentes permitidas para NF-e.
- Validação de cadastro pelo catálogo; códigos antigos continuam visíveis para revisão, sem migração em massa.
- Status e filtro de pendências de cadastro. “Completo” avalia NCM/CFOP/origem e classificação IBS/CBS; não valida NCM/CFOP contra suas tabelas nem aprova contabilidade/tributação de uma operação.
- Bloqueio explícito de emissão RTC ou IS que seria silenciosamente omitido. Também protege snapshots anteriores com esses tributos. Legado sem reforma e sem IS mantém seu payload.
- Sem migration nova; sem alteração de regime, alíquota, estoque, financeiro ou ativação automática.

O ERP ainda não está pronto para emitir a reforma em produção. Pendentes: PDF e schemas oficiais completos, motor e regras versionadas, CEST/benefícios quando aplicáveis, apuração Simples, adaptador Focus com cálculos/totais, fluxo formal de homologação e XML autorizado. O catálogo é um snapshot: atualização oficial posterior exige nova importação revisada. Não transforma parâmetros de 2026 em alíquotas de 2027.

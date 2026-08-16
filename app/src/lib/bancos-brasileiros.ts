// Sugestão pro combobox de Banco (Configurações → Contas Financeiras) — não é
// entidade, não tem tabela própria; `contas_financeiras.banco` continua sendo
// texto livre, essa lista só melhora o preenchimento. Os 18 mais relevantes
// pro mercado PME brasileiro (bancos tradicionais + principais digitais/
// cooperativas/fintechs com conta PJ), sem código FEBRABAN (fora de escopo
// até existir integração bancária real).
export const BANCOS_BRASILEIROS = [
  "Banco do Brasil",
  "Bradesco",
  "Caixa Econômica Federal",
  "Itaú Unibanco",
  "Santander",
  "Nubank",
  "Inter",
  "C6 Bank",
  "BTG Pactual",
  "Banco Safra",
  "Sicoob",
  "Sicredi",
  "XP Investimentos",
  "PagBank",
  "Mercado Pago",
  "Stone",
  "Banco Original",
  "Banrisul",
] as const;

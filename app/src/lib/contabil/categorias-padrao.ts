// Seed de categorias pro tenant novo — a partir da spec
// docs/superpowers/specs/2026-08-16-seed-categorias-e-bancos-design.md.
// `paiNome` referencia outra entrada desta mesma lista pelo nome (resolvido
// pra categoria_pai_id em duas passadas no cadastro: pais primeiro, depois
// filhos); `ordemDre` é o `ordem` de MODELO_COMPLETO_DRE (dre.ts) à qual a
// categoria deve ser vinculada via linha_dre_categorias — sem isso a
// categoria nasce "não classificada" na cascata do DRE.
export type CategoriaPadrao = {
  nome: string;
  tipo: "RECEITA" | "DESPESA";
  ehCustoFixo: boolean;
  paiNome: string | null;
  ordemDre: number;
};

export const CATEGORIAS_PADRAO: CategoriaPadrao[] = [
  // Receitas operacionais (ordem 1)
  { nome: "Receita de Serviços", tipo: "RECEITA", ehCustoFixo: false, paiNome: null, ordemDre: 1 },
  { nome: "Receita de Vendas", tipo: "RECEITA", ehCustoFixo: false, paiNome: null, ordemDre: 1 },
  { nome: "Comissões Recebidas", tipo: "RECEITA", ehCustoFixo: false, paiNome: null, ordemDre: 1 },
  // Receitas não operacionais (ordem 14)
  { nome: "Juros Recebidos", tipo: "RECEITA", ehCustoFixo: false, paiNome: null, ordemDre: 14 },
  { nome: "Rendimento sobre Aplicações", tipo: "RECEITA", ehCustoFixo: false, paiNome: null, ordemDre: 14 },
  { nome: "Outras Receitas", tipo: "RECEITA", ehCustoFixo: false, paiNome: null, ordemDre: 14 },
  // Despesas variáveis (ordem 6)
  { nome: "Comissões sobre Vendas", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 6 },
  { nome: "Marketing e Publicidade", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 6 },
  { nome: "Taxas de Cartão e Maquininha", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 6 },
  { nome: "Fretes e Logística", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 6 },
  { nome: "Subcontratações e Terceirizados", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 6 },
  // Despesas fixas (ordem 10) — com dois grupos de subcategoria
  { nome: "Despesas com Pessoal", tipo: "DESPESA", ehCustoFixo: true, paiNome: null, ordemDre: 10 },
  { nome: "Salários e Ordenados", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas com Pessoal", ordemDre: 10 },
  { nome: "Pró-labore", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas com Pessoal", ordemDre: 10 },
  { nome: "INSS e FGTS", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas com Pessoal", ordemDre: 10 },
  { nome: "Benefícios (VT/VR/Plano de Saúde)", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas com Pessoal", ordemDre: 10 },
  { nome: "Despesas Administrativas", tipo: "DESPESA", ehCustoFixo: true, paiNome: null, ordemDre: 10 },
  { nome: "Aluguel", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas Administrativas", ordemDre: 10 },
  { nome: "Água, Luz e Internet", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas Administrativas", ordemDre: 10 },
  { nome: "Material de Escritório", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas Administrativas", ordemDre: 10 },
  { nome: "Honorários Contábeis", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas Administrativas", ordemDre: 10 },
  { nome: "Softwares e Assinaturas", tipo: "DESPESA", ehCustoFixo: true, paiNome: "Despesas Administrativas", ordemDre: 10 },
  { nome: "Tarifas Bancárias", tipo: "DESPESA", ehCustoFixo: true, paiNome: null, ordemDre: 10 },
  { nome: "Seguros", tipo: "DESPESA", ehCustoFixo: true, paiNome: null, ordemDre: 10 },
  { nome: "Manutenção e Limpeza", tipo: "DESPESA", ehCustoFixo: true, paiNome: null, ordemDre: 10 },
  // Despesas não operacionais (ordem 16)
  { nome: "Multas e Penalidades", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 16 },
  { nome: "Outras Despesas", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 16 },
  // Tributos sobre o lucro (ordem 19)
  { nome: "IRPJ e CSLL", tipo: "DESPESA", ehCustoFixo: false, paiNome: null, ordemDre: 19 },
];

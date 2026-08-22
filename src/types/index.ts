export type TipoDispositivo = 'iPhone' | 'Android' | 'iPad' | 'Apple Watch' | 'Outro';

export type StatusOS =
  | 'aguardando_analise'
  | 'orcamento_gerado'
  | 'aprovado'
  | 'em_manutencao'
  | 'aguardando_peca'
  | 'pronto_para_retirada'
  | 'entregue'
  | 'cancelado';

export type TipoQualidadePeca = 'Original' | 'Primeira Linha' | 'OLED' | 'Incell';

export type TipoCobertura = 'Particular' | 'Garantia da Loja' | 'Revisão / Upgrade';

export type LocalizacaoDispositivo =
  | 'bancada_local'
  | 'em_transito_ida_sp'
  | 'laboratorio_sp'
  | 'em_transito_retorno_sp'
  | 'loja_pronto';

export type CargoUsuario = 'vendedor' | 'tecnico' | 'gerente';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  cargo: CargoUsuario;
  meta_mensal_os: number;
  percentual_comissao?: number;
  valor_base_comissao_os?: number;
  created_at?: string;
}

export type CategoriaPeca =
  | 'Bateria'
  | 'Tela'
  | 'Tampa'
  | 'Face ID'
  | 'Carcaça'
  | 'NFC'
  | 'Camera'
  | 'Conector'
  | 'Sensor'
  | 'Sinal'
  | 'CI carga'
  | 'Transplante'
  | 'Outros';

export type MarcaPeca = 'Apple' | 'Samsung' | 'Xiaomi' | 'Motorola' | 'Outra';

export interface PecaEstoque {
  id: string;
  descricao: string;
  codigo_sku: string;
  tipo_qualidade: TipoQualidadePeca;
  modelo_compativel: string;
  categoria?: CategoriaPeca | string;
  marca?: MarcaPeca | string;
  estoque_minimo?: number;
  localizacao_gaveta?: string;
  quantidade_estoque: number;
  custo_unitario: number;
  preco_venda: number;
  created_at?: string;
}

export interface ChecklistEntrada {
  face_id: 'ok' | 'defeito' | 'nao_se_aplica';
  true_tone: 'ok' | 'defeito' | 'nao_se_aplica';
  cameras: 'ok' | 'defeito' | 'nao_se_aplica';
  microfones: 'ok' | 'defeito' | 'nao_se_aplica';
  alto_falante: 'ok' | 'defeito' | 'nao_se_aplica';
  carregamento: 'ok' | 'defeito' | 'nao_se_aplica';
  detalhes_esteticos?: string;
  fotos_urls?: string[];
}

export interface ChecklistSaida {
  face_id: 'ok' | 'defeito' | 'nao_se_aplica';
  true_tone: 'ok' | 'defeito' | 'nao_se_aplica';
  cameras: 'ok' | 'defeito' | 'nao_se_aplica';
  microfones: 'ok' | 'defeito' | 'nao_se_aplica';
  alto_falante: 'ok' | 'defeito' | 'nao_se_aplica';
  carregamento: 'ok' | 'defeito' | 'nao_se_aplica';
  touch_display: 'ok' | 'defeito' | 'nao_se_aplica';
  observacoes_saida?: string;
  ok_tecnico: boolean;
  data_verificacao?: string;
}

export interface DetalhesTerceirizado {
  parceiro_sp: string;
  rastreio_envio?: string;
  rastreio_retorno?: string;
  data_envio_sp: string;
  previsao_retorno_sp: string;
  custo_laboratorio: number;
  observacoes?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  telefone_secundario?: string | null;
  cpf: string; // Obrigatório
  email?: string | null;
  instagram?: string | null;
  created_at?: string;
}

export interface ItemPeca {
  id: string;
  os_id: string;
  peca_estoque_id?: string;
  descricao: string;
  tipo_qualidade: TipoQualidadePeca;
  custo: number;
  preco_venda: number;
  quantidade: number;
  created_at?: string;
}

export interface OrdemServico {
  id: string;
  numero_os: number;
  cliente_id: string;
  cliente?: Cliente;
  vendedor_id?: string | null;
  vendedor_nome?: string;
  tecnico_id?: string | null;
  tecnico_nome?: string;
  tipo_dispositivo: TipoDispositivo;
  modelo: string;
  cor: string;
  imei_ou_serial: string;
  senha_aparelho?: string;
  buscar_iphone_desativado: boolean;
  aparelho_nao_liga?: boolean; // Novo: Aparelho Desligado / Não Liga
  defeito_reclamado: string;
  laudo_tecnico?: string | null;
  checklist_entrada: ChecklistEntrada;
  checklist_saida?: ChecklistSaida | null;
  fotos_entrada?: string[];
  status: StatusOS;
  tipo_cobertura: TipoCobertura;
  localizacao_atual: LocalizacaoDispositivo;
  detalhes_terceirizado?: DetalhesTerceirizado | null;
  data_entrada: string;
  previsao_entrega?: string | null;
  data_conclusao?: string | null;
  valor_servico: number;
  valor_pecas: number;
  valor_desconto: number;
  valor_total: number;
  forma_pagamento?: string | null;
  numero_venda_syscor?: string | null;
  baixa_estoque_realizada?: boolean;
  motivo_encerramento?: string | null;
  data_baixa?: string | null;
  desconto_avaliacao_tradein?: number;
  garantia_dias: number;
  pecas?: ItemPeca[];
  created_at?: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  total_ativas: number;
  prontos_entrega: number;
  faturamento_mes: number;
  tempo_medio_reparo_dias: number;
  em_sp_count: number;
  sp_vencidas_count: number;
  garantias_loja_count: number;
}

export interface RelatorioFinanceiro {
  total_arrumados: number;
  faturamento_total: number;
  custo_pecas_total: number;
  custo_terceirizados_total: number;
  custo_total: number;
  lucro_liquido: number;
  margem_lucro_percentual: number;
}

export interface DesempenhoVendedor {
  vendedor_id: string;
  vendedor_nome: string;
  os_particulares_abertas: number;
  os_particulares_concluidas: number;
  faturamento_gerado: number;
  meta_mensal: number;
  percentual_meta: number;
  valor_comissao_por_os: number;
  faixa_comissao_label: string;
  comissao_estimada: number;
}

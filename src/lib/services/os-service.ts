import { createClient } from '@/lib/supabase/client';
import { MOCK_CLIENTES, MOCK_ORDENS_SERVICO } from './mock-data';
import {
  Cliente,
  DashboardMetrics,
  DetalhesTerceirizado,
  ItemPeca,
  LocalizacaoDispositivo,
  OrdemServico,
  StatusOS,
} from '@/types';

// In-Memory Storage for Demo Mode when Supabase is not configured
let localClientesStore: Cliente[] = [...MOCK_CLIENTES];
let localOSStore: OrdemServico[] = [...MOCK_ORDENS_SERVICO];

// Helper to check if client side state has saved data
if (typeof window !== 'undefined') {
  try {
    const savedOS = localStorage.getItem('fitch_os_store');
    const savedCli = localStorage.getItem('fitch_clientes_store');
    if (savedOS) localOSStore = JSON.parse(savedOS);
    if (savedCli) localClientesStore = JSON.parse(savedCli);
  } catch (e) {
    console.error('Error reading localStorage', e);
  }
}

function persistLocalState() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fitch_os_store', JSON.stringify(localOSStore));
      localStorage.setItem('fitch_clientes_store', JSON.stringify(localClientesStore));
    } catch (e) {
      console.error('Error persisting localStorage', e);
    }
  }
}

export const OSService = {
  // 1. CLIENTES
  async getClientes(): Promise<Cliente[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (!error && data) return data as Cliente[];
    }
    return localClientesStore;
  },

  async buscarClientePorTelefoneOuCpf(query: string): Promise<Cliente[]> {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .or(`telefone.ilike.%${cleanQuery}%,cpf.ilike.%${cleanQuery}%,nome.ilike.%${cleanQuery}%`)
        .limit(10);
      if (data && data.length > 0) return data as Cliente[];
    }

    return localClientesStore.filter(
      (c) =>
        c.telefone.toLowerCase().includes(cleanQuery) ||
        (c.cpf && c.cpf.toLowerCase().includes(cleanQuery)) ||
        c.nome.toLowerCase().includes(cleanQuery)
    );
  },

  async criarCliente(cliente: Omit<Cliente, 'id' | 'created_at'>): Promise<Cliente> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();
      if (!error && data) return data as Cliente;
    }

    const novo: Cliente = {
      id: `cli-${Date.now()}`,
      ...cliente,
      created_at: new Date().toISOString(),
    };
    localClientesStore.unshift(novo);
    persistLocalState();
    return novo;
  },

  // 2. ORDENS DE SERVIÇO
  async getOrdensServico(): Promise<OrdemServico[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, cliente:clientes(*), pecas:os_itens_pecas(*)')
        .order('numero_os', { ascending: false });
      if (!error && data) return data as OrdemServico[];
    }
    return localOSStore;
  },

  async getOrdemServicoById(id: string): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, cliente:clientes(*), pecas:os_itens_pecas(*)')
        .or(`id.eq.${id},numero_os.eq.${isNaN(Number(id)) ? -1 : Number(id)}`)
        .maybeSingle();
      if (!error && data) return data as OrdemServico;
    }

    const found = localOSStore.find(
      (o) => o.id === id || o.numero_os === Number(id)
    );
    return found || null;
  },

  async criarOrdemServico(
    dados: Omit<
      OrdemServico,
      'id' | 'numero_os' | 'valor_total' | 'created_at' | 'updated_at'
    >
  ): Promise<OrdemServico> {
    const valorPecasTotal = (dados.pecas || []).reduce(
      (acc, p) => acc + (p.preco_venda * p.quantidade),
      0
    );
    const valorServico = dados.valor_servico || 0;
    const valorDesconto = dados.valor_desconto || 0;
    const valorTotal = Math.max(0, valorServico + valorPecasTotal - valorDesconto);

    const supabase = createClient();
    if (supabase) {
      const { data: osData, error: osErr } = await supabase
        .from('ordens_servico')
        .insert([
          {
            cliente_id: dados.cliente_id,
            tipo_dispositivo: dados.tipo_dispositivo,
            modelo: dados.modelo,
            cor: dados.cor,
            imei_ou_serial: dados.imei_ou_serial,
            senha_aparelho: dados.senha_aparelho || '',
            buscar_iphone_desativado: dados.buscar_iphone_desativado,
            defeito_reclamado: dados.defeito_reclamado,
            laudo_tecnico: dados.laudo_tecnico || null,
            checklist_entrada: dados.checklist_entrada,
            checklist_saida: dados.checklist_saida || null,
            status: dados.status || 'aguardando_analise',
            tipo_cobertura: dados.tipo_cobertura || 'Particular',
            localizacao_atual: dados.localizacao_atual || 'bancada_local',
            detalhes_terceirizado: dados.detalhes_terceirizado || null,
            data_entrada: dados.data_entrada || new Date().toISOString(),
            previsao_entrega: dados.previsao_entrega || null,
            valor_servico: valorServico,
            valor_pecas: valorPecasTotal,
            valor_desconto: valorDesconto,
            forma_pagamento: dados.forma_pagamento || null,
            garantia_dias: dados.garantia_dias || 90,
          },
        ])
        .select('*, cliente:clientes(*)')
        .single();

      if (!osErr && osData) {
        if (dados.pecas && dados.pecas.length > 0) {
          const pecasFormatadas = dados.pecas.map((p) => ({
            os_id: osData.id,
            descricao: p.descricao,
            tipo_qualidade: p.tipo_qualidade,
            custo: p.custo,
            preco_venda: p.preco_venda,
            quantidade: p.quantidade,
          }));
          await supabase.from('os_itens_pecas').insert(pecasFormatadas);
        }
        return (await this.getOrdemServicoById(osData.id)) || (osData as OrdemServico);
      }
    }

    const maxNumeroOS = localOSStore.reduce(
      (max, os) => (os.numero_os > max ? os.numero_os : max),
      1000
    );

    const proximaOSNum = maxNumeroOS + 1;
    const clienteFound = localClientesStore.find((c) => c.id === dados.cliente_id);

    const novaOS: OrdemServico = {
      id: `os-${proximaOSNum}`,
      numero_os: proximaOSNum,
      cliente_id: dados.cliente_id,
      cliente: clienteFound,
      tipo_dispositivo: dados.tipo_dispositivo,
      modelo: dados.modelo,
      cor: dados.cor,
      imei_ou_serial: dados.imei_ou_serial,
      senha_aparelho: dados.senha_aparelho,
      buscar_iphone_desativado: dados.buscar_iphone_desativado,
      defeito_reclamado: dados.defeito_reclamado,
      laudo_tecnico: dados.laudo_tecnico,
      checklist_entrada: dados.checklist_entrada,
      checklist_saida: dados.checklist_saida,
      status: dados.status || 'aguardando_analise',
      tipo_cobertura: dados.tipo_cobertura || 'Particular',
      localizacao_atual: dados.localizacao_atual || 'bancada_local',
      detalhes_terceirizado: dados.detalhes_terceirizado,
      data_entrada: dados.data_entrada || new Date().toISOString(),
      previsao_entrega: dados.previsao_entrega,
      valor_servico: valorServico,
      valor_pecas: valorPecasTotal,
      valor_desconto: valorDesconto,
      valor_total: valorTotal,
      forma_pagamento: dados.forma_pagamento,
      garantia_dias: dados.garantia_dias || 90,
      pecas: (dados.pecas || []).map((p, idx) => ({
        ...p,
        id: `peca-${Date.now()}-${idx}`,
        os_id: `os-${proximaOSNum}`,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localOSStore.unshift(novaOS);
    persistLocalState();
    return novaOS;
  },

  async atualizarStatusOS(id: string, novoStatus: StatusOS): Promise<OrdemServico | null> {
    const dataConclusao =
      novoStatus === 'pronto_para_retirada' || novoStatus === 'entregue'
        ? new Date().toISOString()
        : null;

    const supabase = createClient();
    if (supabase) {
      const updatePayload: Record<string, any> = {
        status: novoStatus,
        updated_at: new Date().toISOString(),
      };
      if (dataConclusao) updatePayload.data_conclusao = dataConclusao;
      if (novoStatus === 'pronto_para_retirada') updatePayload.localizacao_atual = 'loja_pronto';

      await supabase.from('ordens_servico').update(updatePayload).eq('id', id);
      return this.getOrdemServicoById(id);
    }

    const os = localOSStore.find((o) => o.id === id);
    if (os) {
      os.status = novoStatus;
      os.updated_at = new Date().toISOString();
      if (dataConclusao) os.data_conclusao = dataConclusao;
      if (novoStatus === 'pronto_para_retirada') os.localizacao_atual = 'loja_pronto';
      persistLocalState();
      return { ...os };
    }
    return null;
  },

  async atualizarLocalizacaoOS(
    id: string,
    localizacao: LocalizacaoDispositivo,
    terceirizadoData?: DetalhesTerceirizado | null
  ): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      const payload: Record<string, any> = {
        localizacao_atual: localizacao,
        updated_at: new Date().toISOString(),
      };
      if (terceirizadoData !== undefined) {
        payload.detalhes_terceirizado = terceirizadoData;
      }

      await supabase.from('ordens_servico').update(payload).eq('id', id);
      return this.getOrdemServicoById(id);
    }

    const os = localOSStore.find((o) => o.id === id);
    if (os) {
      os.localizacao_atual = localizacao;
      if (terceirizadoData !== undefined) os.detalhes_terceirizado = terceirizadoData;
      os.updated_at = new Date().toISOString();
      persistLocalState();
      return { ...os };
    }
    return null;
  },

  async salvarLaudoEChecklistSaida(
    id: string,
    laudo: string,
    checklistSaida: any
  ): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      await supabase
        .from('ordens_servico')
        .update({
          laudo_tecnico: laudo,
          checklist_saida: checklistSaida,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      return this.getOrdemServicoById(id);
    }

    const os = localOSStore.find((o) => o.id === id);
    if (os) {
      os.laudo_tecnico = laudo;
      os.checklist_saida = checklistSaida;
      os.updated_at = new Date().toISOString();
      persistLocalState();
      return { ...os };
    }
    return null;
  },

  async adicionarItemPeca(
    osId: string,
    item: Omit<ItemPeca, 'id' | 'os_id' | 'created_at'>
  ): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      await supabase.from('os_itens_pecas').insert([{ os_id: osId, ...item }]);
      return this.getOrdemServicoById(osId);
    }

    const os = localOSStore.find((o) => o.id === osId);
    if (os) {
      if (!os.pecas) os.pecas = [];
      const novaPeca: ItemPeca = {
        id: `peca-${Date.now()}`,
        os_id: osId,
        ...item,
        created_at: new Date().toISOString(),
      };
      os.pecas.push(novaPeca);
      os.valor_pecas = os.pecas.reduce(
        (sum, p) => sum + (p.preco_venda * p.quantidade),
        0
      );
      os.valor_total = Math.max(0, os.valor_servico + os.valor_pecas - os.valor_desconto);
      os.updated_at = new Date().toISOString();
      persistLocalState();
      return { ...os };
    }
    return null;
  },

  async removerItemPeca(osId: string, pecaId: string): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      await supabase.from('os_itens_pecas').delete().eq('id', pecaId);
      return this.getOrdemServicoById(osId);
    }

    const os = localOSStore.find((o) => o.id === osId);
    if (os && os.pecas) {
      os.pecas = os.pecas.filter((p) => p.id !== pecaId);
      os.valor_pecas = os.pecas.reduce(
        (sum, p) => sum + (p.preco_venda * p.quantidade),
        0
      );
      os.valor_total = Math.max(0, os.valor_servico + os.valor_pecas - os.valor_desconto);
      os.updated_at = new Date().toISOString();
      persistLocalState();
      return { ...os };
    }
    return null;
  },

  // 3. MÉTRICAS DASHBOARD
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const ordens = await this.getOrdensServico();
    const hoje = new Date();

    const ativas = ordens.filter(
      (o) => o.status !== 'entregue' && o.status !== 'cancelado'
    );
    const prontos = ordens.filter((o) => o.status === 'pronto_para_retirada');
    
    // Total Faturado no mês
    const faturamentoMes = ordens
      .filter((o) => {
        if (o.status !== 'entregue' && o.status !== 'pronto_para_retirada') return false;
        const d = new Date(o.data_conclusao || o.data_entrada);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      })
      .reduce((sum, o) => sum + Number(o.valor_total || 0), 0);

    // Em São Paulo (Terceirizados)
    const emSP = ordens.filter(
      (o) =>
        o.localizacao_atual === 'em_transito_ida_sp' ||
        o.localizacao_atual === 'laboratorio_sp' ||
        o.localizacao_atual === 'em_transito_retorno_sp'
    );

    // Vencidas em SP
    const spVencidas = emSP.filter((o) => {
      if (!o.detalhes_terceirizado?.previsao_retorno_sp) return false;
      const prev = new Date(o.detalhes_terceirizado.previsao_retorno_sp);
      return prev < hoje && o.localizacao_atual !== 'loja_pronto';
    });

    // Garantias da Loja
    const garantiasLoja = ordens.filter(
      (o) => o.tipo_cobertura === 'Garantia da Loja' && o.status !== 'entregue'
    );

    return {
      total_ativas: ativas.length,
      prontos_entrega: prontos.length,
      faturamento_mes: faturamentoMes,
      tempo_medio_reparo_dias: 2.5,
      em_sp_count: emSP.length,
      sp_vencidas_count: spVencidas.length,
      garantias_loja_count: garantiasLoja.length,
    };
  },
};

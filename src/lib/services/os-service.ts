import { createClient } from '@/lib/supabase/client';
import {
  Cliente,
  DashboardMetrics,
  DetalhesTerceirizado,
  ItemPeca,
  LocalizacaoDispositivo,
  OrdemServico,
  StatusOS,
} from '@/types';

// Production Clean In-Memory & LocalStorage State
let localClientesStore: Cliente[] = [];
let localOSStore: OrdemServico[] = [];

if (typeof window !== 'undefined') {
  try {
    const savedOS = localStorage.getItem('fitch_os_store');
    const savedCli = localStorage.getItem('fitch_clientes_store');
    if (savedOS) {
      localOSStore = JSON.parse(savedOS);
    } else {
      localStorage.setItem('fitch_os_store', JSON.stringify([]));
    }

    if (savedCli) {
      localClientesStore = JSON.parse(savedCli);
    } else {
      localStorage.setItem('fitch_clientes_store', JSON.stringify([]));
    }
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
  // Clear all test OS and test clients
  zerarDadosDeTeste(): void {
    localOSStore = [];
    localClientesStore = [];
    persistLocalState();
  },

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
        .or(`telefone.ilike.%${cleanQuery}%,cpf.ilike.%${cleanQuery}%,nome.ilike.%${cleanQuery}%`);
      if (data) return data as Cliente[];
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
      const { data, error } = await supabase.from('clientes').insert([cliente]).select().single();
      if (!error && data) return data as Cliente;
    }

    const novoCliente: Cliente = {
      id: `cli-${Date.now()}`,
      ...cliente,
      created_at: new Date().toISOString(),
    };
    localClientesStore.unshift(novoCliente);
    persistLocalState();
    return novoCliente;
  },

  // 2. ORDENS DE SERVIÇO
  async getOrdensServico(): Promise<OrdemServico[]> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(*),
          pecas:os_itens_pecas(*)
        `)
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
        .select(`
          *,
          cliente:clientes(*),
          pecas:os_itens_pecas(*)
        `)
        .or(`id.eq.${id},numero_os.eq.${isNaN(Number(id)) ? -1 : Number(id)}`)
        .single();
      if (!error && data) return data as OrdemServico;
    }

    const found = localOSStore.find(
      (os) => os.id === id || os.numero_os.toString() === id
    );
    return found || null;
  },

  async criarOrdemServico(
    dados: Omit<OrdemServico, 'id' | 'numero_os' | 'valor_total' | 'created_at' | 'updated_at'>
  ): Promise<OrdemServico> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('ordens_servico').insert([dados]).select().single();
      if (!error && data) return data as OrdemServico;
    }

    const proximoNumero = localOSStore.length > 0
      ? Math.max(...localOSStore.map((o) => o.numero_os)) + 1
      : 1001;

    const cliente = localClientesStore.find((c) => c.id === dados.cliente_id);

    const valorTotal = Math.max(
      0,
      (dados.valor_servico || 0) + (dados.valor_pecas || 0) - (dados.valor_desconto || 0)
    );

    const novaOS: OrdemServico = {
      id: `os-${Date.now()}`,
      numero_os: proximoNumero,
      ...dados,
      cliente,
      valor_total: valorTotal,
      pecas: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localOSStore.unshift(novaOS);
    persistLocalState();
    return novaOS;
  },

  async atualizarStatusOS(id: string, novoStatus: StatusOS): Promise<OrdemServico | null> {
    const supabase = createClient();
    const isConcluido = novoStatus === 'pronto_para_retirada' || novoStatus === 'entregue';
    const dataConcl = isConcluido ? new Date().toISOString() : null;

    if (supabase) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .update({ status: novoStatus, data_conclusao: dataConcl, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as OrdemServico;
    }

    const index = localOSStore.findIndex((o) => o.id === id);
    if (index !== -1) {
      localOSStore[index].status = novoStatus;
      if (isConcluido) localOSStore[index].data_conclusao = dataConcl;
      localOSStore[index].updated_at = new Date().toISOString();
      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  async atualizarLocalizacaoOS(
    id: string,
    novaLocalizacao: LocalizacaoDispositivo,
    detalhesTerceirizado?: DetalhesTerceirizado
  ): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      const payload: any = { localizacao_atual: novaLocalizacao, updated_at: new Date().toISOString() };
      if (detalhesTerceirizado) payload.detalhes_terceirizado = detalhesTerceirizado;

      const { data, error } = await supabase
        .from('ordens_servico')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as OrdemServico;
    }

    const index = localOSStore.findIndex((o) => o.id === id);
    if (index !== -1) {
      localOSStore[index].localizacao_atual = novaLocalizacao;
      if (detalhesTerceirizado) localOSStore[index].detalhes_terceirizado = detalhesTerceirizado;
      localOSStore[index].updated_at = new Date().toISOString();
      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  async salvarLaudoEChecklistSaida(
    id: string,
    laudoTecnico: string,
    checklistSaida?: any
  ): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          laudo_tecnico: laudoTecnico,
          checklist_saida: checklistSaida,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as OrdemServico;
    }

    const index = localOSStore.findIndex((o) => o.id === id);
    if (index !== -1) {
      localOSStore[index].laudo_tecnico = laudoTecnico;
      if (checklistSaida) localOSStore[index].checklist_saida = checklistSaida;
      localOSStore[index].updated_at = new Date().toISOString();
      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  async adicionarItemPeca(
    osId: string,
    item: Omit<ItemPeca, 'id' | 'os_id' | 'created_at'>
  ): Promise<OrdemServico | null> {
    const novoItem: ItemPeca = {
      id: `peca-${Date.now()}`,
      os_id: osId,
      ...item,
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      await supabase.from('os_itens_pecas').insert([novoItem]);
      return this.getOrdemServicoById(osId);
    }

    const index = localOSStore.findIndex((o) => o.id === osId);
    if (index !== -1) {
      const pecasAtuais = localOSStore[index].pecas || [];
      localOSStore[index].pecas = [...pecasAtuais, novoItem];

      // Recalcular valor pecas e total
      const somaPecas = localOSStore[index].pecas.reduce(
        (acc, p) => acc + (p.preco_venda * p.quantidade),
        0
      );
      localOSStore[index].valor_pecas = somaPecas;
      localOSStore[index].valor_total = Math.max(
        0,
        (localOSStore[index].valor_servico || 0) + somaPecas - (localOSStore[index].valor_desconto || 0)
      );

      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  async removerItemPeca(osId: string, pecaId: string): Promise<OrdemServico | null> {
    const supabase = createClient();
    if (supabase) {
      await supabase.from('os_itens_pecas').delete().eq('id', pecaId);
      return this.getOrdemServicoById(osId);
    }

    const index = localOSStore.findIndex((o) => o.id === osId);
    if (index !== -1 && localOSStore[index].pecas) {
      localOSStore[index].pecas = localOSStore[index].pecas.filter((p) => p.id !== pecaId);

      const somaPecas = localOSStore[index].pecas.reduce(
        (acc, p) => acc + (p.preco_venda * p.quantidade),
        0
      );
      localOSStore[index].valor_pecas = somaPecas;
      localOSStore[index].valor_total = Math.max(
        0,
        (localOSStore[index].valor_servico || 0) + somaPecas - (localOSStore[index].valor_desconto || 0)
      );

      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  // 3. METRICS
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const ordens = await this.getOrdensServico();

    const totalAtivas = ordens.filter(
      (o) => o.status !== 'entregue' && o.status !== 'cancelado'
    ).length;

    const prontosEntrega = ordens.filter((o) => o.status === 'pronto_para_retirada').length;

    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    const faturamentoMes = ordens
      .filter((o) => {
        if (o.status !== 'pronto_para_retirada' && o.status !== 'entregue') return false;
        const d = new Date(o.data_conclusao || o.data_entrada);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      })
      .reduce((acc, o) => acc + (o.valor_total || 0), 0);

    const emSpCount = ordens.filter(
      (o) =>
        o.localizacao_atual === 'em_transito_ida_sp' ||
        o.localizacao_atual === 'laboratorio_sp' ||
        o.localizacao_atual === 'em_transito_retorno_sp'
    ).length;

    const hoje = new Date();
    const spVencidasCount = ordens.filter((o) => {
      if (
        o.localizacao_atual !== 'laboratorio_sp' &&
        o.localizacao_atual !== 'em_transito_ida_sp'
      ) {
        return false;
      }
      if (!o.detalhes_terceirizado?.previsao_retorno_sp) return false;
      const prev = new Date(o.detalhes_terceirizado.previsao_retorno_sp);
      return prev < hoje;
    }).length;

    const garantiasLojaCount = ordens.filter(
      (o) => o.tipo_cobertura === 'Garantia da Loja'
    ).length;

    return {
      total_ativas: totalAtivas,
      prontos_entrega: prontosEntrega,
      faturamento_mes: faturamentoMes,
      tempo_medio_reparo_dias: 1.5,
      em_sp_count: emSpCount,
      sp_vencidas_count: spVencidasCount,
      garantias_loja_count: garantiasLojaCount,
    };
  },
};

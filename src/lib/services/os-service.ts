import { createClient } from '@/lib/supabase/client';
import { EstoqueService } from '@/lib/services/estoque-service';
import {
  Cliente,
  DashboardMetrics,
  DetalhesTerceirizado,
  ItemPeca,
  LocalizacaoDispositivo,
  OrdemServico,
  StatusOS,
} from '@/types';

function sanitizeUuid(id: any): string | null {
  if (typeof id !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// In-Memory Fallback State when Supabase is disconnected
let localClientesStore: Cliente[] = [];
let localOSStore: OrdemServico[] = [];

if (typeof window !== 'undefined') {
  try {
    const savedOS = localStorage.getItem('fitch_os_store');
    const savedCli = localStorage.getItem('fitch_clientes_store');
    if (savedOS) {
      localOSStore = JSON.parse(savedOS);
    }
    if (savedCli) {
      localClientesStore = JSON.parse(savedCli);
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
  // Clear test data
  zerarDadosDeTeste(): void {
    localOSStore = [];
    localClientesStore = [];
    persistLocalState();
  },

  async deletarOrdemServico(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        const validUuid = sanitizeUuid(id);
        if (validUuid) {
          const { error } = await supabase.from('ordens_servico').delete().eq('id', validUuid);
          if (error) console.error('Supabase deletarOrdemServico error:', error);
        } else {
          // If query passed numeric numero_os
          const { error } = await supabase
            .from('ordens_servico')
            .delete()
            .eq('numero_os', isNaN(Number(id)) ? -1 : Number(id));
          if (error) console.error('Supabase deletarOrdemServico error:', error);
        }
      } catch (e) {
        console.error('Error deleting OS from Supabase:', e);
      }
    }

    localOSStore = localOSStore.filter((o) => o.id !== id && o.numero_os.toString() !== id);
    persistLocalState();
    return true;
  },

  // 1. CLIENTES
  async getClientes(): Promise<Cliente[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('clientes').select('*').order('nome');
        if (error) {
          console.error('Supabase getClientes error:', error);
        } else if (data) {
          return data as Cliente[];
        }
      } catch (e) {
        console.error(e);
      }
    }
    return localClientesStore;
  },

  async buscarClientePorTelefoneOuCpf(query: string): Promise<Cliente[]> {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .or(`telefone.ilike.%${cleanQuery}%,cpf.ilike.%${cleanQuery}%,nome.ilike.%${cleanQuery}%`);
        if (error) {
          console.error('Supabase buscarCliente error:', error);
        } else if (data) {
          return data as Cliente[];
        }
      } catch (e) {
        console.error(e);
      }
    }

    return localClientesStore.filter(
      (c) =>
        c.telefone.toLowerCase().includes(cleanQuery) ||
        (c.cpf && c.cpf.toLowerCase().includes(cleanQuery)) ||
        c.nome.toLowerCase().includes(cleanQuery)
    );
  },

  async criarCliente(cliente: Omit<Cliente, 'id' | 'created_at'>): Promise<Cliente> {
    const validId = generateUuid();
    const novoClienteObj = {
      id: validId,
      nome: cliente.nome.trim(),
      telefone: cliente.telefone.trim(),
      telefone_secundario: cliente.telefone_secundario || null,
      cpf: cliente.cpf ? cliente.cpf.trim() : '',
      email: cliente.email || null,
      instagram: cliente.instagram || null,
    };

    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('clientes').insert([novoClienteObj]).select().single();
        if (error) {
          console.error('Supabase criarCliente error:', error);
        } else if (data) {
          return data as Cliente;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const localCli: Cliente = {
      ...novoClienteObj,
      created_at: new Date().toISOString(),
    };
    localClientesStore.unshift(localCli);
    persistLocalState();
    return localCli;
  },

  // 2. ORDENS DE SERVIÇO
  async getOrdensServico(options?: { apenasAtivas?: boolean; apenasEncerradas?: boolean }): Promise<OrdemServico[]> {
    const apenasAtivas = options?.apenasAtivas ?? false;
    const apenasEncerradas = options?.apenasEncerradas ?? false;

    const supabase = createClient();
    if (supabase) {
      try {
        let query = supabase
          .from('ordens_servico')
          .select(`
            *,
            cliente:clientes(*),
            pecas:os_itens_pecas(*)
          `);

        if (apenasAtivas) {
          query = query.not('status', 'in', '("entregue","cancelado")');
        } else if (apenasEncerradas) {
          query = query.in('status', ['entregue', 'cancelado']);
        }

        const { data, error } = await query.order('numero_os', { ascending: false });

        if (error) {
          console.error('Supabase getOrdensServico error:', error);
        } else if (data) {
          return data as OrdemServico[];
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (apenasAtivas) {
      return localOSStore.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado');
    }
    if (apenasEncerradas) {
      return localOSStore.filter((o) => o.status === 'entregue' || o.status === 'cancelado');
    }

    return localOSStore;
  },

  async getOrdensServicoAtivas(): Promise<OrdemServico[]> {
    return this.getOrdensServico({ apenasAtivas: true });
  },

  async getOrdensServicoEncerradas(): Promise<OrdemServico[]> {
    return this.getOrdensServico({ apenasEncerradas: true });
  },

  async getOrdemServicoById(id: string): Promise<OrdemServico | null> {
    const cleanId = (id || '').trim();
    if (!cleanId) return null;

    const supabase = createClient();
    if (supabase) {
      try {
        const validUuid = sanitizeUuid(cleanId);
        let query = supabase
          .from('ordens_servico')
          .select(`
            *,
            cliente:clientes(*),
            pecas:os_itens_pecas(*)
          `);

        if (validUuid) {
          query = query.eq('id', validUuid);
        } else {
          const num = Number(cleanId);
          if (!isNaN(num) && num > 0) {
            query = query.eq('numero_os', num);
          } else {
            query = query.eq('id', cleanId);
          }
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          return data as OrdemServico;
        }
        if (error) {
          console.error('Supabase getOrdemServicoById error:', error);
        }
      } catch (e) {
        console.error('Error fetching OS by ID from Supabase:', e);
      }
    }

    const found = localOSStore.find(
      (os) => os.id === cleanId || os.numero_os.toString() === cleanId
    );
    return found || null;
  },

  async criarOrdemServico(
    dados: Omit<OrdemServico, 'id' | 'numero_os' | 'valor_total' | 'created_at' | 'updated_at'>
  ): Promise<OrdemServico> {
    const supabase = createClient();

    let validClienteId = sanitizeUuid(dados.cliente_id);

    // If cliente_id is not a valid UUID (e.g. from local storage fallback), create customer in Supabase first
    if (!validClienteId && dados.cliente) {
      const cli = await this.criarCliente({
        nome: dados.cliente.nome,
        telefone: dados.cliente.telefone,
        cpf: dados.cliente.cpf,
      });
      validClienteId = cli.id;
    }

    if (supabase && validClienteId) {
      try {
        const payload: any = {
          cliente_id: validClienteId,
          vendedor_id: sanitizeUuid(dados.vendedor_id),
          vendedor_nome: dados.vendedor_nome || 'Vendedor',
          tecnico_id: sanitizeUuid(dados.tecnico_id),
          tecnico_nome: dados.tecnico_nome || null,
          tipo_dispositivo: dados.tipo_dispositivo,
          modelo: dados.modelo,
          cor: dados.cor,
          imei_ou_serial: dados.imei_ou_serial,
          senha_aparelho: dados.senha_aparelho || '',
          buscar_iphone_desativado: Boolean(dados.buscar_iphone_desativado),
          defeito_reclamado: dados.defeito_reclamado,
          laudo_tecnico: dados.laudo_tecnico || null,
          checklist_entrada: dados.checklist_entrada,
          fotos_entrada: (dados.fotos_entrada || []).filter((f) => Boolean(f) && typeof f === 'string' && f.trim() !== ''),
          status: dados.status || 'aguardando_analise',
          tipo_cobertura: dados.tipo_cobertura || 'Particular',
          localizacao_atual: dados.localizacao_atual || 'bancada_local',
          data_entrada: dados.data_entrada || new Date().toISOString(),
          previsao_entrega: dados.previsao_entrega || null,
          valor_servico: Number(dados.valor_servico) || 0,
          valor_pecas: Number(dados.valor_pecas) || 0,
          valor_desconto: Number(dados.valor_desconto) || 0,
          desconto_avaliacao_tradein: Number(dados.desconto_avaliacao_tradein) || 0,
          garantia_dias: Number(dados.garantia_dias) || 90,
        };

        const { data, error } = await supabase
          .from('ordens_servico')
          .insert([payload])
          .select(`
            *,
            cliente:clientes(*),
            pecas:os_itens_pecas(*)
          `)
          .single();

        if (error) {
          console.error('Supabase criarOrdemServico Error:', error);

          // Retry fallback 1: Coluna 'desconto_avaliacao_tradein' ainda não existe no banco Supabase
          if (error.message.includes('desconto_avaliacao_tradein') || error.message.includes('schema cache') || error.message.includes('column')) {
            const payloadNoTradein = { ...payload };
            delete payloadNoTradein.desconto_avaliacao_tradein;

            if (error.message.includes('tipo_cobertura_enum') || error.message.includes('invalid input value for enum')) {
              payloadNoTradein.tipo_cobertura = 'Garantia da Loja';
            }

            const { data: retryData, error: retryErr } = await supabase
              .from('ordens_servico')
              .insert([payloadNoTradein])
              .select(`
                *,
                cliente:clientes(*),
                pecas:os_itens_pecas(*)
              `)
              .single();

            if (!retryErr && retryData) {
              const resObj = retryData as OrdemServico;
              resObj.tipo_cobertura = dados.tipo_cobertura;
              resObj.desconto_avaliacao_tradein = Number(dados.desconto_avaliacao_tradein) || 0;
              return resObj;
            }
          }

          // Retry fallback 2: Enum 'tipo_cobertura_enum' ainda não possui 'Revisão / Upgrade' no banco Supabase
          if (error.message.includes('tipo_cobertura_enum') || error.message.includes('invalid input value for enum')) {
            const fallbackPayload = {
              ...payload,
              tipo_cobertura: 'Garantia da Loja',
            };
            const { data: retryData, error: retryErr } = await supabase
              .from('ordens_servico')
              .insert([fallbackPayload])
              .select(`
                *,
                cliente:clientes(*),
                pecas:os_itens_pecas(*)
              `)
              .single();

            if (!retryErr && retryData) {
              const resObj = retryData as OrdemServico;
              resObj.tipo_cobertura = dados.tipo_cobertura;
              resObj.desconto_avaliacao_tradein = Number(dados.desconto_avaliacao_tradein) || 0;
              return resObj;
            }
          }
        } else if (data) {
          return data as OrdemServico;
        }
      } catch (e) {
        console.error('Supabase exception:', e);
      }
    }

    // LocalStorage fallback only if Supabase not configured
    const proximoNumero = localOSStore.length > 0
      ? Math.max(...localOSStore.map((o) => o.numero_os)) + 1
      : 1001;

    const cliente = localClientesStore.find((c) => c.id === dados.cliente_id) || dados.cliente;

    const valorTotal = Math.max(
      0,
      (dados.valor_servico || 0) + (dados.valor_pecas || 0) - (dados.valor_desconto || 0)
    );

    const novaOS: OrdemServico = {
      id: generateUuid(),
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

    if (supabase && sanitizeUuid(id)) {
      try {
        const { data, error } = await supabase
          .from('ordens_servico')
          .update({ status: novoStatus, data_conclusao: dataConcl, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) console.error('Supabase atualizarStatusOS error:', error);
        if (!error && data) return data as OrdemServico;
      } catch (e) {
        console.error(e);
      }
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

  async atualizarVendedorOS(
    id: string,
    vendedorId: string | null,
    vendedorNome: string
  ): Promise<OrdemServico | null> {
    const supabase = createClient();
    const validUuid = sanitizeUuid(id);
    const validVendedorId = sanitizeUuid(vendedorId);

    if (supabase && validUuid) {
      try {
        let { data, error } = await supabase
          .from('ordens_servico')
          .update({
            vendedor_id: validVendedorId,
            vendedor_nome: vendedorNome,
            updated_at: new Date().toISOString(),
          })
          .eq('id', validUuid)
          .select(`
            *,
            cliente:clientes(*),
            pecas:os_itens_pecas(*)
          `)
          .maybeSingle();

        // If FK error or constraint occurs on vendedor_id, retry update with vendedor_nome only
        if (error) {
          console.warn('Supabase error with vendedor_id, retrying update with vendedor_nome only:', error);
          const fallbackRes = await supabase
            .from('ordens_servico')
            .update({
              vendedor_nome: vendedorNome,
              updated_at: new Date().toISOString(),
            })
            .eq('id', validUuid)
            .select(`
              *,
              cliente:clientes(*),
              pecas:os_itens_pecas(*)
            `)
            .maybeSingle();

          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!error && data) {
          const idx = localOSStore.findIndex((o) => o.id === validUuid);
          if (idx !== -1) {
            localOSStore[idx].vendedor_id = validVendedorId;
            localOSStore[idx].vendedor_nome = vendedorNome;
            localOSStore[idx].updated_at = new Date().toISOString();
            persistLocalState();
          }
          return data as OrdemServico;
        }
      } catch (e) {
        console.error('Error updating seller in Supabase:', e);
      }
    }

    const index = localOSStore.findIndex(
      (o) => o.id === id || o.numero_os.toString() === id
    );
    if (index !== -1) {
      localOSStore[index].vendedor_id = vendedorId;
      localOSStore[index].vendedor_nome = vendedorNome;
      localOSStore[index].updated_at = new Date().toISOString();
      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  async darBaixaPagamentoSyscor(
    id: string,
    dados: { numero_venda_syscor: string; forma_pagamento: string }
  ): Promise<OrdemServico | null> {
    const os = await this.getOrdemServicoById(id);
    if (!os) return null;

    const nowIso = new Date().toISOString();
    const payload: any = {
      status: 'entregue' as StatusOS,
      numero_venda_syscor: dados.numero_venda_syscor.trim(),
      forma_pagamento: dados.forma_pagamento.trim(),
      data_baixa: nowIso,
      data_conclusao: os.data_conclusao || nowIso,
      baixa_estoque_realizada: true,
      updated_at: nowIso,
    };

    // Baixa automática de estoque para as peças utilizadas
    if (!os.baixa_estoque_realizada && os.pecas && os.pecas.length > 0) {
      for (const peca of os.pecas) {
        if (peca.peca_estoque_id) {
          try {
            await EstoqueService.darSaidaEstoque(peca.peca_estoque_id, peca.quantidade || 1);
          } catch (err) {
            console.error('Erro ao dar baixa no estoque para a peça:', peca, err);
          }
        }
      }
    }

    const supabase = createClient();
    if (supabase && sanitizeUuid(id)) {
      try {
        const { data, error } = await supabase
          .from('ordens_servico')
          .update(payload)
          .eq('id', id)
          .select(`
            *,
            cliente:clientes(*),
            pecas:os_itens_pecas(*)
          `)
          .single();

        if (error) console.error('Supabase darBaixaPagamentoSyscor error:', error);
        if (!error && data) return data as OrdemServico;
      } catch (e) {
        console.error(e);
      }
    }

    const index = localOSStore.findIndex((o) => o.id === id);
    if (index !== -1) {
      localOSStore[index] = {
        ...localOSStore[index],
        ...payload,
      };
      persistLocalState();
      return localOSStore[index];
    }

    return null;
  },

  async encerrarSemCobranca(id: string, motivo: string): Promise<OrdemServico | null> {
    const os = await this.getOrdemServicoById(id);
    if (!os) return null;

    const nowIso = new Date().toISOString();
    const payload: any = {
      status: 'cancelado' as StatusOS,
      motivo_encerramento: motivo.trim(),
      data_conclusao: os.data_conclusao || nowIso,
      updated_at: nowIso,
    };

    const supabase = createClient();
    if (supabase && sanitizeUuid(id)) {
      try {
        const { data, error } = await supabase
          .from('ordens_servico')
          .update(payload)
          .eq('id', id)
          .select(`
            *,
            cliente:clientes(*),
            pecas:os_itens_pecas(*)
          `)
          .single();

        if (error) console.error('Supabase encerrarSemCobranca error:', error);
        if (!error && data) return data as OrdemServico;
      } catch (e) {
        console.error(e);
      }
    }

    const index = localOSStore.findIndex((o) => o.id === id);
    if (index !== -1) {
      localOSStore[index] = {
        ...localOSStore[index],
        ...payload,
      };
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
    if (supabase && sanitizeUuid(id)) {
      try {
        const payload: any = { localizacao_atual: novaLocalizacao, updated_at: new Date().toISOString() };
        if (detalhesTerceirizado) payload.detalhes_terceirizado = detalhesTerceirizado;

        const { data, error } = await supabase
          .from('ordens_servico')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) console.error('Supabase atualizarLocalizacaoOS error:', error);
        if (!error && data) return data as OrdemServico;
      } catch (e) {
        console.error(e);
      }
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
    if (supabase && sanitizeUuid(id)) {
      try {
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
        if (error) console.error('Supabase salvarLaudo error:', error);
        if (!error && data) return data as OrdemServico;
      } catch (e) {
        console.error(e);
      }
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
      id: generateUuid(),
      os_id: osId,
      ...item,
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase && sanitizeUuid(osId)) {
      try {
        await supabase.from('os_itens_pecas').insert([{
          ...novoItem,
          peca_estoque_id: sanitizeUuid(item.peca_estoque_id),
        }]);
        return this.getOrdemServicoById(osId);
      } catch (e) {
        console.error(e);
      }
    }

    const index = localOSStore.findIndex((o) => o.id === osId);
    if (index !== -1) {
      const pecasAtuais = localOSStore[index].pecas || [];
      localOSStore[index].pecas = [...pecasAtuais, novoItem];

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
    if (supabase && sanitizeUuid(osId)) {
      try {
        await supabase.from('os_itens_pecas').delete().eq('id', pecaId);
        return this.getOrdemServicoById(osId);
      } catch (e) {
        console.error(e);
      }
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

  async alternarTipoItemPeca(
    osId: string,
    pecaId: string,
    precoVendaRestaurar?: number
  ): Promise<OrdemServico | null> {
    const os = await this.getOrdemServicoById(osId);
    if (!os || !os.pecas) return null;

    const item = os.pecas.find((p) => p.id === pecaId);
    if (!item) return null;

    const ehGarantiaAtual = Number(item.preco_venda || 0) === 0;
    const novoPreco = ehGarantiaAtual
      ? (Number(precoVendaRestaurar) || (Number(item.custo) > 0 ? Number(item.custo) * 2 : 150))
      : 0;

    let novaDesc = item.descricao;
    if (ehGarantiaAtual) {
      novaDesc = novaDesc.replace(/^\[GARANTIA LOJA\]\s*/i, '').trim();
    } else {
      if (!novaDesc.toUpperCase().startsWith('[GARANTIA LOJA]')) {
        novaDesc = `[GARANTIA LOJA] ${novaDesc}`.trim();
      }
    }

    const supabase = createClient();
    if (supabase && sanitizeUuid(osId)) {
      try {
        await supabase
          .from('os_itens_pecas')
          .update({
            preco_venda: novoPreco,
            descricao: novaDesc,
          })
          .eq('id', pecaId);

        // Recalcular valor_pecas na OS se trigger não estiver ativa
        const { data: itensDb } = await supabase
          .from('os_itens_pecas')
          .select('preco_venda, quantidade')
          .eq('os_id', osId);

        if (itensDb) {
          const somaTotalPecas = itensDb.reduce(
            (acc, it) => acc + (Number(it.preco_venda) * Number(it.quantidade || 1)),
            0
          );
          const valorTotalNovo = Math.max(
            0,
            (Number(os.valor_servico) || 0) + somaTotalPecas - (Number(os.valor_desconto) || 0)
          );
          await supabase
            .from('ordens_servico')
            .update({
              valor_pecas: somaTotalPecas,
              valor_total: valorTotalNovo,
              updated_at: new Date().toISOString(),
            })
            .eq('id', osId);
        }

        return this.getOrdemServicoById(osId);
      } catch (e) {
        console.error('Erro ao alternar tipo da peca no Supabase:', e);
      }
    }

    const index = localOSStore.findIndex((o) => o.id === osId);
    if (index !== -1 && localOSStore[index].pecas) {
      const pIdx = localOSStore[index].pecas.findIndex((p) => p.id === pecaId);
      if (pIdx !== -1) {
        localOSStore[index].pecas[pIdx] = {
          ...localOSStore[index].pecas[pIdx],
          preco_venda: novoPreco,
          descricao: novaDesc,
        };

        const somaPecas = localOSStore[index].pecas.reduce(
          (acc, p) => acc + (p.preco_venda * (p.quantidade || 1)),
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
    }

    return null;
  },

  // 3. METRICS
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const ordensAtivas = await this.getOrdensServicoAtivas();

    const totalAtivas = ordensAtivas.length;
    const prontosEntrega = ordensAtivas.filter((o) => o.status === 'pronto_para_retirada').length;

    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    let faturamentoMes = 0;
    const supabase = createClient();

    if (supabase) {
      try {
        const primeiroDiaMes = new Date(anoAtual, mesAtual, 1).toISOString();
        const { data } = await supabase
          .from('ordens_servico')
          .select('valor_total')
          .in('status', ['pronto_para_retirada', 'entregue'])
          .gte('created_at', primeiroDiaMes);

        if (data) {
          faturamentoMes = data.reduce((acc: number, item: any) => acc + Number(item.valor_total || 0), 0);
        }
      } catch (e) {
        console.error('Error fetching faturamento metrics:', e);
      }
    } else {
      faturamentoMes = localOSStore
        .filter((o) => {
          if (o.status !== 'pronto_para_retirada' && o.status !== 'entregue') return false;
          const d = new Date(o.data_conclusao || o.data_entrada);
          return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        })
        .reduce((acc, o) => acc + (o.valor_total || 0), 0);
    }

    const emSpCount = ordensAtivas.filter(
      (o) =>
        o.localizacao_atual === 'em_transito_ida_sp' ||
        o.localizacao_atual === 'laboratorio_sp' ||
        o.localizacao_atual === 'em_transito_retorno_sp'
    ).length;

    const hoje = new Date();
    const spVencidasCount = ordensAtivas.filter((o) => {
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

    const garantiasLojaCount = ordensAtivas.filter(
      (o) => o.tipo_cobertura === 'Garantia da Loja' || o.tipo_cobertura === 'Garantia Android'
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

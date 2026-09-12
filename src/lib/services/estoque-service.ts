import { createClient } from '@/lib/supabase/client';
import { PecaEstoque, TipoQualidadePeca } from '@/types';

export const MOCK_ESTOQUE_PECAS: PecaEstoque[] = [];

let localEstoque: PecaEstoque[] = [];

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('fitch_estoque_store');
    if (saved) localEstoque = JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
}

function persistLocalEstoque() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fitch_estoque_store', JSON.stringify(localEstoque));
    } catch (e) {
      console.error(e);
    }
  }
}

export const EstoqueService = {
  async getPecas(): Promise<PecaEstoque[]> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('estoque_pecas')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const dbIds = new Set(data.map((d: any) => d.id));
          const localOnly = localEstoque.filter((l) => !dbIds.has(l.id) && l.id.startsWith('est-'));

          const mapped = data.map((dbPeca: any) => {
            const localMatch = localEstoque.find(
              (l) => l.id === dbPeca.id || (l.codigo_sku && l.codigo_sku === dbPeca.codigo_sku)
            );
            return {
              ...dbPeca,
              categoria: dbPeca.categoria || localMatch?.categoria || 'Bateria',
              marca: dbPeca.marca || localMatch?.marca || 'Apple',
              localizacao_gaveta: dbPeca.localizacao_gaveta || localMatch?.localizacao_gaveta || 'Bancada',
              fornecedor: dbPeca.fornecedor || localMatch?.fornecedor || 'China Parts',
            } as PecaEstoque;
          });

          localEstoque = [...localOnly, ...mapped];
          persistLocalEstoque();

          // Se houver peças pendentes salvas apenas localmente (est-), sincroniza automaticamente com o Supabase
          if (localOnly.length > 0) {
            this.syncPendingLocalPecas(localOnly);
          }

          return localEstoque;
        }
      } catch (e) {
        console.error('[EstoqueService] Erro ao buscar peças:', e);
      }
    }
    return localEstoque;
  },

  async syncPendingLocalPecas(pendingList: PecaEstoque[]) {
    const supabase = createClient();
    if (!supabase || !pendingList || pendingList.length === 0) return;

    for (const pending of pendingList) {
      try {
        const { id, created_at, ...dadosSemId } = pending;
        const synced = await this.cadastrarPeca(dadosSemId);
        if (synced && !synced.id.startsWith('est-')) {
          // Remove o item temporario local substituindo pelo real do Supabase
          localEstoque = localEstoque.filter((p) => p.id !== pending.id);
          persistLocalEstoque();
          console.log(`[EstoqueService] Peça pendente "${pending.descricao}" sincronizada com sucesso na nuvem.`);
        }
      } catch (e) {
        console.warn('[EstoqueService] Falha ao sincronizar peça pendente:', e);
      }
    }
  },

  async cadastrarPeca(
    peca: Omit<PecaEstoque, 'id' | 'created_at'>
  ): Promise<PecaEstoque> {
    let cleanSku = (peca.codigo_sku || '').trim().toUpperCase();
    if (!cleanSku) {
      cleanSku = `PEC-${Date.now().toString(36).toUpperCase()}`;
    }

    // Evitar erro de SKU duplicado se ja existir localmente
    const skuExists = localEstoque.some((p) => (p.codigo_sku || '').toUpperCase() === cleanSku);
    if (skuExists) {
      cleanSku = `${cleanSku}-${Math.floor(Math.random() * 90 + 10)}`;
    }

    const payloadFull: any = {
      descricao: (peca.descricao || '').trim(),
      codigo_sku: cleanSku,
      tipo_qualidade: peca.tipo_qualidade || 'Original',
      modelo_compativel: (peca.modelo_compativel || '').trim(),
      categoria: peca.categoria || 'Bateria',
      marca: peca.marca || 'Apple',
      estoque_minimo: peca.estoque_minimo !== undefined ? Number(peca.estoque_minimo) : 3,
      localizacao_gaveta: peca.localizacao_gaveta || 'Bancada',
      fornecedor: peca.fornecedor || 'China Parts',
      quantidade_estoque: Number(peca.quantidade_estoque) || 0,
      custo_unitario: Number(peca.custo_unitario) || 0,
      preco_venda: Number(peca.preco_venda) || 0,
    };

    const supabase = createClient();
    if (supabase) {
      // Tentativas progressivas de inserção: da mais completa até o esquema mínimo garantido
      const payloadsToTry = [
        // 1. Completo com todas as colunas
        { ...payloadFull },
        // 2. Sem fornecedor
        {
          descricao: payloadFull.descricao,
          codigo_sku: payloadFull.codigo_sku,
          tipo_qualidade: payloadFull.tipo_qualidade,
          modelo_compativel: payloadFull.modelo_compativel,
          categoria: payloadFull.categoria,
          marca: payloadFull.marca,
          localizacao_gaveta: payloadFull.localizacao_gaveta,
          estoque_minimo: payloadFull.estoque_minimo,
          quantidade_estoque: payloadFull.quantidade_estoque,
          custo_unitario: payloadFull.custo_unitario,
          preco_venda: payloadFull.preco_venda,
        },
        // 3. Sem localizacao_gaveta, estoque_minimo, marca
        {
          descricao: payloadFull.descricao,
          codigo_sku: payloadFull.codigo_sku,
          tipo_qualidade: payloadFull.tipo_qualidade,
          modelo_compativel: payloadFull.modelo_compativel,
          categoria: payloadFull.categoria,
          quantidade_estoque: payloadFull.quantidade_estoque,
          custo_unitario: payloadFull.custo_unitario,
          preco_venda: payloadFull.preco_venda,
        },
        // 4. Esquema original mínimo garantido (funciona mesmo se colunas novas ainda não foram criadas no Supabase)
        {
          descricao: payloadFull.descricao,
          codigo_sku: payloadFull.codigo_sku,
          tipo_qualidade: payloadFull.tipo_qualidade,
          modelo_compativel: payloadFull.modelo_compativel,
          quantidade_estoque: payloadFull.quantidade_estoque,
          custo_unitario: payloadFull.custo_unitario,
          preco_venda: payloadFull.preco_venda,
        },
      ];

      for (let attempt = 0; attempt < payloadsToTry.length; attempt++) {
        let currentPayload = { ...payloadsToTry[attempt] };
        try {
          let { data, error } = await supabase
            .from('estoque_pecas')
            .insert([currentPayload])
            .select()
            .single();

          // Se der erro de chave única duplicada (SKU já existe no banco remoto - código 23505)
          if (error && (error.code === '23505' || error.message?.toLowerCase().includes('sku') || error.message?.toLowerCase().includes('duplicate key'))) {
            const uniqueSku = `${cleanSku}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
            currentPayload.codigo_sku = uniqueSku;
            payloadFull.codigo_sku = uniqueSku;
            const retryRes = await supabase
              .from('estoque_pecas')
              .insert([currentPayload])
              .select()
              .single();
            data = retryRes.data;
            error = retryRes.error;
          }

          if (!error && data) {
            const novaPeca: PecaEstoque = {
              ...(data as PecaEstoque),
              ...payloadFull,
              id: data.id,
              created_at: data.created_at || new Date().toISOString(),
            };
            // Adiciona no topo do estoque local
            localEstoque = [novaPeca, ...localEstoque.filter((p) => p.id !== novaPeca.id && p.codigo_sku !== novaPeca.codigo_sku)];
            persistLocalEstoque();
            console.log(`[EstoqueService] Peça inserida com sucesso no Supabase na tentativa ${attempt + 1}:`, novaPeca.id);
            return novaPeca;
          } else if (error) {
            console.warn(`[EstoqueService] Tentativa ${attempt + 1} falhou no Supabase:`, error.message);
          }
        } catch (err) {
          console.error(`[EstoqueService] Exceção na tentativa ${attempt + 1}:`, err);
        }
      }
    }

    // Fallback de emergência local se o Supabase estiver indisponível
    console.warn('[EstoqueService] Gravando localmente após falha de inserção no Supabase.');
    const nova: PecaEstoque = {
      id: `est-${Date.now()}`,
      ...payloadFull,
      created_at: new Date().toISOString(),
    };
    localEstoque.unshift(nova);
    persistLocalEstoque();
    return nova;
  },

  async darEntradaEstoque(
    id: string,
    quantidadeAdicional: number,
    custoNovaCompra?: number,
    novoPrecoVenda?: number
  ): Promise<PecaEstoque | null> {
    let currentItem = localEstoque.find((p) => p.id === id);

    const supabase = createClient();
    if (supabase) {
      try {
        const { data: dbData } = await supabase.from('estoque_pecas').select('*').eq('id', id).single();
        if (dbData) currentItem = dbData as PecaEstoque;
      } catch (e) {}
    }

    if (!currentItem) return null;

    const qtdAtual = Number(currentItem.quantidade_estoque) || 0;
    const custoAtual = Number(currentItem.custo_unitario) || 0;
    const precoVendaAtual = Number(currentItem.preco_venda) || 0;

    const qtdNovaCompra = Number(quantidadeAdicional) || 0;
    const custoNovoUnitario = custoNovaCompra !== undefined ? Number(custoNovaCompra) : custoAtual;
    const precoVendaNovo = novoPrecoVenda !== undefined ? Number(novoPrecoVenda) : precoVendaAtual;

    const qtdTotalFinal = qtdAtual + qtdNovaCompra;

    // Cálculo do Custo Médio Ponderado
    let novoCustoMedio = custoAtual;
    if (qtdTotalFinal > 0) {
      const valorEstoqueAtual = qtdAtual * custoAtual;
      const valorNovaCompra = qtdNovaCompra * custoNovoUnitario;
      novoCustoMedio = (valorEstoqueAtual + valorNovaCompra) / qtdTotalFinal;
    } else {
      novoCustoMedio = custoNovoUnitario;
    }

    // Arredondar para 2 casas decimais
    novoCustoMedio = Math.round(novoCustoMedio * 100) / 100;

    const payloadToUpdate = {
      quantidade_estoque: qtdTotalFinal,
      custo_unitario: novoCustoMedio,
      preco_venda: precoVendaNovo,
    };

    if (supabase) {
      try {
        const { data } = await supabase
          .from('estoque_pecas')
          .update(payloadToUpdate)
          .eq('id', id)
          .select()
          .single();
        if (data) {
          const updated = data as PecaEstoque;
          const idx = localEstoque.findIndex((p) => p.id === id);
          if (idx !== -1) localEstoque[idx] = updated;
          persistLocalEstoque();
          return updated;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (currentItem) {
      currentItem.quantidade_estoque = qtdTotalFinal;
      currentItem.custo_unitario = novoCustoMedio;
      currentItem.preco_venda = precoVendaNovo;
      persistLocalEstoque();
      return { ...currentItem };
    }
    return null;
  },

  async atualizarValores(id: string, custo: number, venda: number): Promise<PecaEstoque | null> {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('estoque_pecas')
          .update({ custo_unitario: custo, preco_venda: venda })
          .eq('id', id)
          .select()
          .single();
        if (data) return data as PecaEstoque;
      } catch (e) {
        console.error(e);
      }
    }

    const peca = localEstoque.find((p) => p.id === id);
    if (peca) {
      peca.custo_unitario = custo;
      peca.preco_venda = venda;
      persistLocalEstoque();
      return { ...peca };
    }
    return null;
  },

  async atualizarPeca(id: string, dados: Partial<PecaEstoque>): Promise<PecaEstoque | null> {
    const supabase = createClient();
    if (supabase && !id.startsWith('est-')) {
      try {
        const { data, error } = await supabase
          .from('estoque_pecas')
          .update(dados)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          const updated = { ...(data as PecaEstoque), ...dados };
          const idx = localEstoque.findIndex((p) => p.id === id);
          if (idx !== -1) localEstoque[idx] = updated;
          persistLocalEstoque();
          return updated;
        }

        // Se falhou por colunas extras inexistentes no Supabase, tenta atualizar colunas base
        if (error) {
          const dadosBase: any = { ...dados };
          delete dadosBase.fornecedor;
          delete dadosBase.localizacao_gaveta;
          delete dadosBase.estoque_minimo;
          delete dadosBase.marca;
          delete dadosBase.categoria;

          if (Object.keys(dadosBase).length > 0) {
            const retryRes = await supabase
              .from('estoque_pecas')
              .update(dadosBase)
              .eq('id', id)
              .select()
              .single();
            if (!retryRes.error && retryRes.data) {
              const updated = { ...(retryRes.data as PecaEstoque), ...dados };
              const idx = localEstoque.findIndex((p) => p.id === id);
              if (idx !== -1) localEstoque[idx] = updated;
              persistLocalEstoque();
              return updated;
            }
          }
        }
      } catch (e) {
        console.error('[EstoqueService] Erro ao atualizar peça:', e);
      }
    }

    const peca = localEstoque.find((p) => p.id === id);
    if (peca) {
      Object.assign(peca, dados);
      persistLocalEstoque();
      return { ...peca };
    }
    return null;
  },

  async deletarPeca(id: string): Promise<boolean> {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('estoque_pecas').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }

    localEstoque = localEstoque.filter((p) => p.id !== id);
    persistLocalEstoque();
    return true;
  },

  async buscarPecas(query: string): Promise<PecaEstoque[]> {
    const q = query.toLowerCase().trim();
    const pecas = await this.getPecas();
    if (!q) return pecas;
    return pecas.filter(
      (p) =>
        p.descricao.toLowerCase().includes(q) ||
        p.codigo_sku.toLowerCase().includes(q) ||
        p.modelo_compativel.toLowerCase().includes(q)
    );
  },

  async darSaidaEstoque(id: string, quantidadeReduzir: number): Promise<PecaEstoque | null> {
    let currentItem = localEstoque.find((p) => p.id === id);

    const supabase = createClient();
    if (supabase) {
      try {
        const { data: dbData } = await supabase.from('estoque_pecas').select('*').eq('id', id).single();
        if (dbData) currentItem = dbData as PecaEstoque;
      } catch (e) {}
    }

    if (!currentItem) return null;

    const qtdAtual = Number(currentItem.quantidade_estoque) || 0;
    const qtdNova = Math.max(0, qtdAtual - Number(quantidadeReduzir));

    if (supabase) {
      try {
        const { data } = await supabase
          .from('estoque_pecas')
          .update({ quantidade_estoque: qtdNova })
          .eq('id', id)
          .select()
          .single();
        if (data) {
          const updated = data as PecaEstoque;
          const idx = localEstoque.findIndex((p) => p.id === id);
          if (idx !== -1) localEstoque[idx] = updated;
          persistLocalEstoque();
          return updated;
        }
      } catch (e) {
        console.error('Supabase darSaidaEstoque error:', e);
      }
    }

    currentItem.quantidade_estoque = qtdNova;
    const idx = localEstoque.findIndex((p) => p.id === id);
    if (idx !== -1) localEstoque[idx] = currentItem;
    persistLocalEstoque();
    return { ...currentItem };
  },
};

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
        const { data, error } = await supabase.from('estoque_pecas').select('*').order('created_at', { ascending: false });
        if (!error && data) return data as PecaEstoque[];
      } catch (e) {
        console.error(e);
      }
    }
    return localEstoque;
  },

  async cadastrarPeca(
    peca: Omit<PecaEstoque, 'id' | 'created_at'>
  ): Promise<PecaEstoque> {
    const cleanSku = (peca.codigo_sku || '').trim() || `PEC-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      ...peca,
      codigo_sku: cleanSku,
    };

    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('estoque_pecas').insert([payload]).select().single();
        if (!error && data) {
          const novaPeca = data as PecaEstoque;
          localEstoque.unshift(novaPeca);
          persistLocalEstoque();
          return novaPeca;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const nova: PecaEstoque = {
      id: `est-${Date.now()}`,
      ...payload,
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
    if (supabase) {
      try {
        const { data } = await supabase
          .from('estoque_pecas')
          .update(dados)
          .eq('id', id)
          .select()
          .single();
        if (data) {
          const idx = localEstoque.findIndex((p) => p.id === id);
          if (idx !== -1) localEstoque[idx] = data as PecaEstoque;
          persistLocalEstoque();
          return data as PecaEstoque;
        }
      } catch (e) {
        console.error(e);
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
};

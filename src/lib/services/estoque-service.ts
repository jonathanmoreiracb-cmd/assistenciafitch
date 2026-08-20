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

  async darEntradaEstoque(id: string, quantidadeAdicional: number): Promise<PecaEstoque | null> {
    const peca = localEstoque.find((p) => p.id === id);
    const novaQtd = (peca?.quantidade_estoque || 0) + quantidadeAdicional;

    const supabase = createClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('estoque_pecas')
          .update({ quantidade_estoque: novaQtd })
          .eq('id', id)
          .select()
          .single();
        if (data) {
          if (peca) peca.quantidade_estoque = novaQtd;
          persistLocalEstoque();
          return data as PecaEstoque;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (peca) {
      peca.quantidade_estoque = novaQtd;
      persistLocalEstoque();
      return { ...peca };
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

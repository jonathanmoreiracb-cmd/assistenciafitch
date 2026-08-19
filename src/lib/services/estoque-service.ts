import { PecaEstoque, TipoQualidadePeca } from '@/types';

export const MOCK_ESTOQUE_PECAS: PecaEstoque[] = [
  {
    id: 'est-001',
    descricao: 'Tela Completa OLED iPhone 14 Pro Max',
    codigo_sku: 'TEL-IP14PM-OLED',
    tipo_qualidade: 'OLED',
    modelo_compativel: 'iPhone 14 Pro Max',
    quantidade_estoque: 8,
    custo_unitario: 350.0,
    preco_venda: 650.0,
  },
  {
    id: 'est-002',
    descricao: 'Bateria Original Apple Watch Series 8 45mm',
    codigo_sku: 'BAT-AWS8-45',
    tipo_qualidade: 'Original',
    modelo_compativel: 'Apple Watch Series 8 45mm',
    quantidade_estoque: 12,
    custo_unitario: 110.0,
    preco_venda: 220.0,
  },
  {
    id: 'est-003',
    descricao: 'Módulo Câmera Traseira iPhone 15 Pro',
    codigo_sku: 'CAM-IP15P-ORIG',
    tipo_qualidade: 'Original',
    modelo_compativel: 'iPhone 15 Pro',
    quantidade_estoque: 4,
    custo_unitario: 300.0,
    preco_venda: 550.0,
  },
  {
    id: 'est-004',
    descricao: 'Display OLED com Aro Samsung Galaxy S24 Ultra',
    codigo_sku: 'DISP-S24U-OLED',
    tipo_qualidade: 'OLED',
    modelo_compativel: 'Samsung Galaxy S24 Ultra',
    quantidade_estoque: 6,
    custo_unitario: 750.0,
    preco_venda: 1100.0,
  },
  {
    id: 'est-005',
    descricao: 'Conector de Carga Lightning iPhone 13/14',
    codigo_sku: 'CON-IP1314-LIGHT',
    tipo_qualidade: 'Primeira Linha',
    modelo_compativel: 'iPhone 13, iPhone 14',
    quantidade_estoque: 25,
    custo_unitario: 25.0,
    preco_venda: 120.0,
  },
];

let localEstoque: PecaEstoque[] = [...MOCK_ESTOQUE_PECAS];

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
    return localEstoque;
  },

  async cadastrarPeca(
    peca: Omit<PecaEstoque, 'id' | 'created_at'>
  ): Promise<PecaEstoque> {
    const nova: PecaEstoque = {
      id: `est-${Date.now()}`,
      ...peca,
      created_at: new Date().toISOString(),
    };
    localEstoque.unshift(nova);
    persistLocalEstoque();
    return nova;
  },

  async darEntradaEstoque(id: string, quantidadeAdicional: number): Promise<PecaEstoque | null> {
    const peca = localEstoque.find((p) => p.id === id);
    if (peca) {
      peca.quantidade_estoque += quantidadeAdicional;
      persistLocalEstoque();
      return { ...peca };
    }
    return null;
  },

  async atualizarValores(id: string, custo: number, venda: number): Promise<PecaEstoque | null> {
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
    if (!q) return localEstoque;
    return localEstoque.filter(
      (p) =>
        p.descricao.toLowerCase().includes(q) ||
        p.codigo_sku.toLowerCase().includes(q) ||
        p.modelo_compativel.toLowerCase().includes(q)
    );
  },
};

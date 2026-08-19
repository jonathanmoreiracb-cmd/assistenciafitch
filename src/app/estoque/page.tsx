'use client';

import React, { useEffect, useState } from 'react';
import {
  Boxes,
  PlusCircle,
  Search,
  Plus,
  RefreshCw,
  PackageCheck,
} from 'lucide-react';
import { EstoqueService } from '@/lib/services/estoque-service';
import { PecaEstoque, TipoQualidadePeca } from '@/types';
import { toast } from 'sonner';

export default function EstoquePage() {
  const [pecas, setPecas] = useState<PecaEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Part Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [formNew, setFormNew] = useState({
    descricao: '',
    codigo_sku: '',
    tipo_qualidade: 'Original' as TipoQualidadePeca,
    modelo_compativel: '',
    quantidade_estoque: 5,
    custo_unitario: '100.00',
    preco_venda: '250.00',
  });

  // Restock Modal State
  const [restockItem, setRestockItem] = useState<PecaEstoque | null>(null);
  const [restockQtd, setRestockQtd] = useState('5');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await EstoqueService.getPecas();
      setPecas(data);
    } catch (e) {
      toast.error('Erro ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCadastrarPeca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNew.descricao || !formNew.codigo_sku || !formNew.modelo_compativel) {
      toast.error('Preencha os campos obrigatórios (Descrição, SKU e Modelo).');
      return;
    }

    try {
      await EstoqueService.cadastrarPeca({
        descricao: formNew.descricao,
        codigo_sku: formNew.codigo_sku.toUpperCase(),
        tipo_qualidade: formNew.tipo_qualidade,
        modelo_compativel: formNew.modelo_compativel,
        quantidade_estoque: Number(formNew.quantidade_estoque) || 0,
        custo_unitario: Number(formNew.custo_unitario) || 0,
        preco_venda: Number(formNew.preco_venda) || 0,
      });
      toast.success('Peça cadastrada no estoque com sucesso!');
      setShowNewModal(false);
      loadData();
    } catch (e) {
      toast.error('Erro ao cadastrar peça.');
    }
  };

  const handleDarEntrada = async () => {
    if (!restockItem) return;
    const qtd = Number(restockQtd);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade válida.');
      return;
    }

    try {
      await EstoqueService.darEntradaEstoque(restockItem.id, qtd);
      toast.success(`Entrada de +${qtd} unidades registrada.`);
      setRestockItem(null);
      loadData();
    } catch (e) {
      toast.error('Erro ao dar entrada.');
    }
  };

  const pecasFiltradas = pecas.filter(
    (p) =>
      !searchQuery ||
      p.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.modelo_compativel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItens = pecas.reduce((acc, p) => acc + p.quantidade_estoque, 0);
  const valorTotalCusto = pecas.reduce((acc, p) => acc + (p.custo_unitario * p.quantidade_estoque), 0);
  const valorTotalVenda = pecas.reduce((acc, p) => acc + (p.preco_venda * p.quantidade_estoque), 0);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Estoque de Peças</h1>
          <p className="text-xs text-slate-500 mt-0.5">Catálogo de peças de reposição para bancada.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-2xl apple-card text-slate-500 hover:text-slate-900"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Peça</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-slate-500">Saldo em Estoque</span>
          <p className="text-3xl font-bold text-[#1d1d1f] mt-1">{totalItens} un</p>
          <span className="text-[10px] text-slate-400">{pecas.length} itens cadastrados</span>
        </div>

        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-slate-500">Investimento (Custo)</span>
          <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">
            R$ {valorTotalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400">Total acumulado em custo</span>
        </div>

        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-slate-500">Venda Total Projetada</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
            R$ {valorTotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            Lucro projetado R$ {(valorTotalVenda - valorTotalCusto).toFixed(2)}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="apple-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Peça, SKU ou Modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/70 border border-slate-200/80 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Descrição da Peça</th>
                <th className="py-3 px-3">Qualidade</th>
                <th className="py-3 px-3">Modelo Compatível</th>
                <th className="py-3 px-3">Estoque</th>
                <th className="py-3 px-3">Custo Unit.</th>
                <th className="py-3 px-3">Venda Unit.</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pecasFiltradas.map((p) => {
                const isLow = p.quantidade_estoque <= 3;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0071e3]">{p.codigo_sku}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900">{p.descricao}</td>
                    <td className="py-3.5 px-3 font-mono text-[10px] text-slate-600">{p.tipo_qualidade}</td>
                    <td className="py-3.5 px-3 text-slate-700">{p.modelo_compativel}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                          isLow ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {p.quantidade_estoque} un
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-500">R$ {Number(p.custo_unitario).toFixed(2)}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">R$ {Number(p.preco_venda).toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setRestockItem(p)}
                        className="px-3 py-1 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] rounded-full font-semibold text-[10px] inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Dar Entrada
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW PART MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCadastrarPeca}
            className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Cadastrar Peça no Estoque</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Descrição *</label>
                <input
                  type="text"
                  placeholder="Ex: Tela Completa OLED iPhone 14 Pro Max"
                  value={formNew.descricao}
                  onChange={(e) => setFormNew({ ...formNew, descricao: e.target.value })}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU *</label>
                  <input
                    type="text"
                    placeholder="TEL-IP14PM"
                    value={formNew.codigo_sku}
                    onChange={(e) => setFormNew({ ...formNew, codigo_sku: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qualidade</label>
                  <select
                    value={formNew.tipo_qualidade}
                    onChange={(e) =>
                      setFormNew({
                        ...formNew,
                        tipo_qualidade: e.target.value as TipoQualidadePeca,
                      })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 focus:outline-none"
                  >
                    <option value="Original">Original</option>
                    <option value="Primeira Linha">Primeira Linha</option>
                    <option value="OLED">OLED</option>
                    <option value="Incell">Incell</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Modelo Compatível *</label>
                <input
                  type="text"
                  placeholder="Ex: iPhone 14 Pro Max"
                  value={formNew.modelo_compativel}
                  onChange={(e) =>
                    setFormNew({ ...formNew, modelo_compativel: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    value={formNew.quantidade_estoque}
                    onChange={(e) =>
                      setFormNew({ ...formNew, quantidade_estoque: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNew.custo_unitario}
                    onChange={(e) => setFormNew({ ...formNew, custo_unitario: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNew.preco_venda}
                    onChange={(e) => setFormNew({ ...formNew, preco_venda: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Salvar Peça
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Dar Entrada no Estoque</h3>
              <button onClick={() => setRestockItem(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-900">{restockItem.descricao}</p>
              <p className="text-slate-500 font-mono">SKU: {restockItem.codigo_sku}</p>

              <div className="pt-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Quantidade a Adicionar:
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQtd}
                  onChange={(e) => setRestockQtd(e.target.value)}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRestockItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Cancelar
              </button>
              <button
                onClick={handleDarEntrada}
                className="px-4 py-2 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Confirmar Entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

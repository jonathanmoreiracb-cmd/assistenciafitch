'use client';

import React, { useEffect, useState } from 'react';
import {
  Boxes,
  PlusCircle,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  AlertTriangle,
  Tag,
  MapPin,
  Smartphone,
  Layers,
} from 'lucide-react';
import { EstoqueService } from '@/lib/services/estoque-service';
import { AuthService } from '@/lib/services/auth-service';
import {
  PecaEstoque,
  TipoQualidadePeca,
  CategoriaPeca,
  MarcaPeca,
  Usuario,
} from '@/types';
import { toast } from 'sonner';

const CATEGORIAS_LIST: { id: CategoriaPeca; label: string; icon: string }[] = [
  { id: 'Bateria', label: 'Bateria', icon: '🔋' },
  { id: 'Tela', label: 'Tela', icon: '📱' },
  { id: 'Tampa', label: 'Tampa', icon: '🚪' },
  { id: 'Face ID', label: 'Face ID', icon: '👤' },
  { id: 'Carcaça', label: 'Carcaça', icon: '🛠️' },
  { id: 'NFC', label: 'NFC', icon: '📶' },
  { id: 'Camera', label: 'Camera', icon: '📷' },
  { id: 'Conector', label: 'Conector', icon: '🔌' },
  { id: 'Sensor', label: 'Sensor', icon: '👁️' },
  { id: 'Sinal', label: 'Sinal', icon: '📡' },
  { id: 'CI carga', label: 'CI carga', icon: '⚡' },
  { id: 'Transplante', label: 'Transplante', icon: '🧬' },
  { id: 'Outros', label: 'Outros', icon: '📦' },
];

const MARCAS_LIST: MarcaPeca[] = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Outra'];

export default function EstoquePage() {
  const [pecas, setPecas] = useState<PecaEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [selectedMarca, setSelectedMarca] = useState<string>('Todas');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => AuthService.getCurrentUser());

  // Modal State (Cadastro & Edição)
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingPeca, setEditingPeca] = useState<PecaEstoque | null>(null);

  const [formNew, setFormNew] = useState({
    descricao: '',
    codigo_sku: '',
    tipo_qualidade: 'Original' as TipoQualidadePeca,
    modelo_compativel: '',
    categoria: 'Bateria' as CategoriaPeca,
    marca: 'Apple' as MarcaPeca,
    estoque_minimo: 3,
    localizacao_gaveta: 'Bancada',
    fornecedor: 'China Parts',
    quantidade_estoque: 5,
    custo_unitario: '100.00',
    preco_venda: '250.00',
  });

  // Restock Modal State
  const [restockItem, setRestockItem] = useState<PecaEstoque | null>(null);
  const [restockQtd, setRestockQtd] = useState('5');
  const [restockCustoNovo, setRestockCustoNovo] = useState('100.00');
  const [restockPrecoVenda, setRestockPrecoVenda] = useState('250.00');

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
    const handleAuth = () => setCurrentUser(AuthService.getCurrentUser());
    window.addEventListener('fitch_auth_changed', handleAuth);
    return () => window.removeEventListener('fitch_auth_changed', handleAuth);
  }, []);

  const handleOpenNewModal = () => {
    setEditingPeca(null);
    setFormNew({
      descricao: '',
      codigo_sku: '',
      tipo_qualidade: 'Original',
      modelo_compativel: '',
      categoria: 'Bateria',
      marca: 'Apple',
      estoque_minimo: 3,
      localizacao_gaveta: 'Bancada',
      fornecedor: 'China Parts',
      quantidade_estoque: 5,
      custo_unitario: '100.00',
      preco_venda: '250.00',
    });
    setShowNewModal(true);
  };

  const handleOpenEditModal = (p: PecaEstoque) => {
    setEditingPeca(p);
    setFormNew({
      descricao: p.descricao,
      codigo_sku: p.codigo_sku || '',
      tipo_qualidade: p.tipo_qualidade,
      modelo_compativel: p.modelo_compativel,
      categoria: (p.categoria as CategoriaPeca) || 'Bateria',
      marca: (p.marca as MarcaPeca) || 'Apple',
      estoque_minimo: p.estoque_minimo !== undefined ? p.estoque_minimo : 3,
      localizacao_gaveta: p.localizacao_gaveta || 'Bancada',
      fornecedor: p.fornecedor || 'China Parts',
      quantidade_estoque: p.quantidade_estoque,
      custo_unitario: p.custo_unitario.toString(),
      preco_venda: p.preco_venda.toString(),
    });
    setShowNewModal(true);
  };

  const handleOpenRestockModal = (p: PecaEstoque) => {
    setRestockItem(p);
    setRestockQtd('5');
    setRestockCustoNovo(p.custo_unitario.toString());
    setRestockPrecoVenda(p.preco_venda.toString());
  };

  const handleCadastrarOuEditarPeca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNew.descricao || !formNew.modelo_compativel) {
      toast.error('Preencha os campos obrigatórios (Descrição e Modelo).');
      return;
    }

    try {
      if (editingPeca) {
        await EstoqueService.atualizarPeca(editingPeca.id, {
          descricao: formNew.descricao,
          codigo_sku: formNew.codigo_sku ? formNew.codigo_sku.toUpperCase() : editingPeca.codigo_sku,
          tipo_qualidade: formNew.tipo_qualidade,
          modelo_compativel: formNew.modelo_compativel,
          categoria: formNew.categoria,
          marca: formNew.marca,
          estoque_minimo: Number(formNew.estoque_minimo) || 3,
          localizacao_gaveta: formNew.localizacao_gaveta || 'Bancada',
          fornecedor: formNew.fornecedor || 'China Parts',
          quantidade_estoque: Number(formNew.quantidade_estoque) || 0,
          custo_unitario: Number(formNew.custo_unitario) || 0,
          preco_venda: Number(formNew.preco_venda) || 0,
        });
        toast.success('Peça atualizada no estoque!');
      } else {
        await EstoqueService.cadastrarPeca({
          descricao: formNew.descricao,
          codigo_sku: formNew.codigo_sku ? formNew.codigo_sku.toUpperCase() : '',
          tipo_qualidade: formNew.tipo_qualidade,
          modelo_compativel: formNew.modelo_compativel,
          categoria: formNew.categoria,
          marca: formNew.marca,
          estoque_minimo: Number(formNew.estoque_minimo) || 3,
          localizacao_gaveta: formNew.localizacao_gaveta || 'Bancada',
          fornecedor: formNew.fornecedor || 'China Parts',
          quantidade_estoque: Number(formNew.quantidade_estoque) || 0,
          custo_unitario: Number(formNew.custo_unitario) || 0,
          preco_venda: Number(formNew.preco_venda) || 0,
        });
        toast.success('Peça cadastrada no estoque com sucesso!');
      }
      setShowNewModal(false);
      setEditingPeca(null);
      loadData();
    } catch (e) {
      toast.error('Erro ao salvar peça.');
    }
  };

  const handleDeletarPeca = async (id: string, desc: string) => {
    if (confirm(`Tem certeza que deseja apagar a peça "${desc}" do estoque?`)) {
      try {
        await EstoqueService.deletarPeca(id);
        toast.success('Peça removida do estoque.');
        loadData();
      } catch (e) {
        toast.error('Erro ao remover peça.');
      }
    }
  };

  const handleDarEntrada = async () => {
    if (!restockItem) return;

    const qtd = Number(restockQtd);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error('Informe uma quantidade válida.');
      return;
    }

    const custoNovo = Number(restockCustoNovo);
    const precoVenda = Number(restockPrecoVenda);

    try {
      await EstoqueService.darEntradaEstoque(
        restockItem.id,
        qtd,
        isNaN(custoNovo) ? undefined : custoNovo,
        isNaN(precoVenda) ? undefined : precoVenda
      );
      toast.success(`Entrada de +${qtd} unidades registrada! Custo médio recalculado.`);
      setRestockItem(null);
      loadData();
    } catch (e) {
      toast.error('Erro ao dar entrada.');
    }
  };

  // Filtered Parts
  const pecasFiltradas = pecas.filter((p) => {
    // Text search
    const query = searchQuery.toLowerCase().trim();
    const matchText =
      !query ||
      p.descricao.toLowerCase().includes(query) ||
      (p.codigo_sku || '').toLowerCase().includes(query) ||
      p.modelo_compativel.toLowerCase().includes(query) ||
      (p.categoria || '').toLowerCase().includes(query) ||
      (p.marca || '').toLowerCase().includes(query) ||
      (p.localizacao_gaveta || '').toLowerCase().includes(query) ||
      (p.fornecedor || '').toLowerCase().includes(query);

    // Categoria filter
    const matchCategoria =
      selectedCategoria === 'Todas' || (p.categoria || 'Bateria') === selectedCategoria;

    // Marca filter
    const matchMarca =
      selectedMarca === 'Todas' || (p.marca || 'Apple') === selectedMarca;

    // Low stock filter
    const isLow = p.quantidade_estoque <= (p.estoque_minimo !== undefined ? p.estoque_minimo : 3);
    const matchLowStock = !onlyLowStock || isLow;

    return matchText && matchCategoria && matchMarca && matchLowStock;
  });

  // Analytics Metrics
  const totalItens = pecas.reduce((acc, p) => acc + p.quantidade_estoque, 0);
  const pecasBaixasCount = pecas.filter(
    (p) => p.quantidade_estoque <= (p.estoque_minimo !== undefined ? p.estoque_minimo : 3)
  ).length;
  const valorTotalCusto = pecas.reduce((acc, p) => acc + p.custo_unitario * p.quantidade_estoque, 0);
  const valorTotalVenda = pecas.reduce((acc, p) => acc + p.preco_venda * p.quantidade_estoque, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#0071e3]" />
            Estoque & Catálogo de Peças
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organização por categoria (Baterias, Telas, Tampas), marcas, gavetas e controle de reposição.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-2xl apple-card text-slate-500 hover:text-slate-900"
            title="Atualizar estoque"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Nova Peça</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div
        className={`grid gap-3 sm:gap-4 ${
          currentUser?.cargo === 'gerente'
            ? 'grid-cols-1 sm:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block">
            Total em Estoque
          </span>
          <p className="text-2xl sm:text-3xl font-black text-[#1d1d1f] mt-1 font-mono">
            {totalItens} <span className="text-sm font-normal text-slate-500">unidades</span>
          </p>
          <span className="text-[10px] text-slate-400">
            {pecas.length} modelos de peças ativos
          </span>
        </div>

        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`apple-card p-4 sm:p-5 cursor-pointer transition-all ${
            onlyLowStock
              ? 'ring-2 ring-amber-500 bg-amber-50/50'
              : pecasBaixasCount > 0
              ? 'hover:border-amber-300'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-amber-800">
              ⚠️ Reposição Necessária
            </span>
            {pecasBaixasCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Alerta
              </span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-1 font-mono">
            {pecasBaixasCount} <span className="text-sm font-normal text-amber-700">peças</span>
          </p>
          <span className="text-[10px] text-amber-700 font-medium">
            {onlyLowStock ? 'Clique para remover filtro de alerta' : 'Clique para filtrar peças em estoque baixo'}
          </span>
        </div>

        {currentUser?.cargo === 'gerente' && (
          <>
            <div className="apple-card p-4 sm:p-5">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block">
                Investimento (Custo)
              </span>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-1 font-mono truncate">
                R$ {valorTotalCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Custo acumulado investido</span>
            </div>

            <div className="apple-card p-4 sm:p-5">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block">
                Venda Projetada (Lucro)
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono truncate">
                R$ {valorTotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold">
                Margem Estimada: R$ {(valorTotalVenda - valorTotalCusto).toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* CATEGORIES PILLS SLIDER */}
      <div className="apple-card p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#0071e3]" /> Categorias Rápida de Peças
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {selectedCategoria === 'Todas' ? 'Exibindo Todas' : `Filtrado por: ${selectedCategoria}`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategoria('Todas')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedCategoria === 'Todas'
                ? 'bg-[#0071e3] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            🧩 Todas ({pecas.length})
          </button>

          {CATEGORIAS_LIST.map((cat) => {
            const count = pecas.filter((p) => (p.categoria || 'Bateria') === cat.id).length;
            const isSelected = selectedCategoria === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0071e3] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLE & SEARCH FILTERS CONTAINER */}
      <div className="apple-card p-4 sm:p-5 space-y-4">
        {/* FILTERS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-3 border-b border-slate-100 items-center">
          {/* Text Search */}
          <div className="relative sm:col-span-6">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Peça, SKU, Modelo, Gaveta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30"
            />
          </div>

          {/* Marca Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none"
            >
              <option value="Todas">🏷️ Marca: Todas</option>
              {MARCAS_LIST.map((m) => (
                <option key={m} value={m}>
                  Marca: {m}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle */}
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`w-full py-2 px-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                onlyLowStock
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{onlyLowStock ? 'Mostrando: Só Estoque Baixo' : 'Filtro: Reposição'}</span>
            </button>
          </div>
        </div>

        {/* MOBILE CARDS LIST */}
        <div className="block md:hidden space-y-3">
          {pecasFiltradas.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-xs">Nenhuma peça encontrada no filtro.</p>
          ) : (
            pecasFiltradas.map((p) => {
              const minEstoque = p.estoque_minimo !== undefined ? p.estoque_minimo : 3;
              const isLow = p.quantidade_estoque <= minEstoque;
              return (
                <div key={p.id} className="bg-slate-50/90 border border-slate-200/80 p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-mono font-bold text-[11px] text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {p.codigo_sku || 'SEM SKU'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-full">
                          {p.categoria || 'Bateria'}
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                          {p.marca || 'Apple'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-xs mt-1">{p.descricao}</h4>
                      <p className="text-[11px] text-slate-500">
                        {p.modelo_compativel} • {p.tipo_qualidade}
                      </p>
                      {p.localizacao_gaveta && (
                        <p className="text-[10px] text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {p.localizacao_gaveta}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black px-2.5 py-1 rounded-full text-xs block font-mono ${
                          isLow ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-900'
                        }`}
                      >
                        {p.quantidade_estoque} un
                      </span>
                      {isLow && (
                        <span className="text-[9px] font-extrabold text-amber-700 block mt-0.5">
                          ⚠️ Repor (≤{minEstoque})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Preço de Venda</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        R$ {Number(p.preco_venda).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenRestockModal(p)}
                        className="px-3 py-1 bg-[#0071e3] text-white rounded-full font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" /> Entrada
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 rounded-full bg-white text-slate-600 border border-slate-200"
                        title="Editar peça"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletarPeca(p.id, p.descricao)}
                        className="p-1.5 rounded-full bg-red-50 text-red-600 border border-red-200"
                        title="Excluir peça"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Categoria / Marca</th>
                <th className="py-3 px-3">Descrição da Peça</th>
                <th className="py-3 px-3">Modelo / Qualidade</th>
                <th className="py-3 px-3">Localização (Gaveta)</th>
                <th className="py-3 px-3">Estoque</th>
                <th className="py-3 px-3">Custo Unit.</th>
                <th className="py-3 px-3">Preço Venda</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pecasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma peça encontrada no filtro selecionado.
                  </td>
                </tr>
              ) : (
                pecasFiltradas.map((p) => {
                  const minEstoque = p.estoque_minimo !== undefined ? p.estoque_minimo : 3;
                  const isLow = p.quantidade_estoque <= minEstoque;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#0071e3] whitespace-nowrap">
                        {p.codigo_sku}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-extrabold text-[10px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full self-start">
                            {p.categoria || 'Bateria'}
                          </span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 self-start">
                            {p.marca || 'Apple'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">{p.descricao}</td>
                      <td className="py-3 px-3">
                        <span className="text-slate-800 font-medium block">{p.modelo_compativel}</span>
                        <span className="text-[10px] font-mono text-slate-500">{p.tipo_qualidade}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-semibold">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full text-[10px]">
                            📍 {p.localizacao_gaveta || 'Bancada'}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                            🏭 {p.fornecedor || 'China Parts'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-black px-2.5 py-1 rounded-full text-xs font-mono inline-block ${
                            isLow
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          {p.quantidade_estoque} un
                        </span>
                        {isLow && (
                          <span className="block text-[9px] font-extrabold text-amber-700 mt-0.5">
                            ⚠️ Repor (≤{minEstoque})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        R$ {Number(p.custo_unitario).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        R$ {Number(p.preco_venda).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRestockModal(p)}
                            className="px-2.5 py-1 bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] rounded-full font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            title="Dar entrada de lote no estoque"
                          >
                            <Plus className="w-3 h-3" /> Entrada
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Editar dados da peça"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletarPeca(p.id, p.descricao)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir peça"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW/EDIT PART MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCadastrarOuEditarPeca}
            className="apple-card bg-white p-6 max-w-xl w-full space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPeca ? 'Editar Peça no Estoque' : 'Cadastrar Nova Peça no Estoque'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-900 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Categoria & Marca */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Categoria *</label>
                  <select
                    value={formNew.categoria}
                    onChange={(e) =>
                      setFormNew({ ...formNew, categoria: e.target.value as CategoriaPeca })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none"
                  >
                    {CATEGORIAS_LIST.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Marca / Fabricante *</label>
                  <select
                    value={formNew.marca}
                    onChange={(e) =>
                      setFormNew({ ...formNew, marca: e.target.value as MarcaPeca })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none"
                  >
                    {MARCAS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Descrição da Peça *</label>
                <input
                  type="text"
                  placeholder="Ex: Tela Completa OLED iPhone 14 Pro Max, Bateria iPhone 11"
                  value={formNew.descricao}
                  onChange={(e) => setFormNew({ ...formNew, descricao: e.target.value })}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none"
                />
              </div>

              {/* SKU & Qualidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Código SKU (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: BAT-IP11, TEL-IP14PM"
                    value={formNew.codigo_sku}
                    onChange={(e) => setFormNew({ ...formNew, codigo_sku: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Qualidade / Linha</label>
                  <select
                    value={formNew.tipo_qualidade}
                    onChange={(e) =>
                      setFormNew({
                        ...formNew,
                        tipo_qualidade: e.target.value as TipoQualidadePeca,
                      })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none"
                  >
                    <option value="Original">Original</option>
                    <option value="Primeira Linha">Primeira Linha</option>
                    <option value="OLED">OLED</option>
                    <option value="Incell">Incell</option>
                  </select>
                </div>
              </div>

              {/* Modelo, Localização e Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Modelo Compatível *</label>
                  <input
                    type="text"
                    placeholder="Ex: iPhone 14 Pro Max"
                    value={formNew.modelo_compativel}
                    onChange={(e) =>
                      setFormNew({ ...formNew, modelo_compativel: e.target.value })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Localização (Gaveta)</label>
                  <input
                    type="text"
                    placeholder="Ex: Gaveta A1"
                    value={formNew.localizacao_gaveta}
                    onChange={(e) =>
                      setFormNew({ ...formNew, localizacao_gaveta: e.target.value })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fornecedor / Origem</label>
                  <input
                    type="text"
                    placeholder="Ex: China Parts, SP Peças"
                    value={formNew.fornecedor}
                    onChange={(e) =>
                      setFormNew({ ...formNew, fornecedor: e.target.value })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Quantidade, Estoque Mínimo, Custo e Venda */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    value={formNew.quantidade_estoque}
                    onChange={(e) =>
                      setFormNew({ ...formNew, quantidade_estoque: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-700 mb-1">Alerta Mín. (un)</label>
                  <input
                    type="number"
                    value={formNew.estoque_minimo}
                    onChange={(e) =>
                      setFormNew({ ...formNew, estoque_minimo: Number(e.target.value) || 1 })
                    }
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNew.custo_unitario}
                    onChange={(e) => setFormNew({ ...formNew, custo_unitario: e.target.value })}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNew.preco_venda}
                    onChange={(e) => setFormNew({ ...formNew, preco_venda: e.target.value })}
                    className="w-full bg-white border border-emerald-300 rounded-full px-3 py-1.5 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Salvar Peça
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {restockItem && (() => {
        const qtdAtual = restockItem.quantidade_estoque || 0;
        const custoAtual = restockItem.custo_unitario || 0;
        const qtdNova = Number(restockQtd) || 0;
        const custoNova = Number(restockCustoNovo) || 0;
        const qtdFinal = qtdAtual + qtdNova;

        let custoMedioRecalculado = custoAtual;
        if (qtdFinal > 0) {
          custoMedioRecalculado = (qtdAtual * custoAtual + qtdNova * custoNova) / qtdFinal;
        }

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="apple-card bg-white p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#0071e3]" />
                  Dar Entrada de Lote no Estoque
                </h3>
                <button
                  onClick={() => setRestockItem(null)}
                  className="text-slate-400 hover:text-slate-900 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-mono font-bold text-[#0071e3] uppercase block">
                  {restockItem.codigo_sku}
                </span>
                <p className="font-bold text-slate-900 text-xs">{restockItem.descricao}</p>
                <p className="text-[11px] text-slate-500">
                  Estoque Atual: <strong className="text-slate-900">{qtdAtual} un</strong> | Custo Atual: R$ {custoAtual.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Quantidade a Adicionar (+) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restockQtd}
                    onChange={(e) => setRestockQtd(e.target.value)}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Custo Novo Lote (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={restockCustoNovo}
                      onChange={(e) => setRestockCustoNovo(e.target.value)}
                      className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Preço Venda (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={restockPrecoVenda}
                      onChange={(e) => setRestockPrecoVenda(e.target.value)}
                      className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200/80 p-3 rounded-2xl space-y-1 text-[11px] text-blue-900">
                  <span className="font-bold block">💡 Cálculo Automático de Custo Médio:</span>
                  <p>
                    Novo Total: <strong>{qtdFinal} un</strong> • Novo Custo Médio: <strong>R$ {custoMedioRecalculado.toFixed(2)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDarEntrada}
                  className="px-5 py-2 text-xs font-bold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
                >
                  Confirmar Entrada
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

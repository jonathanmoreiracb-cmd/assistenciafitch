'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wrench,
  CheckCircle2,
  DollarSign,
  Building2,
  AlertTriangle,
  Search,
  PlusCircle,
  FileText,
  MessageSquare,
  Eye,
  RefreshCw,
  Printer,
  Trash2,
  ExternalLink,
  Filter,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { AuthService } from '@/lib/services/auth-service';
import { DashboardMetrics, OrdemServico, StatusOS, Usuario } from '@/types';
import { ThermalLabel } from '@/components/print/ThermalLabel';
import { WarrantyTerm } from '@/components/print/WarrantyTerm';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [ordensEncerradas, setOrdensEncerradas] = useState<OrdemServico[]>([]);
  const [loadingEncerradas, setLoadingEncerradas] = useState(false);
  const [hasLoadedEncerradas, setHasLoadedEncerradas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => AuthService.getCurrentUser());

  // Filters
  const [activeTab, setActiveTab] = useState<'em_andamento' | 'bancada' | 'sp' | 'garantia' | 'encerradas'>('em_andamento');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [vendedorFilter, setVendedorFilter] = useState<string>('todos');
  const [coberturaFilter, setCoberturaFilter] = useState<string>('todos');
  const [localizacaoFilter, setLocalizacaoFilter] = useState<string>('todos');

  // Print Modals
  const [printThermalOS, setPrintThermalOS] = useState<OrdemServico | null>(null);
  const [printWarrantyOS, setPrintWarrantyOS] = useState<OrdemServico | null>(null);
  const [isRotated90, setIsRotated90] = useState(false);

  const handleToggleRotate = () => {
    setIsRotated90((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('rotate-thermal-90');
      } else {
        document.body.classList.remove('rotate-thermal-90');
      }
      return next;
    });
  };

  const fetchEncerradas = async () => {
    setLoadingEncerradas(true);
    try {
      const list = await OSService.getOrdensServicoEncerradas();
      setOrdensEncerradas(list);
      setHasLoadedEncerradas(true);
    } catch (e) {
      toast.error('Erro ao carregar O.S. encerradas.');
    } finally {
      setLoadingEncerradas(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: [Promise<DashboardMetrics>, Promise<OrdemServico[]>, Promise<OrdemServico[]>?] = [
        OSService.getDashboardMetrics(),
        OSService.getOrdensServicoAtivas(),
      ];
      if (hasLoadedEncerradas) {
        promises.push(OSService.getOrdensServicoEncerradas());
      }
      const [m, listAtivas, listEncerradas] = await Promise.all(promises);
      setMetrics(m);
      setOrdens(listAtivas);
      if (listEncerradas) {
        setOrdensEncerradas(listEncerradas);
      }
    } catch (e) {
      toast.error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'em_andamento' | 'bancada' | 'sp' | 'garantia' | 'encerradas') => {
    setActiveTab(tab);
    if (tab === 'encerradas' && !hasLoadedEncerradas) {
      fetchEncerradas();
    }
  };

  useEffect(() => {
    loadData();
    const handleAuth = () => setCurrentUser(AuthService.getCurrentUser());
    window.addEventListener('fitch_auth_changed', handleAuth);
    return () => window.removeEventListener('fitch_auth_changed', handleAuth);
  }, []);

  const handlePrintThermal = () => {
    document.body.classList.remove('is-printing-warranty');
    document.body.classList.add('printing-thermal-mode');
    document.body.classList.add('is-printing-thermal');

    let styleEl = document.getElementById('thermal-page-override');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'thermal-page-override';
      styleEl.innerHTML = `@page { size: 80mm 50mm !important; margin: 0 !important; }`;
      document.head.appendChild(styleEl);
    }

    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-thermal-mode');
      document.body.classList.remove('is-printing-thermal');
      const el = document.getElementById('thermal-page-override');
      if (el) el.remove();
    }, 1000);
  };

  const handlePrintWarranty = () => {
    document.body.classList.remove('printing-thermal-mode');
    document.body.classList.remove('is-printing-thermal');
    document.body.classList.add('is-printing-warranty');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('is-printing-warranty');
    }, 1000);
  };

  const geratLinkWhatsApp = (os: OrdemServico) => {
    const nome = os.cliente?.nome.split(' ')[0] || 'Cliente';
    let msg = `Olá, ${nome}! A *Fitch Tecnologia* informa:\n\n`;
    msg += `Aparelho: *${os.tipo_dispositivo} ${os.modelo}*\nO.S. nº: *#${os.numero_os}*\n`;

    if (os.status === 'pronto_para_retirada') {
      msg += `🎉 Seu aparelho está *PRONTO PARA RETIRADA*!\nTotal: R$ ${Number(os.valor_total).toFixed(2)}`;
    } else {
      msg += `Status: *${formatStatus(os.status)}*.`;
    }

    const tel = os.cliente?.telefone.replace(/\D/g, '') || '';
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  };

  // Sellers list: combine AuthService atendentes and any seller names in orders
  const vendedoresList = React.useMemo(() => {
    const atendentes = AuthService.getAtendentes();
    const namesSet = new Set<string>();
    atendentes.forEach((a) => namesSet.add(a.nome));
    ordens.forEach((o) => {
      if (o.vendedor_nome) namesSet.add(o.vendedor_nome);
    });
    ordensEncerradas.forEach((o) => {
      if (o.vendedor_nome) namesSet.add(o.vendedor_nome);
    });
    return Array.from(namesSet).sort();
  }, [ordens, ordensEncerradas]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('todos');
    setVendedorFilter('todos');
    setCoberturaFilter('todos');
    setLocalizacaoFilter('todos');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'todos' ||
    vendedorFilter !== 'todos' ||
    coberturaFilter !== 'todos' ||
    localizacaoFilter !== 'todos';

  // Filtered List logic (with RBAC enforcement)
  const ordensBase = activeTab === 'encerradas' ? ordensEncerradas : ordens;

  const ordensFiltradas = ordensBase.filter((os) => {
    if (currentUser?.cargo === 'vendedor') {
      const isOwner = os.vendedor_id === currentUser.id || os.vendedor_nome === currentUser.nome;
      if (!isOwner) return false;
    }

    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      os.numero_os.toString().includes(query) ||
      (os.cliente?.nome && os.cliente.nome.toLowerCase().includes(query)) ||
      (os.cliente?.cpf && os.cliente.cpf.toLowerCase().includes(query)) ||
      (os.cliente?.telefone && os.cliente.telefone.toLowerCase().includes(query)) ||
      (os.numero_venda_syscor && os.numero_venda_syscor.toLowerCase().includes(query)) ||
      (os.imei_ou_serial && os.imei_ou_serial.toLowerCase().includes(query)) ||
      (os.modelo && os.modelo.toLowerCase().includes(query)) ||
      (os.tipo_dispositivo && os.tipo_dispositivo.toLowerCase().includes(query)) ||
      (os.vendedor_nome && os.vendedor_nome.toLowerCase().includes(query)) ||
      (os.defeito_reclamado && os.defeito_reclamado.toLowerCase().includes(query));

    let matchTab = true;
    if (activeTab === 'bancada') {
      matchTab = os.localizacao_atual === 'bancada_local';
    } else if (activeTab === 'sp') {
      matchTab =
        os.localizacao_atual === 'em_transito_ida_sp' ||
        os.localizacao_atual === 'laboratorio_sp' ||
        os.localizacao_atual === 'em_transito_retorno_sp';
    } else if (activeTab === 'garantia') {
      matchTab =
        os.tipo_cobertura === 'Garantia da Loja' ||
        os.tipo_cobertura === 'Garantia Android' ||
        os.tipo_cobertura === 'Revisão / Upgrade';
    } else if (activeTab === 'encerradas') {
      matchTab = os.status === 'entregue' || os.status === 'cancelado';
    } else if (activeTab === 'em_andamento') {
      matchTab = os.status !== 'entregue' && os.status !== 'cancelado';
    }

    let matchStatus = true;
    if (statusFilter !== 'todos') {
      matchStatus = os.status === statusFilter;
    }

    let matchVendedor = true;
    if (vendedorFilter !== 'todos') {
      matchVendedor = os.vendedor_nome === vendedorFilter || os.vendedor_id === vendedorFilter;
    }

    let matchCobertura = true;
    if (coberturaFilter !== 'todos') {
      matchCobertura = os.tipo_cobertura === coberturaFilter;
    }

    let matchLocalizacao = true;
    if (localizacaoFilter !== 'todos') {
      matchLocalizacao = os.localizacao_atual === localizacaoFilter;
    }

    return matchQuery && matchTab && matchStatus && matchVendedor && matchCobertura && matchLocalizacao;
  });

  const handleDeletarOS = async (targetOs: OrdemServico) => {
    const confirmacao = confirm(
      `Tem certeza que deseja excluir a Ordem de Serviço #${targetOs.numero_os} (${targetOs.cliente?.nome || 'Cliente'})?`
    );
    if (!confirmacao) return;

    try {
      await OSService.deletarOrdemServico(targetOs.id);
      toast.success(`Ordem de Serviço #${targetOs.numero_os} excluída.`);
      loadData();
    } catch (e) {
      toast.error('Erro ao excluir Ordem de Serviço.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="dashboard-content-area space-y-6">
        {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
            {currentUser?.cargo === 'vendedor'
              ? `Minhas Ordens de Serviço`
              : 'Visão Geral da Assistência'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser?.cargo === 'vendedor'
              ? `Logado como ${currentUser.nome} • Exibindo somente suas O.S.`
              : 'Painel de controle em tempo real da Fitch Tecnologia.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-2xl apple-card text-slate-500 hover:text-slate-900"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/os/nova"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova O.S.</span>
          </Link>
        </div>
      </div>

      {/* OVERDUE SP ALERT BANNER IF APPLICABLE */}
      {metrics && metrics.sp_vencidas_count > 0 && currentUser?.cargo !== 'vendedor' && (
        <div className="apple-card bg-amber-500/10 border-amber-500/30 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Alerta de Terceirizados em São Paulo
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Existem <strong>{metrics.sp_vencidas_count} aparelho(s)</strong> no laboratório de SP com previsão de retorno vencida.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('sp')}
            className="shrink-0 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-full"
          >
            Ver Aparelhos
          </button>
        </div>
      )}

      {/* ESSENTIAL METRIC CARDS */}
      <div className={`grid gap-3 sm:gap-4 ${currentUser?.cargo === 'gerente' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div className="apple-card apple-card-hover p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">O.S. Ativas</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#1d1d1f] mt-1.5">
            {metrics?.total_ativas ?? '-'}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Em andamento na loja</span>
        </div>

        <div className="apple-card apple-card-hover p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Prontos p/ Retirada</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1.5">
            {metrics?.prontos_entrega ?? '-'}
          </p>
          <span className="text-[10px] text-emerald-700/80 mt-0.5 block">Aguardando cliente</span>
        </div>

        {currentUser?.cargo === 'gerente' && (
          <div className="apple-card apple-card-hover p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Faturamento Mês</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#1d1d1f] mt-1.5 truncate font-mono">
              R$ {metrics?.faturamento_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '0,00'}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Concluídos este mês</span>
          </div>
        )}

        <div className="apple-card apple-card-hover p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Em São Paulo (SP)</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1.5">
            {metrics?.em_sp_count ?? '-'}
          </p>
          <span className="text-[10px] text-purple-700/80 mt-0.5 block">Laboratório parceiro</span>
        </div>
      </div>

      {/* SEARCH AND SEGMENTED TABS */}
      <div className="apple-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Segmented Control Filter Tabs (Scrollable on Mobile) */}
          <div className="bg-slate-100/80 p-1 rounded-full flex items-center gap-1 self-start max-w-full overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabChange('em_andamento')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'em_andamento'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Em Andamento
            </button>

            <button
              onClick={() => handleTabChange('bancada')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'bancada'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bancada Local
            </button>

            <button
              onClick={() => handleTabChange('sp')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'sp'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Em São Paulo
            </button>

            <button
              onClick={() => handleTabChange('garantia')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'garantia'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Garantias Loja
            </button>

            <button
              onClick={() => handleTabChange('encerradas')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'encerradas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Encerradas / Histórico
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar O.S., cliente ou IMEI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/70 border border-slate-200/80 rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] mr-0.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Filtros:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`border rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer transition-all ${
                statusFilter !== 'todos'
                  ? 'bg-blue-50 border-[#0071e3] text-[#0071e3] shadow-xs'
                  : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <option value="todos">Status: Todos</option>
              <option value="aguardando_analise">Aguardando Análise</option>
              <option value="orcamento_gerado">Orçamento Gerado</option>
              <option value="aprovado">Aprovado</option>
              <option value="aguardando_peca">Aguardando Peça</option>
              <option value="em_reparo">Em Reparo</option>
              <option value="pronto_para_retirada">Pronto para Retirada</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>

            {/* Vendedor Filter */}
            {currentUser?.cargo !== 'vendedor' && (
              <select
                value={vendedorFilter}
                onChange={(e) => setVendedorFilter(e.target.value)}
                className={`border rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer transition-all ${
                  vendedorFilter !== 'todos'
                    ? 'bg-blue-50 border-[#0071e3] text-[#0071e3] shadow-xs'
                    : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="todos">Vendedor: Todos</option>
                {vendedoresList.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            )}

            {/* Tipo de Cobertura / Serviço */}
            <select
              value={coberturaFilter}
              onChange={(e) => setCoberturaFilter(e.target.value)}
              className={`border rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer transition-all ${
                coberturaFilter !== 'todos'
                  ? 'bg-blue-50 border-[#0071e3] text-[#0071e3] shadow-xs'
                  : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <option value="todos">Serviço: Todos</option>
              <option value="Particular">Particular</option>
              <option value="Garantia da Loja">Garantia Seminovo (180d)</option>
              <option value="Garantia Android">Garantia Android (90d)</option>
              <option value="Revisão / Upgrade">Revisão / Trade-in</option>
            </select>

            {/* Localização Filter */}
            <select
              value={localizacaoFilter}
              onChange={(e) => setLocalizacaoFilter(e.target.value)}
              className={`border rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer transition-all ${
                localizacaoFilter !== 'todos'
                  ? 'bg-blue-50 border-[#0071e3] text-[#0071e3] shadow-xs'
                  : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <option value="todos">Localização: Todas</option>
              <option value="bancada_local">Bancada Local</option>
              <option value="em_transito_ida_sp">Em Trânsito p/ SP</option>
              <option value="laboratorio_sp">Laboratório SP</option>
              <option value="em_transito_retorno_sp">Retorno de SP</option>
              <option value="pronto_na_loja">Pronto na Loja</option>
            </select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full border border-rose-200 transition-colors shadow-2xs"
                title="Limpar todos os filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          {/* Result Counter */}
          <div className="text-[11px] font-medium text-slate-400">
            Exibindo <strong className="text-slate-900 font-bold">{ordensFiltradas.length}</strong> de <strong className="text-slate-900 font-bold">{ordensBase.length}</strong> O.S.
          </div>
        </div>

        {/* MOBILE CARD LIST (VISIBLE ONLY ON MOBILE) */}
        <div className="block md:hidden space-y-3">
          {loading || (activeTab === 'encerradas' && loadingEncerradas) ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Carregando Ordens de Serviço...
            </div>
          ) : ordensFiltradas.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma Ordem de Serviço encontrada.
            </div>
          ) : (
            ordensFiltradas.map((os) => (
              <div
                key={os.id}
                className="bg-slate-50/90 border border-slate-200/80 p-3.5 rounded-2xl space-y-3 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/os/${os.id}`}
                      className="font-bold text-sm text-[#0071e3] font-mono hover:underline"
                    >
                      #{os.numero_os}
                    </Link>
                    <span className="text-[11px] font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {os.tipo_dispositivo} {os.modelo}
                    </span>
                    {os.numero_venda_syscor && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                        Syscor: #{os.numero_venda_syscor}
                      </span>
                    )}
                  </div>
                  {renderAppleStatusBadge(os.status)}
                </div>

                <div className="flex justify-between items-start text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <p className="font-bold text-slate-900">{os.cliente?.nome || 'Cliente'}</p>
                    <p className="text-[11px] text-slate-500">{os.cliente?.telefone}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 font-mono">
                      {os.motivo_encerramento ? (
                        <span className="text-slate-500 text-[11px]">R$ 0,00 (Devolvido)</span>
                      ) : os.tipo_cobertura === 'Garantia da Loja' ? (
                        <span className="text-amber-600 text-[11px]">R$ 0,00 (Garantia Apple)</span>
                      ) : os.tipo_cobertura === 'Garantia Android' ? (
                        <span className="text-emerald-600 text-[11px]">R$ 0,00 (Garantia Android)</span>
                      ) : os.tipo_cobertura === 'Revisão / Upgrade' ? (
                        <span className="text-indigo-600 text-[11px]">R$ 0,00 (Loja)</span>
                      ) : (
                        <span>R$ {Number(os.valor_total).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="mt-0.5">{renderAppleLocationBadge(os.localizacao_atual)}</div>
                  </div>
                </div>

                {/* Mobile Quick Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  {currentUser?.cargo === 'gerente' ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Vend:</span>
                      <select
                        value={os.vendedor_id || ''}
                        onChange={async (e) => {
                          const atendentes = AuthService.getAtendentes();
                          const sel = atendentes.find((v) => v.id === e.target.value);
                          if (sel) {
                            const updated = await OSService.atualizarVendedorOS(os.id, sel.id, sel.nome);
                            if (updated) {
                              toast.success(`Vendedor da O.S. #${os.numero_os} alterado para ${sel.nome}!`);
                              loadData();
                            } else {
                              toast.error('Erro ao alterar vendedor.');
                            }
                          }
                        }}
                        className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-[10px] text-slate-800 font-bold focus:outline-none cursor-pointer"
                      >
                        {!os.vendedor_id && <option value="">{os.vendedor_nome || 'Selecionar'}</option>}
                        {AuthService.getAtendentes().map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Vendedor: {os.vendedor_nome || 'Loja'}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/os/${os.id}`}
                      className="p-1.5 rounded-full bg-white text-[#0071e3] border border-slate-200 shadow-2xs"
                      title="Ver O.S."
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => setPrintThermalOS(os)}
                      className="p-1.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs"
                      title="Etiqueta"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setPrintWarrantyOS(os)}
                      className="p-1.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs"
                      title="Termo A4"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <a
                      href={geratLinkWhatsApp(os)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleDeletarOS(os)}
                      className="p-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 shadow-2xs"
                      title="Excluir O.S."
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP DATA TABLE (HIDDEN ON MOBILE) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">O.S. nº</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Aparelho</th>
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3">Localização</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Valor Total</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading || (activeTab === 'encerradas' && loadingEncerradas) ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Carregando Ordens de Serviço...
                  </td>
                </tr>
              ) : ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma Ordem de Serviço encontrada.
                  </td>
                </tr>
              ) : (
                ordensFiltradas.map((os) => {
                  return (
                    <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-[#1d1d1f]">
                        <Link href={`/os/${os.id}`} className="hover:text-[#0071e3]">
                          #{os.numero_os}
                        </Link>
                        {os.numero_venda_syscor && (
                          <div className="text-[10px] font-semibold text-emerald-600 font-mono">
                            Syscor #{os.numero_venda_syscor}
                          </div>
                        )}
                        {os.motivo_encerramento && (
                          <div className="text-[10px] font-semibold text-slate-500">
                            Sem cobrança
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900">
                          {os.cliente?.nome || 'Cliente'}
                        </div>
                        <div className="text-[10px] text-slate-400">{os.cliente?.telefone}</div>
                      </td>

                      <td className="py-3.5 px-3 font-medium text-slate-800">
                        <div>
                          <span>{os.tipo_dispositivo} {os.modelo}</span>
                          {((os.fotos_entrada || []).length > 0 || ((os.checklist_entrada as any)?.fotos_urls || []).length > 0) && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              📷 {((os.fotos_entrada || []).length + ((os.checklist_entrada as any)?.fotos_urls || []).length)} foto(s)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600">
                        {currentUser?.cargo === 'gerente' ? (
                          <select
                            value={os.vendedor_id || ''}
                            onChange={async (e) => {
                              const atendentes = AuthService.getAtendentes();
                              const sel = atendentes.find((v) => v.id === e.target.value);
                              if (sel) {
                                const updated = await OSService.atualizarVendedorOS(os.id, sel.id, sel.nome);
                                if (updated) {
                                  toast.success(`Vendedor da O.S. #${os.numero_os} alterado para ${sel.nome}!`);
                                  loadData();
                                } else {
                                  toast.error('Erro ao alterar vendedor.');
                                }
                              }
                            }}
                            className="bg-slate-100/90 border border-slate-200 rounded-full px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                          >
                            {!os.vendedor_id && <option value="">{os.vendedor_nome || 'Selecionar Vendedor'}</option>}
                            {AuthService.getAtendentes().map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.nome}
                              </option>
                            ))}
                          </select>
                        ) : (
                          os.vendedor_nome || 'Atendente'
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {renderAppleLocationBadge(os.localizacao_atual)}
                      </td>

                      <td className="py-3.5 px-3">{renderAppleStatusBadge(os.status)}</td>

                      <td className="py-3.5 px-3 font-semibold text-slate-900 font-mono">
                        {os.motivo_encerramento ? (
                          <span className="text-slate-500 font-bold">R$ 0,00 (Devolvido)</span>
                        ) : os.tipo_cobertura === 'Garantia da Loja' ? (
                          <span className="text-amber-600 font-bold">R$ 0,00 (Garantia Apple)</span>
                        ) : os.tipo_cobertura === 'Garantia Android' ? (
                          <span className="text-emerald-600 font-bold">R$ 0,00 (Garantia Android)</span>
                        ) : os.tipo_cobertura === 'Revisão / Upgrade' ? (
                          <span className="text-indigo-600 font-bold">R$ 0,00 (Estoque Loja)</span>
                        ) : (
                          <span>R$ {Number(os.valor_total).toFixed(2)}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/os/${os.id}`}
                            className="p-1.5 rounded-full text-slate-400 hover:text-[#0071e3] hover:bg-slate-100"
                            title="Ver O.S."
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => setPrintThermalOS(os)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            title="Etiqueta Térmica 80x50mm"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setPrintWarrantyOS(os)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            title="Termo A4"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <a
                            href={geratLinkWhatsApp(os)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full text-emerald-600 hover:bg-emerald-50"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleDeletarOS(os)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir Ordem de Serviço (Aberta errada)"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>


      {/* THERMAL LABEL MODAL */}
      {printThermalOS && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0071e3]" />
                Etiqueta Térmica (80mm x 50mm)
              </h3>
              <button
                onClick={() => setPrintThermalOS(null)}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-auto printable-thermal-area">
              <ThermalLabel os={printThermalOS} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleRotate}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                    isRotated90
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  🔄 {isRotated90 ? 'Giro 90° Ativado' : 'Girar 90°'}
                </button>
                <Link
                  href={`/print/label/${printThermalOS.id}`}
                  target="_blank"
                  className="px-3 py-1.5 text-xs font-bold rounded-full border border-blue-200 bg-blue-50 text-[#0071e3] hover:bg-blue-100 transition-all flex items-center gap-1"
                >
                  🔍 Modo Escala & Zoom
                </Link>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    document.body.classList.remove('rotate-thermal-90');
                    setIsRotated90(false);
                    setPrintThermalOS(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePrintThermal}
                  className="px-5 py-2 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
                >
                  Imprimir Etiqueta (80x50mm)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WARRANTY TERM MODAL */}
      {printWarrantyOS && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 modal-warranty-overlay">
          <div className="apple-card bg-white p-6 max-w-4xl w-full space-y-4 max-h-[90vh] flex flex-col shadow-2xl modal-warranty-container">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 no-print">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0071e3]" />
                Termo de Garantia e Entrada A4
              </h3>
              <button
                onClick={() => setPrintWarrantyOS(null)}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 modal-warranty-scroll">
              <WarrantyTerm os={printWarrantyOS} />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 no-print">
              <Link
                href={`/print/warranty/${printWarrantyOS.id}`}
                target="_blank"
                className="px-3.5 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-[#0071e3] rounded-full border border-blue-200 flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Nova Aba (A4)</span>
              </Link>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrintWarrantyOS(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Fechar
                </button>
                <button
                  onClick={handlePrintWarranty}
                  className="px-5 py-2 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Termo A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Apple Style Helpers
function formatStatus(status: StatusOS) {
  const map: Record<StatusOS, string> = {
    aguardando_analise: 'Aguardando Análise',
    orcamento_gerado: 'Orçamento Gerado',
    aprovado: 'Aprovado',
    em_manutencao: 'Em Manutenção',
    aguardando_peca: 'Aguardando Peça',
    pronto_para_retirada: 'Pronto para Retirada',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };
  return map[status] || status;
}

function renderAppleStatusBadge(status: StatusOS) {
  const styles: Record<StatusOS, string> = {
    aguardando_analise: 'bg-amber-50 text-amber-700 border-amber-200',
    orcamento_gerado: 'bg-purple-50 text-purple-700 border-purple-200',
    aprovado: 'bg-blue-50 text-blue-700 border-blue-200',
    em_manutencao: 'bg-sky-50 text-[#0071e3] border-sky-200',
    aguardando_peca: 'bg-orange-50 text-orange-700 border-orange-200',
    pronto_para_retirada: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    entregue: 'bg-slate-100 text-slate-600 border-slate-200',
    cancelado: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
        styles[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function renderAppleLocationBadge(loc: string) {
  const map: Record<string, { label: string; style: string }> = {
    bancada_local: {
      label: 'Bancada Local',
      style: 'bg-slate-100 text-slate-700',
    },
    em_transito_ida_sp: {
      label: 'Indo p/ SP',
      style: 'bg-purple-50 text-purple-700',
    },
    laboratorio_sp: {
      label: 'Lab SP',
      style: 'bg-purple-100 text-purple-800 font-semibold',
    },
    em_transito_retorno_sp: {
      label: 'Retorno SP',
      style: 'bg-purple-50 text-purple-700',
    },
    loja_pronto: {
      label: 'Pronto na Loja',
      style: 'bg-emerald-50 text-emerald-700 font-semibold',
    },
  };

  const item = map[loc] || { label: loc, style: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full ${item.style}`}>
      {item.label}
    </span>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => AuthService.getCurrentUser());

  // Filters
  const [activeTab, setActiveTab] = useState<'todas' | 'bancada' | 'sp' | 'garantia'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Print Modals
  const [printThermalOS, setPrintThermalOS] = useState<OrdemServico | null>(null);
  const [printWarrantyOS, setPrintWarrantyOS] = useState<OrdemServico | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, list] = await Promise.all([
        OSService.getDashboardMetrics(),
        OSService.getOrdensServico(),
      ]);
      setMetrics(m);
      setOrdens(list);
    } catch (e) {
      toast.error('Erro ao carregar dados.');
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

  const handlePrintThermal = () => {
    document.body.classList.add('printing-thermal-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-thermal-mode');
    }, 1000);
  };

  const handlePrintWarranty = () => {
    document.body.classList.remove('printing-thermal-mode');
    window.print();
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

  // Filtered List logic (with RBAC enforcement)
  const ordensFiltradas = ordens.filter((os) => {
    if (currentUser?.cargo === 'vendedor') {
      const isOwner = os.vendedor_id === currentUser.id || os.vendedor_nome === currentUser.nome;
      if (!isOwner) return false;
    }

    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      os.numero_os.toString().includes(query) ||
      (os.cliente?.nome && os.cliente.nome.toLowerCase().includes(query)) ||
      (os.numero_venda_syscor && os.numero_venda_syscor.toLowerCase().includes(query)) ||
      os.imei_ou_serial.toLowerCase().includes(query) ||
      os.modelo.toLowerCase().includes(query);

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
    }

    let matchStatus = true;
    if (statusFilter !== 'todos') {
      matchStatus = os.status === statusFilter;
    }

    return matchQuery && matchTab && matchStatus;
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
              onClick={() => setActiveTab('todas')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'todas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas as O.S.
            </button>

            <button
              onClick={() => setActiveTab('bancada')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'bancada'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bancada Local
            </button>

            <button
              onClick={() => setActiveTab('sp')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'sp'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Em São Paulo
            </button>

            <button
              onClick={() => setActiveTab('garantia')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'garantia'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Garantias Loja
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
              className="w-full bg-slate-100/70 border border-slate-200/80 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30"
            />
          </div>
        </div>

        {/* MOBILE CARD LIST (VISIBLE ONLY ON MOBILE) */}
        <div className="block md:hidden space-y-3">
          {loading ? (
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
                  <span className="text-[10px] text-slate-400">
                    Vendedor: {os.vendedor_nome || 'Loja'}
                  </span>

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
              {loading ? (
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
                        {os.vendedor_nome || 'Pedro Vendedor'}
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintThermalOS(null)}
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
      )}

      {/* WARRANTY TERM MODAL */}
      {printWarrantyOS && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-4xl w-full space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
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

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <WarrantyTerm os={printWarrantyOS} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPrintWarrantyOS(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Fechar
              </button>
              <button
                onClick={handlePrintWarranty}
                className="px-5 py-2 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Imprimir Termo A4
              </button>
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

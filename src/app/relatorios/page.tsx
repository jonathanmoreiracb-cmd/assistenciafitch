'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  PieChart,
  UserCheck,
  Award,
  Users,
  ShieldAlert,
  Package,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { AuthService } from '@/lib/services/auth-service';
import { calcularComissaoVolume } from '@/lib/utils/commission';
import { DesempenhoVendedor, OrdemServico } from '@/types';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [searchPeca, setSearchPeca] = useState('');
  const [filtroGarantia, setFiltroGarantia] = useState<'todas' | 'em_garantia' | 'expirada'>('todas');
  const [filtroTipoCobranca, setFiltroTipoCobranca] = useState<'todos' | 'pagos' | 'garantia_loja'>('todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await OSService.getOrdensServico();
      setOrdens(data);
    } catch (e) {
      toast.error('Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (!user || user.cargo !== 'gerente') {
      toast.error('Acesso exclusivo ao perfil de Gerente.');
      router.push('/dashboard');
      return;
    }
    loadData();
  }, []);

  const ordensFiltradas = ordens.filter((os) => {
    if (periodo === 'todos') return true;
    const d = new Date(os.data_conclusao || os.data_entrada);
    const hoje = new Date();

    if (periodo === 'hoje') {
      return d.toDateString() === hoje.toDateString();
    }
    if (periodo === 'semana') {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      return d >= seteDiasAtras;
    }
    if (periodo === 'mes') {
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }
    return true;
  });

  const arrumados = ordensFiltradas.filter(
    (o) => o.status === 'pronto_para_retirada' || o.status === 'entregue'
  );

  const faturamentoTotal = arrumados.reduce((sum, o) => sum + Number(o.valor_total || 0), 0);

  const custoPecasTotal = arrumados.reduce((sum, o) => {
    const pecasCusto = (o.pecas || []).reduce((pSum, p) => pSum + (p.custo * p.quantidade), 0);
    return sum + pecasCusto;
  }, 0);

  const custoTerceirizadosTotal = arrumados.reduce((sum, o) => {
    return sum + Number(o.detalhes_terceirizado?.custo_laboratorio || 0);
  }, 0);

  const custoTotal = custoPecasTotal + custoTerceirizadosTotal;
  const lucroLiquido = faturamentoTotal - custoTotal;
  const margemLucro = faturamentoTotal > 0 ? (lucroLiquido / faturamentoTotal) * 100 : 0;

  const vendedores = AuthService.getVendedores();
  const desempenhoVendedores: DesempenhoVendedor[] = vendedores.map((v) => {
    const osDoVendedor = ordensFiltradas.filter(
      (o) => o.vendedor_id === v.id || o.vendedor_nome === v.nome
    );

    const osParticularesAbertas = osDoVendedor.filter(
      (o) => o.tipo_cobertura === 'Particular'
    ).length;

    const osParticularesConcluidas = osDoVendedor.filter(
      (o) =>
        o.tipo_cobertura === 'Particular' &&
        (o.status === 'pronto_para_retirada' || o.status === 'entregue')
    );

    const faturamentoVendedor = osParticularesConcluidas.reduce(
      (sum, o) => sum + Number(o.valor_total || 0),
      0
    );

    const calcComissao = calcularComissaoVolume(osParticularesConcluidas.length);
    const meta = v.meta_mensal_os || 10;
    const percentualMeta = Math.min(100, (osParticularesConcluidas.length / meta) * 100);

    return {
      vendedor_id: v.id,
      vendedor_nome: v.nome,
      os_particulares_abertas: osParticularesAbertas,
      os_particulares_concluidas: osParticularesConcluidas.length,
      faturamento_gerado: faturamentoVendedor,
      meta_mensal: meta,
      percentual_meta: percentualMeta,
      valor_comissao_por_os: calcComissao.valorPorOS,
      faixa_comissao_label: calcComissao.faixaLabel,
      comissao_estimada: calcComissao.comissaoTotal,
    };
  });

  // Extração e consolidação das peças que saíram nas O.S. filtradas
  const pecasUtilizadas = ordensFiltradas
    .filter((o) => o.status !== 'cancelado')
    .flatMap((o) =>
      (o.pecas || []).map((p) => {
        const dataReferencia = o.data_conclusao || o.data_baixa || o.data_entrada;
        const diasGarantia = o.garantia_dias || 90;
        const diasPassados = Math.max(
          0,
          Math.floor((Date.now() - new Date(dataReferencia).getTime()) / (1000 * 60 * 60 * 24))
        );
        const diasRestantes = Math.max(0, diasGarantia - diasPassados);
        const emGarantia = diasPassados <= diasGarantia;
        const qtd = p.quantidade || 1;
        const custoTotalItem = Number(p.custo || 0) * qtd;
        const vendaTotalItem = Number(p.preco_venda || 0) * qtd;
        const ehGarantia =
          vendaTotalItem === 0 ||
          (p.descricao && p.descricao.toUpperCase().includes('[GARANTIA LOJA]')) ||
          o.tipo_cobertura === 'Garantia da Loja';
        const lucroTotalItem = ehGarantia ? -custoTotalItem : vendaTotalItem - custoTotalItem;

        return {
          id: p.id,
          osId: o.id,
          numeroOs: o.numero_os,
          clienteNome: o.cliente?.nome || 'Cliente Balcão',
          clienteTelefone: o.cliente?.telefone || '',
          aparelho: `${o.tipo_dispositivo} ${o.modelo}`,
          imei: o.imei_ou_serial,
          pecaNome: p.descricao,
          qualidade: p.tipo_qualidade,
          quantidade: qtd,
          custo: custoTotalItem,
          venda: vendaTotalItem,
          lucro: lucroTotalItem,
          ehGarantia,
          dataSaida: dataReferencia,
          diasGarantia,
          diasPassados,
          diasRestantes,
          emGarantia,
          syscorVenda: o.numero_venda_syscor,
        };
      })
    );

  const pecasFiltradas = pecasUtilizadas.filter((p) => {
    // Filtro de Garantia 90d
    if (filtroGarantia === 'em_garantia' && !p.emGarantia) return false;
    if (filtroGarantia === 'expirada' && p.emGarantia) return false;

    // Filtro de Tipo de Cobrança (Pago vs Garantia da Loja)
    if (filtroTipoCobranca === 'pagos' && p.ehGarantia) return false;
    if (filtroTipoCobranca === 'garantia_loja' && !p.ehGarantia) return false;

    // Filtro de Busca texto
    if (!searchPeca.trim()) return true;
    const q = searchPeca.toLowerCase().trim();
    return (
      p.pecaNome.toLowerCase().includes(q) ||
      p.aparelho.toLowerCase().includes(q) ||
      p.imei.toLowerCase().includes(q) ||
      p.clienteNome.toLowerCase().includes(q) ||
      p.numeroOs.toString().includes(q) ||
      (p.syscorVenda && p.syscorVenda.toLowerCase().includes(q))
    );
  });

  const pecasPagas = pecasUtilizadas.filter((p) => !p.ehGarantia);
  const pecasGarantiaLoja = pecasUtilizadas.filter((p) => p.ehGarantia);

  const totalQtdPecas = pecasUtilizadas.reduce((sum, p) => sum + p.quantidade, 0);
  const totalCustoPecasPagas = pecasPagas.reduce((sum, p) => sum + p.custo, 0);
  const totalVendaPecasPagas = pecasPagas.reduce((sum, p) => sum + p.venda, 0);
  const totalLucroPecasPagas = totalVendaPecasPagas - totalCustoPecasPagas;

  const totalCustoGarantiaLoja = pecasGarantiaLoja.reduce((sum, p) => sum + p.custo, 0);
  const lucroLiquidoRealPecas = totalLucroPecasPagas - totalCustoGarantiaLoja;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
            Relatórios Financeiros & Comissões
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidado de aparelhos arrumados, faturamento e comissão por O.S. Particular.
          </p>
        </div>

        {/* Apple Segmented Control */}
        <div className="bg-slate-100/80 p-1 rounded-full flex items-center gap-1 self-start max-w-full overflow-x-auto no-scrollbar">
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              periodo === 'hoje'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('semana')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              periodo === 'semana'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              periodo === 'mes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              periodo === 'todos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todo Histórico
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Aparelhos Arrumados</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1.5">{arrumados.length} un</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Concluídos no período</span>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Faturamento Total</span>
          <p className="text-xl sm:text-2xl font-bold text-[#1d1d1f] mt-1.5 font-mono truncate">
            R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Receita total da loja</span>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Custo Operacional Total</span>
          <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1.5 font-mono truncate">
            R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Peças + Laboratórios SP</span>
        </div>

        <div className="apple-card p-4 sm:p-5 bg-gradient-to-b from-white to-emerald-50/30 border-emerald-200/80">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Lucro Líquido Real</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1.5 font-mono truncate">
            R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            Margem: {margemLucro.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* SELLER COMMISSION TIERS */}
      <div className="apple-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0071e3]" />
              Gratificação por Assistência Particular Negociada
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escala progressiva: R$ 20,00 até R$ 50,00 por O.S. Particular negociada. (O.S. de Garantia não geram gratificação).
            </p>
          </div>

          <div className="text-right text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl font-medium">
            <span>Até 5 un: R$ 20,00 • 6 un: R$ 30,00</span>
            <br />
            <span>7 a 8 un: R$ 40,00 • Acima de 8 (9+): R$ 50,00</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {desempenhoVendedores.map((v) => (
            <div key={v.vendedor_id} className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center font-bold text-sm">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{v.vendedor_nome}</h4>
                    <span className="text-[10px] font-bold text-[#0071e3]">
                      Faixa Atual: {v.faixa_comissao_label}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Comissão</span>
                  <span className="text-base font-extrabold text-emerald-600 font-mono">
                    R$ {v.comissao_estimada.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">
                    O.S. Particulares Validadas: {v.os_particulares_concluidas} / {v.meta_mensal} un
                  </span>
                  <span className="text-[#0071e3] font-mono">
                    R$ {v.valor_comissao_por_os.toFixed(2)} / O.S.
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, v.percentual_meta)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/80">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Cálculo da Comissão</span>
                  <span className="font-bold text-slate-900">
                    {v.os_particulares_concluidas} un × R$ {v.valor_comissao_por_os.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block">Faturamento Gerado</span>
                  <span className="font-bold text-[#0071e3]">R$ {v.faturamento_gerado.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO: HISTÓRICO DE PEÇAS UTILIZADAS, CUSTO X LUCRO & GARANTIA */}
      <div className="apple-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Histórico de Peças Utilizadas & Garantias (90 dias)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rastreabilidade de cada peça que saiu do estoque nas Ordens de Serviço, com cálculo de Custo x Venda x Lucro e prazo de garantia.
            </p>
          </div>

          {/* Quick Metrics of Parts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Peças</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{totalQtdPecas} un</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {pecasPagas.length} pagas • {pecasGarantiaLoja.length} gar.
              </span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-blue-800 uppercase block font-semibold">Venda Peças (Receita)</span>
              <span className="font-bold text-blue-700 font-mono text-sm">R$ {totalVendaPecasPagas.toFixed(2)}</span>
              <span className="text-[9px] text-blue-500 block mt-0.5">Cobrado de clientes</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Custo Peças Pagas</span>
              <span className="font-bold text-slate-700 font-mono text-sm">R$ {totalCustoPecasPagas.toFixed(2)}</span>
              <span className="text-[9px] text-emerald-600 block mt-0.5 font-semibold">
                +R$ {totalLucroPecasPagas.toFixed(2)} lucro
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-amber-800 uppercase block font-semibold">Despesa Garantia Loja</span>
              <span className="font-bold text-amber-700 font-mono text-sm">R$ {totalCustoGarantiaLoja.toFixed(2)}</span>
              <span className="text-[9px] text-amber-600 block mt-0.5">
                {pecasGarantiaLoja.length} peças s/ cobrança
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Lucro Líquido Peças</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">R$ {lucroLiquidoRealPecas.toFixed(2)}</span>
              <span className="text-[9px] text-emerald-600 block mt-0.5">
                Lucro Pagas - Desp. Gar.
              </span>
            </div>
          </div>
        </div>

        {/* Filtros e Busca de Peças */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por peça, modelo, O.S. ou cliente..."
              value={searchPeca}
              onChange={(e) => setSearchPeca(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-9 pr-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Tipo de Cobrança */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full text-xs font-semibold">
              <button
                onClick={() => setFiltroTipoCobranca('todos')}
                className={`px-3 py-1 rounded-full transition-all ${
                  filtroTipoCobranca === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({pecasUtilizadas.length})
              </button>
              <button
                onClick={() => setFiltroTipoCobranca('pagos')}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                  filtroTipoCobranca === 'pagos'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                💰 Pagas ({pecasPagas.length})
              </button>
              <button
                onClick={() => setFiltroTipoCobranca('garantia_loja')}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                  filtroTipoCobranca === 'garantia_loja'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                🛡️ Garantia Loja ({pecasGarantiaLoja.length})
              </button>
            </div>

            {/* Filtro de Prazo Garantia 90d */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full text-xs font-semibold">
              <button
                onClick={() => setFiltroGarantia('todas')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  filtroGarantia === 'todas'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Prazo: Todos
              </button>
              <button
                onClick={() => setFiltroGarantia('em_garantia')}
                className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                  filtroGarantia === 'em_garantia'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                90d Ativo ({pecasUtilizadas.filter((p) => p.emGarantia).length})
              </button>
              <button
                onClick={() => setFiltroGarantia('expirada')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  filtroGarantia === 'expirada'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expiradas ({pecasUtilizadas.filter((p) => !p.emGarantia).length})
              </button>
            </div>
          </div>
        </div>

        {/* Tabela Detalhada */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/50">
                <th className="py-2.5 px-3">Data Saída</th>
                <th className="py-2.5 px-3">O.S. / Cliente</th>
                <th className="py-2.5 px-3">Aparelho / IMEI</th>
                <th className="py-2.5 px-3">Peça Utilizada</th>
                <th className="py-2.5 px-3 text-right">Custo Loja</th>
                <th className="py-2.5 px-3 text-right">Preço Venda</th>
                <th className="py-2.5 px-3 text-right">Lucro Líquido</th>
                <th className="py-2.5 px-3 text-center">Garantia (90d)</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {pecasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma peça utilizada encontrada para este período ou filtro.
                  </td>
                </tr>
              ) : (
                pecasFiltradas.map((p) => {
                  const dataFormatada = p.dataSaida
                    ? new Date(p.dataSaida).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr key={`${p.osId}-${p.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {dataFormatada}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>O.S. #{p.numeroOs}</span>
                          {p.syscorVenda && (
                            <span className="text-[9px] font-mono bg-blue-50 text-[#0071e3] border border-blue-200 px-1.5 py-0.2 rounded">
                              Syscor #{p.syscorVenda}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {p.clienteNome}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{p.aparelho}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.imei}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{p.pecaNome}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.ehGarantia ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] px-2 py-0.2 rounded-full font-bold">
                              🛡️ Garantia da Loja
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-2 py-0.2 rounded-full font-bold">
                              💰 Serviço Pago
                            </span>
                          )}
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.2 rounded-full font-mono">
                            {p.qualidade}
                          </span>
                          {p.quantidade > 1 && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                              {p.quantidade}x
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 font-semibold whitespace-nowrap">
                        R$ {Number(p.custo).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {p.ehGarantia ? (
                          <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                            R$ 0,00 (Garantia)
                          </span>
                        ) : (
                          <span className="text-slate-900 font-bold">
                            R$ {Number(p.venda).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black whitespace-nowrap">
                        {p.ehGarantia ? (
                          <span className="text-amber-700 text-xs">
                            - R$ {Number(p.custo).toFixed(2)}
                            <span className="text-[9px] font-normal block text-amber-600">despesa loja</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs">
                            + R$ {Number(p.lucro).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {p.emGarantia ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Garantia ({p.diasRestantes}d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                            Expirada ({p.diasPassados}d)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => router.push(`/os/${p.osId}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0071e3] hover:underline"
                        >
                          Ver O.S. <ExternalLink className="w-3 h-3" />
                        </button>
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
  );
}

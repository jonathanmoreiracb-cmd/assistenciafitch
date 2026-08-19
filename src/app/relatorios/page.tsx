'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  PieChart,
  UserCheck,
  Award,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { AuthService } from '@/lib/services/auth-service';
import { calcularComissaoVolume } from '@/lib/utils/commission';
import { DesempenhoVendedor, OrdemServico } from '@/types';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);

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
    const meta = v.meta_mensal_os || 15;
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
        <div className="bg-slate-100/80 p-1 rounded-full flex items-center gap-1 self-start">
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              periodo === 'hoje'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('semana')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              periodo === 'semana'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              periodo === 'mes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo('todos')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-slate-500">Aparelhos Arrumados</span>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{arrumados.length} un</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Concluídos no período</span>
        </div>

        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-slate-500">Faturamento Total</span>
          <p className="text-2xl font-bold text-[#1d1d1f] mt-2 font-mono">
            R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Receita total da loja</span>
        </div>

        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-slate-500">Custo Operacional Total</span>
          <p className="text-2xl font-bold text-red-600 mt-2 font-mono">
            R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Peças + Laboratórios SP</span>
        </div>

        <div className="apple-card p-5 bg-gradient-to-b from-white to-emerald-50/30 border-emerald-200/80">
          <span className="text-xs font-semibold text-slate-500">Lucro Líquido Real</span>
          <p className="text-3xl font-bold text-emerald-700 mt-2 font-mono">
            R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
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
              Comissões por Volume de O.S. Particulares
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escala progressiva: R$ 20,00 até R$ 50,00 por O.S. Particular. (O.S. de Garantia não geram comissão).
            </p>
          </div>

          <div className="text-right text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <span>R$ 20 (1-10 un) • R$ 30 (11-20 un)</span>
            <br />
            <span>R$ 40 (21-30 un) • R$ 50 (31+ un)</span>
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
    </div>
  );
}

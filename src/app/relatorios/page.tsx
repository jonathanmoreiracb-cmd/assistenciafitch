'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Printer,
  Copy,
  Calendar,
  X,
  User,
  Filter,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { AuthService } from '@/lib/services/auth-service';
import { calcularComissaoVolume } from '@/lib/utils/commission';
import { DesempenhoVendedor, OrdemServico, Usuario } from '@/types';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'todos' | 'personalizado'>('mes');
  const [mesPersonalizado, setMesPersonalizado] = useState<string>(''); // YYYY-MM
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [searchPeca, setSearchPeca] = useState('');
  const [filtroGarantia, setFiltroGarantia] = useState<'todas' | 'em_garantia' | 'expirada'>('todas');
  const [filtroTipoCobranca, setFiltroTipoCobranca] = useState<'todos' | 'pagos' | 'garantia_loja'>('todos');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');

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

  // Lista consolidada de todos os vendedores cadastrados + vendedores com O.S. no sistema
  const allVendedores = useMemo(() => {
    const list: Usuario[] = [...AuthService.getVendedores()];
    const nomesCadastrados = new Set(list.map((u) => u.nome.trim().toLowerCase()));

    ordens.forEach((o) => {
      const nomeVendedor = (o.vendedor_nome || '').trim();
      if (nomeVendedor && !nomesCadastrados.has(nomeVendedor.toLowerCase())) {
        nomesCadastrados.add(nomeVendedor.toLowerCase());
        list.push({
          id: o.vendedor_id || `vendedor-${nomeVendedor}`,
          nome: nomeVendedor,
          email: `${nomeVendedor.toLowerCase().replace(/\s+/g, '')}@fitch.com`,
          senha: '',
          cargo: 'vendedor',
          meta_mensal_os: 10,
          percentual_comissao: 5,
        });
      }
    });

    return list.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [ordens]);

  // Filtragem por Período
  const ordensFiltradas = useMemo(() => {
    return ordens.filter((os) => {
      if (periodo === 'todos') return true;
      const dataStr = os.data_conclusao || os.data_baixa || os.data_entrada;
      if (!dataStr) return true;
      const d = new Date(dataStr);
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
      if (periodo === 'mes_anterior') {
        const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        return d.getMonth() === mesPassado.getMonth() && d.getFullYear() === mesPassado.getFullYear();
      }
      if (periodo === 'personalizado' && mesPersonalizado) {
        const [ano, mes] = mesPersonalizado.split('-').map(Number);
        return d.getFullYear() === ano && d.getMonth() === mes - 1;
      }
      return true;
    });
  }, [ordens, periodo, mesPersonalizado]);

  // Ordens concluídas
  const arrumados = useMemo(() => {
    return ordensFiltradas.filter(
      (o) => o.status === 'pronto_para_retirada' || o.status === 'entregue'
    );
  }, [ordensFiltradas]);

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

  // Desempenho e cálculo de comissão para cada vendedor
  const desempenhoVendedores: DesempenhoVendedor[] = useMemo(() => {
    return allVendedores.map((v) => {
      const osDoVendedor = ordensFiltradas.filter((o) => {
        if (o.vendedor_id && v.id && o.vendedor_id === v.id) return true;
        if (o.vendedor_nome && v.nome && o.vendedor_nome.trim().toLowerCase() === v.nome.trim().toLowerCase()) return true;
        return false;
      });

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
  }, [allVendedores, ordensFiltradas]);

  // Vendedor atualmente selecionado no filtro
  const selectedVendedorData = useMemo(() => {
    if (filtroVendedor === 'todos') return null;
    return desempenhoVendedores.find((d) => {
      return (
        d.vendedor_nome.toLowerCase() === filtroVendedor.toLowerCase() ||
        d.vendedor_id === filtroVendedor
      );
    });
  }, [desempenhoVendedores, filtroVendedor]);

  // Extração e consolidação das peças / serviços que saíram nas O.S. filtradas
  const pecasUtilizadas = useMemo(() => {
    return ordensFiltradas
      .filter((o) => o.status !== 'cancelado')
      .flatMap((o) => {
        const dataReferencia = o.data_conclusao || o.data_baixa || o.data_entrada;
        const diasGarantia = o.garantia_dias || 90;
        const diasPassados = Math.max(
          0,
          Math.floor((Date.now() - new Date(dataReferencia).getTime()) / (1000 * 60 * 60 * 24))
        );
        const diasRestantes = Math.max(0, diasGarantia - diasPassados);
        const emGarantia = diasPassados <= diasGarantia;

        // Se tem peças listadas
        if (o.pecas && o.pecas.length > 0) {
          return o.pecas.map((p) => {
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
              vendedorId: o.vendedor_id,
              vendedorNome: o.vendedor_nome || 'Não atribuído',
              tipoCobertura: o.tipo_cobertura,
              statusOS: o.status,
            };
          });
        }

        // Se não tem peças cadastradas (serviço / mão de obra pura)
        const valorTotal = Number(o.valor_total || o.valor_servico || 0);
        const ehGarantia = o.tipo_cobertura === 'Garantia da Loja' || valorTotal === 0;

        return [
          {
            id: `serv-${o.id}`,
            osId: o.id,
            numeroOs: o.numero_os,
            clienteNome: o.cliente?.nome || 'Cliente Balcão',
            clienteTelefone: o.cliente?.telefone || '',
            aparelho: `${o.tipo_dispositivo} ${o.modelo}`,
            imei: o.imei_ou_serial,
            pecaNome: o.defeito_reclamado ? `Serviço: ${o.defeito_reclamado}` : 'Mão de Obra / Reparo',
            qualidade: 'Serviço',
            quantidade: 1,
            custo: 0,
            venda: valorTotal,
            lucro: valorTotal,
            ehGarantia,
            dataSaida: dataReferencia,
            diasGarantia,
            diasPassados,
            diasRestantes,
            emGarantia,
            syscorVenda: o.numero_venda_syscor,
            vendedorId: o.vendedor_id,
            vendedorNome: o.vendedor_nome || 'Não atribuído',
            tipoCobertura: o.tipo_cobertura,
            statusOS: o.status,
          },
        ];
      });
  }, [ordensFiltradas]);

  // Aplicar filtros de busca, vendedor, garantia e tipo de cobrança
  const pecasFiltradas = useMemo(() => {
    return pecasUtilizadas.filter((p) => {
      // Filtro de Vendedor
      if (filtroVendedor !== 'todos') {
        const matchVend =
          (p.vendedorNome && p.vendedorNome.trim().toLowerCase() === filtroVendedor.trim().toLowerCase()) ||
          p.vendedorId === filtroVendedor;
        if (!matchVend) return false;
      }

      // Filtro de Garantia 90d
      if (filtroGarantia === 'em_garantia' && !p.emGarantia) return false;
      if (filtroGarantia === 'expirada' && p.emGarantia) return false;

      // Filtro de Tipo de Cobrança (Pago vs Garantia da Loja)
      if (filtroTipoCobranca === 'pagos' && p.ehGarantia) return false;
      if (filtroTipoCobranca === 'garantia_loja' && !p.ehGarantia) return false;

      // Filtro de Busca texto (inclui vendedor também!)
      if (!searchPeca.trim()) return true;
      const q = searchPeca.toLowerCase().trim();
      return (
        p.pecaNome.toLowerCase().includes(q) ||
        p.aparelho.toLowerCase().includes(q) ||
        p.imei.toLowerCase().includes(q) ||
        p.clienteNome.toLowerCase().includes(q) ||
        p.numeroOs.toString().includes(q) ||
        (p.vendedorNome && p.vendedorNome.toLowerCase().includes(q)) ||
        (p.syscorVenda && p.syscorVenda.toLowerCase().includes(q))
      );
    });
  }, [pecasUtilizadas, filtroVendedor, filtroGarantia, filtroTipoCobranca, searchPeca]);

  const pecasPagas = pecasFiltradas.filter((p) => !p.ehGarantia);
  const pecasGarantiaLoja = pecasFiltradas.filter((p) => p.ehGarantia);

  const totalQtdPecas = pecasFiltradas.reduce((sum, p) => sum + p.quantidade, 0);
  const totalCustoPecasPagas = pecasPagas.reduce((sum, p) => sum + p.custo, 0);
  const totalVendaPecasPagas = pecasPagas.reduce((sum, p) => sum + p.venda, 0);
  const totalLucroPecasPagas = totalVendaPecasPagas - totalCustoPecasPagas;

  const totalCustoGarantiaLoja = pecasGarantiaLoja.reduce((sum, p) => sum + p.custo, 0);
  const lucroLiquidoRealPecas = totalLucroPecasPagas - totalCustoGarantiaLoja;

  // Formatação do label do período atual
  const labelPeriodoAtual = useMemo(() => {
    if (periodo === 'hoje') return 'Hoje';
    if (periodo === 'semana') return 'Últimos 7 dias';
    if (periodo === 'mes') {
      return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (periodo === 'mes_anterior') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (periodo === 'personalizado' && mesPersonalizado) {
      const [ano, mes] = mesPersonalizado.split('-').map(Number);
      return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    return 'Todo Histórico';
  }, [periodo, mesPersonalizado]);

  // Ação para copiar resumo de comissão
  const handleCopiarResumo = (v: DesempenhoVendedor) => {
    const texto = `📋 *FECHAMENTO DE COMISSÃO - FITCH TECNOLOGIA*
👤 *Vendedor(a):* ${v.vendedor_nome}
📅 *Período:* ${labelPeriodoAtual}
📱 *O.S. Particulares Concluídas:* ${v.os_particulares_concluidas} un (Meta: ${v.meta_mensal} un)
🏷️ *Faixa de Comissão:* R$ ${v.valor_comissao_por_os.toFixed(2)} por O.S.
💰 *Faturamento Gerado:* R$ ${v.faturamento_gerado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
💵 *TOTAL DE COMISSÃO A PAGAR:* R$ ${v.comissao_estimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    navigator.clipboard.writeText(texto);
    toast.success(`Resumo de comissão de ${v.vendedor_nome} copiado!`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
            Relatórios Financeiros & Comissões
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico completo de O.S. pagas, vendedor responsável e fechamento de comissão.
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
            onClick={() => setPeriodo('mes_anterior')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              periodo === 'mes_anterior'
                ? 'bg-[#0071e3] text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Ideal para fechamento de folha de pagamento do mês que se encerrou"
          >
            Mês Passado
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

          {/* Seletor de Mês Específico */}
          <div className="flex items-center pl-1 border-l border-slate-200">
            <input
              type="month"
              value={mesPersonalizado}
              onChange={(e) => {
                setMesPersonalizado(e.target.value);
                if (e.target.value) setPeriodo('personalizado');
              }}
              className="text-xs bg-white border border-slate-200 rounded-full px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              title="Filtrar por outro mês específico para fechamento"
            />
          </div>
        </div>
      </div>

      {/* CARDS GERAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Aparelhos Arrumados</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1.5">{arrumados.length} un</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {labelPeriodoAtual}
          </span>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Faturamento Total</span>
          <p className="text-xl sm:text-2xl font-bold text-[#1d1d1f] mt-1.5 font-mono truncate">
            R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Receita total no período</span>
        </div>

        <div className="apple-card p-4 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Custo Operacional Total</span>
          <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1.5 font-mono truncate">
            R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Peças + Terceirizados</span>
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
        <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0071e3]" />
              Gratificação por Assistência Particular Negociada ({labelPeriodoAtual})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em um vendedor para filtrar instantaneamente todas as suas O.S. e gerar o fechamento de salário.
            </p>
          </div>

          <div className="text-right text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl font-medium self-start md:self-auto">
            <span>Até 5 un: R$ 20,00 • 6 un: R$ 30,00</span>
            <br />
            <span>7 a 8 un: R$ 40,00 • Acima de 8 (9+): R$ 50,00</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {desempenhoVendedores.map((v) => {
            const isSelected =
              filtroVendedor.toLowerCase() === v.vendedor_nome.toLowerCase() ||
              filtroVendedor === v.vendedor_id;

            return (
              <div
                key={v.vendedor_id}
                onClick={() => {
                  setFiltroVendedor(isSelected ? 'todos' : v.vendedor_nome);
                }}
                className={`p-5 rounded-2xl space-y-4 cursor-pointer transition-all duration-200 border ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#0071e3] ring-2 ring-[#0071e3]/30 shadow-md'
                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-blue-50 text-[#0071e3]'
                      }`}
                    >
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {v.vendedor_nome}
                        {isSelected && (
                          <span className="text-[9px] bg-[#0071e3] text-white px-1.5 py-0.2 rounded-full font-bold">
                            Ativo
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] font-bold text-[#0071e3]">
                        {v.faixa_comissao_label}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Comissão</span>
                    <span className="text-base font-extrabold text-emerald-600 font-mono">
                      R$ {v.comissao_estimada.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">
                      O.S. Válidas: {v.os_particulares_concluidas} / {v.meta_mensal} un
                    </span>
                    <span className="text-[#0071e3] font-mono">
                      R$ {v.valor_comissao_por_os.toFixed(2)} / O.S.
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, v.percentual_meta)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                    <span className="text-[9px] text-slate-500 block">Cálculo</span>
                    <span className="font-bold text-slate-900 text-[11px]">
                      {v.os_particulares_concluidas} un × R$ {v.valor_comissao_por_os.toFixed(0)}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                    <span className="text-[9px] text-slate-500 block">Faturamento</span>
                    <span className="font-bold text-[#0071e3] text-[11px]">
                      R$ {v.faturamento_gerado.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500 text-[10px]">
                    {isSelected ? '✓ Filtrando tabela abaixo' : 'Toque para ver O.S.'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopiarResumo(v);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-2 py-1 rounded-lg transition-all"
                    title="Copiar resumo de comissão para colar no WhatsApp ou planilha"
                  >
                    <Copy className="w-3 h-3 text-[#0071e3]" /> Copiar Resumo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BANNER DE FECHAMENTO DE SALÁRIO DO VENDEDOR (QUANDO FILTRADO) */}
      {selectedVendedorData && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border-2 border-[#0071e3]/40 p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#0071e3] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide">
                  Fechamento de Salário & Comissão
                </span>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-5 h-5 text-[#0071e3]" />
                  {selectedVendedorData.vendedor_nome}
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Período: <strong className="text-slate-900">{labelPeriodoAtual}</strong> •{' '}
                Exibindo abaixo apenas as O.S. e serviços vinculados a este vendedor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs text-right">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">O.S. Validadas</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {selectedVendedorData.os_particulares_concluidas} un
                </span>
              </div>

              <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs text-right">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Faixa / Por O.S.</span>
                <span className="text-base font-bold text-[#0071e3] font-mono">
                  R$ {selectedVendedorData.valor_comissao_por_os.toFixed(2)}
                </span>
              </div>

              <div className="bg-emerald-600 text-white px-4 py-2 rounded-2xl shadow-xs text-right">
                <span className="text-[10px] uppercase block font-bold text-emerald-100">Comissão a Pagar</span>
                <span className="text-xl font-black font-mono">
                  R$ {selectedVendedorData.comissao_estimada.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => handleCopiarResumo(selectedVendedorData)}
                className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                title="Copiar resumo completo deste vendedor"
              >
                <Copy className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Copiar Resumo</span>
              </button>

              <button
                onClick={() => setFiltroVendedor('todos')}
                className="px-3.5 py-2.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1"
                title="Mostrar O.S. de todos os vendedores"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar Filtro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: HISTÓRICO DE O.S. PAGAS & PEÇAS */}
      <div className="apple-card p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f] flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Histórico de O.S. Pagas, Peças & Garantias (90 dias)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidado de cada O.S. e peça com vendedor responsável, custo loja, preço de venda e lucro líquido.
            </p>
          </div>

          {/* Quick Metrics of Parts */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Itens</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{totalQtdPecas} un</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {pecasPagas.length} pagas • {pecasGarantiaLoja.length} gar.
              </span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-blue-800 uppercase block font-semibold">Receita Total</span>
              <span className="font-bold text-blue-700 font-mono text-sm">R$ {totalVendaPecasPagas.toFixed(2)}</span>
              <span className="text-[9px] text-blue-500 block mt-0.5">Cobrado de clientes</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Custo Loja</span>
              <span className="font-bold text-slate-700 font-mono text-sm">R$ {totalCustoPecasPagas.toFixed(2)}</span>
              <span className="text-[9px] text-emerald-600 block mt-0.5 font-semibold">
                +R$ {totalLucroPecasPagas.toFixed(2)} bruto
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-amber-800 uppercase block font-semibold">Garantia Loja</span>
              <span className="font-bold text-amber-700 font-mono text-sm">R$ {totalCustoGarantiaLoja.toFixed(2)}</span>
              <span className="text-[9px] text-amber-600 block mt-0.5">
                {pecasGarantiaLoja.length} sem cobrança
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Lucro Líquido</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">R$ {lucroLiquidoRealPecas.toFixed(2)}</span>
              <span className="text-[9px] text-emerald-600 block mt-0.5">
                Vendas - Custos
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Campo de Busca Geral */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por peça, modelo, O.S., cliente ou vendedor..."
              value={searchPeca}
              onChange={(e) => setSearchPeca(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* NOVO: FILTRO EXCLUSIVO DE VENDEDOR */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 px-3 py-1.5 rounded-full text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-[#0071e3]" />
              <span className="text-slate-500">Vendedor:</span>
              <select
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer pr-1"
              >
                <option value="todos">Todos os Vendedores ({pecasUtilizadas.length})</option>
                {allVendedores.map((v) => (
                  <option key={v.id} value={v.nome}>
                    {v.nome}
                  </option>
                ))}
              </select>
              {filtroVendedor !== 'todos' && (
                <button
                  onClick={() => setFiltroVendedor('todos')}
                  className="text-slate-400 hover:text-slate-700 ml-0.5 text-xs font-bold"
                  title="Limpar filtro de vendedor"
                >
                  ✕
                </button>
              )}
            </div>

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
                Todas
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
                🛡️ Garantia ({pecasGarantiaLoja.length})
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
                90d Ativo
              </button>
              <button
                onClick={() => setFiltroGarantia('expirada')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  filtroGarantia === 'expirada'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expiradas
              </button>
            </div>
          </div>
        </div>

        {/* TABELA DETALHADA COM COLUNA VENDEDOR */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] bg-slate-50/50">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">O.S. / Cliente</th>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3">Aparelho / IMEI</th>
                <th className="py-2.5 px-3">Peça / Serviço</th>
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
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-600">Nenhum registro encontrado.</p>
                      <p className="text-[11px] text-slate-400">
                        Tente ajustar o período ou limpar o filtro de vendedor.
                      </p>
                    </div>
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
                    <tr key={`${p.osId}-${p.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {dataFormatada}
                      </td>

                      {/* O.S. e Cliente */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>O.S. #{p.numeroOs}</span>
                          {p.syscorVenda && (
                            <span className="text-[9px] font-mono bg-blue-50 text-[#0071e3] border border-blue-200 px-1.5 py-0.2 rounded">
                              Syscor #{p.syscorVenda}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
                          {p.clienteNome}
                        </div>
                      </td>

                      {/* NOVO: COLUNA VENDEDOR COM SELETOR RÁPIDO PARA GERENTE */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={p.vendedorId || ''}
                            onChange={async (e) => {
                              const atendentes = AuthService.getAtendentes();
                              const sel = atendentes.find((v) => v.id === e.target.value);
                              if (sel) {
                                const updated = await OSService.atualizarVendedorOS(p.osId, sel.id, sel.nome);
                                if (updated) {
                                  toast.success(`Vendedor da O.S. #${p.numeroOs} alterado para ${sel.nome}!`);
                                  loadData();
                                } else {
                                  toast.error('Erro ao alterar vendedor.');
                                }
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-full px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer transition-colors max-w-[140px] truncate"
                            title="Alterar vendedor responsável desta O.S."
                          >
                            {!p.vendedorId && (
                              <option value="">{p.vendedorNome || 'Selecionar Vendedor'}</option>
                            )}
                            {allVendedores.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Aparelho */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{p.aparelho}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.imei}</div>
                      </td>

                      {/* Peça / Serviço */}
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

                      {/* Custo Loja */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 font-semibold whitespace-nowrap">
                        R$ {Number(p.custo).toFixed(2)}
                      </td>

                      {/* Preço Venda */}
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

                      {/* Lucro Líquido */}
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

                      {/* Garantia (90d) */}
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

                      {/* Ação */}
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

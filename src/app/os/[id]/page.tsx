'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Printer,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Smartphone,
  DollarSign,
  Truck,
  CheckSquare,
  Zap,
  Boxes,
  CreditCard,
  PackageCheck,
  XCircle,
  Receipt,
  Camera,
  Eye,
  History,
  Image as ImageIcon,
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { EstoqueService } from '@/lib/services/estoque-service';
import { AuthService } from '@/lib/services/auth-service';
import {
  ChecklistSaida,
  DetalhesTerceirizado,
  LocalizacaoDispositivo,
  OrdemServico,
  PecaEstoque,
  StatusOS,
  TipoQualidadePeca,
  Usuario,
} from '@/types';
import { ThermalLabel } from '@/components/print/ThermalLabel';
import { WarrantyTerm } from '@/components/print/WarrantyTerm';
import { toast } from 'sonner';

export default function OSDetalhesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const osId = params.id as string;

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => AuthService.getCurrentUser());
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);

  const atendentesList = React.useMemo(() => {
    const list = AuthService.getAtendentes();
    if (os?.vendedor_nome && !list.some((v) => v.nome === os.vendedor_nome || v.id === os.vendedor_id)) {
      list.unshift({
        id: os.vendedor_id || 'vendedor-customizado',
        nome: os.vendedor_nome,
        email: '',
        cargo: 'vendedor',
        meta_mensal_os: 0,
      });
    }
    return list;
  }, [os?.vendedor_id, os?.vendedor_nome]);

  // Inventory parts for selection & interactive smart picker
  const [estoquePecas, setEstoquePecas] = useState<PecaEstoque[]>([]);
  const [selectedEstoqueId, setSelectedEstoqueId] = useState<string>('');
  const [estoqueSearchTerm, setEstoqueSearchTerm] = useState('');
  const [estoqueCategoriaFiltro, setEstoqueCategoriaFiltro] = useState('Todas');
  const [estoqueApenasDisponiveis, setEstoqueApenasDisponiveis] = useState(true);
  const [estoqueFiltroModeloOS, setEstoqueFiltroModeloOS] = useState(false);
  const [mostrarCatalogoEstoque, setMostrarCatalogoEstoque] = useState(false);

  // Peças filtradas com busca inteligente
  const pecasEstoqueFiltradas = React.useMemo(() => {
    return estoquePecas.filter((p) => {
      // 1. Filtro de Categoria
      if (estoqueCategoriaFiltro !== 'Todas') {
        const catPeca = (p.categoria || 'Bateria').toLowerCase();
        if (catPeca !== estoqueCategoriaFiltro.toLowerCase()) return false;
      }

      // 2. Filtro de Apenas Disponíveis (Estoque > 0)
      if (estoqueApenasDisponiveis && Number(p.quantidade_estoque) <= 0) {
        return false;
      }

      // 3. Filtro inteligente do modelo da O.S.
      if (estoqueFiltroModeloOS && os?.modelo) {
        const mod = os.modelo.toLowerCase().trim();
        const comp = (p.modelo_compativel || '').toLowerCase();
        const desc = (p.descricao || '').toLowerCase();
        const words = mod.split(/[\s-]+/).filter((w) => w.length > 2 && w !== 'apple');
        const match = comp.includes(mod) || desc.includes(mod) || words.some((w) => comp.includes(w) || desc.includes(w));
        if (!match) return false;
      }

      // 4. Busca por texto
      if (estoqueSearchTerm.trim()) {
        const q = estoqueSearchTerm.toLowerCase().trim();
        return (
          p.descricao.toLowerCase().includes(q) ||
          p.modelo_compativel.toLowerCase().includes(q) ||
          p.codigo_sku.toLowerCase().includes(q) ||
          (p.categoria || '').toLowerCase().includes(q) ||
          (p.localizacao_gaveta || '').toLowerCase().includes(q) ||
          (p.fornecedor || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [estoquePecas, estoqueCategoriaFiltro, estoqueApenasDisponiveis, estoqueFiltroModeloOS, estoqueSearchTerm, os?.modelo]);

  // Editable Technical Diagnosis
  const [laudoInput, setLaudoInput] = useState('');

  // Editable Spare Part Form
  const [novaPecaDesc, setNovaPecaDesc] = useState('');
  const [novaPecaQualidade, setNovaPecaQualidade] = useState<TipoQualidadePeca>('Original');
  const [novaPecaCusto, setNovaPecaCusto] = useState('100.00');
  const [novaPecaPreco, setNovaPecaPreco] = useState('250.00');
  const [novaPecaQtd, setNovaPecaQtd] = useState('1');
  const [novaPecaModo, setNovaPecaModo] = useState<'pago' | 'garantia'>('pago');

  // SP Logistics Modal State
  const [showSpModal, setShowSpModal] = useState(false);
  const [spForm, setSpForm] = useState<DetalhesTerceirizado>({
    parceiro_sp: 'Lab Micro-Solda SP Tech',
    rastreio_envio: '',
    rastreio_retorno: '',
    data_envio_sp: new Date().toISOString().slice(0, 10),
    previsao_retorno_sp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    custo_laboratorio: 250,
    observacoes: '',
  });

  // Exit Checklist Modal State
  const [showExitChecklistModal, setShowExitChecklistModal] = useState(false);
  const [exitChecklistForm, setExitChecklistForm] = useState<ChecklistSaida>({
    face_id: 'ok',
    true_tone: 'ok',
    cameras: 'ok',
    microfones: 'ok',
    alto_falante: 'ok',
    carregamento: 'ok',
    touch_display: 'ok',
    observacoes_saida: '',
    ok_tecnico: true,
  });

  // Print Modals
  const [showThermalPrint, setShowThermalPrint] = useState(false);
  const [showWarrantyPrint, setShowWarrantyPrint] = useState(false);
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

  // Syscor Baixa Modal State
  const [showSyscorBaixaModal, setShowSyscorBaixaModal] = useState(false);
  const [syscorVendaInput, setSyscorVendaInput] = useState('');
  const [syscorFormaPagamento, setSyscorFormaPagamento] = useState('Pix');
  const [syscorSubmitting, setSyscorSubmitting] = useState(false);

  // Devolução sem Cobrança Modal State
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [devolucaoMotivoSelect, setDevolucaoMotivoSelect] = useState('Orçamento Recusado pelo Cliente');
  const [devolucaoObsInput, setDevolucaoObsInput] = useState('');
  const [devolucaoSubmitting, setDevolucaoSubmitting] = useState(false);

  const handleConfirmSyscorBaixa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!syscorVendaInput.trim()) {
      toast.error('Informe o número da venda gerado no Syscor.');
      return;
    }
    setSyscorSubmitting(true);
    try {
      const updated = await OSService.darBaixaPagamentoSyscor(osId, {
        numero_venda_syscor: syscorVendaInput,
        forma_pagamento: syscorFormaPagamento,
      });
      if (updated) {
        setOs(updated);
        setShowSyscorBaixaModal(false);
        setSyscorVendaInput('');
        toast.success(`Baixa efetuada com sucesso! Venda Syscor #${updated.numero_venda_syscor} vinculada e estoque atualizado.`);
      }
    } catch (err) {
      toast.error('Erro ao efetuar baixa com Syscor.');
    } finally {
      setSyscorSubmitting(false);
    }
  };

  const handleConfirmDevolucao = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDevolucaoSubmitting(true);
    try {
      const motivoFinal = devolucaoObsInput.trim()
        ? `${devolucaoMotivoSelect} (${devolucaoObsInput.trim()})`
        : devolucaoMotivoSelect;

      const updated = await OSService.encerrarSemCobranca(osId, motivoFinal);
      if (updated) {
        setOs(updated);
        setShowDevolucaoModal(false);
        setDevolucaoObsInput('');
        toast.success('O.S. encerrada sem cobrança. Aparelho liberado para devolução.');
      }
    } catch (err) {
      toast.error('Erro ao encerrar O.S.');
    } finally {
      setDevolucaoSubmitting(false);
    }
  };

  const loadOS = async () => {
    setLoading(true);
    try {
      const [data, est] = await Promise.all([
        OSService.getOrdemServicoById(osId),
        EstoqueService.getPecas(),
      ]);

      if (data) {
        setOs(data);
        setLaudoInput(data.laudo_tecnico || '');
        if (data.tipo_cobertura === 'Garantia da Loja') {
          setNovaPecaModo('garantia');
          setNovaPecaPreco('0.00');
        }
        if (data.detalhes_terceirizado) {
          setSpForm(data.detalhes_terceirizado);
        }
        if (data.checklist_saida) {
          setExitChecklistForm(data.checklist_saida);
        }
      } else {
        toast.error('Ordem de Serviço não encontrada.');
      }
      setEstoquePecas(est);
    } catch (e) {
      toast.error('Erro ao carregar O.S.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOS();
    if (searchParams.get('autoprint') === 'true') {
      setShowThermalPrint(true);
    }
    const handleAuth = () => setCurrentUser(AuthService.getCurrentUser());
    window.addEventListener('fitch_auth_changed', handleAuth);
    return () => window.removeEventListener('fitch_auth_changed', handleAuth);
  }, [osId]);

  const handleSelectEstoquePeca = (id: string) => {
    setSelectedEstoqueId(id);
    const item = estoquePecas.find((p) => p.id === id);
    if (item) {
      const isGarantia = novaPecaModo === 'garantia';
      const cleanDesc = item.descricao.replace(/^\[GARANTIA LOJA\]\s*/i, '');
      setNovaPecaDesc(isGarantia ? `[GARANTIA LOJA] ${cleanDesc}` : cleanDesc);
      setNovaPecaQualidade(item.tipo_qualidade);
      setNovaPecaCusto(item.custo_unitario.toString());
      setNovaPecaPreco(isGarantia ? '0.00' : item.preco_venda.toString());
      setMostrarCatalogoEstoque(false);
      toast.success(
        isGarantia
          ? `Peça "${item.descricao}" selecionada como GARANTIA (R$ 0,00 p/ cliente)!`
          : `Peça "${item.descricao}" selecionada do estoque!`
      );
    }
  };

  const handleToggleModoPeca = (modo: 'pago' | 'garantia') => {
    setNovaPecaModo(modo);
    if (modo === 'garantia') {
      setNovaPecaPreco('0.00');
      if (novaPecaDesc && !novaPecaDesc.toUpperCase().startsWith('[GARANTIA LOJA]')) {
        setNovaPecaDesc(`[GARANTIA LOJA] ${novaPecaDesc.trim()}`);
      }
    } else {
      const p = estoquePecas.find((item) => item.id === selectedEstoqueId);
      if (p) {
        setNovaPecaPreco(p.preco_venda.toString());
      } else if (novaPecaPreco === '0.00' || novaPecaPreco === '0') {
        setNovaPecaPreco('250.00');
      }
      setNovaPecaDesc((prev) => prev.replace(/^\[GARANTIA LOJA\]\s*/i, ''));
    }
  };

  const handleClearSelectedEstoquePeca = () => {
    setSelectedEstoqueId('');
    setNovaPecaDesc('');
    setNovaPecaCusto('100.00');
    setNovaPecaPreco(novaPecaModo === 'garantia' ? '0.00' : '250.00');
  };

  const handleAlternarTipoItem = async (pecaId: string) => {
    try {
      const updated = await OSService.alternarTipoItemPeca(osId, pecaId);
      if (updated) {
        setOs(updated);
        toast.success('Tipo de cobrança da peça alterado com sucesso!');
      }
    } catch (e) {
      toast.error('Erro ao alternar tipo da peça.');
    }
  };

  // 1-Click Status Change handler
  const handleStatusChange = async (novoStatus: StatusOS) => {
    try {
      const updated = await OSService.atualizarStatusOS(osId, novoStatus);
      if (updated) {
        setOs(updated);
        toast.success(`Status alterado para: ${formatStatusName(novoStatus)}`);
      }
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleLocationChange = async (loc: LocalizacaoDispositivo) => {
    if (loc === 'laboratorio_sp' || loc === 'em_transito_ida_sp') {
      setShowSpModal(true);
      return;
    }
    try {
      const updated = await OSService.atualizarLocalizacaoOS(osId, loc);
      if (updated) {
        setOs(updated);
        toast.success(`Localização atualizada: ${formatLocationName(loc)}`);
      }
    } catch (e) {
      toast.error('Erro ao alterar localização.');
    }
  };

  const handleSaveLaudo = async () => {
    try {
      const updated = await OSService.salvarLaudoEChecklistSaida(
        osId,
        laudoInput,
        os?.checklist_saida || null
      );
      if (updated) {
        setOs(updated);
        toast.success('Laudo técnico salvo!');
      }
    } catch (e) {
      toast.error('Erro ao salvar laudo.');
    }
  };

  const handleAddPeca = async () => {
    if (!novaPecaDesc) {
      toast.error('Informe a descrição da peça.');
      return;
    }
    try {
      const precoFinal = novaPecaModo === 'garantia' ? 0 : (Number(novaPecaPreco) || 0);
      let descFinal = novaPecaDesc.trim();
      if (novaPecaModo === 'garantia' && !descFinal.toUpperCase().startsWith('[GARANTIA LOJA]')) {
        descFinal = `[GARANTIA LOJA] ${descFinal}`;
      }

      const updated = await OSService.adicionarItemPeca(osId, {
        peca_estoque_id: selectedEstoqueId || undefined,
        descricao: descFinal,
        tipo_qualidade: novaPecaQualidade,
        custo: Number(novaPecaCusto) || 0,
        preco_venda: precoFinal,
        quantidade: Number(novaPecaQtd) || 1,
      });
      if (updated) {
        setOs(updated);
        setNovaPecaDesc('');
        setSelectedEstoqueId('');
        if (novaPecaModo === 'garantia') {
          setNovaPecaPreco('0.00');
        }
        toast.success(
          novaPecaModo === 'garantia'
            ? '🛡️ Peça de Garantia adicionada! (R$ 0,00 ao cliente • Saída de estoque garantida)'
            : 'Peça adicionada ao orçamento!'
        );
      }
    } catch (e) {
      toast.error('Erro ao adicionar peça.');
    }
  };

  const handleRemovePeca = async (pecaId: string) => {
    try {
      const updated = await OSService.removerItemPeca(osId, pecaId);
      if (updated) {
        setOs(updated);
        toast.success('Peça removida.');
      }
    } catch (e) {
      toast.error('Erro ao remover peça.');
    }
  };

  const handleSaveSpLogistics = async () => {
    try {
      const updated = await OSService.atualizarLocalizacaoOS(
        osId,
        'laboratorio_sp',
        spForm
      );
      if (updated) {
        setOs(updated);
        setShowSpModal(false);
        toast.success('Despacho para São Paulo registrado com sucesso!');
      }
    } catch (e) {
      toast.error('Erro ao salvar despacho.');
    }
  };

  const handleSaveExitChecklist = async () => {
    try {
      const updated = await OSService.salvarLaudoEChecklistSaida(
        osId,
        laudoInput,
        exitChecklistForm
      );
      if (updated) {
        const osPronta = await OSService.atualizarStatusOS(osId, 'pronto_para_retirada');
        if (osPronta) setOs(osPronta);
        setShowExitChecklistModal(false);
        toast.success('Checklist de saída salvo com sucesso!');
      }
    } catch (e) {
      toast.error('Erro ao salvar checklist.');
    }
  };

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

  const handleDeletarOS = async () => {
    if (!os) return;
    const confirmacao = confirm(
      `Tem certeza que deseja excluir permanentemente a Ordem de Serviço #${os.numero_os} (${os.cliente?.nome || 'Cliente'})?`
    );
    if (!confirmacao) return;

    try {
      await OSService.deletarOrdemServico(os.id);
      toast.success(`Ordem de Serviço #${os.numero_os} excluída com sucesso.`);
      router.push('/dashboard');
    } catch (e) {
      toast.error('Erro ao excluir Ordem de Serviço.');
    }
  };

  const geratLinkWhatsApp = () => {
    if (!os) return '#';
    const nome = os.cliente?.nome.split(' ')[0] || 'Cliente';
    let msg = `Olá, ${nome}! A *Fitch Tecnologia* informa:\n\n`;
    msg += `Dispositivo: *${os.tipo_dispositivo} ${os.modelo}*\nO.S. nº: *#${os.numero_os}*\n`;

    if (os.status === 'pronto_para_retirada') {
      msg += `🎉 Seu aparelho está *PRONTO PARA RETIRADA*!\nTotal: R$ ${Number(os.valor_total).toFixed(2)}`;
    } else {
      msg += `Status: *${formatStatusName(os.status)}*.`;
    }

    const tel = os.cliente?.telefone.replace(/\D/g, '') || '';
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 font-sans">
        Carregando detalhes da Ordem de Serviço...
      </div>
    );
  }

  if (!os) {
    return (
      <div className="py-20 text-center space-y-4 font-sans">
        <h2 className="text-xl font-bold text-slate-900">Ordem de Serviço não encontrada.</h2>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0071e3] text-white font-semibold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const lucroBrutoPecas = (os.pecas || []).reduce(
    (acc, p) => acc + (p.preco_venda - p.custo) * p.quantidade,
    0
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="os-detail-content-area space-y-6">
        {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start lg:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="p-2.5 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all shrink-0 mt-0.5"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-white bg-gradient-to-r from-[#0071e3] to-blue-600 px-3 py-1 rounded-full font-mono shadow-xs">
                O.S. #{os.numero_os}
              </span>
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {os.tipo_dispositivo} {os.modelo} ({os.cor})
              </span>

              {/* Tipo de Cobertura Badge */}
              {os.tipo_cobertura === 'Particular' && (
                <span className="text-xs font-bold bg-blue-50 text-[#0071e3] border border-blue-200 px-3 py-1 rounded-full">
                  🛠️ Assistência Particular
                </span>
              )}
              {os.tipo_cobertura === 'Garantia da Loja' && (
                <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1 rounded-full">
                  🛡️ Garantia de Seminovo (180 Dias)
                </span>
              )}
              {os.tipo_cobertura === 'Garantia Android' && (
                <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full">
                  📱 Garantia Android Novo (90 Dias)
                </span>
              )}
              {os.tipo_cobertura === 'Revisão / Upgrade' && (
                <span className="text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-300 px-3 py-1 rounded-full">
                  🔄 Revisão / Trade-in
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap pt-0.5">
              <span>Cliente: <strong className="text-slate-900">{os.cliente?.nome}</strong> ({os.cliente?.telefone})</span>
              <span>• Entrada: <strong className="text-slate-900">{new Date(os.data_entrada).toLocaleDateString('pt-BR')}</strong></span>
              {currentUser?.cargo === 'gerente' ? (
                <div className="bg-indigo-50 text-indigo-950 font-black px-3 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1.5">
                  <span className="shrink-0">👤 Vendedor:</span>
                  <select
                    value={os.vendedor_id || ''}
                    onChange={async (e) => {
                      const sel = atendentesList.find((v) => v.id === e.target.value);
                      if (sel) {
                        const updated = await OSService.atualizarVendedorOS(os.id, sel.id, sel.nome);
                        if (updated) {
                          setOs(updated);
                          toast.success(`Vendedor alterado para ${sel.nome}!`);
                        } else {
                          toast.error('Erro ao alterar vendedor.');
                        }
                      }
                    }}
                    className="bg-transparent text-indigo-950 font-black text-xs focus:outline-none cursor-pointer border-b border-indigo-300"
                  >
                    {!os.vendedor_id && <option value="">Selecionar Vendedor</option>}
                    {atendentesList.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                os.vendedor_nome && (
                  <span className="bg-indigo-50 text-indigo-950 font-black px-3 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                    👤 Vendedor: {os.vendedor_nome}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
          <button
            onClick={() => setShowExitChecklistModal(true)}
            className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#0071e3]" />
            Checklist Saída
          </button>

          <button
            onClick={() => setShowThermalPrint(true)}
            className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#0071e3]" />
            Etiqueta (80x50mm)
          </button>

          <button
            onClick={() => setShowWarrantyPrint(true)}
            className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
            Termo A4
          </button>

          <a
            href={geratLinkWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </a>

          <button
            onClick={handleDeletarOS}
            className="px-3.5 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            title="Excluir Ordem de Serviço permanentemente"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      </div>

      {/* SYSCOR & BAIXA ACTION BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white space-y-3 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Receipt className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold tracking-tight text-white">Controle de Baixa & Venda Syscor</h3>
                {os.numero_venda_syscor ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    ✅ Baixa Efetuada no Syscor
                  </span>
                ) : os.motivo_encerramento ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    🚫 Devolvido sem Cobrança
                  </span>
                ) : (
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    ⏳ Pendente de Baixa na Loja
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {os.numero_venda_syscor ? (
                  <>Venda Syscor: <strong className="text-white">#{os.numero_venda_syscor}</strong> • Forma: <strong className="text-white">{os.forma_pagamento || 'Não informada'}</strong> • Estoque: <span className="text-emerald-300 font-semibold">{os.baixa_estoque_realizada ? 'Baixado no Estoque' : 'Pendente'}</span></>
                ) : os.motivo_encerramento ? (
                  <>O.S. encerrada sem cobrança. Motivo: <strong className="text-white">{os.motivo_encerramento}</strong></>
                ) : (
                  <>Cobrou o cliente no Syscor? Clique ao lado para dar baixa no sistema, vincular a venda e dar saída automática nas peças do estoque.</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSyscorVendaInput(os.numero_venda_syscor || '');
                setSyscorFormaPagamento(os.forma_pagamento || 'Pix');
                setShowSyscorBaixaModal(true);
              }}
              className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
            >
              <CreditCard className="w-4 h-4" />
              {os.numero_venda_syscor
                ? 'Atualizar Venda Syscor'
                : (os.tipo_cobertura === 'Garantia da Loja' || Number(os.valor_total) === 0)
                  ? '🛡️ Concluir & Baixar Estoque (Garantia Loja)'
                  : '🟢 Dar Baixa (Venda Syscor)'}
            </button>

            {!os.numero_venda_syscor && (
              <button
                type="button"
                onClick={() => setShowDevolucaoModal(true)}
                className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-4 h-4 text-red-400" />
                🔴 Devolver sem Cobrança
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WORKBENCH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* TRADE-IN MARGIN ALERT FOR TECHNICIAN */}
          {(os.tipo_cobertura === 'Revisão / Upgrade' || Number(os.desconto_avaliacao_tradein) > 0) && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950 text-white space-y-3 border border-indigo-700/60 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Margem de Avaliação do Trade-in / Upgrade
                    </h4>
                    <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5 drop-shadow-xs">
                      R$ {Number(os.desconto_avaliacao_tradein || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-3.5 py-1 rounded-full shrink-0">
                  Desconto na Compra
                </span>
              </div>
              <p className="text-xs text-indigo-100 border-t border-indigo-800/80 pt-2.5 leading-relaxed">
                💡 <strong>Aviso para o Técnico:</strong> Este valor de <strong className="text-emerald-300">R$ {Number(os.desconto_avaliacao_tradein || 0).toFixed(2)}</strong> foi abatido do cliente no momento da compra do aparelho. Utilize este valor como margem para saber a viabilidade do reparo.
              </p>
            </div>
          )}

          {/* Status 1-Click Transition Buttons */}
          <div className="apple-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#0071e3]" />
                Status da Manutenção
              </h3>
              <span className="text-xs font-bold text-[#0071e3] bg-blue-50 px-3 py-0.5 rounded-full self-start sm:self-auto">
                Status Atual: {formatStatusName(os.status)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {renderAppleStatusButton('aguardando_analise', os.status, handleStatusChange)}
              {renderAppleStatusButton('orcamento_gerado', os.status, handleStatusChange)}
              {renderAppleStatusButton('aprovado', os.status, handleStatusChange)}
              {renderAppleStatusButton('em_manutencao', os.status, handleStatusChange)}
              {renderAppleStatusButton('aguardando_peca', os.status, handleStatusChange)}
              {renderAppleStatusButton('pronto_para_retirada', os.status, handleStatusChange)}
              {renderAppleStatusButton('entregue', os.status, handleStatusChange)}
              {renderAppleStatusButton('cancelado', os.status, handleStatusChange)}
            </div>
          </div>

          {/* Location Switcher */}
          <div className="apple-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                Localização do Aparelho
              </h3>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full self-start sm:self-auto">
                {formatLocationName(os.localizacao_atual)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleLocationChange('bancada_local')}
                className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                  os.localizacao_atual === 'bancada_local'
                    ? 'bg-blue-50 border-[#0071e3] text-[#0071e3]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🛠️ Bancada Local
              </button>

              <button
                type="button"
                onClick={() => handleLocationChange('laboratorio_sp')}
                className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                  os.localizacao_atual === 'laboratorio_sp'
                    ? 'bg-purple-50 border-purple-500 text-purple-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🏬 Lab SP (Terceiro)
              </button>

              <button
                type="button"
                onClick={() => handleLocationChange('loja_pronto')}
                className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                  os.localizacao_atual === 'loja_pronto'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                ✅ Pronto na Loja
              </button>
            </div>
          </div>

          {/* FOTOS DO APARELHO & EVIDÊNCIAS DE ENTRADA */}
          {(() => {
            const fotosArray = Array.from(
              new Set([
                ...(os.fotos_entrada || []),
                ...((os.checklist_entrada as any)?.fotos_urls || []),
              ])
            ).filter(Boolean);

            return (
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4.5 h-4.5 text-[#0071e3]" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Fotos do Aparelho & Evidências de Entrada
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-0.5 rounded-full">
                    {fotosArray.length} foto(s) anexada(s)
                  </span>
                </div>

                {fotosArray.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    📷 Nenhuma foto anexada no momento da abertura desta O.S.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {fotosArray.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImageZoom(imgUrl)}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-xs hover:shadow-md transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={imgUrl}
                          alt={`Foto Aparelho ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" /> Expandir
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                          Foto #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* LINHA DO TEMPO DA OPERAÇÃO & AUDITORIA */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-purple-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Histórico & Linha do Tempo da Operação
                </h3>
              </div>
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-3 py-0.5 rounded-full border border-purple-100">
                Auditoria da O.S.
              </span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Evento 1: Abertura */}
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#0071e3] ring-4 ring-blue-50"></span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-extrabold text-xs text-slate-900">1. Abertura da Ordem de Serviço</span>
                    <span className="text-[10px] font-mono font-semibold text-slate-500">
                      {new Date(os.data_entrada).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    O.S. aberta pelo Vendedor Responsável: <strong className="text-slate-900">{os.vendedor_nome || 'Loja'}</strong>.
                  </p>
                </div>
              </div>

              {/* Evento 2: Status Atual */}
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-50"></span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-extrabold text-xs text-slate-900">2. Status Atual da Manutenção</span>
                    <span className="text-[10px] font-mono font-bold text-[#0071e3] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {formatStatusName(os.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Localização atual do dispositivo: <strong>{formatLocationName(os.localizacao_atual)}</strong>.
                  </p>
                </div>
              </div>

              {/* Evento 3: Baixa Syscor */}
              {os.numero_venda_syscor && (
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
                  <div className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200/90 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-black text-xs text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        3. Baixa de Pagamento & Venda Syscor Registrada
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        {os.data_baixa ? new Date(os.data_baixa).toLocaleString('pt-BR') : 'Baixado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/90 p-3 rounded-xl border border-emerald-200/80 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Nº Venda Syscor</span>
                        <strong className="text-emerald-950 font-mono text-sm">#{os.numero_venda_syscor}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Forma de Pagamento</span>
                        <strong className="text-emerald-950">{os.forma_pagamento || 'Não informada'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Valor Total Cobrado</span>
                        <strong className="text-emerald-700 font-mono text-sm">R$ {Number(os.valor_total || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1.5 border-t border-emerald-200/60">
                      <div className="flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Estoque:</strong> {os.baixa_estoque_realizada ? 'Saída automática de peças confirmada.' : 'Pendente de baixa.'}
                        </span>
                      </div>
                      {os.pecas && os.pecas.length > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md border border-emerald-200">
                          Peças: {os.pecas.map((p) => `${p.descricao} (${p.quantidade} un)`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Evento 4: Devolução sem Cobrança */}
              {os.motivo_encerramento && !os.numero_venda_syscor && (
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-50"></span>
                  <div className="bg-amber-50/90 p-4 rounded-2xl border border-amber-200/90 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        3. Encerramento por Devolução (Sem Cobrança)
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        {os.data_baixa ? new Date(os.data_baixa).toLocaleString('pt-BR') : 'Encerrado'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900">
                      Motivo do encerramento sem cobrança: <strong className="text-amber-950">{os.motivo_encerramento}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diagnosis Editor */}
          <div className="apple-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Laudo Técnico
              </h3>
              <button
                onClick={handleSaveLaudo}
                className="px-3.5 py-1 rounded-full bg-[#0071e3] text-white text-xs font-semibold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" /> Salvar Laudo
              </button>
            </div>
            <textarea
              rows={3}
              value={laudoInput}
              onChange={(e) => setLaudoInput(e.target.value)}
              placeholder="Digite o laudo e testes efetuados..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Spare Parts */}
          <div className="apple-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Peças Utilizadas & Orçamento
              </h3>
              {currentUser?.cargo === 'gerente' && (
                <span className="text-xs font-mono font-bold text-emerald-600">
                  Lucro Peças: R$ {lucroBrutoPecas.toFixed(2)}
                </span>
              )}
            </div>

            {/* Inventory Picker Inteligente com Busca e Filtros */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-[#0071e3]" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Buscar & Selecionar Peça do Estoque
                  </span>
                </div>

                {/* Botão de Sugestão Inteligente para o Modelo da O.S. */}
                {os?.modelo && (
                  <button
                    type="button"
                    onClick={() => setEstoqueFiltroModeloOS(!estoqueFiltroModeloOS)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                      estoqueFiltroModeloOS
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-[#0071e3] border border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sugeridas para {os.modelo}</span>
                  </button>
                )}
              </div>

              {/* Se houver peça selecionada do estoque */}
              {selectedEstoqueId && (
                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ✓
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        Peça Vinculada do Estoque:
                      </span>
                      <p className="text-xs font-black text-emerald-950">
                        {estoquePecas.find((p) => p.id === selectedEstoqueId)?.descricao} (
                        {estoquePecas.find((p) => p.id === selectedEstoqueId)?.codigo_sku})
                      </p>
                      <span className="text-[10px] text-emerald-700">
                        {estoquePecas.find((p) => p.id === selectedEstoqueId)?.localizacao_gaveta
                          ? `📍 ${estoquePecas.find((p) => p.id === selectedEstoqueId)?.localizacao_gaveta} • `
                          : ''}
                        Disp: <strong>{estoquePecas.find((p) => p.id === selectedEstoqueId)?.quantidade_estoque} un</strong> • Venda: R$ {Number(estoquePecas.find((p) => p.id === selectedEstoqueId)?.preco_venda || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedEstoquePeca}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1 rounded-full shadow-xs hover:bg-red-50 transition-colors shrink-0"
                  >
                    ✕ Desmarcar / Manual
                  </button>
                </div>
              )}

              {/* Barra de Busca e Filtro de Disponibilidade */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="relative sm:col-span-8">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Digite modelo (ex: 13, 11), peça ou gaveta..."
                    value={estoqueSearchTerm}
                    onChange={(e) => setEstoqueSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full pl-9 pr-8 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                  />
                  {estoqueSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setEstoqueSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setEstoqueApenasDisponiveis(!estoqueApenasDisponiveis)}
                    className={`w-full py-2 px-3 rounded-full text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      estoqueApenasDisponiveis
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${estoqueApenasDisponiveis ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Apenas Disponíveis (&gt;0)</span>
                  </button>
                </div>
              </div>

              {/* Pílulas de Categorias */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 shrink-0">Categorias:</span>
                {['Todas', 'Bateria', 'Tela', 'Tampa', 'Camera', 'Conector', 'Face ID', 'Outros'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEstoqueCategoriaFiltro(cat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                      estoqueCategoriaFiltro === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Lista Visual de Peças Filtradas */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-between px-1">
                  <span>{pecasEstoqueFiltradas.length} peças encontradas</span>
                  {estoqueFiltroModeloOS && <span className="text-[#0071e3]">✨ Filtro de {os?.modelo} ativado</span>}
                </div>

                {pecasEstoqueFiltradas.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    Nenhuma peça encontrada com estes filtros. Tente buscar por outro termo ou desmarque "Apenas Disponíveis".
                  </div>
                ) : (
                  pecasEstoqueFiltradas.map((est) => {
                    const isSelected = selectedEstoqueId === est.id;
                    const qtd = Number(est.quantidade_estoque) || 0;
                    return (
                      <div
                        key={est.id}
                        onClick={() => handleSelectEstoquePeca(est.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400'
                            : 'bg-white hover:bg-blue-50/40 border-slate-200/80 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono shrink-0">
                            {est.categoria || 'Peça'}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <span>{est.descricao}</span>
                              <span className="text-[10px] font-mono text-slate-400">({est.codigo_sku})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>📱 {est.modelo_compativel}</span>
                              {est.localizacao_gaveta && (
                                <span className="text-blue-600 font-medium">📍 {est.localizacao_gaveta}</span>
                              )}
                              {est.tipo_qualidade && (
                                <span className="text-slate-400 font-mono">({est.tipo_qualidade})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            {qtd > 2 ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                {qtd} un disponíveis
                              </span>
                            ) : qtd > 0 ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                Só {qtd} un
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">
                                Esgotado (0)
                              </span>
                            )}
                            <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                              R$ {Number(est.preco_venda).toFixed(2)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEstoquePeca(est.id);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs'
                            }`}
                          >
                            {isSelected ? '✓ Selecionada' : '+ Selecionar'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Form de Adicionar Peça / Orçamento com Rótulos Claros e Seletor Pago vs Garantia */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                    Adicionar Peça / Serviço ao Orçamento
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Defina se a peça é cobrada do cliente ou se é garantia/cortesia da loja.
                  </span>
                </div>

                {/* Seletor de Modo: Serviço Pago vs Garantia Loja */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-full text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleModoPeca('pago')}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                      novaPecaModo === 'pago'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💰 Serviço Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleModoPeca('garantia')}
                    className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                      novaPecaModo === 'garantia'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛡️ Garantia Loja (R$ 0)
                  </button>
                </div>
              </div>

              {/* Banner Explicativo quando em Modo Garantia */}
              {novaPecaModo === 'garantia' && (
                <div className="bg-amber-50 border border-amber-300/80 p-2.5 rounded-xl flex items-start gap-2 text-amber-900 text-[11px]">
                  <span className="text-base leading-none">🛡️</span>
                  <div className="leading-snug">
                    <strong className="block text-amber-950 font-bold">Modo Garantia da Loja Ativado:</strong>
                    O cliente não pagará por esta peça (<strong>Preço Venda = R$ 0,00</strong>). Ao finalizar a O.S., a baixa de 1 unidade no estoque será realizada normalmente e o custo de <strong>R$ {Number(novaPecaCusto || 0).toFixed(2)}</strong> será contabilizado como <em>Despesa de Garantia da Loja</em> nos relatórios financeiros.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Descrição */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Descrição da Peça / Serviço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tela iPhone 13 Original, Troca Bateria"
                    value={novaPecaDesc}
                    onChange={(e) => setNovaPecaDesc(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30"
                  />
                </div>

                {/* Qualidade */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Qualidade / Tipo
                  </label>
                  <select
                    value={novaPecaQualidade}
                    onChange={(e) => setNovaPecaQualidade(e.target.value as TipoQualidadePeca)}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Original">Original</option>
                    <option value="Primeira Linha">Primeira Linha</option>
                    <option value="OLED">OLED</option>
                    <option value="Incell">Incell</option>
                  </select>
                </div>

                {/* Custo da Peça (Pago pela loja) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Custo Loja (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={novaPecaCusto}
                    onChange={(e) => setNovaPecaCusto(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                </div>

                {/* Valor de Venda ao Cliente */}
                <div className="sm:col-span-2">
                  <label className={`block text-[11px] font-bold mb-1 ${novaPecaModo === 'garantia' ? 'text-amber-800' : 'text-emerald-700'}`}>
                    {novaPecaModo === 'garantia' ? 'Preço Venda (Garantia)' : 'Preço Venda (R$)'}
                  </label>
                  {novaPecaModo === 'garantia' ? (
                    <div className="w-full bg-amber-100/70 border border-amber-300 rounded-full px-3 py-1.5 text-xs font-mono font-bold text-amber-900 flex items-center justify-between">
                      <span>R$ 0,00</span>
                      <span className="text-[9px] uppercase tracking-wider bg-amber-200/80 px-1.5 py-0.2 rounded font-sans">Sem Custo</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={novaPecaPreco}
                      onChange={(e) => setNovaPecaPreco(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-full px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500 italic">
                  💡 <strong>Custo Loja:</strong> despesa que a loja teve na peça. <strong>Preço Venda:</strong> valor cobrado do cliente (R$ 0,00 se garantia).
                </span>

                <button
                  type="button"
                  onClick={handleAddPeca}
                  className={`px-4 py-1.5 text-white rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all hover:scale-[1.02] shrink-0 ${
                    novaPecaModo === 'garantia'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {novaPecaModo === 'garantia' ? 'Adicionar Peça em Garantia (R$ 0)' : 'Adicionar Peça ao Orçamento'}
                </button>
              </div>
            </div>

            {/* Table de Peças Utilizadas */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-2">Peça / Serviço</th>
                    <th className="py-2 px-2">Tipo / Cobrança</th>
                    <th className="py-2 px-2">Custo Loja</th>
                    <th className="py-2 px-2">Preço Cobrado</th>
                    <th className="py-2 px-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!os.pecas || os.pecas.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        Nenhuma peça adicionada.
                      </td>
                    </tr>
                  ) : (
                    os.pecas.map((p) => {
                      const ehGarantia =
                        Number(p.preco_venda || 0) === 0 ||
                        (p.descricao && p.descricao.toUpperCase().includes('[GARANTIA LOJA]'));

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-2">
                            <div className="font-semibold text-slate-900">{p.descricao}</div>
                            <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.2 rounded-full font-mono mt-0.5 inline-block">
                              {p.tipo_qualidade}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            {ehGarantia ? (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                🛡️ Garantia Loja
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                💰 Serviço Pago
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-600 font-semibold">
                            R$ {Number(p.custo).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 font-mono whitespace-nowrap">
                            {ehGarantia ? (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                R$ 0,00 (Garantia)
                              </span>
                            ) : (
                              <span className="font-bold text-slate-900">
                                R$ {Number(p.preco_venda).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAlternarTipoItem(p.id)}
                                title={
                                  ehGarantia
                                    ? 'Mudar para Serviço Pago (cobrar do cliente)'
                                    : 'Mudar para Garantia da Loja (não cobrar do cliente)'
                                }
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                  ehGarantia
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                    : 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                {ehGarantia ? '💰 Tornar Pago' : '🛡️ Tornar Garantia'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemovePeca(p.id)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remover peça"
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
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Resumo do Dispositivo
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-extrabold text-[#0071e3] uppercase block">
                  Aparelho & Credenciais
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {os.tipo_dispositivo} {os.modelo} ({os.cor})
                </p>
                <p className="font-mono text-slate-600 text-[11px]">
                  IMEI/SN: <strong className="text-slate-900">{os.imei_ou_serial}</strong>
                </p>
                <p className="font-mono text-slate-600 text-[11px]">
                  Senha Tela: <strong className="text-slate-900 bg-amber-100 px-2 py-0.5 rounded-md">{os.senha_aparelho || 'SEM SENHA'}</strong>
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase block">
                  Dados do Cliente
                </span>
                <p className="font-extrabold text-slate-900 text-sm">{os.cliente?.nome}</p>
                <p className="text-slate-600 font-semibold">{os.cliente?.telefone}</p>
                {os.cliente?.cpf && <p className="text-slate-500 font-mono text-[11px]">CPF: {os.cliente.cpf}</p>}
              </div>

              <div className="bg-indigo-50 p-3.5 rounded-2xl border border-indigo-200/90 space-y-1">
                <span className="text-[10px] font-extrabold text-indigo-900 uppercase block">
                  Vendedor Responsável (Abertura O.S.)
                </span>
                <p className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                  👤 {os.vendedor_nome || 'Não informado / Loja'}
                </p>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200/90 space-y-1">
                <span className="text-[10px] font-extrabold text-amber-900 uppercase block">
                  Defeito Reclamado
                </span>
                <p className="text-slate-800 font-medium italic">{os.defeito_reclamado}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          {(() => {
            const pecasGarantiaTotalCusto = (os.pecas || [])
              .filter(
                (p) =>
                  Number(p.preco_venda || 0) === 0 ||
                  (p.descricao && p.descricao.toUpperCase().includes('[GARANTIA LOJA]'))
              )
              .reduce((acc, p) => acc + (Number(p.custo || 0) * (p.quantidade || 1)), 0);

            return (
              <div className="bg-gradient-to-b from-white to-slate-50 p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                  Resumo Financeiro
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-2">
                    <span>Vendedor Abertura:</span>
                    <span className="font-extrabold text-slate-900">{os.vendedor_nome || 'Loja'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Mão de Obra / Serviço:</span>
                    <span className="font-mono font-bold text-slate-900">
                      R$ {Number(os.valor_servico || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Peças Cobradas (Cliente):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      R$ {Number(os.valor_pecas || 0).toFixed(2)}
                    </span>
                  </div>
                  {pecasGarantiaTotalCusto > 0 && (
                    <div className="flex justify-between items-center text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <div>
                        <span className="font-bold flex items-center gap-1">🛡️ Despesa Garantia Loja:</span>
                        <span className="text-[10px] text-amber-700 block">Peças sem cobrança ao cliente</span>
                      </div>
                      <span className="font-mono font-black text-amber-950 text-xs">
                        R$ {pecasGarantiaTotalCusto.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {Number(os.valor_desconto) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Desconto Especial:</span>
                      <span className="font-mono font-bold text-red-600">
                        - R$ {Number(os.valor_desconto).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {Number(os.desconto_avaliacao_tradein) > 0 && (
                    <div className="flex justify-between text-indigo-900 bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                      <span className="font-bold">Margem Trade-in:</span>
                      <span className="font-mono font-black text-indigo-950">
                        R$ {Number(os.desconto_avaliacao_tradein).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-extrabold text-slate-900">
                    <span>TOTAL A COBRAR:</span>
                    <span className="font-mono text-emerald-600 text-lg font-black bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      R$ {Number(os.valor_total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      </div>

      {/* EXIT CHECKLIST MODAL */}
      {showExitChecklistModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#0071e3]" />
                Checklist de Saída & Qualidade
              </h3>
              <button onClick={() => setShowExitChecklistModal(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">Confirme se todos os testes de bancada foram aprovados:</p>

              <div className="grid grid-cols-2 gap-2">
                {renderExitItem('Face ID / Touch ID', 'face_id', exitChecklistForm, setExitChecklistForm)}
                {renderExitItem('True Tone', 'true_tone', exitChecklistForm, setExitChecklistForm)}
                {renderExitItem('Câmeras', 'cameras', exitChecklistForm, setExitChecklistForm)}
                {renderExitItem('Microfones', 'microfones', exitChecklistForm, setExitChecklistForm)}
                {renderExitItem('Alto-Falante', 'alto_falante', exitChecklistForm, setExitChecklistForm)}
                {renderExitItem('Carregamento', 'carregamento', exitChecklistForm, setExitChecklistForm)}
                {renderExitItem('Touch / Display', 'touch_display', exitChecklistForm, setExitChecklistForm)}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observações de Saída</label>
                <textarea
                  rows={2}
                  value={exitChecklistForm.observacoes_saida || ''}
                  onChange={(e) =>
                    setExitChecklistForm({ ...exitChecklistForm, observacoes_saida: e.target.value })
                  }
                  placeholder="Aparelho limpo, película aplicada..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowExitChecklistModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveExitChecklist}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-sm"
              >
                Salvar Checklist & Marcar Pronto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SP LOGISTICS MODAL */}
      {showSpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                Despacho para Laboratório em São Paulo
              </h3>
              <button onClick={() => setShowSpModal(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Laboratório Parceiro SP</label>
                <input
                  type="text"
                  value={spForm.parceiro_sp}
                  onChange={(e) => setSpForm({ ...spForm, parceiro_sp: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Rastreio Envio (Ida)</label>
                  <input
                    type="text"
                    placeholder="Ex: SS123456789BR"
                    value={spForm.rastreio_envio || ''}
                    onChange={(e) => setSpForm({ ...spForm, rastreio_envio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Previsão Retorno</label>
                  <input
                    type="date"
                    value={spForm.previsao_retorno_sp}
                    onChange={(e) => setSpForm({ ...spForm, previsao_retorno_sp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Custo Estimado Lab (R$)</label>
                <input
                  type="number"
                  value={spForm.custo_laboratorio}
                  onChange={(e) => setSpForm({ ...spForm, custo_laboratorio: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSpModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSpLogistics}
                className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-sm"
              >
                Confirmar Envio p/ SP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT THERMAL LABEL MODAL */}
      {showThermalPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0071e3]" />
                Etiqueta Térmica (80mm x 50mm)
              </h3>
              <button onClick={() => setShowThermalPrint(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="flex justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-auto printable-thermal-area">
              <ThermalLabel os={os} />
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
                  href={`/print/label/${os.id}`}
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
                    setShowThermalPrint(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Fechar
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

      {/* PRINT WARRANTY TERM MODAL */}
      {showWarrantyPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 modal-warranty-overlay">
          <div className="apple-card bg-white p-6 max-w-4xl w-full space-y-4 max-h-[90vh] flex flex-col shadow-2xl modal-warranty-container">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 no-print">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0071e3]" />
                Termo de Garantia A4
              </h3>
              <button onClick={() => setShowWarrantyPrint(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 modal-warranty-scroll">
              <WarrantyTerm os={os} />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 no-print">
              <Link
                href={`/print/warranty/${os.id}`}
                target="_blank"
                className="px-3.5 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-[#0071e3] rounded-full border border-blue-200 flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Nova Aba (A4)</span>
              </Link>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWarrantyPrint(false)}
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

      {/* SYSCOR BAIXA MODAL */}
      {showSyscorBaixaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Dar Baixa e Vincular Venda do Syscor
              </h3>
              <button onClick={() => setShowSyscorBaixaModal(false)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSyscorBaixa} className="space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl space-y-1">
                <p className="text-emerald-900 font-semibold">
                  Ao dar baixa aqui, a O.S. será marcada como <strong>Entregue / Concluída</strong> e o estoque das peças utilizadas será baixado automaticamente.
                </p>
              </div>

              {/* Opção Rápida para Garantia da Loja */}
              <div className="bg-amber-50 border border-amber-200/90 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] text-amber-900 leading-tight">
                  <span className="font-bold flex items-center gap-1">🛡️ É Serviço / Peça em Garantia da Loja?</span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">Sem cobrança no Syscor (R$ 0,00) e baixa automática das peças.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSyscorVendaInput('GARANTIA-LOJA');
                    setSyscorFormaPagamento('Garantia da Loja');
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-full shadow-xs shrink-0 transition-all hover:scale-[1.02]"
                >
                  ⚡ Preencher como Garantia
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Número da Venda no Syscor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 10492 ou VD-884 ou GARANTIA-LOJA"
                  value={syscorVendaInput}
                  onChange={(e) => setSyscorVendaInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Forma de Pagamento no Syscor</label>
                <select
                  value={syscorFormaPagamento}
                  onChange={(e) => setSyscorFormaPagamento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:bg-white"
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Link de Pagamento / Online">Link de Pagamento / Online</option>
                  <option value="Garantia da Loja">Garantia da Loja (Sem Cobrança / R$ 0,00)</option>
                  <option value="Múltiplos Pagamentos (Syscor)">Múltiplos Pagamentos (Syscor)</option>
                </select>
              </div>

              {os?.pecas && os.pecas.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Peças com Baixa Automática no Estoque ({os.pecas.length})
                  </span>
                  <ul className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {os.pecas.map((p) => (
                      <li key={p.id} className="py-1 flex justify-between">
                        <span>{p.descricao} ({p.tipo_qualidade})</span>
                        <span className="font-mono font-bold">{p.quantidade} un</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSyscorBaixaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={syscorSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-sm flex items-center gap-1.5"
                >
                  {syscorSubmitting ? 'Salvando...' : 'Confirmar Baixa & Vincular Syscor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEVOLUÇÃO SEM COBRANÇA MODAL */}
      {showDevolucaoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Devolver Aparelho Sem Cobrança (Encerrar O.S.)
              </h3>
              <button onClick={() => setShowDevolucaoModal(false)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDevolucao} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl space-y-1">
                <p className="text-amber-900 font-semibold">
                  A O.S. será encerrada sem cobrança (R$ 0,00). <strong>Nenhuma peça do estoque será descontada.</strong>
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Motivo do Encerramento / Devolução</label>
                <select
                  value={devolucaoMotivoSelect}
                  onChange={(e) => setDevolucaoMotivoSelect(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 text-xs focus:outline-none focus:bg-white"
                >
                  <option value="Orçamento Recusado pelo Cliente">Orçamento Recusado pelo Cliente</option>
                  <option value="Sem Conserto / Placa Condenada">Sem Conserto / Placa Condenada</option>
                  <option value="Cliente Desistiu da Espera">Cliente Desistiu da Espera</option>
                  <option value="Aparelho Sem Peça Compatível no Mercado">Aparelho Sem Peça Compatível no Mercado</option>
                  <option value="Outro Motivo">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Observações Adicionais (Opcional)</label>
                <textarea
                  rows={2}
                  value={devolucaoObsInput}
                  onChange={(e) => setDevolucaoObsInput(e.target.value)}
                  placeholder="Ex: Cliente achou o valor da tela alto, devolvido montado."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDevolucaoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={devolucaoSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-sm"
                >
                  {devolucaoSubmitting ? 'Encerrando...' : 'Confirmar Encerramento sem Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL ZOOM DE FOTO (LIGHTBOX) */}
      {activeImageZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveImageZoom(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveImageZoom(null)}
              className="self-end text-white hover:text-slate-300 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shadow-md transition-all hover:bg-white/20"
            >
              ✕ Fechar Visualização
            </button>
            <img
              src={activeImageZoom}
              alt="Foto Ampliada do Aparelho"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatStatusName(s: StatusOS) {
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
  return map[s] || s;
}

function formatLocationName(l: string) {
  const map: Record<string, string> = {
    bancada_local: 'Bancada Local',
    em_transito_ida_sp: 'Em Trânsito (Ida SP)',
    laboratorio_sp: 'Laboratório SP',
    em_transito_retorno_sp: 'Em Trânsito (Retorno SP)',
    loja_pronto: 'Pronto na Loja',
  };
  return map[l] || l;
}

function renderAppleStatusButton(
  statusKey: StatusOS,
  currentStatus: StatusOS,
  onClick: (s: StatusOS) => void
) {
  const isCurrent = currentStatus === statusKey;
  return (
    <button
      type="button"
      onClick={() => onClick(statusKey)}
      className={`py-2 px-2 rounded-2xl text-[11px] font-semibold border transition-all text-center ${
        isCurrent
          ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs font-bold'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
      }`}
    >
      {formatStatusName(statusKey)}
    </button>
  );
}

function renderExitItem(
  title: string,
  field: keyof ChecklistSaida,
  form: ChecklistSaida,
  setForm: React.Dispatch<React.SetStateAction<ChecklistSaida>>
) {
  const current = form[field] as string;
  return (
    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
      <span className="text-[11px] font-semibold text-slate-800">{title}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setForm({ ...form, [field]: 'ok' })}
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
            current === 'ok' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...form, [field]: 'defeito' })}
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
            current === 'defeito' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          Defeito
        </button>
      </div>
    </div>
  );
}

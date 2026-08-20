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

  // Inventory parts for selection
  const [estoquePecas, setEstoquePecas] = useState<PecaEstoque[]>([]);
  const [selectedEstoqueId, setSelectedEstoqueId] = useState<string>('');

  // Editable Technical Diagnosis
  const [laudoInput, setLaudoInput] = useState('');

  // Editable Spare Part Form
  const [novaPecaDesc, setNovaPecaDesc] = useState('');
  const [novaPecaQualidade, setNovaPecaQualidade] = useState<TipoQualidadePeca>('Original');
  const [novaPecaCusto, setNovaPecaCusto] = useState('100.00');
  const [novaPecaPreco, setNovaPecaPreco] = useState('250.00');
  const [novaPecaQtd, setNovaPecaQtd] = useState('1');

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
      setNovaPecaDesc(item.descricao);
      setNovaPecaQualidade(item.tipo_qualidade);
      setNovaPecaCusto(item.custo_unitario.toString());
      setNovaPecaPreco(item.preco_venda.toString());
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
      const updated = await OSService.adicionarItemPeca(osId, {
        peca_estoque_id: selectedEstoqueId || undefined,
        descricao: novaPecaDesc,
        tipo_qualidade: novaPecaQualidade,
        custo: Number(novaPecaCusto) || 0,
        preco_venda: Number(novaPecaPreco) || 0,
        quantidade: Number(novaPecaQtd) || 1,
      });
      if (updated) {
        setOs(updated);
        setNovaPecaDesc('');
        setSelectedEstoqueId('');
        toast.success('Peça adicionada ao orçamento!');
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

  const handlePrint = () => {
    window.print();
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
      {/* Top Header Card */}
      <div className="apple-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-[#1d1d1f] font-mono">
                O.S. #{os.numero_os}
              </span>
              <span className="text-xs font-semibold bg-[#0071e3]/10 text-[#0071e3] px-3 py-0.5 rounded-full">
                {os.tipo_dispositivo} {os.modelo}
              </span>

              {/* Tipo de Serviço Badge */}
              {os.tipo_cobertura === 'Particular' && (
                <span className="text-xs font-semibold bg-blue-50 text-[#0071e3] border border-blue-200 px-3 py-0.5 rounded-full">
                  🛠️ Assistência Particular (Pago)
                </span>
              )}
              {os.tipo_cobertura === 'Garantia da Loja' && (
                <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-3 py-0.5 rounded-full">
                  🛡️ Garantia de Seminovo (180 Dias - R$ 0,00)
                </span>
              )}
              {os.tipo_cobertura === 'Revisão / Upgrade' && (
                <span className="text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-300 px-3 py-0.5 rounded-full">
                  🔄 Revisão / Trade-in (Aparelho da Loja)
                </span>
              )}
              {os.vendedor_nome && (
                <span className="text-xs text-slate-500 font-medium">
                  • Vendedor: {os.vendedor_nome}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliente: <strong className="text-slate-900">{os.cliente?.nome}</strong> ({os.cliente?.telefone}) • Entrada:{' '}
              {new Date(os.data_entrada).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowExitChecklistModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#0071e3]" />
            Checklist Saída
          </button>

          <button
            onClick={() => setShowThermalPrint(true)}
            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#0071e3]" />
            Etiqueta (80x50mm)
          </button>

          <button
            onClick={() => setShowWarrantyPrint(true)}
            className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-[#0071e3]" />
            Termo A4
          </button>

          <a
            href={geratLinkWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Enviar WhatsApp
          </a>

          <button
            onClick={handleDeletarOS}
            className="px-3.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Excluir Ordem de Serviço permanentemente"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir O.S.
          </button>
        </div>
      </div>

      {/* WORKBENCH GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status 1-Click Transition Buttons */}
          <div className="apple-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#0071e3]" />
                Status da Manutenção
              </h3>
              <span className="text-xs font-bold text-[#0071e3] bg-blue-50 px-3 py-0.5 rounded-full">
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
          <div className="apple-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                Localização do Aparelho
              </h3>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                {formatLocationName(os.localizacao_atual)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
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

            {/* Inventory Picker */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
              <label className="block text-[10px] font-bold text-[#0071e3] uppercase">
                Selecionar Peça do Estoque
              </label>
              <select
                value={selectedEstoqueId}
                onChange={(e) => handleSelectEstoquePeca(e.target.value)}
                className="w-full bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900"
              >
                <option value="">-- Escolher do Estoque --</option>
                {estoquePecas.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.codigo_sku} | {est.descricao} (Disponível: {est.quantidade_estoque} un)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <input
                type="text"
                placeholder="Descrição da Peça"
                value={novaPecaDesc}
                onChange={(e) => setNovaPecaDesc(e.target.value)}
                className="sm:col-span-2 bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900"
              />

              <select
                value={novaPecaQualidade}
                onChange={(e) => setNovaPecaQualidade(e.target.value as TipoQualidadePeca)}
                className="bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900"
              >
                <option value="Original">Original</option>
                <option value="Primeira Linha">Primeira Linha</option>
                <option value="OLED">OLED</option>
                <option value="Incell">Incell</option>
              </select>

              <input
                type="number"
                placeholder="Custo R$"
                value={novaPecaCusto}
                onChange={(e) => setNovaPecaCusto(e.target.value)}
                className="bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900 font-mono"
              />

              <input
                type="number"
                placeholder="Venda R$"
                value={novaPecaPreco}
                onChange={(e) => setNovaPecaPreco(e.target.value)}
                className="bg-white border border-slate-200/80 rounded-full px-3 py-1.5 text-xs text-slate-900 font-mono"
              />

              <div className="sm:col-span-5 flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddPeca}
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Peça
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-2">Peça</th>
                    <th className="py-2 px-2">Qualidade</th>
                    <th className="py-2 px-2">Custo</th>
                    <th className="py-2 px-2">Venda</th>
                    <th className="py-2 px-2 text-right">Ação</th>
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
                    os.pecas.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-semibold text-slate-900">{p.descricao}</td>
                        <td className="py-2 px-2">
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">
                            {p.tipo_qualidade}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-500">
                          R$ {Number(p.custo).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-900">
                          R$ {Number(p.preco_venda).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() => handleRemovePeca(p.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          <div className="apple-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Resumo do Dispositivo
            </h3>

            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-[#0071e3] uppercase block">
                  Aparelho
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {os.tipo_dispositivo} {os.modelo} ({os.cor})
                </p>
                <p className="font-mono text-slate-500 text-[11px]">
                  IMEI/SN: {os.imei_ou_serial}
                </p>
                <p className="font-mono text-slate-500 text-[11px]">
                  Senha Tela: <strong className="text-slate-900">{os.senha_aparelho || 'SEM SENHA'}</strong>
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Cliente
                </span>
                <p className="font-bold text-slate-900">{os.cliente?.nome}</p>
                <p className="text-slate-500">{os.cliente?.telefone}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Defeito Reclamado
                </span>
                <p className="text-slate-700 italic">{os.defeito_reclamado}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="apple-card p-5 space-y-3 bg-gradient-to-b from-white to-slate-50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Resumo Financeiro
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Mão de Obra:</span>
                <span className="font-mono">R$ {Number(os.valor_servico).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Peças:</span>
                <span className="font-mono">R$ {Number(os.valor_pecas).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Desconto:</span>
                <span className="font-mono text-red-600">- R$ {Number(os.valor_desconto).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>TOTAL O.S.:</span>
                <span className="font-mono text-emerald-600 text-base">
                  R$ {Number(os.valor_total).toFixed(2)}
                </span>
              </div>
            </div>
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowThermalPrint(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Fechar
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Imprimir Etiqueta (80x50mm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT WARRANTY TERM MODAL */}
      {showWarrantyPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="apple-card bg-white p-6 max-w-4xl w-full space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0071e3]" />
                Termo de Garantia A4
              </h3>
              <button onClick={() => setShowWarrantyPrint(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <WarrantyTerm os={os} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowWarrantyPrint(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Fechar
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Imprimir A4
              </button>
            </div>
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

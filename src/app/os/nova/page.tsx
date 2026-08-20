'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Smartphone,
  CheckSquare,
  FileText,
  Search,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  XCircle,
  MinusCircle,
  Sparkles,
  DollarSign,
  PowerOff,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { AuthService } from '@/lib/services/auth-service';
import { PhotoUploader } from '@/components/ui/PhotoUploader';
import {
  ChecklistEntrada,
  Cliente,
  TipoCobertura,
  TipoDispositivo,
  Usuario,
} from '@/types';
import { toast } from 'sonner';

export default function NovaOSPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  const currentUser = AuthService.getCurrentUser();
  const vendedores = AuthService.getVendedores();

  const [vendedorSelecionado, setVendedorSelecionado] = useState<Usuario>(() => {
    return (
      (currentUser && vendedores.find((v) => v.id === currentUser.id)) ||
      vendedores[0] || {
        id: '11111111-1111-1111-1111-111111111111',
        nome: 'Jonathan Moreira',
        email: 'jonathan@fitch.com',
        cargo: 'gerente',
        meta_mensal_os: 0,
        percentual_comissao: 0,
      }
    );
  });

  // Step 1 State: Customer
  const [searchCliQuery, setSearchCliQuery] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isNovoCliente, setIsNovoCliente] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({
    nome: '',
    telefone: '',
    telefone_secundario: '',
    cpf: '',
    email: '',
    instagram: '',
  });

  // Step 2 State: Device
  const [tipoDispositivo, setTipoDispositivo] = useState<TipoDispositivo>('iPhone');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('Preto');
  const [imeiOuSerial, setImeiOuSerial] = useState('');
  const [senhaAparelho, setSenhaAparelho] = useState('');
  const [buscarIphoneDesativado, setBuscarIphoneDesativado] = useState(false);
  const [aparelhoNaoLiga, setAparelhoNaoLiga] = useState(false);
  const [tipoCobertura, setTipoCobertura] = useState<TipoCobertura>('Particular');

  // Step 3 State: Checklist & Photos
  const [checklist, setChecklist] = useState<ChecklistEntrada>({
    face_id: 'ok',
    true_tone: 'ok',
    cameras: 'ok',
    microfones: 'ok',
    alto_falante: 'ok',
    carregamento: 'ok',
    detalhes_esteticos: '',
  });
  const [fotosAnexadas, setFotosAnexadas] = useState<string[]>([]);

  // Step 4 State: Problem & Price Table Entry
  const [defeitoReclamado, setDefeitoReclamado] = useState('');
  const [laudoTeorico, setLaudoTeorico] = useState('');
  const [previsaoEntrega, setPrevisaoEntrega] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [valorServico, setValorServico] = useState('150.00');
  const [valorDesconto, setValorDesconto] = useState('0.00');

  const handleBuscarCliente = async (query: string) => {
    setSearchCliQuery(query);
    if (query.trim().length >= 2) {
      const res = await OSService.buscarClientePorTelefoneOuCpf(query);
      setClientesEncontrados(res);
    } else {
      setClientesEncontrados([]);
    }
  };

  const handleSelectCliente = (cli: Cliente) => {
    setSelectedCliente(cli);
    setIsNovoCliente(false);
    toast.success(`Cliente ${cli.nome} selecionado!`);
  };

  const handleToggleAparelhoNaoLiga = (checked: boolean) => {
    setAparelhoNaoLiga(checked);
    if (checked) {
      setChecklist((prev) => ({
        ...prev,
        face_id: 'nao_se_aplica',
        true_tone: 'nao_se_aplica',
        cameras: 'nao_se_aplica',
        microfones: 'nao_se_aplica',
        alto_falante: 'nao_se_aplica',
        carregamento: 'nao_se_aplica',
        detalhes_esteticos: prev.detalhes_esteticos || 'Aparelho não liga / desligado.',
      }));
      toast.info('Checklist definido como N/A (Aparelho Desligado).');
    }
  };

  const handleSalvarOS = async () => {
    if (!modelo || !imeiOuSerial || !defeitoReclamado) {
      toast.error('Preencha os campos obrigatórios do aparelho e defeito.');
      return;
    }

    setLoading(true);
    try {
      let clienteId = selectedCliente?.id;

      if (isNovoCliente || !clienteId) {
        if (!novoClienteForm.nome || !novoClienteForm.telefone || !novoClienteForm.cpf) {
          toast.error('Nome, Telefone e CPF do cliente são obrigatórios.');
          setLoading(false);
          setStep(1);
          return;
        }
        const novoCli = await OSService.criarCliente({
          nome: novoClienteForm.nome,
          telefone: novoClienteForm.telefone,
          telefone_secundario: novoClienteForm.telefone_secundario || null,
          cpf: novoClienteForm.cpf,
          email: novoClienteForm.email || null,
          instagram: novoClienteForm.instagram || null,
        });
        clienteId = novoCli.id;
      }

      const novaOS = await OSService.criarOrdemServico({
        cliente_id: clienteId,
        vendedor_id: vendedorSelecionado.id,
        vendedor_nome: vendedorSelecionado.nome,
        tipo_dispositivo: tipoDispositivo,
        modelo,
        cor,
        imei_ou_serial: imeiOuSerial,
        senha_aparelho: senhaAparelho,
        buscar_iphone_desativado: buscarIphoneDesativado,
        aparelho_nao_liga: aparelhoNaoLiga,
        defeito_reclamado: defeitoReclamado,
        laudo_tecnico: laudoTeorico || null,
        checklist_entrada: checklist,
        fotos_entrada: fotosAnexadas,
        status: 'aguardando_analise',
        tipo_cobertura: tipoCobertura,
        localizacao_atual: 'bancada_local',
        data_entrada: new Date().toISOString(),
        previsao_entrega: previsaoEntrega ? new Date(previsaoEntrega).toISOString() : null,
        valor_servico: tipoCobertura === 'Particular' ? Number(valorServico) || 0 : 0,
        valor_pecas: 0,
        valor_desconto: tipoCobertura === 'Particular' ? Number(valorDesconto) || 0 : 0,
        garantia_dias: tipoCobertura === 'Garantia da Loja' ? 180 : 90,
      });

      toast.success(`Ordem de Serviço #${novaOS.numero_os} criada por ${vendedorSelecionado.nome}!`);
      router.push(`/os/${novaOS.id}?autoprint=true`);
    } catch (e) {
      toast.error('Erro ao salvar Ordem de Serviço.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6 font-sans">
      {/* Header & Seller Selection */}
      <div className="apple-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight">Nova Ordem de Serviço</h1>
          <p className="text-xs text-slate-500 mt-0.5">Assistente de Abertura Fitch Tecnologia</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500">Vendedor:</span>
          <select
            value={vendedorSelecionado.id}
            onChange={(e) => {
              const v = vendedores.find((v) => v.id === e.target.value);
              if (v) setVendedorSelecionado(v);
            }}
            className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs text-[#0071e3] font-bold focus:outline-none"
          >
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* APPLE SETUP ASSISTANT STEPPER */}
      <div className="apple-card p-2 sm:p-3 flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setStep(1)}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
            step === 1 ? 'bg-[#0071e3] text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span>1. Cliente</span>
        </button>

        <button
          onClick={() => (selectedCliente || isNovoCliente ? setStep(2) : null)}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
            step === 2 ? 'bg-[#0071e3] text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span>2. Aparelho</span>
        </button>

        <button
          onClick={() => (selectedCliente || isNovoCliente ? setStep(3) : null)}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
            step === 3 ? 'bg-[#0071e3] text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span>3. Checklist</span>
        </button>

        <button
          onClick={() => (selectedCliente || isNovoCliente ? setStep(4) : null)}
          className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
            step === 4 ? 'bg-[#0071e3] text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span>4. Prazo & Valor</span>
        </button>
      </div>

      {/* STEP 1: CLIENTE */}
      {step === 1 && (
        <div className="apple-card p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-[#1d1d1f]">Passo 1: Cliente</h3>
            <button
              type="button"
              onClick={() => {
                setIsNovoCliente(!isNovoCliente);
                setSelectedCliente(null);
              }}
              className="text-xs font-bold text-[#0071e3] hover:underline"
            >
              {isNovoCliente ? 'Buscar Cliente Existente' : '+ Novo Cliente'}
            </button>
          </div>

          {!isNovoCliente ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite nome, telefone ou CPF para buscar..."
                  value={searchCliQuery}
                  onChange={(e) => handleBuscarCliente(e.target.value)}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30"
                />
              </div>

              {selectedCliente ? (
                <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#0071e3] uppercase block">
                      Cliente Selecionado
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedCliente.nome}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Tel: {selectedCliente.telefone} | CPF: {selectedCliente.cpf || 'Não cadastrado'}
                    </p>
                    {selectedCliente.email && (
                      <p className="text-[11px] text-slate-500">E-mail: {selectedCliente.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCliente(null)}
                    className="text-xs text-[#0071e3] hover:underline font-semibold"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {clientesEncontrados.map((cli) => (
                    <div
                      key={cli.id}
                      onClick={() => handleSelectCliente(cli)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{cli.nome}</p>
                        <p className="text-[11px] text-slate-500">
                          {cli.telefone} • CPF: {cli.cpf}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#0071e3]" />
                    </div>
                  ))}
                  {searchCliQuery.length >= 2 && clientesEncontrados.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Nenhum cliente encontrado. Clique em "+ Novo Cliente" para cadastrar.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo"
                  value={novoClienteForm.nome}
                  onChange={(e) =>
                    setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Principal (WhatsApp) *
                </label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={novoClienteForm.telefone}
                  onChange={(e) =>
                    setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Secundário
                </label>
                <input
                  type="text"
                  placeholder="(11) 97777-6666"
                  value={novoClienteForm.telefone_secundario}
                  onChange={(e) =>
                    setNovoClienteForm({ ...novoClienteForm, telefone_secundario: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF * (Obrigatório)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={novoClienteForm.cpf}
                  onChange={(e) =>
                    setNovoClienteForm({ ...novoClienteForm, cpf: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail do Cliente
                </label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={novoClienteForm.email}
                  onChange={(e) =>
                    setNovoClienteForm({ ...novoClienteForm, email: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instagram (@usuario)
                </label>
                <input
                  type="text"
                  placeholder="@cliente"
                  value={novoClienteForm.instagram}
                  onChange={(e) =>
                    setNovoClienteForm({ ...novoClienteForm, instagram: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                if (selectedCliente) {
                  setStep(2);
                } else if (isNovoCliente) {
                  if (!novoClienteForm.nome || !novoClienteForm.telefone || !novoClienteForm.cpf) {
                    toast.error('Informe Nome, Telefone e CPF (obrigatório).');
                  } else {
                    setStep(2);
                  }
                } else {
                  toast.error('Selecione ou informe os dados do cliente primeiro.');
                }
              }}
              className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              <span>Avançar para Aparelho</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: APARELHO & COBERTURA */}
      {step === 2 && (
        <div className="apple-card p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-[#1d1d1f]">Passo 2: Dispositivo & Cobertura</h3>
          </div>

          {/* Device Not Turning On Toggle */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <PowerOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Aparelho não liga / Desligado</h4>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Desativa o checklist de entrada automaticamente (todos ficam N/A por impossibilidade de teste).
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aparelhoNaoLiga}
                onChange={(e) => handleToggleAparelhoNaoLiga(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tipo de Serviço / Origem da Demanda *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Assistência Particular */}
              <button
                type="button"
                onClick={() => setTipoCobertura('Particular')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  tipoCobertura === 'Particular'
                    ? 'bg-white border-[#0071e3] ring-2 ring-[#0071e3]/20 text-slate-900 shadow-sm'
                    : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0071e3]">
                    🛠️ Assistência Particular
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                    Pago
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Cliente não comprou na loja / fora da garantia. Cliente paga pelo serviço. Gera comissão.
                </p>
              </button>

              {/* Option 2: Garantia de Seminovo */}
              <button
                type="button"
                onClick={() => {
                  setTipoCobertura('Garantia da Loja');
                  setValorServico('0.00');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  tipoCobertura === 'Garantia da Loja'
                    ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 text-amber-900 shadow-sm'
                    : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-700">
                    🛡️ Garantia de Seminovo
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    R$ 0,00
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Garantia de 180 dias de cliente que comprou seminovo na loja. Pós-venda (R$ 0,00 pro cliente).
                </p>
              </button>

              {/* Option 3: Revisão / Trade-in Upgrade */}
              <button
                type="button"
                onClick={() => {
                  setTipoCobertura('Revisão / Upgrade');
                  setValorServico('0.00');
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  tipoCobertura === 'Revisão / Upgrade'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 shadow-sm'
                    : 'bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-700">
                    🔄 Revisão / Trade-in
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Estoque Loja
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Aparelho pegado de upgrade/troca para trocar bateria ou peças antes de colocar à venda.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Dispositivo *
              </label>
              <select
                value={tipoDispositivo}
                onChange={(e) => setTipoDispositivo(e.target.value as TipoDispositivo)}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
              >
                <option value="iPhone">iPhone</option>
                <option value="Android">Android</option>
                <option value="iPad">iPad</option>
                <option value="Apple Watch">Apple Watch</option>
                <option value="Outro">MacBook / Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modelo Completo *
              </label>
              <input
                type="text"
                placeholder="Ex: iPhone 14 Pro Max"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cor
              </label>
              <input
                type="text"
                placeholder="Ex: Preto, Roxo"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IMEI ou Número de Série *
              </label>
              <input
                type="text"
                placeholder="358912345678901 ou Serial"
                value={imeiOuSerial}
                onChange={(e) => setImeiOuSerial(e.target.value)}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha de Tela
              </label>
              <input
                type="text"
                placeholder="Ex: 123456"
                value={senhaAparelho}
                onChange={(e) => setSenhaAparelho(e.target.value)}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-full bg-slate-100 border border-slate-200 w-full">
                <input
                  type="checkbox"
                  checked={buscarIphoneDesativado}
                  onChange={(e) => setBuscarIphoneDesativado(e.target.checked)}
                  className="rounded text-[#0071e3] focus:ring-0"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Buscar iPhone Desativado
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => {
                if (modelo && imeiOuSerial) {
                  setStep(3);
                } else {
                  toast.error('Informe o Modelo e o IMEI/Serial do aparelho.');
                }
              }}
              className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              <span>Avançar para Checklist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CHECKLIST & PHOTOS */}
      {step === 3 && (
        <div className="apple-card p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-[#1d1d1f]">Passo 3: Checklist & Fotos</h3>
          </div>

          {aparelhoNaoLiga && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-2.5">
              <PowerOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-amber-800">
                Aparelho Desligado / Não Liga — Todos os testes de entrada foram definidos como 'Não se Aplica' (N/A).
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {renderAppleChecklistToggle('Face ID / Touch ID', 'face_id', checklist, setChecklist, aparelhoNaoLiga)}
            {renderAppleChecklistToggle('True Tone', 'true_tone', checklist, setChecklist, aparelhoNaoLiga)}
            {renderAppleChecklistToggle('Câmeras', 'cameras', checklist, setChecklist, aparelhoNaoLiga)}
            {renderAppleChecklistToggle('Microfones', 'microfones', checklist, setChecklist, aparelhoNaoLiga)}
            {renderAppleChecklistToggle('Alto-Falante', 'alto_falante', checklist, setChecklist, aparelhoNaoLiga)}
            {renderAppleChecklistToggle('Carregamento', 'carregamento', checklist, setChecklist, aparelhoNaoLiga)}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detalhes Estéticos / Avarias
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Riscos leves na tampa traseira..."
              value={checklist.detalhes_esteticos}
              onChange={(e) =>
                setChecklist({ ...checklist, detalhes_esteticos: e.target.value })
              }
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Interactive Native Photo Uploader */}
          <div className="pt-2">
            <PhotoUploader photos={fotosAnexadas} onChange={setFotosAnexadas} />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              <span>Avançar para Prazo & Valor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DEFEITO & VALOR */}
      {step === 4 && (
        <div className="apple-card p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-[#1d1d1f]">Passo 4: Problema & Tabela de Preços</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Defeito Reclamado pelo Cliente *
              </label>
              <textarea
                rows={3}
                placeholder="Descreva o defeito reclamado..."
                value={defeitoReclamado}
                onChange={(e) => setDefeitoReclamado(e.target.value)}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-[#0071e3] uppercase block">
                Valor Estimado conforme Tabela da Loja
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previsão de Entrega
                  </label>
                  <input
                    type="datetime-local"
                    value={previsaoEntrega}
                    onChange={(e) => setPrevisaoEntrega(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor Mão de Obra (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={tipoCobertura === 'Garantia da Loja'}
                    value={tipoCobertura === 'Garantia da Loja' ? '0.00' : valorServico}
                    onChange={(e) => setValorServico(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={tipoCobertura === 'Garantia da Loja'}
                    value={tipoCobertura === 'Garantia da Loja' ? '0.00' : valorDesconto}
                    onChange={(e) => setValorDesconto(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 rounded-full px-3.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={handleSalvarOS}
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Gerando...' : 'Gerar Ordem de Serviço'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderAppleChecklistToggle(
  title: string,
  field: keyof ChecklistEntrada,
  checklist: ChecklistEntrada,
  setChecklist: React.Dispatch<React.SetStateAction<ChecklistEntrada>>,
  disabled?: boolean
) {
  const current = checklist[field] as string;

  return (
    <div className={`p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <span className="text-xs font-semibold text-slate-700 block truncate">{title}</span>
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setChecklist({ ...checklist, [field]: 'ok' })}
          className={`py-1 px-1 rounded-full text-[10px] font-bold transition-all ${
            current === 'ok' ? 'bg-emerald-600 text-white' : 'bg-slate-200/60 text-slate-600'
          }`}
        >
          OK
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setChecklist({ ...checklist, [field]: 'defeito' })}
          className={`py-1 px-1 rounded-full text-[10px] font-bold transition-all ${
            current === 'defeito' ? 'bg-red-600 text-white' : 'bg-slate-200/60 text-slate-600'
          }`}
        >
          Defeito
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setChecklist({ ...checklist, [field]: 'nao_se_aplica' })}
          className={`py-1 px-1 rounded-full text-[10px] font-bold transition-all ${
            current === 'nao_se_aplica' ? 'bg-slate-700 text-white' : 'bg-slate-200/60 text-slate-600'
          }`}
        >
          N/A
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Boxes,
  TrendingUp,
  Building2,
  PlusCircle,
  Edit,
  Trash2,
  Crown,
  UserCheck,
  Wrench,
  Save,
  Plus,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { AuthService } from '@/lib/services/auth-service';
import { EstoqueService } from '@/lib/services/estoque-service';
import { OSService } from '@/lib/services/os-service';
import { calcularComissaoVolume } from '@/lib/utils/commission';
import {
  CargoUsuario,
  DesempenhoVendedor,
  OrdemServico,
  PecaEstoque,
  TipoQualidadePeca,
  Usuario,
} from '@/types';
import { toast } from 'sonner';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Usuario | null>(AuthService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'usuarios' | 'estoque' | 'relatorios' | 'loja'>('usuarios');

  // --- ABA 1: USUÁRIOS STATE ---
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [formUser, setFormUser] = useState({
    nome: '',
    email: '',
    senha: '123',
    cargo: 'vendedor' as CargoUsuario,
    meta_mensal_os: 15,
  });

  // --- ABA 2: ESTOQUE STATE ---
  const [pecas, setPecas] = useState<PecaEstoque[]>([]);
  const [showNewPecaModal, setShowNewPecaModal] = useState(false);
  const [formPeca, setFormPeca] = useState({
    descricao: '',
    codigo_sku: '',
    tipo_qualidade: 'Original' as TipoQualidadePeca,
    modelo_compativel: '',
    quantidade_estoque: 5,
    custo_unitario: '100.00',
    preco_venda: '250.00',
  });
  const [restockItem, setRestockItem] = useState<PecaEstoque | null>(null);
  const [restockQtd, setRestockQtd] = useState('5');

  // --- ABA 3: RELATÓRIOS STATE ---
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);

  // --- ABA 4: DADOS DA LOJA STATE ---
  const [lojaConfig, setLojaConfig] = useState({
    nome: 'Fitch Tecnologia',
    subtitulo: 'Assistência Técnica Especializada Apple & Android',
    telefone: '(11) 99999-8888',
    cnpj: '12.345.678/0001-99',
    chavePix: 'financeiro@fitchtecnologia.com.br',
    garantiaPadraoDias: 90,
  });

  const loadAllData = async () => {
    setUsuarios(AuthService.getUsuarios());
    try {
      const [est, ord] = await Promise.all([
        EstoqueService.getPecas(),
        OSService.getOrdensServico(),
      ]);
      setPecas(est);
      setOrdens(ord);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    setCurrentUser(u);
    if (!u || u.cargo !== 'gerente') {
      toast.error('Acesso exclusivo ao perfil de Gerente.');
      router.push('/login');
      return;
    }
    loadAllData();
  }, []);

  const handleZerarOSteste = () => {
    if (confirm('Tem certeza que deseja apagar TODAS as Ordens de Serviço de teste e zerar o sistema?')) {
      OSService.zerarDadosDeTeste();
      toast.success('Todas as Ordens de Serviço de teste foram apagadas. Sistema pronto!');
      loadAllData();
    }
  };

  // --- USUARIOS HANDLERS ---
  const handleSaveUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUser.nome || !formUser.email) {
      toast.error('Preencha nome e e-mail.');
      return;
    }

    if (editUser) {
      AuthService.atualizarUsuario(editUser.id, {
        nome: formUser.nome,
        email: formUser.email,
        senha: formUser.senha,
        cargo: formUser.cargo,
        meta_mensal_os: formUser.meta_mensal_os,
      });
      toast.success('Usuário atualizado!');
    } else {
      AuthService.cadastrarUsuario({
        nome: formUser.nome,
        email: formUser.email,
        senha: formUser.senha,
        cargo: formUser.cargo,
        meta_mensal_os: formUser.meta_mensal_os,
      });
      toast.success('Novo colaborador cadastrado!');
    }

    setShowUserModal(false);
    setEditUser(null);
    loadAllData();
  };

  const handleEditUserClick = (u: Usuario) => {
    setEditUser(u);
    setFormUser({
      nome: u.nome,
      email: u.email,
      senha: u.senha || '123',
      cargo: u.cargo,
      meta_mensal_os: u.meta_mensal_os || 15,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Deseja excluir este usuário?')) {
      const ok = AuthService.deletarUsuario(id);
      if (ok) {
        toast.success('Usuário removido.');
        loadAllData();
      } else {
        toast.error('Não é possível excluir o único usuário restante.');
      }
    }
  };

  // --- ESTOQUE HANDLERS ---
  const handleCadastrarPeca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPeca.descricao || !formPeca.codigo_sku || !formPeca.modelo_compativel) {
      toast.error('Preencha os campos obrigatórios (Descrição, SKU e Modelo).');
      return;
    }

    try {
      await EstoqueService.cadastrarPeca({
        descricao: formPeca.descricao,
        codigo_sku: formPeca.codigo_sku.toUpperCase(),
        tipo_qualidade: formPeca.tipo_qualidade,
        modelo_compativel: formPeca.modelo_compativel,
        quantidade_estoque: Number(formPeca.quantidade_estoque) || 0,
        custo_unitario: Number(formPeca.custo_unitario) || 0,
        preco_venda: Number(formPeca.preco_venda) || 0,
      });
      toast.success('Peça cadastrada no estoque!');
      setShowNewPecaModal(false);
      loadAllData();
    } catch (e) {
      toast.error('Erro ao cadastrar peça.');
    }
  };

  const handleDarEntradaPeca = async () => {
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
      loadAllData();
    } catch (e) {
      toast.error('Erro ao dar entrada.');
    }
  };

  // --- RELATÓRIOS LOGIC ---
  const ordensFiltradas = ordens.filter((os) => {
    if (periodo === 'todos') return true;
    const d = new Date(os.data_conclusao || os.data_entrada);
    const hoje = new Date();
    if (periodo === 'hoje') return d.toDateString() === hoje.toDateString();
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
    const pecasCusto = (o.pecas || []).reduce((pSum, p) => pSum + p.custo * p.quantidade, 0);
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
      os_particulares_abertas: osDoVendedor.length,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            Central de Administração Fitch Tecnologia
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logado como <strong className="text-slate-900">{currentUser?.nome || 'Jonathan Moreira'}</strong> (Gerente Principal)
          </p>
        </div>

        {/* Zerar Dados de Teste Button */}
        <button
          onClick={handleZerarOSteste}
          className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-full font-bold text-xs flex items-center gap-2 transition-all self-start"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Zerar O.S. de Teste</span>
        </button>
      </div>

      {/* CONSOLIDATED ADMIN TABS */}
      <div className="bg-slate-100/80 p-1 rounded-full flex items-center gap-1 overflow-x-auto self-start">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'usuarios'
              ? 'bg-[#1d1d1f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Equipe & Vendedores</span>
        </button>

        <button
          onClick={() => setActiveTab('estoque')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'estoque'
              ? 'bg-[#1d1d1f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Estoque de Peças</span>
        </button>

        <button
          onClick={() => setActiveTab('relatorios')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'relatorios'
              ? 'bg-[#1d1d1f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Relatórios Financeiros</span>
        </button>

        <button
          onClick={() => setActiveTab('loja')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'loja'
              ? 'bg-[#1d1d1f] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Dados da Loja</span>
        </button>
      </div>

      {/* ABA 1: EQUIPE & VENDEDORES */}
      {activeTab === 'usuarios' && (
        <div className="apple-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Gestão de Colaboradores</h3>
              <p className="text-xs text-slate-500">Cadastre vendedores, técnicos e gerentes.</p>
            </div>
            <button
              onClick={() => {
                setEditUser(null);
                setFormUser({
                  nome: '',
                  email: '',
                  senha: '123',
                  cargo: 'vendedor',
                  meta_mensal_os: 15,
                });
                setShowUserModal(true);
              }}
              className="px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs rounded-full shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Colaborador</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Nome</th>
                  <th className="py-3 px-3">E-mail / Login</th>
                  <th className="py-3 px-3">Cargo</th>
                  <th className="py-3 px-3">Meta (O.S.)</th>
                  <th className="py-3 px-3">Regra de Comissão</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      {renderCargoIcon(u.cargo)}
                      <span>{u.nome}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="py-3.5 px-3">
                      <span className="uppercase text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {u.cargo}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0071e3]">
                      {u.cargo === 'vendedor' ? `${u.meta_mensal_os} un` : '-'}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                      {u.cargo === 'vendedor' ? 'R$ 20,00 a R$ 50,00 por O.S. Particular' : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditUserClick(u)}
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: ESTOQUE DE PEÇAS */}
      {activeTab === 'estoque' && (
        <div className="apple-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Catálogo & Estoque de Peças</h3>
              <p className="text-xs text-slate-500">Cadastre peças com custo de aquisição e preço de venda.</p>
            </div>
            <button
              onClick={() => setShowNewPecaModal(true)}
              className="px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs rounded-full shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Peça</span>
            </button>
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
                {pecas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0071e3]">{p.codigo_sku}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900">{p.descricao}</td>
                    <td className="py-3.5 px-3 font-mono text-[10px] text-slate-600">{p.tipo_qualidade}</td>
                    <td className="py-3.5 px-3 text-slate-700">{p.modelo_compativel}</td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-800">
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
                ))}
                {pecas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                      Nenhuma peça cadastrada. Clique em "+ Nova Peça" para cadastrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: RELATÓRIOS FINANCEIROS */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="apple-card p-5">
              <span className="text-xs font-semibold text-slate-500">Aparelhos Arrumados</span>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{arrumados.length} un</p>
            </div>

            <div className="apple-card p-5">
              <span className="text-xs font-semibold text-slate-500">Faturamento Total</span>
              <p className="text-2xl font-bold text-[#1d1d1f] mt-2 font-mono">
                R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="apple-card p-5">
              <span className="text-xs font-semibold text-slate-500">Custo Operacional Total</span>
              <p className="text-2xl font-bold text-red-600 mt-2 font-mono">
                R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="apple-card p-5 bg-emerald-50/30 border-emerald-200/80">
              <span className="text-xs font-semibold text-slate-500">Lucro Líquido Real</span>
              <p className="text-3xl font-bold text-emerald-700 mt-2 font-mono">
                R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                Margem: {margemLucro.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="apple-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Desempenho & Comissões de Vendas</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {desempenhoVendedores.map((v) => (
                <div key={v.vendedor_id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{v.vendedor_nome}</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      Comissão: R$ {v.comissao_estimada.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    O.S. Particulares Concluíam: {v.os_particulares_concluidas} un (R$ {v.valor_comissao_por_os.toFixed(2)} / O.S.)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: DADOS DA LOJA */}
      {activeTab === 'loja' && (
        <div className="apple-card p-6 space-y-5 max-w-xl">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Parâmetros da Loja</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={lojaConfig.nome}
                onChange={(e) => setLojaConfig({ ...lojaConfig, nome: e.target.value })}
                className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Telefone</label>
                <input
                  type="text"
                  value={lojaConfig.telefone}
                  onChange={(e) => setLojaConfig({ ...lojaConfig, telefone: e.target.value })}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">CNPJ</label>
                <input
                  type="text"
                  value={lojaConfig.cnpj}
                  onChange={(e) => setLojaConfig({ ...lojaConfig, cnpj: e.target.value })}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => toast.success('Salvo com sucesso!')}
                className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold rounded-full text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" /> Salvar Parâmetros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS: NOVO USUÁRIO */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUsuario}
            className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editUser ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  placeholder="Ex: Pedro Vendedor"
                  value={formUser.nome}
                  onChange={(e) => setFormUser({ ...formUser, nome: e.target.value })}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">E-mail / Login *</label>
                  <input
                    type="email"
                    placeholder="pedro@fitch.com"
                    value={formUser.email}
                    onChange={(e) => setFormUser({ ...formUser, email: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Senha *</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={formUser.senha}
                    onChange={(e) => setFormUser({ ...formUser, senha: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Cargo *</label>
                <select
                  value={formUser.cargo}
                  onChange={(e) =>
                    setFormUser({ ...formUser, cargo: e.target.value as CargoUsuario })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-semibold"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="tecnico">Técnico</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full shadow-sm"
              >
                Salvar Colaborador
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAIS: NOVA PEÇA */}
      {showNewPecaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCadastrarPeca}
            className="apple-card bg-white p-6 max-w-lg w-full space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Cadastrar Peça no Estoque</h3>
              <button
                type="button"
                onClick={() => setShowNewPecaModal(false)}
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
                  placeholder="Ex: Tela OLED iPhone 14 Pro Max"
                  value={formPeca.descricao}
                  onChange={(e) => setFormPeca({ ...formPeca, descricao: e.target.value })}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU *</label>
                  <input
                    type="text"
                    placeholder="TEL-IP14PM"
                    value={formPeca.codigo_sku}
                    onChange={(e) => setFormPeca({ ...formPeca, codigo_sku: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qualidade</label>
                  <select
                    value={formPeca.tipo_qualidade}
                    onChange={(e) =>
                      setFormPeca({
                        ...formPeca,
                        tipo_qualidade: e.target.value as TipoQualidadePeca,
                      })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900"
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
                  value={formPeca.modelo_compativel}
                  onChange={(e) =>
                    setFormPeca({ ...formPeca, modelo_compativel: e.target.value })
                  }
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    value={formPeca.quantidade_estoque}
                    onChange={(e) =>
                      setFormPeca({ ...formPeca, quantidade_estoque: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPeca.custo_unitario}
                    onChange={(e) => setFormPeca({ ...formPeca, custo_unitario: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPeca.preco_venda}
                    onChange={(e) => setFormPeca({ ...formPeca, preco_venda: e.target.value })}
                    className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewPecaModal(false)}
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

      {/* MODAIS: ENTRADA ESTOQUE */}
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
                onClick={handleDarEntradaPeca}
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

function renderCargoIcon(cargo: CargoUsuario) {
  switch (cargo) {
    case 'gerente':
      return <Crown className="w-4 h-4 text-amber-500" />;
    case 'vendedor':
      return <UserCheck className="w-4 h-4 text-[#0071e3]" />;
    case 'tecnico':
      return <Wrench className="w-4 h-4 text-indigo-600" />;
  }
}

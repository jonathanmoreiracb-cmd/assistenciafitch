'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Smartphone,
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  MessageSquare,
  Sparkles,
  MapPin,
  PhoneCall,
  Check,
  AlertCircle,
  Camera,
  ExternalLink,
  PowerOff,
} from 'lucide-react';
import { OSService } from '@/lib/services/os-service';
import { OrdemServico, StatusOS } from '@/types';

export default function ConsultaPublicaPage() {
  const params = useParams();
  const osId = params.id as string;

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOS() {
      setLoading(true);
      try {
        const data = await OSService.getOrdemServicoById(osId);
        setOs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchOS();
  }, [osId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-3 border-[#0071e3] border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">Consultando status do dispositivo no Supabase...</p>
        </div>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 font-sans">
        <div className="apple-card p-8 rounded-3xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Ordem de Serviço Não Encontrada</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Não encontramos a O.S. com a chave informada ({osId}). Verifique a etiqueta de entrada ou entre em contato com o suporte da Fitch Tecnologia.
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(os.status, os.localizacao_atual);
  const isPronto = os.status === 'pronto_para_retirada' || os.status === 'entregue';

  const gerarWhatsAppContact = () => {
    const msg = `Olá Fitch Tecnologia! Gostaria de falar sobre o acompanhamento da minha O.S. #${os.numero_os} (${os.tipo_dispositivo} ${os.modelo}).`;
    return `https://wa.me/5511999998888?text=${encodeURIComponent(msg)}`;
  };

  const maskedImei = os.imei_ou_serial
    ? os.imei_ou_serial.length > 8
      ? `${os.imei_ou_serial.substring(0, 4)}****${os.imei_ou_serial.substring(os.imei_ou_serial.length - 4)}`
      : os.imei_ou_serial
    : 'N/A';

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans pb-16">
      {/* Apple Floating Glass Header */}
      <header className="apple-glass sticky top-0 z-30">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#409cff] flex items-center justify-center shadow-md shadow-[#0071e3]/20 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#1d1d1f] tracking-tight leading-tight">
                Fitch Tecnologia
              </h1>
              <p className="text-[10px] text-[#0071e3] font-bold uppercase tracking-wider">
                Portal de Acompanhamento do Cliente
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-[#0071e3] px-3.5 py-1 rounded-full">
            O.S. #{os.numero_os}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Welcome Greeting */}
        <div className="px-1">
          <span className="text-xs font-semibold text-slate-500 block">Olá, {os.cliente?.nome || 'Cliente'}</span>
          <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Status do seu Dispositivo</h2>
        </div>

        {/* STATUS CALLOUT CARD */}
        <div
          className={`p-6 rounded-3xl border relative overflow-hidden transition-all shadow-sm ${
            isPronto
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white border-emerald-500 shadow-emerald-500/10'
              : 'bg-gradient-to-br from-[#0071e3] via-[#0060c2] to-[#004fa3] text-white border-[#0071e3] shadow-[#0071e3]/20'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-md">
                Etapa Atual
              </span>
              <h3 className="text-2xl font-black mt-3 tracking-tight leading-tight">
                {formatPublicStatusName(os.status)}
              </h3>
              <p className="text-xs text-white/90 mt-1.5 leading-relaxed max-w-sm">
                {getPublicStatusDescription(os.status, os.localizacao_atual)}
              </p>
            </div>

            {isPronto ? (
              <div className="w-13 h-13 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-13 h-13 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
            )}
          </div>

          {/* SP Location Notice */}
          {(os.localizacao_atual === 'laboratorio_sp' || os.localizacao_atual === 'em_transito_ida_sp') && (
            <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-white/90">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>
                Dispositivo em processo especializado de alta precisão em São Paulo.
              </span>
            </div>
          )}
        </div>

        {/* STEPPER TIMELINE */}
        <div className="apple-card p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Linha do Tempo da Manutenção
          </h3>

          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {renderTimelineStep(
              1,
              'Recebimento na Loja',
              `Entrada registrada em ${new Date(os.data_entrada).toLocaleDateString('pt-BR')}`,
              currentStepIndex >= 1
            )}

            {renderTimelineStep(
              2,
              'Diagnóstico & Orçamento',
              os.status === 'orcamento_gerado' || os.status === 'aprovado'
                ? 'Laudo técnico elaborado.'
                : 'Diagnóstico técnico efetuado.',
              currentStepIndex >= 2
            )}

            {renderTimelineStep(
              3,
              'Em Manutenção na Bancada',
              os.localizacao_atual === 'laboratorio_sp'
                ? 'Submetido a testes avançados em laboratório.'
                : 'Instalação de peças e testes estresse.',
              currentStepIndex >= 3
            )}

            {renderTimelineStep(
              4,
              'Pronto para Retirada',
              'Aparelho aprovado no controle de qualidade e higienizado.',
              currentStepIndex >= 4
            )}
          </div>
        </div>

        {/* DEVICE DETAILS & WARRANTY CARD */}
        <div className="apple-card p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Especificações do Aparelho
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Aparelho & Cor
              </span>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                {os.tipo_dispositivo} {os.modelo}
              </p>
              <p className="text-[10px] text-slate-500">Cor: {os.cor}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Garantia Fitch
              </span>
              <p className="font-extrabold text-[#0071e3] text-sm mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                {os.garantia_dias} Dias
              </p>
              <p className="text-[10px] text-slate-500">
                Cobertura: {os.tipo_cobertura}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              IMEI / Serial Protegido
            </span>
            <p className="font-mono font-bold text-slate-800">{maskedImei}</p>
          </div>

          {os.aparelho_nao_liga && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900">
              <PowerOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Aparelho deu entrada desligado / sem ligar.</span>
            </div>
          )}

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              Defeito Informado pelo Cliente
            </span>
            <p className="text-slate-800">{os.defeito_reclamado}</p>
          </div>

          {os.laudo_tecnico && (
            <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl space-y-1 text-xs">
              <span className="text-[10px] text-[#0071e3] font-black uppercase block">
                Parecer Técnico da Fitch Tecnologia
              </span>
              <p className="text-slate-800">{os.laudo_tecnico}</p>
            </div>
          )}
        </div>

        {/* PHOTOS ATTACHED GALLERY */}
        {os.fotos_entrada && os.fotos_entrada.length > 0 && (
          <div className="apple-card p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#0071e3]" />
                Registros de Entrada & Avarias
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {os.fotos_entrada.length} foto(s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {os.fotos_entrada.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 block relative group"
                >
                  <img
                    src={url}
                    alt={`Foto avaria ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* SHOP CONTACT & WHATSAPP BUTTON */}
        <div className="apple-card p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900">Precisa falar com a gente?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Fale direto com a equipe da Fitch Tecnologia no WhatsApp sobre sua Ordem de Serviço.
            </p>
          </div>

          <a
            href={gerarWhatsAppContact()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Falar com a Fitch Tecnologia via WhatsApp</span>
          </a>
        </div>
      </main>
    </div>
  );
}

// Helpers
function getStepIndex(status: StatusOS, localizacao: string): number {
  if (status === 'entregue' || status === 'pronto_para_retirada') return 4;
  if (status === 'em_manutencao' || status === 'aguardando_peca' || localizacao === 'laboratorio_sp') return 3;
  if (status === 'orcamento_gerado' || status === 'aprovado') return 2;
  return 1;
}

function formatPublicStatusName(s: StatusOS) {
  const map: Record<StatusOS, string> = {
    aguardando_analise: 'Em Análise Inicial',
    orcamento_gerado: 'Orçamento Concluído',
    aprovado: 'Serviço Aprovado',
    em_manutencao: 'Em Manutenção na Bancada',
    aguardando_peca: 'Aguardando Peça Especial',
    pronto_para_retirada: 'Pronto para Retirada! 🎉',
    entregue: 'Aparelho Entregue',
    cancelado: 'Serviço Cancelado',
  };
  return map[s] || s;
}

function getPublicStatusDescription(s: StatusOS, loc: string) {
  if (s === 'pronto_para_retirada') {
    return 'Seu dispositivo passou nos testes de qualidade, foi higienizado e está pronto para retirada na loja!';
  }
  if (loc === 'laboratorio_sp') {
    return 'Aparelho em bancada avançada de micro-solda no nosso laboratório em São Paulo.';
  }
  if (s === 'em_manutencao') {
    return 'Nossos técnicos especializados estão executando os reparos e testes de estresse no seu aparelho.';
  }
  if (s === 'orcamento_gerado') {
    return 'O orçamento e laudo técnico foram concluídos. Aguardando sua aprovação.';
  }
  return 'Seu aparelho deu entrada na loja e está aguardando fila de diagnósticos.';
}

function renderTimelineStep(step: number, title: string, subtitle: string, isDone: boolean) {
  return (
    <div className="flex items-start gap-4 relative z-10">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-all ${
          isDone
            ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-sm'
            : 'bg-slate-100 text-slate-400 border-slate-200'
        }`}
      >
        {isDone ? <Check className="w-4 h-4" /> : step}
      </div>
      <div>
        <h4 className={`text-xs font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
          {title}
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

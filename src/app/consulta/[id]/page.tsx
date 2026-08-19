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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-400">Carregando status do seu aparelho...</p>
        </div>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 border-slate-800">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">Ordem de Serviço Não Encontrada</h2>
          <p className="text-xs text-slate-400">
            Verifique se o número da O.S. está correto ou entre em contato direto com a Fitch Tecnologia.
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(os.status, os.localizacao_atual);
  const isPronto = os.status === 'pronto_para_retirada';

  const geratWhatsAppContact = () => {
    const msg = `Olá! Sou cliente da Fitch Tecnologia e gostaria de mais informações sobre minha O.S. #${os.numero_os} (${os.tipo_dispositivo} ${os.modelo}).`;
    return `https://wa.me/5511999998888?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-400 flex items-center justify-center shadow-md shadow-sky-500/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">
                Fitch Tecnologia
              </h1>
              <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                Acompanhamento em Tempo Real
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-sky-400 px-3 py-1 rounded-full">
            O.S. #{os.numero_os}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Status Callout Card */}
        <div
          className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
            isPronto
              ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-emerald-500/40 shadow-emerald-950/40'
              : 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 shadow-slate-950/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                Status Atual do Aparelho
              </span>
              <h2 className="text-2xl font-black text-white mt-2 tracking-tight">
                {formatPublicStatusName(os.status)}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {getPublicStatusDescription(os.status, os.localizacao_atual)}
              </p>
            </div>

            {isPronto ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
            )}
          </div>

          {/* SP Location indicator if in SP */}
          {(os.localizacao_atual === 'laboratorio_sp' || os.localizacao_atual === 'em_transito_ida_sp') && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-purple-300">
              <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Seu aparelho está sendo tratado em nosso laboratório de alta precisão em São Paulo.
              </span>
            </div>
          )}
        </div>

        {/* STEPPER TIMELINE */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Linha do Tempo da Manutenção
          </h3>

          <div className="space-y-6 relative before:absolute before:left-[17px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {renderTimelineStep(
              1,
              'Recebimento na Loja',
              `Entrada realizada em ${new Date(os.data_entrada).toLocaleDateString('pt-BR')}`,
              currentStepIndex >= 1
            )}

            {renderTimelineStep(
              2,
              'Análise & Orçamento',
              os.status === 'orcamento_gerado' || os.status === 'aprovado'
                ? 'Orçamento pronto e aprovado.'
                : 'Diagnóstico técnico efetuado.',
              currentStepIndex >= 2
            )}

            {renderTimelineStep(
              3,
              'Em Manutenção na Bancada',
              os.localizacao_atual === 'laboratorio_sp'
                ? 'Submetido a testes avançados em São Paulo.'
                : 'Substituição de peças e testes estresse.',
              currentStepIndex >= 3
            )}

            {renderTimelineStep(
              4,
              'Pronto para Retirada',
              'Aparelho testado, aprovado no checklist de saída e higienizado.',
              currentStepIndex >= 4
            )}
          </div>
        </div>

        {/* DEVICE DETAILS & WARRANTY CARD */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Detalhes do Dispositivo
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Modelo
              </span>
              <p className="font-bold text-white text-sm mt-0.5">
                {os.tipo_dispositivo} {os.modelo}
              </p>
              <p className="text-[10px] text-slate-400">Cor: {os.cor}</p>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Garantia da Loja
              </span>
              <p className="font-bold text-sky-400 text-sm mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                {os.garantia_dias} Dias
              </p>
              <p className="text-[10px] text-slate-400">
                Cobertura: {os.tipo_cobertura}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Defeito Informado
            </span>
            <p className="text-slate-300">{os.defeito_reclamado}</p>
          </div>

          {os.laudo_tecnico && (
            <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-2xl space-y-1 text-xs">
              <span className="text-[10px] text-sky-400 font-extrabold uppercase block">
                Laudo Técnico Fitch Tecnologia
              </span>
              <p className="text-slate-200">{os.laudo_tecnico}</p>
            </div>
          )}
        </div>

        {/* SHOP CONTACT & WHATSAPP BUTTON */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 border-slate-800 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>

          <div>
            <h4 className="text-base font-bold text-white">Dúvidas sobre seu reparo?</h4>
            <p className="text-xs text-slate-400 mt-1">
              Nossa equipe de atendimento da Fitch Tecnologia está pronta para te atender no WhatsApp.
            </p>
          </div>

          <a
            href={geratWhatsAppContact()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Falar com o Atendimento via WhatsApp</span>
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
    orcamento_gerado: 'Orçamento Pronto',
    aprovado: 'Aprovado pelo Cliente',
    em_manutencao: 'Em Manutenção',
    aguardando_peca: 'Aguardando Peça Especial',
    pronto_para_retirada: 'Pronto para Retirada 🎉',
    entregue: 'Entregue ao Cliente',
    cancelado: 'Serviço Cancelado',
  };
  return map[s] || s;
}

function getPublicStatusDescription(s: StatusOS, loc: string) {
  if (s === 'pronto_para_retirada') {
    return 'Seu aparelho passou nos testes de qualidade e está higienizado aguardando sua retirada!';
  }
  if (loc === 'laboratorio_sp') {
    return 'Aparelho em bancada avançada de micro-solda no nosso laboratório de São Paulo.';
  }
  if (s === 'em_manutencao') {
    return 'Nossos técnicos especializados estão executando os procedimentos no seu dispositivo.';
  }
  if (s === 'orcamento_gerado') {
    return 'O orçamento e o laudo técnico foram concluídos. Aguardando sua aprovação.';
  }
  return 'Seu aparelho deu entrada na loja e está na fila de diagnósticos.';
}

function renderTimelineStep(step: number, title: string, subtitle: string, isDone: boolean) {
  return (
    <div className="flex items-start gap-4 relative z-10">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-all ${
          isDone
            ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
            : 'bg-slate-900 text-slate-500 border-slate-800'
        }`}
      >
        {isDone ? <Check className="w-4 h-4" /> : step}
      </div>
      <div>
        <h4 className={`text-xs font-bold ${isDone ? 'text-white' : 'text-slate-500'}`}>
          {title}
        </h4>
        <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

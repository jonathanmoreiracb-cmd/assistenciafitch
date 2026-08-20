'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { OrdemServico } from '@/types';

interface WarrantyTermProps {
  os: OrdemServico;
}

export const WarrantyTerm: React.FC<WarrantyTermProps> = ({ os }) => {
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/consulta/${os.numero_os}`
      : `https://assistenciafitch.vercel.app/consulta/${os.numero_os}`;

  const dataEntradaFormatted = new Date(os.data_entrada).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="a4-warranty-term bg-white text-black p-8 max-w-[210mm] mx-auto text-xs font-sans leading-relaxed border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-6 print:m-0">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#1d1d1f] p-2.5 rounded-xl flex items-center shrink-0">
            <img
              src="/logo.png"
              alt="Fitch Tecnologia"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              FITCH TECNOLOGIA
            </h1>
            <p className="text-slate-700 font-bold text-xs">
              Assistência Técnica Especializada Apple & Android
            </p>
            <p className="text-slate-500 text-[10px]">
              Manutenção de iPhone, iPad, Apple Watch, MacBook e Android Premium
            </p>
            <p className="text-slate-500 text-[10px]">
              Contato: (11) 99999-8888 | financeiro@fitchtecnologia.com.br
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-black uppercase bg-black text-white px-3 py-1 rounded-sm mb-1.5">
            ORDEM DE SERVIÇO Nº #{os.numero_os}
          </span>
          <p className="text-[11px] font-bold text-slate-800">
            Data de Entrada: {dataEntradaFormatted}
          </p>
          <span className="text-[10px] font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-xs border border-blue-200 mt-1 uppercase">
            Serviço: {os.tipo_cobertura === 'Garantia da Loja' ? 'Garantia de Seminovo (180 dias)' : os.tipo_cobertura === 'Revisão / Upgrade' ? 'Revisão / Trade-in (Estoque Loja)' : 'Assistência Particular'}
          </span>
        </div>
      </div>

      {/* Customer & Device Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-1 text-xs">
          <h3 className="font-bold uppercase text-[10px] text-slate-500 border-b border-slate-300 pb-1 mb-1">
            DADOS DO CLIENTE
          </h3>
          <p><strong className="text-slate-800">Nome:</strong> {os.cliente?.nome || 'N/A'}</p>
          <p><strong className="text-slate-800">CPF:</strong> {os.cliente?.cpf || 'Não informado'}</p>
          <p><strong className="text-slate-800">Telefone Principal:</strong> {os.cliente?.telefone || 'N/A'}</p>
          {os.cliente?.telefone_secundario && (
            <p><strong className="text-slate-800">Telefone Secundário:</strong> {os.cliente.telefone_secundario}</p>
          )}
          {os.cliente?.email && (
            <p><strong className="text-slate-800">E-mail:</strong> {os.cliente.email}</p>
          )}
          {os.cliente?.instagram && (
            <p><strong className="text-slate-800">Instagram:</strong> {os.cliente.instagram}</p>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <h3 className="font-bold uppercase text-[10px] text-slate-500 border-b border-slate-300 pb-1 mb-1">
            DADOS DO DISPOSITIVO
          </h3>
          <p>
            <strong className="text-slate-800">Aparelho:</strong> {os.tipo_dispositivo} {os.modelo} ({os.cor})
          </p>
          <p><strong className="text-slate-800">IMEI / Serial:</strong> <span className="font-mono">{os.imei_ou_serial}</span></p>
          <p>
            <strong className="text-slate-800">Senha de Tela:</strong>{' '}
            <span className="font-mono font-bold bg-white px-2 py-0.5 border border-slate-300 rounded-xs">
              {os.senha_aparelho || 'Sem senha'}
            </span>
          </p>
          <p>
            <strong className="text-slate-800">Buscar iPhone Desativado:</strong>{' '}
            {os.buscar_iphone_desativado ? 'SIM (Confirmado)' : 'NÃO'}
          </p>
          {os.aparelho_nao_liga && (
            <p className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-xs inline-block text-[10px] mt-1">
              ⚡ Aparelho Desligado / Não Liga na Entrada
            </p>
          )}
        </div>
      </div>

      {/* Problem & Diagnosis */}
      <div className="space-y-3 mb-5">
        <div className="border border-slate-300 p-3 rounded-xl">
          <h4 className="font-bold text-[11px] text-slate-900 uppercase mb-1">
            Defeito Reclamado pelo Cliente:
          </h4>
          <p className="text-slate-800 text-xs">{os.defeito_reclamado}</p>
        </div>

        {os.laudo_tecnico && (
          <div className="border border-blue-200 bg-blue-50/50 p-3 rounded-xl">
            <h4 className="font-bold text-[11px] text-blue-900 uppercase mb-1">
              Laudo Técnico / Parecer de Entrada:
            </h4>
            <p className="text-slate-900 text-xs">{os.laudo_tecnico}</p>
          </div>
        )}
      </div>

      {/* Checklist Grid */}
      <div className="mb-5 border border-slate-300 p-3 rounded-xl">
        <h4 className="font-bold text-[11px] text-slate-900 uppercase mb-2">
          Checklist de Entrada e Inspeção Física
        </h4>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Face ID / Touch ID:</span>
            <strong className="uppercase">{os.checklist_entrada.face_id}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>True Tone:</span>
            <strong className="uppercase">{os.checklist_entrada.true_tone}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Câmeras (Frontal/Traseira):</span>
            <strong className="uppercase">{os.checklist_entrada.cameras}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Microfones:</span>
            <strong className="uppercase">{os.checklist_entrada.microfones}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Alto-Falante:</span>
            <strong className="uppercase">{os.checklist_entrada.alto_falante}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Conector de Carga:</span>
            <strong className="uppercase">{os.checklist_entrada.carregamento}</strong>
          </div>
        </div>
        {os.checklist_entrada.detalhes_esteticos && (
          <p className="mt-2 text-[10px] text-slate-700">
            <strong>Detalhes Estéticos/Avarias:</strong> {os.checklist_entrada.detalhes_esteticos}
          </p>
        )}
      </div>

      {/* Financial Summary */}
      <div className="flex justify-between items-center mb-6 bg-slate-900 text-white p-4 rounded-xl">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Resumo Financeiro & Condições
          </p>
          <p className="text-xs text-slate-200 mt-0.5">
            Vendedor: {os.vendedor_nome || 'Fitch Tecnologia'} | Garantia da Loja: {os.garantia_dias} dias
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">VALOR ESTIMADO / TOTAL</span>
          <span className="text-2xl font-black font-mono">
            R$ {Number(os.valor_total).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Terms & Warranty Rules */}
      <div className="border-t border-slate-300 pt-3 mb-6 text-[9px] text-slate-600 space-y-1 leading-tight">
        <p className="font-bold text-slate-900 text-[10px] uppercase">
          TERMOS DE GARANTIA E RESPONSABILIDADE DA FITCH TECNOLOGIA:
        </p>
        <p>
          1. A garantia concedida é de <strong>{os.garantia_dias} dias</strong> a contar da data de retirada do aparelho, cobrindo exclusivamente as peças e serviços discriminados nesta Ordem de Serviço.
        </p>
        <p>
          2. A garantia será anulada em caso de: quedas, contato com líquidos, violação do selo de garantia da Fitch Tecnologia, tentativas de reparo por terceiros ou mau uso do dispositivo.
        </p>
        <p>
          3. Aparelhos não retirados em até 90 dias após a notificação de conclusão serão submetidos às diretrizes da legislação vigente para custeio das despesas de armazenamento.
        </p>
        <p>
          4. O cliente declara ter ciência das condições estéticas e de funcionamento registradas no checklist no ato de entrada do dispositivo.
        </p>
      </div>

      {/* QR Code & Signature Section */}
      <div className="grid grid-cols-3 gap-6 items-end pt-3 border-t border-slate-300">
        <div className="flex items-center gap-3">
          <QRCodeSVG value={publicUrl} size={64} level="M" />
          <div className="text-[9px] text-slate-600">
            <p className="font-bold text-slate-900">QR Code de Consulta</p>
            <p>Escaneie para acompanhar o status em tempo real</p>
          </div>
        </div>

        <div className="text-center">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-bold text-[10px] text-slate-900">Fitch Tecnologia</p>
          <p className="text-[8px] text-slate-500">Técnico / Responsável</p>
        </div>

        <div className="text-center">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-bold text-[10px] text-slate-900">Assinatura do Cliente</p>
          <p className="text-[8px] text-slate-500">{os.cliente?.nome}</p>
        </div>
      </div>
    </div>
  );
};

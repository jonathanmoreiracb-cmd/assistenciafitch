'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { OrdemServico } from '@/types';

interface WarrantyTermProps {
  os: OrdemServico;
}

export const WarrantyTerm: React.FC<WarrantyTermProps> = ({ os }) => {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/consulta/${os.numero_os}`
    : `https://fitch-tecnologia.app/consulta/${os.numero_os}`;

  const dataEntradaFormatted = new Date(os.data_entrada).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="a4-warranty-term bg-white text-black p-8 max-w-[210mm] mx-auto text-xs font-sans leading-relaxed border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            FITCH TECNOLOGIA
          </h1>
          <p className="text-slate-600 font-medium text-xs">
            Assistência Técnica Especializada Apple & Android
          </p>
          <p className="text-slate-500 text-[10px]">
            Manutenção de iPhone, iPad, Apple Watch, Mac e Smartphones Premium
          </p>
          <p className="text-slate-500 text-[10px]">
            Contato: (11) 99999-8888 | suporte@fitchtecnologia.com.br
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-sm font-extrabold uppercase bg-slate-900 text-white px-3 py-1 rounded-sm mb-2">
            TERMO DE ORDEM DE SERVIÇO Nº #{os.numero_os}
          </span>
          <p className="text-[11px] font-semibold text-slate-700">
            Data de Entrada: {dataEntradaFormatted}
          </p>
          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-xs border border-blue-200 mt-1">
            Cobertura: {os.tipo_cobertura.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Customer & Device Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-md border border-slate-200">
        <div>
          <h3 className="font-bold uppercase text-[10px] text-slate-500 mb-1 border-b border-slate-300 pb-0.5">
            DADOS DO CLIENTE
          </h3>
          <p><strong className="text-slate-700">Nome:</strong> {os.cliente?.nome || 'N/A'}</p>
          <p><strong className="text-slate-700">Telefone:</strong> {os.cliente?.telefone || 'N/A'}</p>
          <p><strong className="text-slate-700">CPF:</strong> {os.cliente?.cpf || 'Não informado'}</p>
        </div>

        <div>
          <h3 className="font-bold uppercase text-[10px] text-slate-500 mb-1 border-b border-slate-300 pb-0.5">
            DADOS DO DISPOSITIVO
          </h3>
          <p>
            <strong className="text-slate-700">Aparelho:</strong> {os.tipo_dispositivo} {os.modelo} ({os.cor})
          </p>
          <p><strong className="text-slate-700">IMEI / Serial:</strong> {os.imei_ou_serial}</p>
          <p>
            <strong className="text-slate-700">Senha de Tela:</strong>{' '}
            <span className="font-mono font-bold bg-white px-1.5 py-0.5 border border-slate-300 rounded-xs">
              {os.senha_aparelho || 'Sem senha'}
            </span>
          </p>
          <p>
            <strong className="text-slate-700">Buscar iPhone Desativado:</strong>{' '}
            {os.buscar_iphone_desativado ? 'SIM (Confirmado)' : 'NÃO / N/A'}
          </p>
        </div>
      </div>

      {/* Problem & Diagnosis */}
      <div className="space-y-3 mb-6">
        <div className="border border-slate-200 p-3 rounded-md">
          <h4 className="font-bold text-[11px] text-slate-800 uppercase mb-1">
            Defeito Reclamado pelo Cliente:
          </h4>
          <p className="text-slate-700">{os.defeito_reclamado}</p>
        </div>

        {os.laudo_tecnico && (
          <div className="border border-blue-200 bg-blue-50/50 p-3 rounded-md">
            <h4 className="font-bold text-[11px] text-blue-900 uppercase mb-1">
              Laudo Técnico / Parecer de Entrada:
            </h4>
            <p className="text-slate-800">{os.laudo_tecnico}</p>
          </div>
        )}
      </div>

      {/* Checklist Grid */}
      <div className="mb-6 border border-slate-200 p-3 rounded-md">
        <h4 className="font-bold text-[11px] text-slate-800 uppercase mb-2">
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
          <p className="mt-2 text-[10px] text-slate-600">
            <strong>Detalhes Estéticos/Avarias:</strong> {os.checklist_entrada.detalhes_esteticos}
          </p>
        )}
      </div>

      {/* Financial Summary */}
      <div className="flex justify-between items-end mb-8 bg-slate-900 text-white p-4 rounded-md">
        <div>
          <p className="text-[10px] text-slate-400 uppercase font-semibold">
            Resumo Financeiro & Condições
          </p>
          <p className="text-xs text-slate-200">
            Forma de Pagamento: {os.forma_pagamento || 'A combinar'} | Garantia:{' '}
            {os.garantia_dias} dias
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">VALOR TOTAL DA O.S.</span>
          <span className="text-2xl font-black">
            R$ {Number(os.valor_total).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Terms & Warranty Rules */}
      <div className="border-t border-slate-300 pt-4 mb-8 text-[9px] text-slate-600 space-y-1.5 leading-tight">
        <p className="font-bold text-slate-800 text-[10px] uppercase">
          TERMOS DE GARANTIA E RESPONSABILIDADE - FITCH TECNOLOGIA:
        </p>
        <p>
          1. A garantia concedida é de <strong>{os.garantia_dias} dias</strong> a contar da data de retirada do aparelho, cobrindo exclusivamente as peças e serviços discriminados nesta Ordem de Serviço.
        </p>
        <p>
          2. A garantia será anulada em caso de: quedas, contato com líquidos, violação do selo de garantia da Fitch Tecnologia, tentativas de reparo por terceiros ou mau uso do dispositivo.
        </p>
        <p>
          3. Aparelhos não retirados em até 90 dias após a notificação de conclusão serão submetidos às diretrizes da legislação vigente para custeio das despesas de armazenamento e peças.
        </p>
        <p>
          4. O cliente declara ter ciência das condições estéticas e de funcionamento registradas no checklist no ato de entrada do dispositivo.
        </p>
      </div>

      {/* QR Code & Signature Section */}
      <div className="grid grid-cols-3 gap-6 items-end pt-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <QRCodeSVG value={publicUrl} size={60} level="M" />
          <div className="text-[9px] text-slate-500">
            <p className="font-bold text-slate-800">QR Code de Consulta</p>
            <p>Escaneie para acompanhar o status em tempo real</p>
          </div>
        </div>

        <div className="text-center">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-bold text-[10px] text-slate-800">Técnico / Responsável Fitch</p>
          <p className="text-[8px] text-slate-500">Fitch Tecnologia</p>
        </div>

        <div className="text-center">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-bold text-[10px] text-slate-800">Assinatura do Cliente</p>
          <p className="text-[8px] text-slate-500">{os.cliente?.nome}</p>
        </div>
      </div>
    </div>
  );
};

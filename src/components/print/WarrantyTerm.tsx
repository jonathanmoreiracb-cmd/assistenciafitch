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

  const deviceName = os.modelo.toLowerCase().includes(os.tipo_dispositivo.toLowerCase())
    ? os.modelo
    : `${os.tipo_dispositivo} ${os.modelo}`;

  return (
    <div className="a4-warranty-term bg-white text-slate-950 p-6 sm:p-8 max-w-[210mm] mx-auto text-xs font-sans leading-relaxed border-2 border-slate-900 shadow-md print:shadow-none print:border-none print:p-0 print:m-0">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-950 pb-4 mb-4">
        <div className="flex items-center gap-3.5">
          <div className="bg-slate-950 p-2.5 rounded-xl flex items-center shrink-0 border border-slate-800">
            <img
              src="/logo.png"
              alt="Fitch Tecnologia"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
              FITCH TECNOLOGIA
            </h1>
            <p className="text-slate-900 font-extrabold text-xs">
              Assistência Técnica Especializada Apple & Android
            </p>
            <p className="text-slate-700 font-medium text-[10px] mt-0.5">
              Manutenção de iPhone e Android
            </p>
            <p className="text-slate-700 font-semibold text-[10px]">
              Contato: +55 (24) 99330-7474 | gerenciafitch@gmail.com
            </p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end shrink-0">
          <span className="text-sm font-mono font-black uppercase bg-slate-950 text-white px-3.5 py-1 rounded-md border border-slate-900 shadow-xs mb-1">
            ORDEM DE SERVIÇO Nº #{os.numero_os}
          </span>
          <p className="text-[11px] font-bold text-slate-900">
            Data de Entrada: <strong className="text-slate-950">{dataEntradaFormatted}</strong>
          </p>
          <p className="text-[11px] font-black text-slate-950 mt-1 bg-amber-100/90 border border-amber-400 px-2.5 py-0.5 rounded-md">
            VENDEDOR: {os.vendedor_nome || 'Loja / Atendente'}
          </p>
          <span className="text-[10px] font-black text-[#0071e3] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-300 mt-1 uppercase">
            Serviço: {os.tipo_cobertura === 'Garantia da Loja' ? 'Garantia de Seminovo (180 dias)' : os.tipo_cobertura === 'Revisão / Upgrade' ? 'Revisão / Trade-in (Estoque Loja)' : 'Assistência Particular'}
          </span>
        </div>
      </div>

      {/* Customer & Device Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-900">
        <div className="space-y-1.5 text-xs">
          <h3 className="font-extrabold uppercase text-[10px] text-slate-900 border-b-2 border-slate-900 pb-1 mb-1.5 tracking-wider">
            DADOS DO CLIENTE & ATENDIMENTO
          </h3>
          <p><strong className="text-slate-900">Cliente:</strong> <span className="font-black text-slate-950">{os.cliente?.nome || 'N/A'}</span></p>
          <p><strong className="text-slate-900">CPF:</strong> <span className="font-semibold text-slate-950">{os.cliente?.cpf || 'Não informado'}</span></p>
          <p><strong className="text-slate-900">Telefone Principal:</strong> <span className="font-bold text-slate-950">{os.cliente?.telefone || 'N/A'}</span></p>
          {os.cliente?.telefone_secundario && (
            <p><strong className="text-slate-900">Telefone Secundário:</strong> <span className="font-semibold text-slate-950">{os.cliente.telefone_secundario}</span></p>
          )}
          {os.cliente?.email && (
            <p><strong className="text-slate-900">E-mail:</strong> <span className="font-semibold text-slate-950">{os.cliente.email}</span></p>
          )}
          <div className="pt-1.5 border-t border-slate-300 mt-1.5 flex items-center justify-between">
            <span className="text-slate-900 font-extrabold uppercase text-[10px]">Vendedor Abertura:</span>
            <span className="font-black text-slate-950 bg-white px-2.5 py-0.5 border border-slate-400 rounded-md">
              👤 {os.vendedor_nome || 'Atendente Loja'}
            </span>
          </div>
          {Number(os.desconto_avaliacao_tradein) > 0 && (
            <div className="mt-1 flex items-center justify-between bg-indigo-50 p-1.5 rounded-md border border-indigo-300">
              <span className="text-indigo-950 font-extrabold uppercase text-[10px]">Margem Trade-in (Desconto):</span>
              <span className="font-mono font-black text-indigo-950 text-xs">
                R$ {Number(os.desconto_avaliacao_tradein).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-xs">
          <h3 className="font-extrabold uppercase text-[10px] text-slate-900 border-b-2 border-slate-900 pb-1 mb-1.5 tracking-wider">
            DADOS DO DISPOSITIVO
          </h3>
          <p>
            <strong className="text-slate-900">Aparelho:</strong> <span className="font-black text-slate-950">{deviceName} {os.cor ? `(${os.cor})` : ''}</span>
          </p>
          <p><strong className="text-slate-900">IMEI / Serial:</strong> <span className="font-mono font-bold text-slate-950">{os.imei_ou_serial}</span></p>
          <p>
            <strong className="text-slate-900">Senha de Tela:</strong>{' '}
            <span className="font-mono font-black text-slate-950 bg-white px-2 py-0.5 border border-slate-400 rounded-md">
              {os.senha_aparelho || 'SEM SENHA'}
            </span>
          </p>
          <p>
            <strong className="text-slate-900">Buscar iPhone Desativado:</strong>{' '}
            <strong className="text-slate-950">{os.buscar_iphone_desativado ? 'SIM (Confirmado)' : 'NÃO'}</strong>
          </p>
          {os.aparelho_nao_liga && (
            <p className="font-extrabold text-amber-950 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-md inline-block text-[10px] mt-1">
              ⚡ Aparelho Desligado / Não Liga na Entrada
            </p>
          )}
        </div>
      </div>

      {/* Problem & Diagnosis */}
      <div className="space-y-3 mb-4">
        <div className="border-2 border-slate-900 p-3.5 rounded-xl bg-white">
          <h4 className="font-extrabold text-[11px] text-slate-950 uppercase mb-1 border-b border-slate-200 pb-1">
            Defeito Reclamado pelo Cliente:
          </h4>
          <p className="text-slate-950 font-semibold text-xs mt-1">{os.defeito_reclamado}</p>
        </div>

        {os.laudo_tecnico && (
          <div className="border-2 border-blue-900 bg-blue-50/70 p-3.5 rounded-xl">
            <h4 className="font-extrabold text-[11px] text-blue-950 uppercase mb-1 border-b border-blue-200 pb-1">
              Laudo Técnico / Parecer de Entrada:
            </h4>
            <p className="text-blue-950 font-medium text-xs mt-1">{os.laudo_tecnico}</p>
          </div>
        )}
      </div>

      {/* Checklist Grid */}
      <div className="mb-4 border-2 border-slate-900 p-3.5 rounded-xl bg-white">
        <h4 className="font-extrabold text-[11px] text-slate-950 uppercase mb-2 border-b border-slate-200 pb-1">
          Checklist de Entrada e Inspeção Física
        </h4>
        <div className="grid grid-cols-3 gap-2.5 text-[10.5px]">
          <div className="flex justify-between border-b border-slate-300 pb-1">
            <span className="font-semibold text-slate-800">Face ID / Touch ID:</span>
            <strong className="uppercase font-black text-slate-950">{os.checklist_entrada.face_id}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-300 pb-1">
            <span className="font-semibold text-slate-800">True Tone:</span>
            <strong className="uppercase font-black text-slate-950">{os.checklist_entrada.true_tone}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-300 pb-1">
            <span className="font-semibold text-slate-800">Câmeras (Frontal/Traseira):</span>
            <strong className="uppercase font-black text-slate-950">{os.checklist_entrada.cameras}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-300 pb-1">
            <span className="font-semibold text-slate-800">Microfones:</span>
            <strong className="uppercase font-black text-slate-950">{os.checklist_entrada.microfones}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-300 pb-1">
            <span className="font-semibold text-slate-800">Alto-Falante:</span>
            <strong className="uppercase font-black text-slate-950">{os.checklist_entrada.alto_falante}</strong>
          </div>
          <div className="flex justify-between border-b border-slate-300 pb-1">
            <span className="font-semibold text-slate-800">Conector de Carga:</span>
            <strong className="uppercase font-black text-slate-950">{os.checklist_entrada.carregamento}</strong>
          </div>
        </div>
        {os.checklist_entrada.detalhes_esteticos && (
          <p className="mt-2 text-[10.5px] text-slate-900 border-t border-slate-200 pt-1.5">
            <strong>Detalhes Estéticos / Avarias:</strong> {os.checklist_entrada.detalhes_esteticos}
          </p>
        )}
      </div>

      {/* Financial Summary */}
      <div className="flex justify-between items-center mb-5 bg-slate-950 text-white p-4 rounded-xl border-2 border-slate-950 shadow-sm">
        <div>
          <p className="text-[10px] text-slate-300 uppercase font-black tracking-wider">
            Resumo Financeiro & Condições
          </p>
          <p className="text-xs text-white font-bold mt-0.5">
            Vendedor: {os.vendedor_nome || 'Fitch Tecnologia'} | Garantia da Loja: {os.garantia_dias} dias
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-300 block uppercase font-black tracking-wider">VALOR ESTIMADO / TOTAL O.S.</span>
          <span className="text-2xl font-black font-mono text-emerald-400 drop-shadow-xs">
            R$ {Number(os.valor_total).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Terms & Warranty Rules */}
      <div className="border-t-2 border-slate-900 pt-3 mb-5 text-[9px] text-slate-900 space-y-1 leading-relaxed">
        <p className="font-black text-slate-950 text-[10px] uppercase">
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
      <div className="grid grid-cols-3 gap-6 items-end pt-3 border-t-2 border-slate-900">
        <div className="flex items-center gap-2.5">
          <QRCodeSVG value={publicUrl} size={58} level="M" />
          <div className="text-[8.5px] text-slate-900 leading-tight">
            <p className="font-black text-slate-950 uppercase">Consulta Online</p>
            <p>Escaneie o QR Code para acompanhar o status da O.S.</p>
          </div>
        </div>

        <div className="text-center">
          <div className="border-b-2 border-slate-950 mb-1 h-7"></div>
          <p className="font-extrabold text-[10px] text-slate-950">{os.vendedor_nome || 'Fitch Tecnologia'}</p>
          <p className="text-[8px] text-slate-700 font-bold uppercase">Vendedor / Atendente Responsável</p>
        </div>

        <div className="text-center">
          <div className="border-b-2 border-slate-950 mb-1 h-7"></div>
          <p className="font-extrabold text-[10px] text-slate-950">Assinatura do Cliente</p>
          <p className="text-[8px] text-slate-700 font-bold">{os.cliente?.nome}</p>
        </div>
      </div>
    </div>
  );
};

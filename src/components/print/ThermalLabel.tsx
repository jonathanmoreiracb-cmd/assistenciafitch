'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { OrdemServico } from '@/types';

interface ThermalLabelProps {
  os: OrdemServico;
}

export const ThermalLabel: React.FC<ThermalLabelProps> = ({ os }) => {
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/consulta/${os.numero_os}`
      : `https://assistenciafitch.vercel.app/consulta/${os.numero_os}`;

  const formattedDate = new Date(os.data_entrada).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const deviceName = os.modelo.toLowerCase().includes(os.tipo_dispositivo.toLowerCase())
    ? os.modelo
    : `${os.tipo_dispositivo} ${os.modelo}`;

  return (
    <div
      className="thermal-label-container bg-white text-black font-sans leading-tight p-2 flex flex-col justify-between overflow-hidden select-none"
      style={{
        width: '80mm',
        height: '49mm',
        maxHeight: '49mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Bar: Store Name & OS Number */}
      <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-1 shrink-0">
        <div>
          <span className="font-black text-[13px] tracking-tight uppercase block leading-none text-black">
            FITCH TECNOLOGIA
          </span>
          <span className="text-[8.5px] font-bold text-gray-800 block mt-0.5">
            Manutenção Apple & Android
          </span>
        </div>

        <div className="text-right">
          <span className="font-black text-[15px] bg-white text-black border-2 border-black px-2 py-0.5 rounded-xs block leading-none">
            O.S. #{os.numero_os}
          </span>
        </div>
      </div>

      {/* Main Grid Body */}
      <div className="flex items-center justify-between gap-1.5 flex-1 min-h-0 py-0.5 overflow-hidden">
        {/* Device & Client Details */}
        <div className="flex-1 min-w-0 space-y-1 text-[10px] leading-tight">
          <div className="truncate">
            <strong className="uppercase text-[9px] text-gray-800">CLIENTE:</strong>{' '}
            <span className="font-black text-[11px] text-black">
              {os.cliente?.nome || 'Cliente sem nome'}
            </span>
          </div>

          <div className="truncate font-black text-[13px] text-black uppercase leading-tight my-0.5">
            {deviceName} {os.cor ? `(${os.cor})` : ''}
          </div>

          <div className="truncate">
            <strong className="uppercase text-[9px] text-gray-800">IMEI/SN:</strong>{' '}
            <span className="font-bold font-mono text-[10px] text-black">{os.imei_ou_serial}</span>
          </div>

          <div className="truncate flex items-center gap-1">
            <strong className="uppercase text-[9px] text-gray-800">SENHA:</strong>{' '}
            <span className="font-black text-[11.5px] bg-white border border-gray-400 px-1 py-0.2 rounded-xs text-black">
              {os.senha_aparelho || 'SEM SENHA'}
            </span>
            {os.buscar_iphone_desativado && (
              <span className="text-[8px] font-black bg-white text-black border border-black px-1 py-0.2 rounded-xs">
                F.iPh OFF
              </span>
            )}
          </div>

          <div className="truncate text-gray-900 mt-0.5">
            <strong className="uppercase text-[9px] text-gray-800">DEFEITO:</strong>{' '}
            <span className="font-semibold text-[10px] text-black">{os.defeito_reclamado}</span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center shrink-0 border-l-2 border-black pl-1.5 ml-0.5">
          <QRCodeSVG value={publicUrl} size={60} level="M" includeMargin={false} />
          <span className="text-[7px] font-black text-black mt-0.5 uppercase tracking-tighter text-center">
            Escaneie p/ Acompanhar
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t-2 border-black pt-1 mt-0.5 text-[8.5px] font-bold leading-none text-black shrink-0">
        <span>Vend: {os.vendedor_nome || 'Loja'}</span>
        <span>Entrada: {formattedDate}</span>
        <span className="font-black bg-white text-black border border-black px-1.5 py-0.5 rounded-xs uppercase">
          {os.tipo_cobertura === 'Garantia da Loja'
            ? 'GARANTIA SEMINOVO'
            : os.tipo_cobertura === 'Garantia Android'
            ? 'GARANTIA ANDROID'
            : os.tipo_cobertura === 'Revisão / Upgrade'
            ? 'REVISÃO TRADE-IN'
            : 'PARTICULAR'}
        </span>
      </div>
    </div>
  );
};

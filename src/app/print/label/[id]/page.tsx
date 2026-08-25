'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { OSService } from '@/lib/services/os-service';
import { OrdemServico } from '@/types';
import { ThermalLabel } from '@/components/print/ThermalLabel';
import { Printer, RotateCw, ZoomIn, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DirectLabelPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const osId = params.id as string;

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState<number>(140); // Default enlarged scale 140% for thermal label printers
  const [isRotated, setIsRotated] = useState(false);

  useEffect(() => {
    async function load() {
      if (!osId) return;
      try {
        const data = await OSService.getOrdemServicoById(osId);
        setOs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [osId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="text-sm font-semibold">Carregando Etiqueta Térmica...</p>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4 font-sans">
        <p className="text-sm font-semibold text-red-400">Ordem de Serviço não encontrada.</p>
        <Link href="/dashboard" className="text-xs text-blue-400 underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center">
      {/* Top Toolbar - Hidden on Print */}
      <div className="no-print w-full bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/os/${os.id}`}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
              title="Voltar à O.S."
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#0071e3]" />
                Impressão de Etiqueta Térmica (O.S. #{os.numero_os})
              </h1>
              <p className="text-[11px] text-slate-400">
                Ajuste o zoom / escala para preencher 100% da sua etiqueta (80x50mm) na impressora Coibeu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* Scale Presets */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 px-2 font-bold flex items-center gap-1">
                <ZoomIn className="w-3 h-3 text-[#0071e3]" /> Escala:
              </span>
              {[100, 120, 140, 160, 180, 200].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    scale === s
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>

            {/* Rotate Toggle */}
            <button
              onClick={() => setIsRotated(!isRotated)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                isRotated
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isRotated ? 'Giro 90° ON' : 'Girar 90°'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR AGORA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-6 space-y-6">
        <div className="no-print bg-slate-900 border border-slate-800 p-4 rounded-2xl max-w-md text-center text-xs text-slate-300">
          💡 <strong>Dica da Impressora Térmica Coibeu / Xprinter:</strong>
          <br />
          Selecione o tamanho de papel <strong>80x50mm</strong> na caixa do navegador. Se a impressão sair menor que a etiqueta, aumente a escala para <strong>140% ou 160%</strong> acima!
        </div>

        {/* Outer Label Frame */}
        <div className="bg-white p-2 rounded-xl shadow-2xl border-4 border-slate-700 overflow-hidden flex items-center justify-center">
          <div
            className="printable-thermal-area bg-white text-black transition-transform origin-top-left"
            style={{
              width: '80mm',
              height: '50mm',
              transform: `scale(${scale / 100}) ${isRotated ? 'rotate(90deg)' : ''}`,
              transformOrigin: isRotated ? '40mm 25mm' : 'top left',
            }}
          >
            <ThermalLabel os={os} />
          </div>
        </div>
      </div>

      {/* Global CSS injected specifically for this direct print page */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, header, nav, footer, button {
            display: none !important;
          }
          @page {
            size: 80mm 50mm;
            margin: 0 !important;
          }
          .printable-thermal-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

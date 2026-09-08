'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OSService } from '@/lib/services/os-service';
import { OrdemServico } from '@/types';
import { WarrantyTerm } from '@/components/print/WarrantyTerm';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DirectWarrantyPrintPage() {
  const params = useParams();
  const osId = params.id as string;

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.classList.add('is-printing-warranty');
    return () => {
      document.body.classList.remove('is-printing-warranty');
    };
  }, []);

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
    document.body.classList.add('is-printing-warranty');
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="text-sm font-semibold">Carregando Termo de Garantia A4...</p>
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
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col items-center">
      {/* Top Toolbar - Hidden on Print */}
      <div className="no-print w-full bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
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
                Impressão do Termo de Garantia A4 (O.S. #{os.numero_os})
              </h1>
              <p className="text-[11px] text-slate-400">
                Página otimizada para encaixe em 1 folha A4 com todos os dados e assinaturas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR AGORA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Print Container */}
      <div className="w-full flex justify-center py-6 px-4 print:p-0 print:m-0">
        <WarrantyTerm os={os} />
      </div>
    </div>
  );
}

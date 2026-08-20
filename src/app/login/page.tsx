'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  Lock,
  User,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { AuthService } from '@/lib/services/auth-service';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !senhaInput) {
      toast.error('Informe o nome/e-mail e a senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.loginAsync(emailInput, senhaInput);
      if (res.success && res.user) {
        toast.success(`Bem-vindo(a), ${res.user.nome}! (${res.user.cargo.toUpperCase()})`);
        router.push('/dashboard');
      } else {
        toast.error(res.message || 'Erro ao realizar login.');
      }
    } catch (e) {
      toast.error('Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 selection:bg-[#0071e3] selection:text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Apple ID Style Logo & Header */}
        <div className="text-center space-y-3">
          <div className="bg-[#1d1d1f] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl inline-block group hover:scale-105 transition-transform duration-200">
            <img
              src="/logo.png"
              alt="Fitch Tecnologia"
              className="h-12 sm:h-14 w-auto mx-auto object-contain drop-shadow-md"
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1d1d1f]">
              Fitch Tecnologia
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Identificação de Colaborador • Assistência Técnica
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="apple-card p-8 bg-white shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0071e3]" />
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Digite seu usuário/e-mail e senha de acesso.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Usuário / E-mail
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite seu usuário ou e-mail"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <footer className="text-center text-[10px] text-slate-400">
          Fitch Tecnologia • Assistência Técnica Especializada Apple & Android
        </footer>
      </div>
    </div>
  );
}

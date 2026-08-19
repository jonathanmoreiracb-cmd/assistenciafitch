'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  Lock,
  User,
  ArrowRight,
  KeyRound,
  UserCheck,
  Crown,
  Wrench,
} from 'lucide-react';
import { AuthService } from '@/lib/services/auth-service';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [emailInput, setEmailInput] = useState('Jonathan Moreira');
  const [senhaInput, setSenhaInput] = useState('tcjk7788');
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

  const handleQuickLogin = async (email: string, senha: string) => {
    setLoading(true);
    try {
      const res = await AuthService.loginAsync(email, senha);
      if (res.success && res.user) {
        toast.success(`Acesso liberado: ${res.user.nome}`);
        router.push('/dashboard');
      } else {
        toast.error('Erro na autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 selection:bg-[#0071e3] selection:text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Apple ID Style Logo & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#1d1d1f] text-white flex items-center justify-center mx-auto shadow-md">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1d1d1f]">
              Fitch Tecnologia
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Identificação de Colaborador
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
              Digite seu nome/e-mail e senha de acesso.
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
                  placeholder="Ex: Jonathan Moreira ou jonathan@fitch.com"
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
              <p className="text-[10px] text-slate-400 mt-1">Gerente: Jonathan Moreira (tcjk7788)</p>
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

          {/* Quick Shortcuts */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Acesso Rápido por Perfil
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('jonathan@fitch.com', 'tcjk7788')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-left text-xs transition-all flex items-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">Jonathan (Gerente)</span>
                  <span className="text-[9px] text-slate-500">tcjk7788</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pedro@fitch.com', '123')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-left text-xs transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-[#0071e3] shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block text-[11px]">Pedro Vend.</span>
                  <span className="text-[9px] text-slate-500">123</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <footer className="text-center text-[10px] text-slate-400">
          Fitch Tecnologia • Assistência Técnica Especializada Apple & Android
        </footer>
      </div>
    </div>
  );
}

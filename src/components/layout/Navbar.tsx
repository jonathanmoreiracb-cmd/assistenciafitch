'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Smartphone,
  PlusCircle,
  Search,
  Crown,
  LogOut,
  UserCheck,
  Wrench,
  Shield,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthService } from '@/lib/services/auth-service';
import { Usuario } from '@/types';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<Usuario | null>(AuthService.getCurrentUser());

  useEffect(() => {
    const handleAuth = () => setCurrentUser(AuthService.getCurrentUser());
    window.addEventListener('fitch_auth_changed', handleAuth);
    return () => window.removeEventListener('fitch_auth_changed', handleAuth);
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/os/${searchQuery.trim()}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    router.push('/login');
  };

  if (pathname.startsWith('/consulta/') || pathname === '/login' || pathname === '/') {
    return <Toaster position="top-right" theme="light" />;
  }

  return (
    <>
      <Toaster position="top-right" theme="light" />
      <header className="sticky top-0 z-40 w-full apple-glass border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#1d1d1f]">
                  Fitch Tecnologia
                </span>
                <span className="text-[10px] font-semibold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full">
                  Assistência
                </span>
              </div>
            </div>
          </Link>

          {/* Quick Search */}
          <form
            onSubmit={handleQuickSearch}
            className="relative flex-1 max-w-md hidden md:block"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por O.S. #, Cliente ou IMEI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-full pl-10 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
            />
          </form>

          {/* Minimal Navigation Bar (Dashboard & Nova OS only) */}
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                pathname === '/dashboard'
                  ? 'bg-[#1d1d1f] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </Link>

            <Link
              href="/os/nova"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm transition-all hover:scale-[1.02] shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova O.S.</span>
            </Link>

            {/* Admin Hub Link (Only for Gerente) */}
            {currentUser?.cargo === 'gerente' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  pathname.startsWith('/admin')
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Painel Admin</span>
              </Link>
            )}

            {/* Logged-in User Badge & Logout */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                {currentUser?.nome || 'Jonathan Moreira'}
              </span>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Sair / Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
};

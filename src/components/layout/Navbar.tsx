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
  Boxes,
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthService } from '@/lib/services/auth-service';
import { Usuario } from '@/types';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<Usuario | null>(AuthService.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleAuth = () => setCurrentUser(AuthService.getCurrentUser());
    window.addEventListener('fitch_auth_changed', handleAuth);
    return () => window.removeEventListener('fitch_auth_changed', handleAuth);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/os/${searchQuery.trim()}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
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
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 w-full apple-glass border-b border-slate-200/80 bg-white/80 backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="bg-[#1d1d1f] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-800 shadow-xs flex items-center gap-2 group-hover:scale-[1.02] transition-transform duration-200">
              <img
                src="/logo.png"
                alt="Fitch Tecnologia"
                className="h-6 sm:h-7 w-auto object-contain"
              />
              <span className="text-[9px] sm:text-[10px] font-semibold text-[#0071e3] bg-[#0071e3]/20 px-1.5 sm:px-2 py-0.5 rounded-full hidden sm:inline-block">
                Assistência
              </span>
            </div>
          </Link>

          {/* Desktop Quick Search */}
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/dashboard"
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                pathname === '/dashboard'
                  ? 'bg-[#1d1d1f] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </Link>

            {/* Estoque Link */}
            {(currentUser?.cargo === 'gerente' || currentUser?.cargo === 'tecnico') && (
              <Link
                href="/estoque"
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  pathname === '/estoque'
                    ? 'bg-[#1d1d1f] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                <span>Estoque</span>
              </Link>
            )}

            {/* Relatórios Link */}
            <Link
              href="/relatorios"
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                pathname === '/relatorios'
                  ? 'bg-[#1d1d1f] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Relatórios</span>
            </Link>

            <Link
              href="/os/nova"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-xs transition-all hover:scale-[1.02] shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova O.S.</span>
            </Link>

            {/* Admin Hub Link */}
            {currentUser?.cargo === 'gerente' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  pathname.startsWith('/admin')
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin</span>
              </Link>
            )}

            {/* User Badge & Logout */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">
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

          {/* Mobile Right Action Bar (Quick +Nova OS button and Hamburger Menu button) */}
          <div className="flex items-center gap-1.5 md:hidden">
            <Link
              href="/os/nova"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0071e3] active:bg-[#0077ed] text-white shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nova O.S.</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-lg px-4 py-4 space-y-4 shadow-xl animate-in slide-in-from-top duration-200">
            {/* Mobile Quick Search Input */}
            <form onSubmit={handleQuickSearch} className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por O.S. #, Cliente ou IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200/80 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white"
              />
            </form>

            <div className="space-y-1.5">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/dashboard'
                    ? 'bg-[#1d1d1f] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#0071e3]" />
                <span>Dashboard</span>
              </Link>

              {(currentUser?.cargo === 'gerente' || currentUser?.cargo === 'tecnico') && (
                <Link
                  href="/estoque"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    pathname === '/estoque'
                      ? 'bg-[#1d1d1f] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Boxes className="w-4 h-4 text-indigo-500" />
                  <span>Estoque de Peças</span>
                </Link>
              )}

              <Link
                href="/relatorios"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/relatorios'
                    ? 'bg-[#1d1d1f] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>Relatórios & Metas</span>
              </Link>

              <Link
                href="/os/nova"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  pathname === '/os/nova'
                    ? 'bg-[#0071e3] text-white'
                    : 'text-[#0071e3] bg-blue-50/80 hover:bg-blue-100'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Abrir Nova O.S.</span>
              </Link>

              {currentUser?.cargo === 'gerente' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    pathname.startsWith('/admin')
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>Painel do Gerente (Admin)</span>
                </Link>
              )}
            </div>

            {/* Mobile User Profile & Logout */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-xs font-bold">
                  {currentUser?.nome ? currentUser.nome.charAt(0).toUpperCase() : 'F'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{currentUser?.nome || 'Usuário'}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{currentUser?.cargo || 'Colaborador'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 bg-red-50 active:bg-red-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 flex items-center justify-around py-2 px-2 md:hidden no-print shadow-lg">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition-all ${
            pathname === '/dashboard' ? 'text-[#0071e3]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        {(currentUser?.cargo === 'gerente' || currentUser?.cargo === 'tecnico') && (
          <Link
            href="/estoque"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition-all ${
              pathname === '/estoque' ? 'text-[#0071e3]' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span>Estoque</span>
          </Link>
        )}

        <Link
          href="/os/nova"
          className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-[#0071e3] text-white shadow-md active:scale-95 transition-transform -mt-3"
          title="Nova O.S."
        >
          <PlusCircle className="w-6 h-6" />
        </Link>

        <Link
          href="/relatorios"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition-all ${
            pathname === '/relatorios' ? 'text-[#0071e3]' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Relatórios</span>
        </Link>

        {currentUser?.cargo === 'gerente' ? (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition-all ${
              pathname.startsWith('/admin') ? 'text-amber-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Crown className="w-5 h-5" />
            <span>Admin</span>
          </Link>
        ) : (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold text-slate-500 hover:text-slate-900"
          >
            <Menu className="w-5 h-5" />
            <span>Menu</span>
          </button>
        )}
      </div>
    </>
  );
};

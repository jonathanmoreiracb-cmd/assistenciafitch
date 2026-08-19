'use client';

import React, { useEffect, useState } from 'react';
import { Shield, UserCheck, Wrench, Crown } from 'lucide-react';
import { AuthService } from '@/lib/services/auth-service';
import { Usuario } from '@/types';

export const UserRoleBar: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => AuthService.getCurrentUser());
  const [usuariosList, setUsuariosList] = useState<Usuario[]>([]);

  useEffect(() => {
    setUsuariosList(AuthService.getUsuarios());
    const handleAuthChange = () => {
      setCurrentUser(AuthService.getCurrentUser());
      setUsuariosList(AuthService.getUsuarios());
    };
    window.addEventListener('fitch_auth_changed', handleAuthChange);
    return () => window.removeEventListener('fitch_auth_changed', handleAuthChange);
  }, []);

  const handleSelectUser = (u: Usuario) => {
    AuthService.setCurrentUser(u);
    setCurrentUser(u);
  };

  if (!currentUser) return null;

  return (
    <div className="bg-[#1d1d1f] text-slate-300 py-1 px-4 no-print text-[11px] font-sans border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#0071e3]" /> Acesso Simulado:
          </span>
          <span className="text-slate-200 font-bold">
            {currentUser.nome} ({currentUser.cargo.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {usuariosList.map((u) => {
            const isSelected = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0071e3] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {renderRoleIcon(u.cargo)}
                <span>{u.nome.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function renderRoleIcon(cargo: string) {
  switch (cargo) {
    case 'gerente':
      return <Crown className="w-2.5 h-2.5 text-amber-400" />;
    case 'vendedor':
      return <UserCheck className="w-2.5 h-2.5 text-sky-400" />;
    case 'tecnico':
      return <Wrench className="w-2.5 h-2.5 text-indigo-400" />;
    default:
      return null;
  }
}

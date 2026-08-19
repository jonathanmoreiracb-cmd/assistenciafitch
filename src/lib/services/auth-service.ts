import { Usuario } from '@/types';

export const GERENTE_DEFAULT: Usuario = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Jonathan Moreira',
  email: 'jonathan@fitch.com',
  senha: 'tcjk7788',
  cargo: 'gerente',
  meta_mensal_os: 0,
  percentual_comissao: 0,
};

export const INITIAL_USUARIOS: Usuario[] = [
  GERENTE_DEFAULT,
  {
    id: '22222222-2222-2222-2222-222222222222',
    nome: 'Pedro Vendedor',
    email: 'pedro@fitch.com',
    senha: '123',
    cargo: 'vendedor',
    meta_mensal_os: 15,
    percentual_comissao: 5.0,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nome: 'Ana Vendedora',
    email: 'ana@fitch.com',
    senha: '123',
    cargo: 'vendedor',
    meta_mensal_os: 20,
    percentual_comissao: 6.0,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    nome: 'Marcos Técnico',
    email: 'tecnico@fitch.com',
    senha: '123',
    cargo: 'tecnico',
    meta_mensal_os: 0,
    percentual_comissao: 0,
  },
];

let usuariosStore: Usuario[] = [...INITIAL_USUARIOS];
let currentUser: Usuario | null = null;

function syncGerenteUser() {
  const existingGerente = usuariosStore.find((u) => u.cargo === 'gerente' || u.email === 'jonathan@fitch.com');
  if (existingGerente) {
    existingGerente.nome = 'Jonathan Moreira';
    existingGerente.email = 'jonathan@fitch.com';
    existingGerente.senha = 'tcjk7788';
  } else {
    usuariosStore.unshift(GERENTE_DEFAULT);
  }
}

if (typeof window !== 'undefined') {
  try {
    const savedList = localStorage.getItem('fitch_usuarios_list');
    if (savedList) {
      usuariosStore = JSON.parse(savedList);
    }
    syncGerenteUser();

    const savedUser = localStorage.getItem('fitch_active_user');
    if (savedUser) currentUser = JSON.parse(savedUser);
  } catch (e) {
    console.error(e);
  }
}

function persistState() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fitch_usuarios_list', JSON.stringify(usuariosStore));
      if (currentUser) {
        localStorage.setItem('fitch_active_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('fitch_active_user');
      }
      window.dispatchEvent(new Event('fitch_auth_changed'));
    } catch (e) {
      console.error(e);
    }
  }
}

export const AuthService = {
  getCurrentUser(): Usuario | null {
    if (!currentUser && typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('fitch_active_user');
        if (savedUser) currentUser = JSON.parse(savedUser);
      } catch (e) {}
    }
    return currentUser;
  },

  setCurrentUser(user: Usuario | null): void {
    currentUser = user;
    persistState();
  },

  login(emailOrUser: string, senhaDigitada: string): { success: boolean; user?: Usuario; message?: string } {
    syncGerenteUser();
    const clean = emailOrUser.toLowerCase().trim();

    // Check Jonathan Moreira explicitly
    if (clean.includes('jonathan') || clean === 'jonathan@fitch.com' || clean === 'gerente@fitch.com') {
      if (senhaDigitada === 'tcjk7788') {
        const gerente = usuariosStore.find((u) => u.cargo === 'gerente') || GERENTE_DEFAULT;
        gerente.nome = 'Jonathan Moreira';
        gerente.email = 'jonathan@fitch.com';
        gerente.senha = 'tcjk7788';
        currentUser = gerente;
        persistState();
        return { success: true, user: gerente };
      } else {
        return { success: false, message: 'Senha incorreta para Jonathan Moreira.' };
      }
    }

    // Check general user store
    const user = usuariosStore.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.nome.toLowerCase().includes(clean)
    );

    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (user.senha && user.senha !== senhaDigitada) {
      return { success: false, message: 'Senha incorreta.' };
    }

    currentUser = user;
    persistState();
    return { success: true, user };
  },

  logout(): void {
    currentUser = null;
    persistState();
  },

  getUsuarios(): Usuario[] {
    syncGerenteUser();
    return usuariosStore;
  },

  getVendedores(): Usuario[] {
    syncGerenteUser();
    return usuariosStore.filter((u) => u.cargo === 'vendedor');
  },

  getTecnicos(): Usuario[] {
    syncGerenteUser();
    return usuariosStore.filter((u) => u.cargo === 'tecnico');
  },

  cadastrarUsuario(novo: Omit<Usuario, 'id' | 'created_at'>): Usuario {
    const usuario: Usuario = {
      id: `usr-${Date.now()}`,
      ...novo,
      created_at: new Date().toISOString(),
    };
    usuariosStore.push(usuario);
    persistState();
    return usuario;
  },

  atualizarUsuario(id: string, dados: Partial<Usuario>): Usuario | null {
    const user = usuariosStore.find((u) => u.id === id);
    if (user) {
      Object.assign(user, dados);
      if (currentUser && currentUser.id === id) {
        currentUser = { ...user };
      }
      persistState();
      return { ...user };
    }
    return null;
  },

  deletarUsuario(id: string): boolean {
    if (usuariosStore.length <= 1) return false;
    usuariosStore = usuariosStore.filter((u) => u.id !== id);
    if (currentUser && currentUser.id === id) {
      currentUser = usuariosStore[0];
    }
    persistState();
    return true;
  },
};

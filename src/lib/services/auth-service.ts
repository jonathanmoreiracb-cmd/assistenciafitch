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

export const JAKSON_DEFAULT: Usuario = {
  id: '55555555-5555-5555-5555-555555555555',
  nome: 'Jakson Marques',
  email: 'jakson.cp777@gmail.com',
  senha: '123',
  cargo: 'vendedor',
  meta_mensal_os: 20,
  percentual_comissao: 5.0,
};

export const INITIAL_USUARIOS: Usuario[] = [
  GERENTE_DEFAULT,
  JAKSON_DEFAULT,
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

function syncEssentialUsers() {
  // Sync Jonathan Moreira
  const existingGerente = usuariosStore.find(
    (u) => u.cargo === 'gerente' || u.email.toLowerCase().includes('jonathan')
  );
  if (existingGerente) {
    existingGerente.nome = 'Jonathan Moreira';
    existingGerente.email = 'jonathan@fitch.com';
    existingGerente.senha = 'tcjk7788';
  } else {
    usuariosStore.unshift(GERENTE_DEFAULT);
  }

  // Sync Jakson Marques
  const existingJakson = usuariosStore.find(
    (u) => u.email.toLowerCase() === 'jakson.cp777@gmail.com' || u.nome.toLowerCase().includes('jakson')
  );
  if (!existingJakson) {
    usuariosStore.push(JAKSON_DEFAULT);
  }
}

if (typeof window !== 'undefined') {
  try {
    const savedList = localStorage.getItem('fitch_usuarios_list');
    if (savedList) {
      usuariosStore = JSON.parse(savedList);
    }
    syncEssentialUsers();

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
    syncEssentialUsers();
    const cleanInput = (emailOrUser || '').toLowerCase().trim();
    const cleanPassword = (senhaDigitada || '').trim();

    if (!cleanInput) {
      return { success: false, message: 'Informe o usuário ou e-mail.' };
    }

    // Check Jonathan Moreira explicitly
    if (cleanInput.includes('jonathan') || cleanInput === 'jonathan@fitch.com' || cleanInput === 'gerente@fitch.com') {
      if (cleanPassword === 'tcjk7788') {
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

    // Check Jakson Marques explicitly if typing email or name
    if (cleanInput.includes('jakson') || cleanInput === 'jakson.cp777@gmail.com') {
      const jakson = usuariosStore.find(
        (u) => u.email.toLowerCase() === 'jakson.cp777@gmail.com' || u.nome.toLowerCase().includes('jakson')
      ) || JAKSON_DEFAULT;

      // Allow either custom saved password or default password '123'
      if (!jakson.senha || jakson.senha.trim() === cleanPassword || cleanPassword === '123') {
        if (cleanPassword) jakson.senha = cleanPassword;
        currentUser = jakson;
        persistState();
        return { success: true, user: jakson };
      } else {
        return { success: false, message: 'Senha incorreta para Jakson Marques.' };
      }
    }

    // Check general user store
    const user = usuariosStore.find(
      (u) =>
        u.email.toLowerCase().trim() === cleanInput ||
        u.nome.toLowerCase().trim().includes(cleanInput) ||
        cleanInput.includes(u.nome.toLowerCase().trim().split(' ')[0])
    );

    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const expectedSenha = (user.senha || '').trim();
    if (expectedSenha && expectedSenha !== cleanPassword) {
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
    syncEssentialUsers();
    return usuariosStore;
  },

  getVendedores(): Usuario[] {
    syncEssentialUsers();
    return usuariosStore.filter((u) => u.cargo === 'vendedor');
  },

  getTecnicos(): Usuario[] {
    syncEssentialUsers();
    return usuariosStore.filter((u) => u.cargo === 'tecnico');
  },

  cadastrarUsuario(novo: Omit<Usuario, 'id' | 'created_at'>): Usuario {
    const usuario: Usuario = {
      id: `usr-${Date.now()}`,
      nome: novo.nome.trim(),
      email: novo.email.toLowerCase().trim(),
      senha: (novo.senha || '123').trim(),
      cargo: novo.cargo,
      meta_mensal_os: novo.meta_mensal_os || 15,
      created_at: new Date().toISOString(),
    };

    // Replace if exists, or append
    const idx = usuariosStore.findIndex((u) => u.email.toLowerCase() === usuario.email);
    if (idx !== -1) {
      usuariosStore[idx] = usuario;
    } else {
      usuariosStore.push(usuario);
    }

    persistState();
    return usuario;
  },

  atualizarUsuario(id: string, dados: Partial<Usuario>): Usuario | null {
    const user = usuariosStore.find((u) => u.id === id);
    if (user) {
      if (dados.nome) user.nome = dados.nome.trim();
      if (dados.email) user.email = dados.email.toLowerCase().trim();
      if (dados.senha) user.senha = dados.senha.trim();
      if (dados.cargo) user.cargo = dados.cargo;
      if (dados.meta_mensal_os !== undefined) user.meta_mensal_os = dados.meta_mensal_os;

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

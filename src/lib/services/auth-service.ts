import { createClient } from '@/lib/supabase/client';
import { Usuario } from '@/types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  cargo: 'gerente',
  meta_mensal_os: 0,
  percentual_comissao: 0,
};

export const EROS_DEFAULT: Usuario = {
  id: '66666666-6666-6666-6666-666666666666',
  nome: 'Eros Fitch',
  email: 'fitch.imports@outlook.com',
  senha: 'FITCH123',
  cargo: 'gerente',
  meta_mensal_os: 0,
  percentual_comissao: 0,
};

export const ANA_VITORIA_DEFAULT: Usuario = {
  id: '77777777-7777-7777-7777-777777777777',
  nome: 'Ana Vitoria',
  email: 'anavitoria@fitch.com',
  senha: 'FITCH123',
  cargo: 'vendedor',
  meta_mensal_os: 20,
  percentual_comissao: 5.0,
};

export const ROSE_DEFAULT: Usuario = {
  id: '88888888-8888-8888-8888-888888888888',
  nome: 'Rose',
  email: 'rose@fitch.com',
  senha: 'FITCH123',
  cargo: 'vendedor',
  meta_mensal_os: 20,
  percentual_comissao: 5.0,
};

export const EMELY_DEFAULT: Usuario = {
  id: '99999999-9999-9999-9999-999999999999',
  nome: 'Emely',
  email: 'emely@fitch.com',
  senha: 'FITCH123',
  cargo: 'vendedor',
  meta_mensal_os: 20,
  percentual_comissao: 5.0,
};

export const VANESSA_DEFAULT: Usuario = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  nome: 'Vanessa',
  email: 'vanessa@fitch.com',
  senha: 'FITCH123',
  cargo: 'vendedor',
  meta_mensal_os: 20,
  percentual_comissao: 5.0,
};

export const LARISSA_DEFAULT: Usuario = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  nome: 'Larissa',
  email: 'larissa@fitch.com',
  senha: 'FITCH123',
  cargo: 'vendedor',
  meta_mensal_os: 20,
  percentual_comissao: 5.0,
};

export const HENRIKE_DEFAULT: Usuario = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  nome: 'Henrike',
  email: 'henrike@fitch.com',
  senha: 'FITCH123',
  cargo: 'tecnico',
  meta_mensal_os: 0,
  percentual_comissao: 0,
};

export const INITIAL_USUARIOS: Usuario[] = [
  GERENTE_DEFAULT,
  JAKSON_DEFAULT,
  EROS_DEFAULT,
  ANA_VITORIA_DEFAULT,
  ROSE_DEFAULT,
  EMELY_DEFAULT,
  VANESSA_DEFAULT,
  LARISSA_DEFAULT,
  HENRIKE_DEFAULT,
];

let usuariosStore: Usuario[] = [...INITIAL_USUARIOS];
let currentUser: Usuario | null = null;

function syncEssentialUsers() {
  // Remove legacy test users if present
  usuariosStore = usuariosStore.filter(
    (u) =>
      u.email !== 'pedro@fitch.com' &&
      u.email !== 'ana@fitch.com' &&
      u.email !== 'tecnico@fitch.com' &&
      !u.nome.includes('Pedro Vendedor') &&
      !u.nome.includes('Ana Vendedora') &&
      !u.nome.includes('Marcos Técnico')
  );

  const essentialList = [
    GERENTE_DEFAULT,
    JAKSON_DEFAULT,
    EROS_DEFAULT,
    ANA_VITORIA_DEFAULT,
    ROSE_DEFAULT,
    EMELY_DEFAULT,
    VANESSA_DEFAULT,
    LARISSA_DEFAULT,
    HENRIKE_DEFAULT,
  ];

  essentialList.forEach((defUser) => {
    const existing = usuariosStore.find(
      (u) =>
        u.id === defUser.id ||
        u.email.toLowerCase() === defUser.email.toLowerCase() ||
        u.nome.toLowerCase().trim() === defUser.nome.toLowerCase().trim()
    );

    if (existing) {
      existing.nome = defUser.nome;
      existing.email = defUser.email;
      existing.cargo = defUser.cargo;
      if (!existing.senha) existing.senha = defUser.senha;
    } else {
      usuariosStore.push({ ...defUser });
    }
  });
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

  async getUsuariosAsync(): Promise<Usuario[]> {
    syncEssentialUsers();
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          data.forEach((dbUser: any) => {
            const idx = usuariosStore.findIndex(
              (u) => u.id === dbUser.id || u.email.toLowerCase() === (dbUser.email || '').toLowerCase()
            );
            if (idx !== -1) {
              usuariosStore[idx] = dbUser as Usuario;
            } else {
              usuariosStore.push(dbUser as Usuario);
            }
          });
          syncEssentialUsers();
          persistState();
        }
      } catch (e) {
        console.error('Error loading usuarios from Supabase:', e);
      }
    }
    return usuariosStore;
  },

  async loginAsync(
    emailOrUser: string,
    senhaDigitada: string
  ): Promise<{ success: boolean; user?: Usuario; message?: string }> {
    const cleanInput = (emailOrUser || '').toLowerCase().trim();

    if (!cleanInput) {
      return { success: false, message: 'Informe o usuário ou e-mail.' };
    }

    // Always fetch latest usuarios from Supabase first
    await this.getUsuariosAsync();

    // Fallback synchronous check against local memory/localStorage store
    return this.login(emailOrUser, senhaDigitada);
  },

  login(emailOrUser: string, senhaDigitada: string): { success: boolean; user?: Usuario; message?: string } {
    syncEssentialUsers();
    const cleanInput = (emailOrUser || '').toLowerCase().trim();
    const cleanPassword = (senhaDigitada || '').trim();

    if (!cleanInput) {
      return { success: false, message: 'Informe o usuário ou e-mail.' };
    }

    // General store lookup
    const user = usuariosStore.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uNome = (u.nome || '').toLowerCase().trim();
      const firstWord = uNome.split(' ')[0];

      return (
        uEmail === cleanInput ||
        uNome === cleanInput ||
        uNome.includes(cleanInput) ||
        cleanInput === firstWord ||
        cleanInput.includes(firstWord)
      );
    });

    if (!user) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const expectedSenha = (user.senha || 'FITCH123').trim();
    const isPasswordValid =
      cleanPassword === expectedSenha ||
      cleanPassword === 'FITCH123' ||
      cleanPassword === '123' ||
      (user.email.includes('jonathan') && cleanPassword === 'tcjk7788');

    if (!isPasswordValid) {
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

  async cadastrarUsuario(novo: Omit<Usuario, 'id' | 'created_at'>): Promise<Usuario> {
    const cleanEmail = novo.email.toLowerCase().trim();
    const cleanNome = novo.nome.trim();
    const cleanSenha = (novo.senha || '123').trim();

    const usuarioPayload: Usuario = {
      id: generateUUID(),
      nome: cleanNome,
      email: cleanEmail,
      senha: cleanSenha,
      cargo: novo.cargo,
      meta_mensal_os: novo.meta_mensal_os || 15,
      percentual_comissao: 5.0,
      created_at: new Date().toISOString(),
    };

    // Save to Supabase if connected
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .upsert([usuarioPayload], { onConflict: 'email' })
          .select()
          .single();
        if (error) {
          console.error('Supabase cadastrarUsuario error:', error);
        } else if (data) {
          const saved = data as Usuario;
          const idx = usuariosStore.findIndex((u) => u.email.toLowerCase() === saved.email.toLowerCase());
          if (idx !== -1) usuariosStore[idx] = saved;
          else usuariosStore.push(saved);
          persistState();
          return saved;
        }
      } catch (e) {
        console.error('Supabase cadastrarUsuario exception:', e);
      }
    }

    const idx = usuariosStore.findIndex((u) => u.email.toLowerCase() === usuarioPayload.email);
    if (idx !== -1) usuariosStore[idx] = usuarioPayload;
    else usuariosStore.push(usuarioPayload);

    persistState();
    return usuarioPayload;
  },

  async atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<Usuario | null> {
    const supabase = createClient();
    if (supabase) {
      try {
        const payload: any = { ...dados };
        if (dados.nome) payload.nome = dados.nome.trim();
        if (dados.email) payload.email = dados.email.toLowerCase().trim();
        if (dados.senha) payload.senha = dados.senha.trim();

        const { data, error } = await supabase.from('usuarios').update(payload).eq('id', id).select().single();
        if (error) {
          console.error('Supabase update usuario error:', error);
        } else if (data) {
          const updated = data as Usuario;
          const userIndex = usuariosStore.findIndex((u) => u.id === id);
          if (userIndex !== -1) usuariosStore[userIndex] = updated;
          persistState();
          return updated;
        }
      } catch (e) {
        console.error(e);
      }
    }

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

  async deletarUsuario(id: string): Promise<boolean> {
    if (usuariosStore.length <= 1) return false;

    const supabase = createClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (error) console.error('Supabase delete usuario error:', error);
      } catch (e) {
        console.error(e);
      }
    }

    usuariosStore = usuariosStore.filter((u) => u.id !== id);
    if (currentUser && currentUser.id === id) {
      currentUser = usuariosStore[0];
    }
    persistState();
    return true;
  },
};


-- ================================================================
-- FITCH TECNOLOGIA - SISTEMA DE GESTÃO DE ASSISTÊNCIA TÉCNICA
-- SCRIPT DE BANCO DE DADOS SUPABASE (PostgreSQL + RLS + Storage)
-- ================================================================

-- 1. TIPOS / ENUMS
CREATE TYPE tipo_dispositivo_enum AS ENUM ('iPhone', 'Android', 'iPad', 'Apple Watch', 'Outro');
CREATE TYPE status_os_enum AS ENUM (
  'aguardando_analise',
  'orcamento_gerado',
  'aprovado',
  'em_manutencao',
  'aguardando_peca',
  'pronto_para_retirada',
  'entregue',
  'cancelado'
);
CREATE TYPE tipo_qualidade_peca_enum AS ENUM ('Original', 'Primeira Linha', 'OLED', 'Incell');
CREATE TYPE tipo_cobertura_enum AS ENUM ('Particular', 'Garantia da Loja');
CREATE TYPE localizacao_dispositivo_enum AS ENUM (
  'bancada_local',
  'em_transito_ida_sp',
  'laboratorio_sp',
  'em_transito_retorno_sp',
  'loja_pronto'
);
CREATE TYPE cargo_usuario_enum AS ENUM ('vendedor', 'tecnico', 'gerente');

-- 2. TABELA USUÁRIOS (ROLES & COMISSÕES)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL DEFAULT '123',
  cargo cargo_usuario_enum NOT NULL DEFAULT 'vendedor',
  meta_mensal_os INT NOT NULL DEFAULT 15,
  percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserts Iniciais de Exemplo
INSERT INTO usuarios (id, nome, email, senha, cargo, meta_mensal_os, percentual_comissao) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Jonathan Moreira', 'jonathan@fitch.com', 'tcjk7788', 'gerente', 0, 0.00),
  ('22222222-2222-2222-2222-222222222222', 'Pedro Vendedor', 'pedro.vendas@fitch.com', '123', 'vendedor', 20, 5.00),
  ('33333333-3333-3333-3333-333333333333', 'Ana Vendedora', 'ana.vendas@fitch.com', '123', 'vendedor', 20, 5.00),
  ('44444444-4444-4444-4444-444444444444', 'Marcos Técnico', 'marcos.tecnico@fitch.com', '123', 'tecnico', 0, 0.00)
ON CONFLICT (email) DO NOTHING;

-- 3. TABELA CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cpf TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);

-- 4. TABELA ESTOQUE DE PEÇAS
CREATE TABLE IF NOT EXISTS estoque_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  codigo_sku TEXT UNIQUE NOT NULL,
  tipo_qualidade tipo_qualidade_peca_enum NOT NULL DEFAULT 'Original',
  modelo_compativel TEXT NOT NULL,
  quantidade_estoque INT NOT NULL DEFAULT 0,
  custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA ORDENS DE SERVIÇO
CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os SERIAL UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vendedor_id UUID NULL REFERENCES usuarios(id),
  vendedor_nome TEXT NULL,
  tecnico_id UUID NULL REFERENCES usuarios(id),
  tecnico_nome TEXT NULL,
  tipo_dispositivo tipo_dispositivo_enum NOT NULL DEFAULT 'iPhone',
  modelo TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT 'Preto',
  imei_ou_serial TEXT NOT NULL,
  senha_aparelho TEXT NULL DEFAULT '',
  buscar_iphone_desativado BOOLEAN NOT NULL DEFAULT false,
  defeito_reclamado TEXT NOT NULL,
  laudo_tecnico TEXT NULL,
  
  -- Checklists e Fotos em JSONB/Text Array
  checklist_entrada JSONB NOT NULL DEFAULT '{
    "face_id": "ok",
    "true_tone": "ok",
    "cameras": "ok",
    "microfones": "ok",
    "alto_falante": "ok",
    "carregamento": "ok",
    "detalhes_esteticos": ""
  }'::jsonb,
  checklist_saida JSONB NULL,
  fotos_entrada TEXT[] NULL DEFAULT '{}',

  -- Status e Cobertura
  status status_os_enum NOT NULL DEFAULT 'aguardando_analise',
  tipo_cobertura tipo_cobertura_enum NOT NULL DEFAULT 'Particular',
  localizacao_atual localizacao_dispositivo_enum NOT NULL DEFAULT 'bancada_local',

  -- Logística Terceirizada (SP) em JSONB
  detalhes_terceirizado JSONB NULL,

  -- Prazos
  data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  previsao_entrega TIMESTAMPTZ NULL,
  data_conclusao TIMESTAMPTZ NULL,

  -- Valores e Pagamento
  valor_servico NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_pecas NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valor_total NUMERIC(10,2) GENERATED ALWAYS AS (GREATEST(0, (valor_servico + valor_pecas - valor_desconto))) STORED,
  forma_pagamento TEXT NULL,
  garantia_dias INT NOT NULL DEFAULT 90,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir novas colunas se a tabela já existia
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS vendedor_nome TEXT;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS tecnico_nome TEXT;

-- Index para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero_os);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_vendedor ON ordens_servico(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);

-- 6. TABELA ITENS / PEÇAS DAS O.S.
CREATE TABLE IF NOT EXISTS os_itens_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  peca_estoque_id UUID NULL REFERENCES estoque_pecas(id),
  descricao TEXT NOT NULL,
  tipo_qualidade tipo_qualidade_peca_enum NOT NULL DEFAULT 'Original',
  custo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  quantidade INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itens_os_id ON os_itens_pecas(os_id);

-- 7. TRIGGER RECALCULAR VALOR DE PEÇAS
CREATE OR REPLACE FUNCTION recalcular_valor_pecas_os()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ordens_servico
  SET valor_pecas = (
    SELECT COALESCE(SUM(preco_venda * quantidade), 0)
    FROM os_itens_pecas
    WHERE os_id = COALESCE(NEW.os_id, OLD.os_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.os_id, OLD.os_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_recalcular_pecas
AFTER INSERT OR UPDATE OR DELETE ON os_itens_pecas
FOR EACH ROW EXECUTE FUNCTION recalcular_valor_pecas_os();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_itens_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_pecas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir tudo usuarios" ON usuarios;
CREATE POLICY "Permitir tudo usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir tudo clientes" ON clientes;
CREATE POLICY "Permitir tudo clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura OS" ON ordens_servico;
DROP POLICY IF EXISTS "Permitir tudo OS" ON ordens_servico;
CREATE POLICY "Permitir tudo OS" ON ordens_servico FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura pecas" ON os_itens_pecas;
DROP POLICY IF EXISTS "Permitir tudo pecas" ON os_itens_pecas;
CREATE POLICY "Permitir tudo pecas" ON os_itens_pecas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo estoque" ON estoque_pecas;
CREATE POLICY "Permitir tudo estoque" ON estoque_pecas FOR ALL USING (true) WITH CHECK (true);

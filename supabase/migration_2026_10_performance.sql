-- =====================================================================
-- MIGRAÇÃO: Performance + colunas faltantes (Out/2026)
-- Rodar no Supabase: Dashboard > SQL Editor > New query > colar > Run
-- ATENÇÃO: rodar no projeto  arrolwyzscobijtbjffb  (o mesmo usado pelo site)
-- =====================================================================

-- 1) Colunas que existem no schema.sql mas nunca foram criadas no banco.
--    Sem elas, a baixa de pagamento (nº venda Syscor) não era salva.
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS numero_venda_syscor TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS baixa_estoque_realizada BOOLEAN DEFAULT false;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS motivo_encerramento TEXT;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS data_baixa TIMESTAMPTZ;

-- 2) Índices para filtros mais usados
CREATE INDEX IF NOT EXISTS idx_os_status ON public.ordens_servico (status);
CREATE INDEX IF NOT EXISTS idx_os_data_conclusao ON public.ordens_servico (data_conclusao);
CREATE INDEX IF NOT EXISTS idx_os_numero_os ON public.ordens_servico (numero_os DESC);
CREATE INDEX IF NOT EXISTS idx_itens_pecas_os_id ON public.os_itens_pecas (os_id);

-- 3) Bucket de fotos + permissões de upload/leitura.
--    Hoje o upload é bloqueado ("row-level security policy") e as fotos
--    são gravadas em base64 dentro da O.S. (~1 a 3,5 MB por O.S.), o que
--    deixa o sistema muito lento.
INSERT INTO storage.buckets (id, name, public)
VALUES ('os-fotos', 'os-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "os-fotos leitura publica" ON storage.objects;
CREATE POLICY "os-fotos leitura publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'os-fotos');

DROP POLICY IF EXISTS "os-fotos upload" ON storage.objects;
CREATE POLICY "os-fotos upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'os-fotos');

DROP POLICY IF EXISTS "os-fotos update" ON storage.objects;
CREATE POLICY "os-fotos update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'os-fotos');

-- Recarrega o cache de schema da API
NOTIFY pgrst, 'reload schema';

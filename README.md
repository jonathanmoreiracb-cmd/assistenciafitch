# Fitch Tecnologia - Sistema de Gestão de Assistência Técnica

Sistema completo, responsivo e moderno para gestão de assistência técnica especializada em dispositivos **Apple (iPhone, iPad, Apple Watch, Mac)** e **Android**.

---

## 🛠️ Recursos do Sistema

- **Identificação Inicial & Segurança**: Autenticação com perfis de Gerente, Vendedor e Técnico.
- **Visual Apple Minimalista**: Interface despoluída, inspirada nos padrões de design da Apple (cards `rounded-3xl`, fundo `#f5f5f7`, botão azul `#0071e3`).
- **Etiquetas Térmicas (80mm x 50mm / 8cm x 5cm)**: Impressão direta com QR Code legível, dados do cliente, modelo, IMEI/SN, senha de tela e defeito.
- **Termos de Garantia A4**: Geração e impressão de termos formais de entrada e garantia.
- **Painel Admin Consolidado (`/admin`)**:
  - 👥 **Equipe & Vendedores**: Cadastro de funcionários, senhas, metas e comissões.
  - 📦 **Estoque de Peças**: Controle de estoque, SKUs, qualidade, custos e valores de venda.
  - 📊 **Relatórios Financeiros**: Faturamento, custos operacionais, lucro líquido e margem %.
  - 🏢 **Dados da Loja**: CNPJ, chave Pix e prazos de garantia.
- **Comissão por Volume de O.S. Particulares**: Escala progressiva de R$ 20,00 a R$ 50,00 por O.S. Particular concluída (O.S. em Garantia da Loja não geram comissão).
- **Upload Nativo de Fotos**: Captura de fotos de avarias pela câmera do celular/PC com pré-visualização.

---

## 🚀 Tecnologias Utilizadas

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Estilização**: Tailwind CSS, Lucide Icons
- **Banco de Dados & Auth**: Supabase (PostgreSQL, RLS)
- **Impressão**: CSS `@media print` para etiquetas térmicas 80x50mm e folhas A4

---

## ⚡ Como Rodar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

Abra o navegador em `http://localhost:3000`.

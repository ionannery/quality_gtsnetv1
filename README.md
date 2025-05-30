# Quality GTSNet

Sistema web para automação de relatórios e geração de scripts de configuração para Unidades Lotéricas.

## Sumário

- [Visão Geral](#visão-geral)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Funcionalidades](#funcionalidades)
- [Detalhes Técnicos](#detalhes-técnicos)
- [Personalização dos Dados](#personalização-dos-dados)
- [Licença](#licença)

---

## Visão Geral

O Quality GTSNet é uma aplicação web composta por um backend Node.js/Express e um frontend HTML/CSS/JS. Ele permite:

- Buscar dados de Unidades Lotéricas a partir de uma base Excel.
- Gerar scripts de configuração personalizados.
- Gerar relatórios em PDF com evidências e imagens.

---

## Estrutura do Projeto

```
quality_gsnet/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── data/
│   │   └── lotericas_data.xlsx
│   └── routes/
│       └── api.js
└── frontend/
    ├── index.html
    ├── loteria.html
    ├── pega-script.html
    ├── css/
    │   └── style.css
    └── js/
        ├── loteria.js
        ├── main.js
        └── pega-script.js
```

- **backend/**: API Node.js/Express, leitura do Excel, geração de scripts.
- **frontend/**: Páginas HTML, CSS customizado, scripts JS para interação.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) (v14 ou superior recomendado)
- npm (geralmente já incluso no Node.js)
- Navegador moderno (Chrome, Firefox, Edge...)

---

## Instalação e Execução

1. **Instale as dependências do backend:**

   ```sh
   cd quality_gsnet/backend
   npm install
   ```

2. **Inicie o servidor:**

   ```sh
   npm start
   ```

   O backend irá rodar por padrão em `http://localhost:3000`.

3. **Acesse o frontend:**

   Abra no navegador:

   ```
   http://localhost:3000/
   ```

   As páginas principais são:
   - Home: `/`
   - Gerador de Script: `/pega-script.html`
   - Relatório Lotérica: `/loteria.html`

---

## Funcionalidades

### Pega Script

- Busca dados da UL pelo código (campo "Ponto Lógico/Designação").
- Exibe informações detalhadas da unidade.
- Permite selecionar parâmetros e preencher dados adicionais.
- Gera script de configuração customizado.
- Copia o script para a área de transferência.

### Relatório Lotérica

- Formulário completo para dados de acesso primário e secundário.
- Campos para logs de teste, evidências e upload de imagens.
- Geração de PDF estilizado, pronto para impressão ou envio.

---

## Detalhes Técnicos

### Backend

- Servidor Express ([backend/server.js](backend/server.js))
- Rotas de API em [backend/routes/api.js](backend/routes/api.js):
  - `GET /api/ul-data/:ulCode`: Busca dados da UL no Excel.
  - `POST /api/generate-script`: Gera script baseado nos dados e parâmetros enviados.
- Leitura do Excel via [xlsx](https://www.npmjs.com/package/xlsx).
- O arquivo de dados deve estar em [backend/data/lotericas_data.xlsx](backend/data/lotericas_data.xlsx).

### Frontend

- HTML/CSS responsivo ([frontend/css/style.css](frontend/css/style.css))
- Scripts JS:
  - [frontend/js/pega-script.js](frontend/js/pega-script.js): Lógica do gerador de script.
  - [frontend/js/loteria.js](frontend/js/loteria.js): Lógica do formulário e geração de PDF.
  - [frontend/js/main.js](frontend/js/main.js): Funções globais.
- Geração de PDF usando [jsPDF](https://github.com/parallax/jsPDF) e [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable).

---

## Personalização dos Dados

- **Base Excel:**  
  Atualize o arquivo [backend/data/lotericas_data.xlsx](backend/data/lotericas_data.xlsx) conforme necessário.
- **Colunas obrigatórias:**  
  Certifique-se de que as colunas do Excel correspondam aos campos esperados no código (ex: `codigoUlBuscavel`, `NomePonto`, etc).

---

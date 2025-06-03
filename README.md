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
- Gerar scripts de configuração personalizados para equipamentos de rede.
- Gerar relatórios em PDF com logs, evidências e imagens.
- Upload de imagens como evidências fotográficas.
- Interface responsiva e intuitiva para uso em campo.

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

- Busca dados da UL pelo código, designador, CPE ou nome (busca flexível).
- Exibe informações detalhadas da unidade.
- Permite selecionar parâmetros (link, owner, modelo, etc.) e preencher dados adicionais.
- Gera script de configuração customizado, pronto para uso.
- Copia o script para a área de transferência com um clique.

### Relatório Lotérica

- Formulário completo para dados de acesso primário e secundário.
- Campos para logs de teste, evidências e upload de até 4 imagens.
- Geração de PDF estilizado, pronto para impressão ou envio.
- PDF inclui logs, tabelas, imagens e informações detalhadas.

---

## Detalhes Técnicos

### Backend

- Servidor Express ([backend/server.js](backend/server.js))
- Rotas de API em [backend/routes/api.js](backend/routes/api.js):
  - `GET /api/ul-data/:ulCode`: Busca dados da UL no Excel por código, designador, CPE ou nome.
  - `POST /api/generate-script`: Gera script baseado nos dados da UL e parâmetros enviados pelo frontend.
- Leitura do Excel via [xlsx](https://www.npmjs.com/package/xlsx).
- O arquivo de dados deve estar em [backend/data/lotericas_data.xlsx](backend/data/lotericas_data.xlsx).
- Cache de dados para performance.

### Frontend

- HTML/CSS responsivo ([frontend/css/style.css](frontend/css/style.css))
- Scripts JS:
  - [frontend/js/pega-script.js](frontend/js/pega-script.js): Busca, exibição de dados e geração de script.
  - [frontend/js/loteria.js](frontend/js/loteria.js): Formulário, validação e geração de PDF com logs e imagens.
  - [frontend/js/main.js](frontend/js/main.js): Funções globais.
- Geração de PDF usando [jsPDF](https://github.com/parallax/jsPDF) e [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable).
- Upload e preview de imagens antes da geração do PDF.

---

## Personalização dos Dados

- **Base Excel:**  
  Atualize o arquivo [backend/data/lotericas_data.xlsx](backend/data/lotericas_data.xlsx) conforme necessário.
- **Colunas obrigatórias:**  
  Certifique-se de que as colunas do Excel correspondam aos campos esperados no código (ex: `codigoulbuscavel`, `NomePonto`, `loopback_principal`, etc).
- **Mapeamento de campos:**  
  O mapeamento entre colunas do Excel e campos exibidos pode ser ajustado em [frontend/js/pega-script.js](frontend/js/pega-script.js).

---

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo LICENSE para mais detalhes.

---
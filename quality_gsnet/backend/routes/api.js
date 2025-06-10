// QUALITY_GTSNET-BACKEND/backend/routes/api.js
const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// --- INÍCIO DAS CONFIGURAÇÕES DE ARQUIVOS E CACHE (EXISTENTE) ---
const excelFileName = 'lotericas_data2.xlsx';
const excelFilePath = path.join(__dirname, '..', 'data', excelFileName);

let excelDataCache = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos
// --- FIM DAS CONFIGURAÇÕES DE ARQUIVOS E CACHE ---

// --- INÍCIO DAS CONFIGURAÇÕES DE RELATÓRIOS PDF ---
const reportsDir = '/home/ubuntu/reports';

// Garante que o diretório de relatórios exista na inicialização
if (!fs.existsSync(reportsDir)) {
    try {
        fs.mkdirSync(reportsDir, { recursive: true });
        console.log(`Diretório de relatórios criado em: ${reportsDir}`);
    } catch (err) {
        console.error(`CRÍTICO: Erro ao criar diretório de relatórios ${reportsDir}. Uploads falharão. Erro:`, err);
        // Considere o que fazer aqui. Se o diretório for essencial, talvez não iniciar o servidor.
    }
}
// --- FIM DAS CONFIGURAÇÕES DE RELATÓRIOS PDF ---


// --- FUNÇÕES UTILITÁRIAS (EXISTENTE E AJUSTADA) ---
function getAllUlDataAsArray() {
    const now = Date.now();
    if (excelDataCache && (now - lastCacheTime < CACHE_DURATION_MS)) {
        return excelDataCache;
    }

    console.log("Lendo e processando arquivo Excel para cache...");
    try {
        if (!fs.existsSync(excelFilePath)) {
            console.error(`Arquivo Excel "${excelFileName}" não encontrado em:`, excelFilePath);
            excelDataCache = [];
            return [];
        }
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            console.error(`Nenhuma planilha encontrada no arquivo "${excelFileName}".`);
            excelDataCache = [];
            return [];
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            console.error(`Planilha "${sheetName}" não encontrada ou inválida no arquivo "${excelFileName}".`);
            excelDataCache = [];
            return [];
        }

        let processedCount = 0;
        const jsonData = xlsx.utils.sheet_to_json(worksheet).map((row, index) => {
            if (row.hasOwnProperty('codigoulbuscavel')) {
                const originalValue = row.codigoulbuscavel;
                if (originalValue !== null && originalValue !== undefined) {
                    row._normalized_codigoulbuscavel = normalizeSearchString(String(originalValue));
                    row._original_codigoulbuscavel_lower = String(originalValue).trim().toLowerCase();
                    if (index < 2) {
                        console.log(`Pré-processando linha ${index + 1}: ENCONTRADO 'codigoulbuscavel' com valor '${originalValue}'. Normalizado: '${row._normalized_codigoulbuscavel}', Lower: '${row._original_codigoulbuscavel_lower}'`);
                    }
                    processedCount++;
                } else if (index < 2) {
                     console.log(`Pré-processando linha ${index + 1}: 'codigoulbuscavel' existe mas é null/undefined.`);
                }
            } else if (index < 2) {
                console.log(`Pré-processando linha ${index + 1}: A propriedade 'codigoulbuscavel' NÃO FOI ENCONTRADA.`);
            }

            if (row.desig_circ_pri) {
                 row._desig_circ_pri_lower = String(row.desig_circ_pri).trim().toLowerCase();
            }
            if (row.CPE) {
                 row._cpe_lower = String(row.CPE).trim().toLowerCase();
            }
            if (row.nomeponto) {
                 row._nomeponto_lower = String(row.nomeponto).trim().toLowerCase();
            }
            return row;
        });

        console.log(`Pré-processamento de 'codigoulbuscavel' concluído. ${processedCount} linhas tinham 'codigoulbuscavel' com valor.`);
        excelDataCache = jsonData;
        lastCacheTime = now;
        console.log(`Dados do Excel carregados e cacheados. ${jsonData.length} linhas no total.`);
        return jsonData;
    } catch (error) {
        console.error(`Erro ao ler o arquivo Excel "${excelFileName}":`, error);
        excelDataCache = [];
        return [];
    }
}

function normalizeSearchString(str) {
    if (typeof str !== 'string' && typeof str !== 'number') return '';
    return String(str).replace(/-/g, '').toLowerCase();
}

// Utilitário AJUSTADO para extrair data do nome do arquivo com timestamp
// Formato esperado: QUALQUERCOISAUL_TIMESTAMP.pdf (ex: UL123_1678886400000.pdf)
function extractDateFromTimestampInFilename(filename) {
    if (!filename || typeof filename !== 'string') return null;
    const parts = filename.split('_');
    if (parts.length < 2) return null; // Precisa de pelo menos ULCODIGO_TIMESTAMP.pdf

    // Pega a parte que deveria ser o timestamp (antes do .pdf)
    const timestampPartWithExtension = parts[parts.length - 1]; // Pega a última parte
    const timestampString = timestampPartWithExtension.substring(0, timestampPartWithExtension.lastIndexOf('.pdf'));

    const timestamp = parseInt(timestampString);
    if (isNaN(timestamp)) {
        // console.warn(`[extractDate] Timestamp inválido no nome do arquivo: ${filename}, parte extraída: ${timestampString}`);
        return null;
    }
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 10); // Retorna YYYY-MM-DD
}
// --- FIM DAS FUNÇÕES UTILITÁRIAS ---


// --- ROTAS DA API ---

// Rota para buscar dados da UL (EXISTENTE - SEM ALTERAÇÕES DIRETAS PARA O PROBLEMA DO PDF)
router.get('/ul-data/:searchTerm', (req, res) => {
    const allData = getAllUlDataAsArray();
    const originalSearchTerm = String(req.params.searchTerm).trim();
    const searchTermLower = originalSearchTerm.toLowerCase();
    const normalizedSearchTerm = normalizeSearchString(originalSearchTerm);

    // console.log(`\n--- Nova Busca GET /ul-data ---`);
    // console.log(`Termo Original: '${originalSearchTerm}', Normalizado para busca: '${normalizedSearchTerm}', Lower para busca: '${searchTermLower}'`);

    if (allData.length === 0) {
        return res.status(500).json({ message: `Base de dados (${excelFileName}) não encontrada, vazia ou com erro de leitura.` });
    }

    let foundEntry = null;
    foundEntry = allData.find(entry =>
        (entry.hasOwnProperty('_normalized_codigoulbuscavel') && entry._normalized_codigoulbuscavel === normalizedSearchTerm) ||
        (entry.hasOwnProperty('_original_codigoulbuscavel_lower') && entry._original_codigoulbuscavel_lower === searchTermLower)
    );

    if (!foundEntry) {
        foundEntry = allData.find(entry => entry._desig_circ_pri_lower && entry._desig_circ_pri_lower === searchTermLower);
    }
    if (!foundEntry && allData.some(entry => entry.hasOwnProperty('_cpe_lower'))) {
        foundEntry = allData.find(entry => entry._cpe_lower && entry._cpe_lower === searchTermLower);
    }
    if (!foundEntry) {
        foundEntry = allData.find(entry => entry._nomeponto_lower && entry._nomeponto_lower.includes(searchTermLower));
    }

    if (foundEntry) {
        const allowedFields = [
            'codigoulbuscavel', 'desig_circ_pri', 'nomeponto', 'rede_lan_subnet',
            'loopback_principal', 'loopback_contigencia', 'oficio_primario', 'oficio_secundario',
            'nome_agencia', 'n_agencia', 'tfl', 'ciaus', 'tipo', 'loopback_switch',
            'enderecocompleto', 'cidade', 'uf', 'cep', 'latencia_secundaria'
        ];
        const filteredData = {};
        allowedFields.forEach(field => {
            if (foundEntry.hasOwnProperty(field)) {
                filteredData[field] = foundEntry[field] !== undefined ? foundEntry[field] : '';
            }
        });
        // console.log("Enviando dados da UL para frontend:", filteredData);
        res.json(filteredData);
    } else {
        // console.log(`Nenhuma entrada encontrada para o termo '${originalSearchTerm}'.`);
        res.status(404).json({ message: `Nenhum registro encontrado para "${originalSearchTerm}".` });
    }
});

// Rota para gerar script (EXISTENTE - SEM ALTERAÇÕES DIRETAS PARA O PROBLEMA DO PDF)
router.post('/generate-script', (req, res) => {
    const { ulCode, scriptParams } = req.body;

    if (!ulCode || !scriptParams) {
        return res.status(400).json({ message: 'Dados insuficientes para gerar o script.' });
    }
    const allData = getAllUlDataAsArray();
    const originalSearchTermForScript = String(ulCode).trim();
    const searchTermLowerForScript = originalSearchTermForScript.toLowerCase();
    const normalizedSearchTermForScript = normalizeSearchString(originalSearchTermForScript);
    let currentUlData = null;
    currentUlData = allData.find(entry =>
        (entry._normalized_codigoulbuscavel && entry._normalized_codigoulbuscavel === normalizedSearchTermForScript) ||
        (entry._original_codigoulbuscavel_lower && entry._original_codigoulbuscavel_lower === searchTermLowerForScript)
    );
    if (!currentUlData) {
        currentUlData = allData.find(entry => entry._desig_circ_pri_lower && entry._desig_circ_pri_lower === searchTermLowerForScript);
    }
    // ... (restante da sua lógica de busca para currentUlData) ...
    if (!currentUlData) {
        return res.status(404).json({ message: `Dados da UL para "${originalSearchTermForScript}" não encontrados ao gerar script.` });
    }

    const {_normalized_codigoulbuscavel, _original_codigoulbuscavel_lower, _desig_circ_pri_lower, _cpe_lower, _nomeponto_lower, ...dataForScript} = currentUlData;
    let script = `! SCRIPT DE CONFIGURAÇÃO GERADO AUTOMATICAMENTE (VIA BACKEND)\n`;
    // ... (restante da sua lógica de geração de script) ...
    script += `write memory\n`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
});


// Rota para UPLOAD (SALVAR) de relatório PDF - ALTERADA
router.post('/upload-report', express.json({ limit: '15mb' }), (req, res) => { // Limite aumentado por segurança
  const { ulCode, pdfBase64 } = req.body;

  if (!ulCode || !pdfBase64) {
    console.error('[API /upload-report] ERRO: Dados insuficientes. ulCode ou pdfBase64 ausente.');
    return res.status(400).json({ message: 'Dados insuficientes (ulCode ou pdfBase64 faltando).' });
  }

  console.log(`[API /upload-report] Recebido upload para UL: ${ulCode}`);
  // console.log(`[API /upload-report] Tamanho do pdfBase64 recebido: ${pdfBase64.length} caracteres`);
  // console.log(`[API /upload-report] Início do pdfBase64: ${pdfBase64.substring(0, 100)}...`); // Loga só o começo

  // Sanitiza ulCode para nome de arquivo e usa timestamp para unicidade
  const safeUlCode = String(ulCode).replace(/[^a-zA-Z0-9_.-]/g, ''); // Remove caracteres inválidos
  const timestamp = Date.now();
  const fileName = `${safeUlCode}_${timestamp}.pdf`; // Novo formato: ULCODIGO_TIMESTAMP.pdf
  const filePath = path.join(reportsDir, fileName);

  // Remove o prefixo Data URI (ex: "data:application/pdf;base64,") se presente
  const base64Data = pdfBase64.replace(/^data:[a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+;base64,/, "");


  if (!base64Data || base64Data.trim() === "") {
      console.error(`[API /upload-report] ERRO: base64Data está vazio após remover o prefixo. UL: ${ulCode}.FilePath: ${filePath}`);
      return res.status(400).json({ message: 'Conteúdo do PDF (Base64) está vazio ou inválido.' });
  }

  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error(`[API /upload-report] ERRO ao salvar PDF em ${filePath}:`, err);
      return res.status(500).json({ message: 'Erro interno do servidor ao salvar o arquivo PDF.' });
    }
    console.log(`[API /upload-report] Relatório salvo com sucesso: ${filePath}`);
    res.status(201).json({ message: 'Relatório salvo com sucesso no servidor.', fileName: fileName }); // 201 Created
  });
});


// Rota para LISTAR relatórios - AJUSTADA para novo nome de arquivo
router.get('/list-reports', (req, res) => {
  const { ulCode, date } = req.query; // date no formato YYYY-MM-DD

  if (!fs.existsSync(reportsDir)) {
    console.warn(`[API /list-reports] Diretório de relatórios ${reportsDir} não encontrado.`);
    return res.json([]); // Retorna array vazio se o diretório não existe
  }

  let files = [];
  try {
    files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.pdf'));
  } catch (err) {
    console.error(`[API /list-reports] Erro ao ler diretório ${reportsDir}:`, err);
    return res.status(500).json({ message: "Erro interno ao listar relatórios." });
  }

  if (ulCode) {
    const safeQueryUlCode = String(ulCode).trim().replace(/[^a-zA-Z0-9_.-]/g, '');
    files = files.filter(f => f.startsWith(safeQueryUlCode + '_'));
  }
  if (date) { // date deve ser YYYY-MM-DD
    files = files.filter(f => extractDateFromTimestampInFilename(f) === date);
  }

  const result = files.map(f => {
    const fileUlCode = f.substring(0, f.indexOf('_')); // Extrai UL Code do nome do arquivo
    const fileDate = extractDateFromTimestampInFilename(f);
    return {
        fileName: f,
        ulCode: fileUlCode,
        date: fileDate || 'Data Inválida', // Exibe a data extraída ou uma mensagem
        url: `/api/download-report/${encodeURIComponent(f)}`
    };
  }).sort((a, b) => b.fileName.localeCompare(a.fileName)); // Opcional: Ordena mais recentes primeiro (se timestamp é parte do nome)


  res.json(result);
});

// Rota para DOWNLOAD de relatório - AJUSTADA
router.get('/download-report/:fileName', (req, res) => {
  const encodedFileName = req.params.fileName;
  let fileName;
  try {
    fileName = decodeURIComponent(encodedFileName);
  } catch (e) {
    console.error(`[API /download-report] Erro ao decodificar nome do arquivo: ${encodedFileName}`, e);
    return res.status(400).json({ message: 'Nome de arquivo inválido.' });
  }
  
  // Validação básica do nome do arquivo para evitar transversal de diretório
  if (fileName.includes('..') || fileName.startsWith('/')) {
    console.error(`[API /download-report] Tentativa de acesso inválida com fileName: ${fileName}`);
    return res.status(400).json({ message: 'Nome de arquivo inválido.' });
  }

  const filePath = path.join(reportsDir, fileName);

  console.log(`[API /download-report] Tentando baixar relatório: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`[API /download-report] Relatório não encontrado: ${filePath}`);
    return res.status(404).json({ message: 'Relatório não encontrado.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  // Usar path.basename para garantir que apenas o nome do arquivo seja usado no Content-Disposition
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fileName)}"`);
  
  const readStream = fs.createReadStream(filePath);
  readStream.on('open', () => {
    console.log(`[API /download-report] Iniciando stream para ${filePath}`);
    readStream.pipe(res);
  });
  readStream.on('error', (err) => {
    console.error(`[API /download-report] Erro ao ler o arquivo ${filePath} para stream:`, err);
    // Importante: não tente enviar outra resposta se os headers já foram enviados.
    // O pipe() já pode ter iniciado a resposta. Apenas logue o erro.
    // Se a stream ainda não iniciou, pode-se enviar um erro 500.
    if (!res.headersSent) {
        res.status(500).send("Erro ao ler o arquivo do relatório.");
    }
  });
});
// --- FIM DAS ROTAS DA API ---

module.exports = router;
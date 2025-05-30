// QUALITY_GTSNET-BACKEND/backend/routes/api.js
const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// __dirname aqui é '.../QUALITY_GTSNET-BACKEND/backend/routes'
// '../data/lotericas_data.xlsx' sobe para 'backend/' e entra em 'data/'
const excelFilePath = path.join(__dirname, '..', 'data', 'lotericas_data.xlsx');

// Função auxiliar para ler e parsear os dados do Excel
function getUlDataFromExcel() {
    try {
        if (!fs.existsSync(excelFilePath)) {
            console.error('Arquivo Excel não encontrado:', excelFilePath);
            return {};
        }
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);

        const dataMap = {};
        jsonData.forEach(row => {
            const key = String(row.codigoUlBuscavel).trim();
            if (key) {
               dataMap[key] = row;
            }
        });
        return dataMap;
    } catch (error) {
        console.error("Erro ao ler o arquivo Excel:", error);
        return {};
    }
}

// Endpoint para buscar dados de uma UL
router.get('/ul-data/:ulCode', (req, res) => {
    const ulData = getUlDataFromExcel();
    const requestedUlCode = String(req.params.ulCode).trim();

    if (ulData[requestedUlCode]) {
        res.json(ulData[requestedUlCode]);
    } else {
        res.status(404).json({ message: 'Código UL não encontrado na base de dados.' });
    }
});

// Endpoint para gerar o script
router.post('/generate-script', (req, res) => {
    const { ulCode, scriptParams } = req.body;

    if (!ulCode || !scriptParams) {
        return res.status(400).json({ message: 'Dados insuficientes para gerar o script (ulCode e scriptParams são obrigatórios).' });
    }

    const allUlData = getUlDataFromExcel();
    const currentUlData = allUlData[String(ulCode).trim()];

    if (!currentUlData) {
        return res.status(404).json({ message: `Dados da UL ${ulCode} não encontrados para gerar o script.` });
    }

    // Lógica de geração de script... (igual à versão anterior)
    let script = `! SCRIPT DE CONFIGURAÇÃO GERADO AUTOMATICAMENTE (VIA BACKEND)\n`;
    script += `! Data Geração: ${new Date().toLocaleString('pt-BR')}\n`;
    script += `!\n`;
    script += `! DADOS DA UNIDADE LOTÉRICA (ATUAL - via Excel):\n`;
    script += `! Código UL: ${currentUlData.codigoUlExibido || 'N/A'}\n`;
    script += `! Nome UL (Owner): ${currentUlData.nomeUl || 'N/A'}\n`;
    script += `! Designador (Link Principal): ${currentUlData.designador || 'N/A'}\n`;
    // Adicione mais campos do currentUlData conforme necessário
    script += `!\n`;
    script += `! PARÂMETROS PARA NOVA CONFIGURAÇÃO (via Formulário):\n`;
    script += `hostname ${scriptParams.link || 'NOVO_ROUTER'}\n`;
    // ... resto da lógica de montagem do script
    script += `! Informações Adicionais (via Formulário):\n`;
    script += `! Novo Owner (se informado no form): ${scriptParams.owner || 'N/A'}\n`;
    script += `! Novo Modelo Router: ${scriptParams.modeloRouter || 'N/A'} (Serial: ${scriptParams.serialRouter || 'N/A'}, FW: ${scriptParams.firmwareRouter || 'N/A'})\n`;
    script += `! Novo Modelo Switch: ${scriptParams.modeloSwitch || 'N/A'} (Serial: ${scriptParams.serialSwitch || 'N/A'}, FW: ${scriptParams.firmwareSwitch || 'N/A'})\n`;
    script += `!\n`;
    if (scriptParams.observacoes) {
        script += `! Observações (via Formulário):\n`;
        scriptParams.observacoes.split('\n').forEach(line => {
            script += `! ${line}\n`;
        });
    }
    script += `!\n`;
    script += `end\n`;
    script += `write memory\n`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
});

module.exports = router;
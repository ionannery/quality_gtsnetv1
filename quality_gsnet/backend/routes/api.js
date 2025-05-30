// QUALITY_GTSNET-BACKEND/backend/routes/api.js
const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const excelFilePath = path.join(__dirname, '..', 'data', 'lotericas_data.xlsx');

// Função auxiliar para ler e parsear os dados do Excel, retornando um array de objetos
function getAllUlDataAsArray() {
    try {
        if (!fs.existsSync(excelFilePath)) {
            console.error('Arquivo Excel não encontrado:', excelFilePath);
            return []; // Retorna array vazio se o arquivo não existe
        }
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0]; // Pega a primeira planilha
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet); // Retorna array de objetos
        return jsonData;
    } catch (error) {
        console.error("Erro ao ler o arquivo Excel:", error);
        return []; // Retorna array vazio em caso de erro
    }
}

// Endpoint para buscar dados de uma UL (agora busca por Ponto Lógico/Designação OU CPE)
router.get('/ul-data/:searchTerm', (req, res) => {
    const allData = getAllUlDataAsArray();
    const searchTerm = String(req.params.searchTerm).trim().toLowerCase(); // Termo de busca em minúsculas

    if (allData.length === 0 && fs.existsSync(excelFilePath)) {
        // Se o arquivo existe mas não retornou dados, pode ser um problema de parse ou planilha vazia
        console.warn("A planilha Excel foi lida, mas nenhum dado foi retornado ou está vazia.");
        // Não envia 404 aqui ainda, pois a busca ainda não foi feita.
    }
    if (allData.length === 0 && !fs.existsSync(excelFilePath)) {
         return res.status(500).json({ message: 'Base de dados (Excel) não encontrada no servidor.' });
    }


    let foundEntry = null;

    // Tenta encontrar pelo campo primário de busca (ex: Ponto Lógico / Designação)
    // Assumindo que a coluna no Excel para esta busca é 'codigoUlBuscavel'
    foundEntry = allData.find(entry => 
        entry.codigoUlBuscavel && String(entry.codigoUlBuscavel).trim().toLowerCase() === searchTerm
    );

    // Se não encontrou, tenta encontrar pelo CPE
    // Assumindo que a coluna no Excel para CPE é 'CPE'
    if (!foundEntry) {
        foundEntry = allData.find(entry => 
            entry.CPE && String(entry.CPE).trim().toLowerCase() === searchTerm
        );
    }
    
    // Adicional: Se você tiver uma coluna como 'PontoLogicoDesignacao' que também pode ser usada para busca
    // e ela for diferente de 'codigoUlBuscavel'
    if (!foundEntry) {
        foundEntry = allData.find(entry =>
            entry.PontoLogicoDesignacao && String(entry.PontoLogicoDesignacao).trim().toLowerCase() === searchTerm
        );
    }


    if (foundEntry) {
        res.json(foundEntry);
    } else {
        res.status(404).json({ message: `Nenhum registro encontrado para \"${req.params.searchTerm}\" como Ponto Lógico/Designação ou CPE.` });
    }
});

// Endpoint para gerar o script (lógica de busca da UL precisa ser adaptada também)
router.post('/generate-script', (req, res) => {
    const { ulCode, scriptParams } = req.body; // ulCode aqui é o termo de busca original

    if (!ulCode || !scriptParams) {
        return res.status(400).json({ message: 'Dados insuficientes para gerar o script (termo de busca e scriptParams são obrigatórios).' });
    }

    const allData = getAllUlDataAsArray();
    const searchTerm = String(ulCode).trim().toLowerCase();
    let currentUlData = null;

    // Lógica de busca similar à do endpoint GET /ul-data/:searchTerm
    currentUlData = allData.find(entry => 
        entry.codigoUlBuscavel && String(entry.codigoUlBuscavel).trim().toLowerCase() === searchTerm
    );
    if (!currentUlData) {
        currentUlData = allData.find(entry => 
            entry.CPE && String(entry.CPE).trim().toLowerCase() === searchTerm
        );
    }
    if (!currentUlData) {
        currentUlData = allData.find(entry =>
            entry.PontoLogicoDesignacao && String(entry.PontoLogicoDesignacao).trim().toLowerCase() === searchTerm
        );
    }

    if (!currentUlData) {
        return res.status(404).json({ message: `Dados da UL para \"${ulCode}\" não encontrados para gerar o script.` });
    }

    // Lógica de geração de script (a partir daqui, igual à versão anterior, usando currentUlData)
    let script = `! SCRIPT DE CONFIGURAÇÃO GERADO AUTOMATICAMENTE (VIA BACKEND)\\\\\\\\n`;
    script += `! Data Geração: ${new Date().toLocaleString('pt-BR')}\\\\\\\\n`;
    script += `!\\\\\\\\n`;
    script += `! DADOS DA UNIDADE LOTÉRICA (ENCONTRADO POR: ${ulCode}):\\\\\\\\n`; // Informa o termo de busca usado
    // Adapte os nomes das colunas aqui para corresponder ao seu Excel
    script += `! Ponto Lógico / Designação: ${currentUlData.PontoLogicoDesignacao || currentUlData.codigoUlBuscavel || 'N/A'}\\\\\\\\n`;
    script += `! Nome Ponto: ${currentUlData.NomePonto || 'N/A'}\\\\\\\\n`;
    script += `! CEP: ${currentUlData.CEP || 'N/A'}\\\\\\\\n`;
    script += `! Endereço Completo: ${currentUlData.EnderecoCompleto || 'N/A'}\\\\\\\\n`;
    script += `! Cidade: ${currentUlData.Cidade || 'N/A'}, UF: ${currentUlData.UF || 'N/A'}\\\\\\\\n`;
    script += `! LAN: ${currentUlData.LAN || 'N/A'}\\\\\\\\n`;
    script += `! Porta Config.: ${currentUlData.Porta191224 || 'N/A'}\\\\\\\\n`;
    script += `! Switch Equipamento: ${currentUlData.SwitchEquipamento || 'N/A'}\\\\\\\\n`;
    script += `! Responsável Entrega Link: ${currentUlData.ResponsavelEntregaLink || 'N/A'}\\\\\\\\n`;
    script += `! Designação Circuito: ${currentUlData.DesignacaoCircuito || 'N/A'}\\\\\\\\n`;
    script += `! CPE: ${currentUlData.CPE || 'N/A'}\\\\\\\\n`;
    script += `! SWiTCH Info: ${currentUlData.SWiTCHConfig || 'N/A'}\\\\\\\\n`;
    script += `!\\\\\\\\n`;
    script += `! PARÂMETROS PARA NOVA CONFIGURAÇÃO (via Formulário):\\\\\\\\n`;
    const hostname = scriptParams.hostnameRouter || scriptParams.linkNovo || 'NOVO_ROUTER';
    script += `hostname ${hostname}\\\\\\\\n`;
    script += `! Owner: ${scriptParams.ownerNovo || 'N/A'}\\\\\\\\n`;
    script += `! Modelo Roteador: ${scriptParams.router_model || 'N/A'} (Serial: ${scriptParams.serialRouter || 'N/A'}, FW: ${scriptParams.firmwareRouter || 'N/A'})\\\\\\\\n`;
    script += `!\\\\\\\\n`;
    script += `! Interface WAN (${scriptParams.linkNovo || 'N/A'})\\\\\\\\n`;
    script += `interface GigabitEthernet0/0 ! Ou a interface WAN correta\\\\\\\\n`;
    script += ` ip address ${scriptParams.ipWanRouter || 'A.B.C.D E.F.G.H'}\\\\\\\\n`;
    script += ` description LINK_PRINCIPAL_${scriptParams.linkNovo || 'NOVO_LINK'}\\\\\\\\n`;
    script += ` no shutdown\\\\\\\\n`;
    script += `!\\\\\\\\n`;
    script += `! Interface LAN\\\\\\\\n`;
    script += `interface GigabitEthernet0/1 ! Ou a interface LAN correta\\\\\\\\n`;
    script += ` ip address ${scriptParams.ipLanRouter || '192.168.1.1 255.255.255.0'}\\\\\\\\n`;
    script += ` no shutdown\\\\\\\\n`;
    script += `!\\\\\\\\n`;

    if (scriptParams.needs_switch === 'SIM') {
        script += `! Configuração do Switch Novo:\\\\\\\\n`;
        script += `! Modelo Switch: ${scriptParams.modeloSwitch || 'N/A'}\\\\\\\\n`;
        script += `! Serial Switch: ${scriptParams.serialSwitch || 'N/A'}\\\\\\\\n`;
        script += `! Firmware Switch: ${scriptParams.firmwareSwitch || 'N/A'}\\\\\\\\n`;
        script += `!\\\\\\\\n`;
    }

    if (scriptParams.observacoes) {
        script += `! Observações (via Formulário):\\\\\\\\n`;
        scriptParams.observacoes.split('\\\\\\\\n').forEach(line => {
            script += `! ${line}\\\\\\\\n`;
        });
    }
    script += `!\\\\\\\\n`;
    script += `end\\\\\\\\n`;
    script += `write memory\\\\\\\\n`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(script);
});

module.exports = router;
// QUALITY_GTSNET-BACKEND/backend/routes/api.js
const express = require('express');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const excelFileName = 'lotericas_data2.xlsx';
const excelFilePath = path.join(__dirname, '..', 'data', excelFileName);

let excelDataCache = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000;

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
            // ===== INÍCIO DO PRÉ-PROCESSAMENTO PARA codigoulbuscavel =====
            // ** Usando 'codigoulbuscavel' (tudo minúsculo) conforme o nome na planilha **
            if (row.hasOwnProperty('codigoulbuscavel')) { // Verifica se a propriedade existe
                const originalValue = row.codigoulbuscavel; // <<<< CORRIGIDO AQUI
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
                // console.log(`   Propriedades existentes nesta linha: ${Object.keys(row).join(', ')}`);
            }
            // ===== FIM DO PRÉ-PROCESSAMENTO PARA codigoulbuscavel =====

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

router.get('/ul-data/:searchTerm', (req, res) => {
    const allData = getAllUlDataAsArray();
    const originalSearchTerm = String(req.params.searchTerm).trim();
    const searchTermLower = originalSearchTerm.toLowerCase();
    const normalizedSearchTerm = normalizeSearchString(originalSearchTerm);

    console.log(`\n--- Nova Busca GET /ul-data ---`);
    console.log(`Termo Original: '${originalSearchTerm}', Normalizado para busca: '${normalizedSearchTerm}', Lower para busca: '${searchTermLower}'`);

    if (allData.length === 0) {
        return res.status(500).json({ message: `Base de dados (${excelFileName}) não encontrada, vazia ou com erro de leitura.` });
    }
    if (allData.length > 0 && allData[0]) {
        console.log(`   Amostra da primeira entrada no cache (após pré-proc):`);
        console.log(`   _normalized_codigoulbuscavel: '${allData[0]._normalized_codigoulbuscavel}'`);
        console.log(`   _original_codigoulbuscavel_lower: '${allData[0]._original_codigoulbuscavel_lower}'`);
        console.log(`   _desig_circ_pri_lower: '${allData[0]._desig_circ_pri_lower}'`);
    }

    let foundEntry = null;

    console.log(`Tentando busca por 'codigoulbuscavel' (campos pré-processados)...`);
    foundEntry = allData.find(entry => {
        const hasNormalized = entry.hasOwnProperty('_normalized_codigoulbuscavel');
        const hasOriginalLower = entry.hasOwnProperty('_original_codigoulbuscavel_lower');

        if (hasNormalized && entry._normalized_codigoulbuscavel === normalizedSearchTerm) {
            console.log(`   ACHOU por _normalized_codigoulbuscavel. Valor original da UL: '${entry.codigoulbuscavel}'`); // <<<< USA 'codigoulbuscavel' para exibir o original
            return true;
        }
        if (hasOriginalLower && entry._original_codigoulbuscavel_lower === searchTermLower) {
            console.log(`   ACHOU por _original_codigoulbuscavel_lower. Valor original da UL: '${entry.codigoulbuscavel}'`); // <<<< USA 'codigoulbuscavel' para exibir o original
            return true;
        }
        return false;
    });
 
    if (!foundEntry) {
        console.log(`Tentando busca por 'desig_circ_pri'...`);
        foundEntry = allData.find(entry => entry._desig_circ_pri_lower && entry._desig_circ_pri_lower === searchTermLower);
        if (foundEntry) console.log(`   ACHOU por _desig_circ_pri_lower. Valor original: '${foundEntry.desig_circ_pri}'`);
    }
    
    if (!foundEntry && allData.some(entry => entry.hasOwnProperty('_cpe_lower'))) {
        console.log(`Tentando busca por 'CPE'...`);
        foundEntry = allData.find(entry => entry._cpe_lower && entry._cpe_lower === searchTermLower);
        if (foundEntry) console.log(`   ACHOU por _cpe_lower. Valor original: '${foundEntry.CPE}'`);
    }
    
    if (!foundEntry) {
        console.log(`Tentando busca por 'nomeponto' (parcial)...`);
        foundEntry = allData.find(entry => entry._nomeponto_lower && entry._nomeponto_lower.includes(searchTermLower));
        if (foundEntry) console.log(`   ACHOU por _nomeponto_lower (parcial). Valor original: '${foundEntry.nomeponto}'`);
    }

    if (foundEntry) {
        // Lista de campos permitidos para resposta
        const allowedFields = [
            'codigoulbuscavel',
            'desig_circ_pri',
            'nomeponto',
            'rede_lan_subnet',
            'loopback_principal',
            'loopback_contigencia',
            'oficio_primario',
            'oficio_secundario',
            'tipo',
            'loopback_switch',
            'enderecocompleto',
            'cidade',
            'uf',
            'cep',
            'latencia_secundaria'
        ];
        // Monta objeto apenas com os campos permitidos
        const filteredData = {};
        allowedFields.forEach(field => {
            filteredData[field] = foundEntry[field] !== undefined ? foundEntry[field] : '';
        });
        res.json(filteredData);
    } else {
        console.log(`Nenhuma entrada encontrada para o termo '${originalSearchTerm}'.`);
        res.status(404).json({ message: `Nenhum registro encontrado para "${originalSearchTerm}".` });
    }
});

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
    if (!currentUlData && allData.some(entry => entry.hasOwnProperty('_cpe_lower'))) {
        currentUlData = allData.find(entry => entry._cpe_lower && entry._cpe_lower === searchTermLowerForScript);
    }
    if (!currentUlData) {
        currentUlData = allData.find(entry => entry._nomeponto_lower && entry._nomeponto_lower.includes(searchTermLowerForScript));
    }

    if (!currentUlData) {
        return res.status(404).json({ message: `Dados da UL para "${originalSearchTermForScript}" não encontrados.` });
    }

    const {_normalized_codigoulbuscavel, _original_codigoulbuscavel_lower, _desig_circ_pri_lower, _cpe_lower, _nomeponto_lower, ...dataForScript} = currentUlData;

    let script = `! SCRIPT DE CONFIGURAÇÃO GERADO AUTOMATICAMENTE (VIA BACKEND)\n`;
    script += `! Data Geração: ${new Date().toLocaleString('pt-BR')}\n`;
    script += `!\n`;
    script += `! DADOS DA UNIDADE LOTÉRICA (ENCONTRADO POR: ${originalSearchTermForScript}):\n`;
    script += `! Site (UL): ${dataForScript.codigoulbuscavel || 'N/A'}\n`; // <<<< USA 'codigoulbuscavel' (minúsculo) para pegar o valor original
    script += `! Nome Ponto: ${dataForScript.nomeponto || 'N/A'}\n`;
    
    let ips = [];
    if(dataForScript.loopback_principal && dataForScript.loopback_principal !== '0') ips.push(`Loopback Principal: ${dataForScript.loopback_principal}`);
    if(dataForScript.loopback_contigencia && dataForScript.loopback_contigencia !== '0') ips.push(`Loopback Contingência: ${dataForScript.loopback_contigencia}`);
    if(dataForScript.ip_wan_principal && dataForScript.ip_wan_principal !== '0') ips.push(`IP WAN Principal: ${dataForScript.ip_wan_principal}`);
    if(dataForScript.ip_wan_contigencia && dataForScript.ip_wan_contigencia !== '0') ips.push(`IP WAN Contingência: ${dataForScript.ip_wan_contigencia}`);
    if(dataForScript.loopback_switch && dataForScript.loopback_switch !== '0') ips.push(`Loopback Switch: ${dataForScript.loopback_switch}`);
    script += `! IPs Configurados: ${ips.length > 0 ? ips.join('; ') : 'N/A'}\n`;
    
    script += `! Modelo Equipamento: ${dataForScript.modelo || 'N/A'}\n`;
    script += `! Designação Circ. Primário: ${dataForScript.desig_circ_pri || 'N/A'}\n`;
    script += `! LAN: ${dataForScript.rede_lan_subnet || 'N/A'}\n`; 
    script += `! Endereço: ${dataForScript.enderecocompleto || 'N/A'}\n`;
    script += `! Cidade: ${dataForScript.cidade || 'N/A'}, UF: ${dataForScript.uf || 'N/A'}\n`;
    script += `!\n`;
    script += `! PARÂMETROS PARA NOVA CONFIGURAÇÃO (via Formulário):\n`;
    
    const hostname = scriptParams.hostnameRouter || scriptParams.ownerNovo || scriptParams.linkNovo || dataForScript.nomeponto || 'NOVO_ROUTER';
    script += `hostname ${hostname.replace(/\s+/g, '_')}\n`;
    script += `! Novo Link Selecionado: ${scriptParams.linkNovo || 'N/A'}\n`;
    script += `! Novo Owner Selecionado: ${scriptParams.ownerNovo || 'N/A'}\n`;
    script += `! Modelo Router Selecionado: ${scriptParams.router_model || 'N/A'}\n`;
    script += `! Serial Router (Novo): ${scriptParams.serialRouter || 'N/A'}\n`;
    script += `! Firmware Router (Novo): ${scriptParams.firmwareRouter || 'N/A'}\n`;
    script += `!\n`;
    script += `! Interface WAN (${scriptParams.linkNovo || 'N/A'})\n`;
    script += `interface GigabitEthernet0/0 ! Adaptar conforme modelo/necessidade\n`;
    script += ` ip address ${scriptParams.ipWanRouter || 'A.B.C.D E.F.G.H'}\n`;
    script += ` description LINK_PRINCIPAL_${(scriptParams.linkNovo || 'NOVO_LINK').replace(/\s+/g, '_')}\n`;
    script += ` no shutdown\n`;
    script += `!\n`;
    script += `! Interface LAN\n`;
    script += `interface GigabitEthernet0/1 ! Adaptar conforme modelo/necessidade\n`;
    script += ` ip address ${scriptParams.ipLanRouter || (dataForScript.rede_lan_subnet ? dataForScript.rede_lan_subnet.split('/')[0] + ' 255.255.255.X' : '192.168.1.1 255.255.255.0')} ! Tenta usar LAN da planilha ou um padrão\n`;
    script += ` no shutdown\n`;
    script += `!\n`;

    if (scriptParams.needs_switch === 'SIM') {
        script += `! Configuração do Switch Novo:\n`;
        script += `! Modelo Switch: ${scriptParams.modeloSwitch || 'N/A'}\n`;
        script += `! Serial Switch: ${scriptParams.serialSwitch || 'N/A'}\n`;
        script += `! Firmware Switch: ${scriptParams.firmwareSwitch || 'N/A'}\n`;
        script += `!\n`;
    }

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
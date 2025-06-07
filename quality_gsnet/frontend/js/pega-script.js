// frontend/js/pega-script.js
document.addEventListener('DOMContentLoaded', () => {
    // ... (constantes como antes: ulCodeInput, searchBtn, etc.)
    const ulCodeInput = document.getElementById('ul-code');
    const searchBtn = document.getElementById('search-btn');
    const generateScriptBtn = document.getElementById('generate-script-btn');
    const scriptOutputTextarea = document.getElementById('script-output');
    const ulSearchError = document.getElementById('ul-search-error');
    const copyScriptBtn = document.getElementById('copy-script-btn');
    const copySuccessMessage = document.getElementById('copy-success-message');
    const switchConditionalFields = document.querySelectorAll('.switch-conditional');
    const dynamicInfoContainer = document.getElementById('dynamic-info-container');
    const optionGroups = document.querySelectorAll('.button-options');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Mapeamento de nomes de colunas (CHAVES = Nomes EXATOS do Excel/Backend)
    // para nomes de exibição (VALORES = Como aparecem na tela)
    const columnDisplayMap = {
        'codigoulbuscavel': 'Código UL',         
        'desig_circ_pri': 'Design. Circ. Primário',
        'nomeponto': 'Nome Lotérica',
        'rede_lan_subnet': 'Rede LAN (SUBNET/28)',
        'loopback_principal': 'Loopback Principal',
        'loopback_contigencia': 'Loopback Contigência',
        'oficio_primario': 'Ofício Primário',
        'oficio_secundario': 'Ofício Secundário',
        'tipo': 'Tipo',
        'loopback_switch': 'Loopback Switch',
        'enderecocompleto': 'Endereço Completo',
        'cidade': 'Cidade',
        'uf': 'UF',
        'cep': 'CEP',
        'latencia_secundaria': 'Latência Secundária',
    };

    // Ordem em que os campos devem ser exibidos inicialmente.
    // Use as CHAVES do columnDisplayMap.
  const displayOrder = [
         ];

    // Funções toggleSwitchFields e getSelectedOptionValue (completas)
    function toggleSwitchFields(show) {
        switchConditionalFields.forEach(field => {
            field.style.display = show ? '' : 'none';
        });
    }

    function getSelectedOptionValue(groupName) {
        const group = document.querySelector(`.button-options[data-group-name="${groupName}"]`);
        if (group) {
            const selectedBtn = group.querySelector('.option-btn.selected');
            if (selectedBtn) return selectedBtn.dataset.value;
        }
        return null; 
    }

    optionGroups.forEach(group => {
        group.addEventListener('click', (event) => {
            if (event.target.classList.contains('option-btn')) {
                group.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
                event.target.classList.add('selected');
                if (group.dataset.groupName === 'needs_switch') {
                    toggleSwitchFields(event.target.dataset.value === 'SIM');
                }
            }
        });
    });
    const initialNeedsSwitch = getSelectedOptionValue('needs_switch');
    toggleSwitchFields(initialNeedsSwitch === 'SIM');

    // --- NOVA LÓGICA PARA TIPOS E CAMPOS CONDICIONAIS ---
    const tipoBtns = document.querySelectorAll('.button-options[data-group-name="tipo_script"] .option-btn');
    const tipo1Params = document.getElementById('tipo1-params');
    // (No futuro: const tipo2Params = document.getElementById('tipo2-params'); ...)
    const routerBtns = document.querySelectorAll('.button-options[data-group-name="router_model"] .option-btn');
    const huaweiVersionGroup = document.getElementById('huawei-version-group');
    const needsSwitchBtns = document.querySelectorAll('.button-options[data-group-name="needs_switch"] .option-btn');
    const switchVersionGroup = document.getElementById('switch-version-group');

    // Seleção exclusiva para TIPO
    tipoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tipoBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            // Só mostra os parâmetros do TIPO 1 por enquanto
            if (btn.dataset.value === 'TIPO 1') {
                tipo1Params.style.display = 'block';
                // (No futuro: tipo2Params.style.display = 'none'; ...)
            } else {
                tipo1Params.style.display = 'none';
            }
        });
    });

    // Seleção exclusiva para modelo do router
    routerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            routerBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            // Se for HUAWEI, mostra grupo de versão
            if (btn.dataset.value === 'HUAWEI') {
                huaweiVersionGroup.style.display = 'block';
            } else {
                huaweiVersionGroup.style.display = 'none';
            }
        });
    });

    // Seleção exclusiva para precisa de switch
    needsSwitchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            needsSwitchBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            // Se SIM, mostra grupo de versão do switch
            if (btn.dataset.value === 'SIM') {
                switchVersionGroup.style.display = 'block';
            } else {
                switchVersionGroup.style.display = 'none';
            }
        });
    });

    function createInfoItem(key, labelText, valueText = '-') {
        const infoItemDiv = document.createElement('div');
        infoItemDiv.classList.add('info-item');
        infoItemDiv.dataset.key = key; // Usar a chave original do backend/Excel

        const labelSpan = document.createElement('span');
        labelSpan.classList.add('info-label');
        labelSpan.textContent = `${labelText}:`;

        const valueSpan = document.createElement('span');
        valueSpan.classList.add('info-value');
        valueSpan.textContent = valueText;

        infoItemDiv.appendChild(labelSpan);
        infoItemDiv.appendChild(valueSpan);
        return infoItemDiv;
    }

    function displayInitialStructure() {
        if (!dynamicInfoContainer) return;
        const h3Title = dynamicInfoContainer.querySelector('h3');
        dynamicInfoContainer.innerHTML = ''; 
        if (h3Title) dynamicInfoContainer.appendChild(h3Title);

        displayOrder.forEach(keyFromDisplayOrder => {
            // O rótulo vem do mapeamento. A chave para data-key é a original.
            const labelText = columnDisplayMap[keyFromDisplayOrder] || keyFromDisplayOrder; // Fallback para a própria chave
            dynamicInfoContainer.appendChild(createInfoItem(keyFromDisplayOrder, labelText));
        });
    }

    function displayUlData(data) {
        console.log("Dados recebidos do backend para displayUlData:", data); // Log para depuração
        if (!dynamicInfoContainer) return;
        if (ulSearchError) ulSearchError.style.display = 'none';
        
        // Itera sobre os dados recebidos do backend
        for (const backendKey in data) {
            if (data.hasOwnProperty(backendKey)) {
                const value = (data[backendKey] !== undefined && data[backendKey] !== null && String(data[backendKey]).trim() !== '') ? data[backendKey] : '-';
                
                // Tenta encontrar um item existente no DOM que corresponda à chave do backend
                // Isso funciona se as chaves no displayOrder/columnDisplayMap são EXATAMENTE as mesmas do backendKey
                let itemDiv = dynamicInfoContainer.querySelector(`.info-item[data-key='${backendKey}']`);

                if (itemDiv) { // Se o item existe (foi criado pela displayInitialStructure)
                    const valueSpan = itemDiv.querySelector('.info-value');
                    if (valueSpan) {
                        valueSpan.textContent = value;
                    }
                } else { 
                    // Se o item não existia na estrutura inicial (não estava no displayOrder)
                    // Adiciona como um novo item, apenas se tiver um valor real
                    if (value !== '-') {
                        const labelText = columnDisplayMap[backendKey] || backendKey.replace(/([A-Z]+)/g, " $1").replace(/_/g, " ").replace(/^./, str => str.toUpperCase()); // Tenta pegar rótulo do mapa ou formata
                        dynamicInfoContainer.appendChild(createInfoItem(backendKey, labelText, value));
                    }
                }
            }
        }

        // Certifica-se que campos que estavam no displayOrder mas não vieram do backend fiquem com '-'
        displayOrder.forEach(keyFromDisplayOrder => {
            if (!data.hasOwnProperty(keyFromDisplayOrder)) {
                let itemDiv = dynamicInfoContainer.querySelector(`.info-item[data-key='${keyFromDisplayOrder}']`);
                if (itemDiv) {
                    const valueSpan = itemDiv.querySelector('.info-value');
                    if (valueSpan) {
                        valueSpan.textContent = '-';
                    }
                }
            }
        });
    }

    function clearUlData() {
        // Reseta todos os campos definidos em displayOrder para '-'
        displayOrder.forEach(keyFromDisplayOrder => {
            const itemDiv = dynamicInfoContainer.querySelector(`.info-item[data-key='${keyFromDisplayOrder}']`);
            if (itemDiv) {
                const valueSpan = itemDiv.querySelector('.info-value');
                if (valueSpan) {
                    valueSpan.textContent = '-';
                }
            }
        });

        // Remove itens que foram adicionados dinamicamente e NÃO estão no displayOrder
        const allItems = dynamicInfoContainer.querySelectorAll('.info-item');
        allItems.forEach(item => {
            if (!displayOrder.includes(item.dataset.key)) {
                item.remove();
            }
        });

        if (scriptOutputTextarea) scriptOutputTextarea.value = '';
        if (copyScriptBtn) copyScriptBtn.style.display = 'none';
        if (ulSearchError) ulSearchError.style.display = 'none';
    }

    displayInitialStructure();
    
    // --- Listener de Busca ---
    if (searchBtn && ulCodeInput && ulSearchError && dynamicInfoContainer) {
        searchBtn.addEventListener('click', async () => {
            const query = ulCodeInput.value.trim();
            if (!query) {
                clearUlData(); 
                ulSearchError.textContent = 'Por favor, digite Site (UL), Design. Circ. ou CPE para buscar.';
                ulSearchError.style.display = 'block';
                return;
            }
            clearUlData();
            
            // Mostrar loading
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            searchBtn.disabled = true;
            
            try {
                const response = await fetch(`/api/ul-data/${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (typeof data !== 'object' || data === null) {
                        ulSearchError.textContent = 'Resposta inesperada do servidor.';
                        ulSearchError.style.display = 'block';
                        return;
                    }
                    displayUlData(data);
                } else {
                    const errorData = await response.json().catch(() => ({ message: `Nenhum registro encontrado para "${query}" ou erro na resposta.` }));
                    ulSearchError.textContent = errorData.message || `Nenhum registro encontrado para "${query}".`;
                    ulSearchError.style.display = 'block';
                }
            } catch (error) {
                ulSearchError.textContent = 'Erro de comunicação ao buscar dados. Verifique o console.';
                ulSearchError.style.display = 'block';
                console.error('Erro ao buscar dados da UL:', error);
            } finally {
                // Esconder loading e reabilitar botão
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                searchBtn.disabled = false;
            }
        });
    }

    // --- Listener para Gerar Script ---
    if (generateScriptBtn && ulCodeInput && scriptOutputTextarea && copyScriptBtn) { 
        generateScriptBtn.addEventListener('click', async () => {
            const currentSearchTerm = ulCodeInput.value.trim(); 
            let hasRealData = false;
            const valueSpans = dynamicInfoContainer.querySelectorAll('.info-item .info-value');
            valueSpans.forEach(span => {
                if (span.textContent !== '-' && span.textContent.trim() !== '') {
                    hasRealData = true;
                }
            });

            if (!hasRealData || ulSearchError.style.display === 'block' || !currentSearchTerm) {
                alert('Por favor, busque e encontre uma Unidade Lotérica válida antes de gerar o script.');
                return;
            }
            
            const scriptParams = {
                 linkNovo: getSelectedOptionValue('linkNovo'),
                 ownerNovo: getSelectedOptionValue('ownerNovo'),
                 router_model: getSelectedOptionValue('router_model'),
                 needs_switch: getSelectedOptionValue('needs_switch'),
                 ipWanRouter: document.getElementById('input-ip-wan-router')?.value.trim() || '',
                 ipLanRouter: document.getElementById('input-ip-lan-router')?.value.trim() || '',
                 hostnameRouter: document.getElementById('input-hostname-router')?.value.trim() || '',
                 firmwareRouter: document.getElementById('input-firmware-router')?.value.trim() || '',
                 serialRouter: document.getElementById('input-serial-router')?.value.trim() || '',
                 observacoes: document.getElementById('input-observacoes')?.value.trim() || '',
                 modeloSwitch: '', // Inicializa
                 serialSwitch: '',   // Inicializa
                 firmwareSwitch: '', // Inicializa
            };

            if (scriptParams.needs_switch === 'SIM') {
                scriptParams.modeloSwitch = document.getElementById('input-modelo-switch')?.value.trim() || '';
                scriptParams.serialSwitch = document.getElementById('input-serial-switch')?.value.trim() || '';
                scriptParams.firmwareSwitch = document.getElementById('input-firmware-switch')?.value.trim() || '';
            }

            try {
                const response = await fetch('/api/generate-script', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify({ ulCode: currentSearchTerm, scriptParams: scriptParams }),
                });

                if (response.ok) {
                    const scriptText = await response.text();
                    scriptOutputTextarea.value = scriptText;
                    copyScriptBtn.style.display = scriptText.trim() !== "" ? 'inline-block' : 'none';
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erro ao gerar script ou resposta inválida.'}));
                    alert(`Erro ao gerar script: ${errorData.message || response.statusText}`);
                }
            } catch (error) {
                alert('Erro de comunicação ao gerar o script. Verifique o console.');
                console.error('Erro ao gerar script:', error);
            }
        });
    }
    
    // --- Funções de Cópia ---
    if (copyScriptBtn && scriptOutputTextarea && copySuccessMessage) {
        copyScriptBtn.addEventListener('click', () => {
            scriptOutputTextarea.select();
            scriptOutputTextarea.setSelectionRange(0, 99999); 
            try {
                navigator.clipboard.writeText(scriptOutputTextarea.value).then(() => {
                    copySuccessMessage.textContent = 'Script copiado com sucesso!';
                    copySuccessMessage.style.display = 'block';
                    setTimeout(() => { copySuccessMessage.style.display = 'none'; }, 2000);
                }).catch(err => { legacyCopy(); });
            } catch (err) { legacyCopy(); }
        });
    }

    function legacyCopy() { 
        let success = false;
        if (!scriptOutputTextarea || !copySuccessMessage) return;
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                copySuccessMessage.textContent = 'Script copiado (fallback)!';
                success = true;
            } else {
                copySuccessMessage.textContent = 'Falha ao copiar (fallback).';
            }
        } catch (err) { 
            copySuccessMessage.textContent = 'Erro ao copiar. Copie manualmente.';
            console.error('Fallback copy error:', err);
        }
        copySuccessMessage.classList.toggle('error-message', !success);
        copySuccessMessage.classList.toggle('success-message', success);
        copySuccessMessage.style.display = 'block';
        setTimeout(() => {
            copySuccessMessage.style.display = 'none';
            copySuccessMessage.classList.remove('error-message'); // Reset class
        }, 3000);
    }
});
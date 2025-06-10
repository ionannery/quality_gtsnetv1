// frontend/js/pega-script.js
document.addEventListener('DOMContentLoaded', () => {
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

    const columnDisplayMap = {
        'codigoulbuscavel': 'Código UL',
        'nomeponto': 'Nome Lotérica',
        'tipo': 'Tipo', // Movido para cima por relevância
        'desig_circ_pri': 'Design. Circ. Primário',
        'rede_lan_subnet': 'Rede LAN (SUBNET/28)',
        'loopback_principal': 'Loopback Principal',
        'loopback_contigencia': 'Loopback Contigência',
        'loopback_switch': 'Loopback Switch',
        'oficio_primario': 'Ofício Primário',
        'oficio_secundario': 'Ofício Secundário',
        'nome_agencia': 'Nome Agência',         // NOVO
        'n_agencia': 'Número Agência',       // NOVO
        'tfl': 'TFL',                        // NOVO
        'ciaus': 'CETEL',                      // NOVO
        'enderecocompleto': 'Endereço Completo',
        'cidade': 'Cidade',
        'uf': 'UF',
        'cep': 'CEP',
        'latencia_secundaria': 'Latência Secundária', // Mantido por último como exemplo
        // Adicione quaisquer outros novos mapeamentos aqui
    };

    // Ordem em que os campos devem ser exibidos inicialmente.
    // ATUALIZADO para incluir todos os campos do columnDisplayMap. Reordene conforme necessário.
    const displayOrder = [
        'codigoulbuscavel',
        'nomeponto',
        'tipo',
        'desig_circ_pri',
        'rede_lan_subnet',
        'loopback_principal',
        'loopback_contigencia',
        'loopback_switch',
        'oficio_primario',
        'oficio_secundario',
        'nome_agencia', // NOVO
        'n_agencia',  // NOVO
        'tfl',        // NOVO
        'ciaus',      // NOVO
        'enderecocompleto',
        'cidade',
        'uf',
        'cep',
        'latencia_secundaria',
        // Adicione quaisquer outras novas chaves do columnDisplayMap aqui na ordem desejada
    ];

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

    const tipoBtns = document.querySelectorAll('.button-options[data-group-name="tipo_script"] .option-btn');
    const tipo1Params = document.getElementById('tipo1-params');
    const routerBtns = document.querySelectorAll('.button-options[data-group-name="router_model"] .option-btn');
    const huaweiVersionGroup = document.getElementById('huawei-version-group');
    const needsSwitchBtns = document.querySelectorAll('.button-options[data-group-name="needs_switch"] .option-btn');
    const switchVersionGroup = document.getElementById('switch-version-group');

    tipoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tipoBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (btn.dataset.value === 'TIPO 1') {
                tipo1Params.style.display = 'block';
            } else {
                tipo1Params.style.display = 'none';
            }
        });
    });

    routerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            routerBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            huaweiVersionGroup.style.display = (btn.dataset.value === 'HUAWEI') ? 'block' : 'none';
        });
    });

    needsSwitchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            needsSwitchBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            switchVersionGroup.style.display = (btn.dataset.value === 'SIM') ? 'block' : 'none';
        });
    });

    function createInfoItem(key, labelText, valueText = '-') {
        const infoItemDiv = document.createElement('div');
        infoItemDiv.classList.add('info-item');
        infoItemDiv.dataset.key = key;

        const labelSpan = document.createElement('span');
        labelSpan.classList.add('info-label');
        labelSpan.textContent = `${labelText}:`;

        const valueSpan = document.createElement('span');
        valueSpan.classList.add('info-value');
        valueSpan.textContent = valueText;

        infoItemDiv.append(labelSpan, valueSpan);
        return infoItemDiv;
    }

    function displayInitialStructure() {
        if (!dynamicInfoContainer) return;
        const h3Title = dynamicInfoContainer.querySelector('h3');
        dynamicInfoContainer.innerHTML = '';
        if (h3Title) dynamicInfoContainer.appendChild(h3Title);

        displayOrder.forEach(keyFromDisplayOrder => {
            const labelText = columnDisplayMap[keyFromDisplayOrder] || keyFromDisplayOrder;
            dynamicInfoContainer.appendChild(createInfoItem(keyFromDisplayOrder, labelText));
        });
    }

    function displayUlData(data) {
        // console.log("Dados recebidos do backend para displayUlData:", data); // DESCOMENTE PARA DEBUG
        if (!dynamicInfoContainer) return;
        if (ulSearchError) ulSearchError.style.display = 'none';

        for (const backendKey in data) {
            if (data.hasOwnProperty(backendKey)) {
                const value = (data[backendKey] !== undefined && data[backendKey] !== null && String(data[backendKey]).trim() !== '') ? String(data[backendKey]).trim() : '-';
                let itemDiv = dynamicInfoContainer.querySelector(`.info-item[data-key='${backendKey}']`);

                if (itemDiv) {
                    const valueSpan = itemDiv.querySelector('.info-value');
                    if (valueSpan) valueSpan.textContent = value;
                } else {
                    // Adiciona apenas se não estiver no displayOrder E tiver um valor real
                    // E se realmente quisermos adicionar campos não previstos no displayOrder
                    if (value !== '-' && !displayOrder.includes(backendKey)) {
                         console.warn(`Campo '${backendKey}' recebido do backend não está no displayOrder. Adicionando dinamicamente.`);
                         const labelText = columnDisplayMap[backendKey] || backendKey.replace(/_/g, " ").replace(/^./, str => str.toUpperCase());
                         dynamicInfoContainer.appendChild(createInfoItem(backendKey, labelText, value));
                    } else if (value !== '-' && displayOrder.includes(backendKey)) {
                        // Isso não deveria acontecer se displayInitialStructure funcionou,
                        // mas como fallback, criaria o item se ele sumiu.
                        console.warn(`Campo '${backendKey}' está no displayOrder mas o div não foi encontrado. Recriando.`);
                        const labelText = columnDisplayMap[backendKey] || backendKey;
                        dynamicInfoContainer.appendChild(createInfoItem(backendKey, labelText, value));
                    }
                }
            }
        }

        // Garante que campos que estão no displayOrder mas não vieram do backend (ou vieram vazios)
        // tenham seu valor exibido como '-'
        displayOrder.forEach(keyInOrder => {
            if (!data.hasOwnProperty(keyInOrder) || (data.hasOwnProperty(keyInOrder) && (data[keyInOrder] === undefined || data[keyInOrder] === null || String(data[keyInOrder]).trim() === ''))) {
                let itemDiv = dynamicInfoContainer.querySelector(`.info-item[data-key='${keyInOrder}']`);
                if (itemDiv) {
                    const valueSpan = itemDiv.querySelector('.info-value');
                    if (valueSpan && valueSpan.textContent.trim() !== '-') { // Evita reescrever se já for '-'
                        valueSpan.textContent = '-';
                    }
                } else {
                    // Se por algum motivo o item não foi criado em displayInitialStructure, cria aqui com '-'
                     console.warn(`Campo '${keyInOrder}' do displayOrder não encontrado no DOM. Criando com valor '-'.`);
                     const labelText = columnDisplayMap[keyInOrder] || keyInOrder;
                     dynamicInfoContainer.appendChild(createInfoItem(keyInOrder, labelText, '-'));
                }
            }
        });
    }


    function clearUlData() {
        displayOrder.forEach(keyFromDisplayOrder => {
            const itemDiv = dynamicInfoContainer.querySelector(`.info-item[data-key='${keyFromDisplayOrder}']`);
            if (itemDiv) {
                const valueSpan = itemDiv.querySelector('.info-value');
                if (valueSpan) valueSpan.textContent = '-';
            }
        });

        // Opcional: Remover itens que não estão no displayOrder (se eles puderem ser adicionados dinamicamente)
        // Se displayOrder for a única fonte da verdade, este loop abaixo não é estritamente necessário
        // se displayInitialStructure e displayUlData estiverem corretos.
        // const allCurrentItems = dynamicInfoContainer.querySelectorAll('.info-item');
        // allCurrentItems.forEach(item => {
        //     if (!displayOrder.includes(item.dataset.key)) {
        //         item.remove();
        //     }
        // });

        if (scriptOutputTextarea) scriptOutputTextarea.value = '';
        if (copyScriptBtn) copyScriptBtn.style.display = 'none';
        if (ulSearchError) ulSearchError.style.display = 'none';
    }

    displayInitialStructure();

    if (searchBtn && ulCodeInput && ulSearchError && dynamicInfoContainer) {
        searchBtn.addEventListener('click', async () => {
            const query = ulCodeInput.value.trim();
            if (!query) {
                clearUlData();
                ulSearchError.textContent = 'Por favor, digite Site (UL), Design. Circ. ou CPE para buscar.';
                ulSearchError.style.display = 'block';
                return;
            }
            // Não é necessário chamar clearUlData() aqui, pois displayUlData vai atualizar ou criar.
            // Apenas garanta que o estado inicial (de displayInitialStructure) esteja correto.
            // Ou, se preferir um reset completo antes da nova busca:
            displayInitialStructure(); // Isso irá reconstruir a estrutura baseada no displayOrder.

            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            searchBtn.disabled = true;

            try {
                const response = await fetch(`/api/ul-data/${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    // console.log("DADOS RECEBIDOS DO BACKEND:", data); // DESCOMENTE PARA DEBUG
                    if (typeof data !== 'object' || data === null || Object.keys(data).length === 0) {
                        ulSearchError.textContent = `Nenhum dado encontrado para "${query}".`;
                        ulSearchError.style.display = 'block';
                        // Garante que a estrutura base seja exibida com '-' se nenhum dado for retornado
                        displayInitialStructure(); // Para garantir que os campos do displayOrder apareçam com '-'
                        return;
                    }
                    displayUlData(data);
                } else {
                    const errorData = await response.json().catch(() => ({ message: `Nenhum registro encontrado para "${query}" ou erro na resposta.` }));
                    ulSearchError.textContent = errorData.message || `Nenhum registro encontrado para "${query}".`;
                    ulSearchError.style.display = 'block';
                    displayInitialStructure(); // Exibe estrutura base com '-' em caso de erro
                }
            } catch (error) {
                ulSearchError.textContent = 'Erro de comunicação ao buscar dados. Verifique o console.';
                ulSearchError.style.display = 'block';
                console.error('Erro ao buscar dados da UL:', error);
                displayInitialStructure(); // Exibe estrutura base com '-' em caso de erro de comunicação
            } finally {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                searchBtn.disabled = false;
            }
        });
    }

    if (generateScriptBtn && ulCodeInput && scriptOutputTextarea && copyScriptBtn) {
        generateScriptBtn.addEventListener('click', async () => {
            const currentSearchTerm = ulCodeInput.value.trim();
            let hasRealData = false;
            const valueSpans = dynamicInfoContainer.querySelectorAll('.info-item .info-value');
            valueSpans.forEach(span => {
                if (span.textContent !== '-' && span.textContent.trim() !== '') hasRealData = true;
            });

            if (!hasRealData || ulSearchError.style.display === 'block' || !currentSearchTerm) {
                alert('Por favor, busque e encontre uma Unidade Lotérica válida antes de gerar o script.');
                return;
            }

            const scriptParams = {
                 linkNovo: getSelectedOptionValue('linkNovo'),
                 ownerNovo: getSelectedOptionValue('ownerNovo'),
                 router_model: getSelectedOptionValue('router_model'),
                 huawei_version: getSelectedOptionValue('router_model') === 'HUAWEI' ? getSelectedOptionValue('huawei_version') : null,
                 needs_switch: getSelectedOptionValue('needs_switch'),
                 switch_version: getSelectedOptionValue('needs_switch') === 'SIM' ? getSelectedOptionValue('switch_version') : null,
                 ipWanRouter: document.getElementById('input-ip-wan-router')?.value.trim() || '',
                 ipLanRouter: document.getElementById('input-ip-lan-router')?.value.trim() || '',
                 hostnameRouter: document.getElementById('input-hostname-router')?.value.trim() || '',
                 firmwareRouter: document.getElementById('input-firmware-router')?.value.trim() || '',
                 serialRouter: document.getElementById('input-serial-router')?.value.trim() || '',
                 observacoes: document.getElementById('input-observacoes')?.value.trim() || '',
                 modeloSwitch: '', serialSwitch: '', firmwareSwitch: '',
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
            scriptOutputTextarea.select(); // Certifique-se de selecionar antes do execCommand
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
            copySuccessMessage.classList.remove('error-message', 'success-message');
        }, 3000);
    }
});
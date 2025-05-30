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

    // Lógica para os botões de opção
    const optionGroups = document.querySelectorAll('.button-options');
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
    
    function toggleSwitchFields(show) {
        switchConditionalFields.forEach(field => {
            field.style.display = show ? '' : 'none';
        });
    }
    const initialNeedsSwitch = getSelectedOptionValue('needs_switch');
    toggleSwitchFields(initialNeedsSwitch === 'SIM');

    function getSelectedOptionValue(groupName) {
        const group = document.querySelector(`.button-options[data-group-name=\\\"${groupName}\\\"]`);
        if (group) {
            const selectedBtn = group.querySelector('.option-btn.selected');
            if (selectedBtn) return selectedBtn.dataset.value;
        }
        return null; 
    }

    function displayUlData(data) {
        document.getElementById('info-ponto-logico-designacao').textContent = data.PontoLogicoDesignacao || data.codigoUlBuscavel || '-';
        document.getElementById('info-nome-ponto').textContent = data.NomePonto || '-';
        document.getElementById('info-cep').textContent = data.CEP || '-';
        document.getElementById('info-endereco-completo').textContent = data.EnderecoCompleto || '-';
        document.getElementById('info-cidade').textContent = data.Cidade || '-';
        document.getElementById('info-uf').textContent = data.UF || '-';
        document.getElementById('info-lan').textContent = data.LAN || '-';
        document.getElementById('info-porta-config').textContent = data.Porta191224 || '-';
        document.getElementById('info-switch-equipamento').textContent = data.SwitchEquipamento || '-';
        document.getElementById('info-responsavel-entrega-link').textContent = data.ResponsavelEntregaLink || '-';
        document.getElementById('info-designacao-circuito').textContent = data.DesignacaoCircuito || '-';
        document.getElementById('info-cpe').textContent = data.CPE || '-';
        document.getElementById('info-switch-adicional').textContent = data.SWiTCHConfig || '-';
        ulSearchError.style.display = 'none';
    }

    function clearUlData() {
        const idsToClear = [
            'info-ponto-logico-designacao', 'info-nome-ponto', 'info-cep', 
            'info-endereco-completo', 'info-cidade', 'info-uf', 'info-lan', 
            'info-porta-config', 'info-switch-equipamento', 'info-responsavel-entrega-link', 
            'info-designacao-circuito', 'info-cpe', 'info-switch-adicional'
        ];
        idsToClear.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
        scriptOutputTextarea.value = '';
        copyScriptBtn.style.display = 'none';
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const query = ulCodeInput.value.trim();
            if (!query) {
                clearUlData();
                ulSearchError.textContent = 'Por favor, digite Ponto Lógico/Designação ou CPE para buscar.'; // MENSAGEM INPUT ATUALIZADA
                ulSearchError.style.display = 'block';
                return;
            }
            try {
                const response = await fetch(`/api/ul-data/${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    displayUlData(data);
                } else {
                    clearUlData();
                    const errorData = await response.json();
                    // MENSAGEM DE ERRO ATUALIZADA
                    ulSearchError.textContent = errorData.message || `Nenhum registro encontrado para \\\"${query}\\\".`; 
                    ulSearchError.style.display = 'block';
                }
            } catch (error) {
                console.error('Erro ao buscar dados da UL:', error);
                clearUlData();
                ulSearchError.textContent = 'Erro de comunicação ao buscar dados. Verifique o console.';
                ulSearchError.style.display = 'block';
            }
        });
    }

    if (generateScriptBtn) {
        generateScriptBtn.addEventListener('click', async () => {
            const currentSearchTerm = ulCodeInput.value.trim(); 
            if (document.getElementById('info-nome-ponto').textContent === '-' || !currentSearchTerm) {
                alert('Por favor, busque e selecione uma Unidade Lotérica válida antes de gerar o script.');
                return;
            }
            
            const scriptParams = {
                linkNovo: getSelectedOptionValue('linkNovo'),
                ownerNovo: getSelectedOptionValue('ownerNovo'),
                router_model: getSelectedOptionValue('router_model'),
                needs_switch: getSelectedOptionValue('needs_switch'),
                ipWanRouter: document.getElementById('input-ip-wan-router').value.trim(),
                ipLanRouter: document.getElementById('input-ip-lan-router').value.trim(),
                hostnameRouter: document.getElementById('input-hostname-router').value.trim(),
                firmwareRouter: document.getElementById('input-firmware-router').value.trim(),
                serialRouter: document.getElementById('input-serial-router').value.trim(),
                observacoes: document.getElementById('input-observacoes').value.trim(),
            };

            if (scriptParams.needs_switch === 'SIM') {
                scriptParams.modeloSwitch = document.getElementById('input-modelo-switch').value.trim();
                scriptParams.serialSwitch = document.getElementById('input-serial-switch').value.trim();
                scriptParams.firmwareSwitch = document.getElementById('input-firmware-switch').value.trim();
            } else {
                scriptParams.modeloSwitch = '';
                scriptParams.serialSwitch = '';
                scriptParams.firmwareSwitch = '';
            }

            try {
                // Envia o termo de busca original para o backend
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
                    const errorData = await response.json();
                    alert(`Erro ao gerar script: ${errorData.message || response.statusText}`);
                    scriptOutputTextarea.value = `Erro ao gerar script: ${errorData.message || response.statusText}`;
                    copyScriptBtn.style.display = 'none';
                }
            } catch (error) {
                console.error('Erro ao gerar script:', error);
                alert('Erro de comunicação ao gerar o script. Verifique o console.');
                scriptOutputTextarea.value = 'Erro de comunicação. Verifique o console.';
                copyScriptBtn.style.display = 'none';
            }
        });
    }
    
    // Funções de cópia (copyScriptBtn event listener e legacyCopy) - MANTIDAS DA VERSÃO ANTERIOR
    if (copyScriptBtn) {
        copyScriptBtn.addEventListener('click', () => {
            scriptOutputTextarea.select();
            scriptOutputTextarea.setSelectionRange(0, 99999); 

            try {
                navigator.clipboard.writeText(scriptOutputTextarea.value).then(() => {
                    copySuccessMessage.textContent = 'Script copiado com sucesso!';
                    copySuccessMessage.style.display = 'block';
                    setTimeout(() => {
                        copySuccessMessage.style.display = 'none';
                    }, 2000);
                }).catch(err => { //NOSONAR
                    legacyCopy();
                });
            } catch (err) { //NOSONAR
                legacyCopy();
            }
        });
    }

    function legacyCopy() {
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                copySuccessMessage.textContent = 'Script copiado (fallback)!';
                copySuccessMessage.style.display = 'block';
            } else {
                copySuccessMessage.textContent = 'Falha ao copiar (fallback).';
                copySuccessMessage.classList.remove('success-message');
                copySuccessMessage.classList.add('error-message');
                copySuccessMessage.style.display = 'block';
            }
        } catch (err) { //NOSONAR
            copySuccessMessage.textContent = 'Erro ao copiar. Copie manualmente.';
            copySuccessMessage.classList.remove('success-message');
            copySuccessMessage.classList.add('error-message');
            copySuccessMessage.style.display = 'block';
            console.error('Fallback copy error:', err);
        } finally {
            setTimeout(() => {
                copySuccessMessage.style.display = 'none';
                copySuccessMessage.classList.remove('error-message');
                copySuccessMessage.classList.add('success-message');
            }, 3000);
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loteria-form');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    // Paleta de cores inspirada no documento anexado, mas com toques de laranja
    const PDF_COLORS = {
        // Cores principais
        dark_gray: '#333333',
        dark_gray_rgb: [51, 51, 51],
        medium_gray: '#666666',
        medium_gray_rgb: [102, 102, 102],
        light_gray: '#CCCCCC',
        light_gray_rgb: [204, 204, 204],
        very_light_gray: '#F5F5F5',
        very_light_gray_rgb: [245, 245, 245],
        
        // Cores de destaque
        orange: '#F39C12',
        orange_rgb: [243, 156, 18],
        light_orange: '#FDEBD0',
        light_orange_rgb: [253, 235, 208],
        
        // Cores utilitárias
        white: '#FFFFFF',
        white_rgb: [255, 255, 255],
        black: '#000000', // Cor preta para bordas
        black_rgb: [0, 0, 0], // RGB para preto
        
        // Cores para alertas/erros
        red: '#E74C3C',
        red_rgb: [231, 76, 60]
    };

    // Assegure que jsPDF e autoTable estão carregados
    // Verificação 1: Biblioteca principal jsPDF
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error('jsPDF (core) not loaded!');
        if(generatePdfBtn) generatePdfBtn.disabled = true;
        // Usar um alerta customizado ou mensagem no DOM em vez de alert()
        displayGlobalMessage('Erro: A biblioteca principal de PDF (jsPDF) não pôde ser carregada. A geração de PDF está desabilitada.', 'error');
        return;
    }

    // Atribui o construtor jsPDF a uma constante para uso claro
    const { jsPDF } = window.jspdf; // window.jspdf.jsPDF é o construtor quando UMD é usado

    // Verificação 2: Plugin jsPDF-AutoTable
    // Crie uma instância temporária do jsPDF para verificar se o método autoTable está disponível
    const tempDoc = new jsPDF(); // Usa o construtor jsPDF obtido
    if (typeof tempDoc.autoTable !== 'function') {
         console.error('jsPDF-AutoTable not loaded or not attached to jsPDF prototype!');
        if(generatePdfBtn) generatePdfBtn.disabled = true;
        displayGlobalMessage('Erro: O plugin de tabelas para PDF (jsPDF-AutoTable) não pôde ser carregado. A geração de PDF está desabilitada.', 'error');
        return;
    }

    // --- Helper para mensagens globais (substitui alert) ---
    function displayGlobalMessage(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.textContent = message;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.left = '50%';
        alertDiv.style.transform = 'translateX(-50%)';
        alertDiv.style.padding = '15px';
        alertDiv.style.borderRadius = 'var(--border-radius)';
        alertDiv.style.boxShadow = 'var(--box-shadow)';
        alertDiv.style.zIndex = '1001'; // Acima de outros elementos
        alertDiv.style.textAlign = 'center';
        alertDiv.style.maxWidth = '90%';

        if (type === 'error') {
            alertDiv.style.backgroundColor = 'var(--danger-color)';
            alertDiv.style.color = 'white';
        } else if (type === 'success') {
            alertDiv.style.backgroundColor = 'var(--success-color)';
            alertDiv.style.color = 'white';
        } else {
            alertDiv.style.backgroundColor = 'var(--primary-color)';
            alertDiv.style.color = 'white';
        }
        
        document.body.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }


    // --- Image Preview Logic ---
    const imageInputs = [
        { inputId: 'imagem-evidencia-1', previewId: 'preview-imagem-1' },
        { inputId: 'imagem-evidencia-2', previewId: 'preview-imagem-2' },
        { inputId: 'imagem-evidencia-3', previewId: 'preview-imagem-3' },
        { inputId: 'imagem-evidencia-4', previewId: 'preview-imagem-4' },
    ];

    imageInputs.forEach(item => {
        const inputElement = document.getElementById(item.inputId);
        const previewElement = document.getElementById(item.previewId);
        if (inputElement && previewElement) {
            inputElement.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        previewElement.src = e.target.result;
                        previewElement.style.display = 'block';
                    }
                    reader.readAsDataURL(file);
                } else {
                    previewElement.src = '#';
                    previewElement.style.display = 'none';
                }
            });
        }
    });


    // --- Form Validation ---
    const numericFieldsToValidate = [
        // Primary
        { id: 'latencia-principal', max: 150, message: 'Latência Principal deve ser <= 150ms.' },
        { id: 'perda-pacotes-principal', max: 1, step: 0.1, message: 'Perda de Pacotes Principal deve ser <= 1%.' },
        { id: 'comutacao-secundario', max: 60, message: 'Comutação p/ Secundário deve ser <= 60s.' },
        { id: 'largura-banda-principal', min: 512, message: 'Largura de Banda Principal deve ser >= 512 Kbps.' },
        // Secondary
        { id: 'latencia-secundario', max: 400, message: 'Latência Contingência deve ser <= 400ms.' },
        { id: 'perda-pacotes-secundario', max: 1, step: 0.1, message: 'Perda de Pacotes Contingência deve ser <= 1%.' },
        { id: 'comutacao-principal', max: 60, message: 'Comutação p/ Principal deve ser <= 60s.' },
        { id: 'largura-banda-secundario', min: 512, message: 'Largura de Banda Contingência deve ser >= 512 Kbps.' }
    ];
    
    numericFieldsToValidate.forEach(fieldInfo => {
        const inputElement = document.getElementById(fieldInfo.id);
        if (inputElement) {
            inputElement.addEventListener('input', () => {
                validateNumericField(inputElement, fieldInfo);
            });
        }
    });

    function validateNumericField(inputElement, rules) {
        const value = parseFloat(inputElement.value);
        const errorElement = document.getElementById(`${rules.id}-error`);
        let isValid = true;
        let errorMessage = '';

        if (inputElement.value.trim() === '') { // Allow empty
             if (errorElement) errorElement.textContent = '';
             inputElement.classList.remove('invalid');
            return true; // Consider empty as valid for now, required check is separate
        }

        if (isNaN(value)) {
            isValid = false;
            errorMessage = 'Deve ser um número.';
        } else {
            if (rules.max !== undefined && value > rules.max) {
                isValid = false;
                errorMessage = rules.message;
            }
            if (rules.min !== undefined && value < rules.min) {
                isValid = false;
                errorMessage = rules.message;
            }
        }

        if (errorElement) {
            errorElement.textContent = isValid ? '' : errorMessage;
        }
        inputElement.classList.toggle('invalid', !isValid);
        return isValid;
    }
    
    function validateAllFields() {
        let allValid = true;
        numericFieldsToValidate.forEach(fieldInfo => {
            const inputElement = document.getElementById(fieldInfo.id);
            if (inputElement && !validateNumericField(inputElement, fieldInfo)) {
                allValid = false;
            }
        });

        const requiredTextInputs = [
            'data', 'oficio', 'codigo-ul', 'nome-ul', 'designador', 
            'acesso-wan-principal', 'tecnologia-principal', 'ip-loopback-principal', 'ip-loopback-switch',
            'acesso-ultima-milha-principal', 'tempo-convergencia-tfl'
        ];

        requiredTextInputs.forEach(id => {
            const input = document.getElementById(id);
            const errorElId = `${id}-error`; 
            let errorEl = document.getElementById(errorElId);

            if(input && input.value.trim() === '') {
                input.classList.add('invalid');
                if (!errorEl && input.parentNode) { 
                    errorEl = document.createElement('small');
                    errorEl.id = errorElId;
                    errorEl.className = 'validation-message error';
                    if (input.nextSibling) {
                        input.parentNode.insertBefore(errorEl, input.nextSibling);
                    } else {
                        input.parentNode.appendChild(errorEl);
                    }
                }
                if(errorEl) errorEl.textContent = 'Campo obrigatório.';
                allValid = false;
            } else if (input) {
                input.classList.remove('invalid');
                 if(errorEl) errorEl.textContent = '';
            }
        });
        return allValid;
    }

    // --- PDF Generation ---
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', async () => { 
            if (!validateAllFields()) {
                displayGlobalMessage('Por favor, corrija os erros no formulário antes de gerar o PDF. Campos obrigatórios não preenchidos ou com valores inválidos estão destacados.', 'error');
                return;
            }

            const doc = new jsPDF({ 
                orientation: 'p', 
                unit: 'mm', 
                format: 'a4' 
            });

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key.replace(/-/g, '_')] = value; 
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            let yPos = margin;

            const drawHeaderRectangle = (textLines, x, y, width, docInstance, options = {}) => {
                const fontSize = options.fontSize || 12;
                const fontStyle = options.fontStyle || 'bold';
                const align = options.align || 'center';
                const padding = options.padding || 3; 
                const vPadding = options.vPadding || padding; 
                const lineHeightFactor = 1.2;
                const fillColor = options.fillColor || null;
                const textColor = options.textColor || PDF_COLORS.dark_gray_rgb;
                const borderColor = options.borderColor || PDF_COLORS.black_rgb; // Alterado para preto
                const borderWidth = options.borderWidth || 0.2;

                docInstance.setFontSize(fontSize);
                docInstance.setFont(undefined, fontStyle);

                if (!Array.isArray(textLines)) {
                    textLines = [textLines];
                }
                
                const textBlockHeight = (textLines.length * fontSize * 0.352778 * lineHeightFactor) - ((fontSize * 0.352778 * lineHeightFactor) - (fontSize * 0.352778)); 
                const rectHeight = textBlockHeight + (vPadding * 2);

                docInstance.setDrawColor.apply(docInstance, borderColor);
                docInstance.setLineWidth(borderWidth);
                
                if (fillColor) {
                    docInstance.setFillColor.apply(docInstance, fillColor);
                    docInstance.rect(x, y, width, rectHeight, 'FD');
                } else {
                    docInstance.rect(x, y, width, rectHeight);
                }

                docInstance.setTextColor.apply(docInstance, textColor);
                
                let currentY = y + vPadding + (fontSize * 0.352778);

                textLines.forEach(line => {
                    const textWidth = docInstance.getStringUnitWidth(line) * fontSize / docInstance.internal.scaleFactor;
                    let textX = x + (width / 2); 
                    if (align === 'left') {
                        textX = x + padding;
                    } else if (align === 'right') {
                        textX = x + width - padding - textWidth;
                    }
                    docInstance.text(line, textX, currentY, { align: align });
                    currentY += (fontSize * 0.352778 * lineHeightFactor);
                });
                
                docInstance.setTextColor.apply(docInstance, PDF_COLORS.dark_gray_rgb);
                
                return y + rectHeight; 
            };
            
            const addEvidenceText = (label, textContent, x, startY, docInstance, maxWidth) => {
                let currentY = startY;
                
                docInstance.setFontSize(10);
                docInstance.setFont(undefined, 'bold');
                docInstance.setTextColor.apply(docInstance, PDF_COLORS.orange_rgb);
                docInstance.text(label, x, currentY);
                currentY += 6; 

                docInstance.setFont(undefined, 'normal');
                docInstance.setFontSize(8.5);
                docInstance.setTextColor.apply(docInstance, PDF_COLORS.dark_gray_rgb);
                
                const textToSplit = textContent || "-";
                const splitText = docInstance.splitTextToSize(textToSplit, maxWidth - x);

                splitText.forEach(line => {
                    if (currentY > pageHeight - margin - 5) { 
                        docInstance.addPage();
                        currentY = margin;
                        docInstance.setFontSize(10);
                        docInstance.setFont(undefined, 'bold');
                        docInstance.setTextColor.apply(docInstance, PDF_COLORS.orange_rgb);
                        docInstance.text(label + " (continuação)", x, currentY);
                        currentY += 6;
                        docInstance.setFontSize(8.5);
                        docInstance.setFont(undefined, 'normal');
                        docInstance.setTextColor.apply(docInstance, PDF_COLORS.dark_gray_rgb);
                    }
                    docInstance.text(line, x, currentY);
                    currentY += 3.5;
                });
                
                return currentY + 4;
            };

            yPos = drawHeaderRectangle(
                ["DOCUMENTO DE TRANSFORMAÇÃO", "DE UNIDADE LOTÉRICAS"], 
                margin, yPos, pageWidth - (margin * 2), doc, 
                { 
                    fontSize: 14, 
                    vPadding: 5,
                    fillColor: PDF_COLORS.orange_rgb,
                    textColor: PDF_COLORS.white_rgb,
                    borderColor: PDF_COLORS.black_rgb // Alterado para preto
                }
            );
            yPos += 3; 

            const ulInfo = `${data.codigo_ul || "CODIGO_UL"} - ${data.nome_ul || "NOME_UL"}`;
            yPos = drawHeaderRectangle(
                [ulInfo.toUpperCase()],
                margin, yPos, pageWidth - (margin * 2), doc, 
                { 
                    fontSize: 11, 
                    vPadding: 4,
                    fillColor: PDF_COLORS.very_light_gray_rgb,
                    textColor: PDF_COLORS.dark_gray_rgb,
                    borderColor: PDF_COLORS.black_rgb // Alterado para preto
                }
            );
            yPos += 7; 

            const primaryDataBody = [
                ["Data:", data.data ? new Date(data.data + 'T00:00:00').toLocaleDateString('pt-BR') : "-"],
                ["Número do Ofício:", data.oficio || "-"],
                ["Código Unidade Lotérica:", data.codigo_ul || "-"],
                ["Nome UL:", data.nome_ul || "-"],
                ["Designador:", data.designador || "-"],
                ["Acesso WAN:", data.acesso_wan_principal || "-"],
                ["Tecnologia:", data.tecnologia_principal || "-"],
                ["Latência Principal Medida (até 150ms):", `${data.latencia_principal || '-'} ms`],
                ["Perda de Pacotes Medida (até 1%):", `${data.perda_pacotes_principal || '-'} %`],
                ["Comutação para Secundário (até 60s):", `${data.comutacao_secundario || '-'} s`],
                ["Largura de Banda (mínima 512 Kbps):", `${data.largura_banda_principal || '-'} Kbps`],
                ["IP Loopback Principal:", data.ip_loopback_principal || "-"],
                ["IP Loopback Switch:", data.ip_loopback_switch || "-"],
                ["SDWAN:", data.sdwan_principal || "-"],
                ["Acesso Última Milha - Principal:", data.acesso_ultima_milha_principal || "-"],
                ["Instalação novo Nobreak:", data.nobreak === "true" ? "Sim" : "Não"],
            ];

            doc.autoTable({
                startY: yPos,
                head: [],
                body: primaryDataBody,
                theme: 'grid', 
                styles: {
                    fontSize: 9,
                    cellPadding: 2, 
                    lineColor: PDF_COLORS.black_rgb, // Alterado para preto
                    lineWidth: 0.1,
                    font: 'helvetica', 
                    textColor: PDF_COLORS.dark_gray_rgb
                },
                columnStyles: {
                    0: { 
                        fontStyle: 'bold', 
                        cellWidth: 65,
                        fillColor: PDF_COLORS.very_light_gray_rgb
                    }, 
                    1: { 
                        cellWidth: 'auto', 
                        fontStyle: 'normal',
                        fillColor: PDF_COLORS.white_rgb
                    } 
                },
                margin: { left: margin, right: margin },
                tableWidth: 'auto', 
            });
            yPos = doc.lastAutoTable.finalY + 10; 

            const hasSecondaryData = data.data_secundario || data.oficio_secundario || data.designador_secundario || data.tecnologia_secundario || data.latencia_secundario || data.perda_pacotes_secundario || data.comutacao_principal || data.largura_banda_secundario || data.ip_loopback_secundario || data.acesso_ultima_milha_secundario;

            if (hasSecondaryData) {
                if (yPos + 80 > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                } else {
                     yPos += 5;
                }
                
                yPos = drawHeaderRectangle(
                    ["DADOS ACESSO SECUNDÁRIO / CONTINGÊNCIA"],
                    margin, yPos, pageWidth - (margin * 2), doc, 
                    { 
                        fontSize: 12, 
                        vPadding: 4,
                        fillColor: PDF_COLORS.light_orange_rgb,
                        textColor: PDF_COLORS.dark_gray_rgb,
                        borderColor: PDF_COLORS.black_rgb // Alterado para preto
                    }
                );
                yPos += 7;

                const secondaryDataBody = [
                    ["Data:", data.data_secundario ? new Date(data.data_secundario + 'T00:00:00').toLocaleDateString('pt-BR') : "-"],
                    ["Número do Ofício:", data.oficio_secundario || "-"],
                    ["Código Unidade Lotérica:", data.codigo_ul_secundario || data.codigo_ul || "-"],
                    ["Nome UL:", data.nome_ul_secundario || data.nome_ul || "-"], 
                    ["Designador:", data.designador_secundario || "-"],
                    ["Acesso WAN:", data.acesso_wan_secundario || "-"],
                    ["Tecnologia:", data.tecnologia_secundario || "-"],
                    ["Latência Contingência Medida (até 400ms):", `${data.latencia_secundario || '-'} ms`],
                    ["Perda de Pacotes Medida (até 1%):", `${data.perda_pacotes_secundario || '-'} %`],
                    ["Comutação para Principal (até 60s):", `${data.comutacao_principal || '-'} s`],
                    ["Largura de Banda (mínima 512 Kbps):", `${data.largura_banda_secundario || '-'} Kbps`],
                    ["IP Loopback Contingência:", data.ip_loopback_secundario || "-"],
                    ["IP Loopback Switch:", data.ip_loopback_switch_secundario || data.ip_loopback_switch || "-"], 
                    ["SDWAN:", data.sdwan_secundario || "-"],
                    ["Acesso Última Milha:", data.acesso_ultima_milha_secundario || "-"],
                ];

                doc.autoTable({
                    startY: yPos,
                    head: [],
                    body: secondaryDataBody,
                    theme: 'grid',
                    styles: { 
                        fontSize: 9, 
                        cellPadding: 2, 
                        lineColor: PDF_COLORS.black_rgb, // Alterado para preto
                        lineWidth: 0.1, 
                        font: 'helvetica',
                        textColor: PDF_COLORS.dark_gray_rgb
                    },
                    columnStyles: {
                        0: { 
                            fontStyle: 'bold', 
                            cellWidth: 65,
                            fillColor: PDF_COLORS.very_light_gray_rgb
                        },
                        1: { 
                            cellWidth: 'auto', 
                            fontStyle: 'normal',
                            fillColor: PDF_COLORS.white_rgb
                        }
                    },
                    margin: { left: margin, right: margin },
                    tableWidth: 'auto',
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }

            if (yPos + 50 > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            } else {
                yPos += 5; 
            }

            yPos = drawHeaderRectangle(
                ["EVIDÊNCIAS"],
                margin, yPos, pageWidth - (margin * 2), doc, 
                { 
                    fontSize: 14, 
                    vPadding: 5,
                    fillColor: PDF_COLORS.orange_rgb,
                    textColor: PDF_COLORS.white_rgb,
                    borderColor: PDF_COLORS.black_rgb // Alterado para preto
                }
            );
            yPos += 3;

            yPos = drawHeaderRectangle(
                [data.tempo_convergencia_tfl || "Tempo de Convergência - TFL (ARP) - DATA E HORÁRIO NÃO INFORMADO"],
                margin, yPos, pageWidth - (margin * 2), doc, 
                { 
                    fontSize: 10, 
                    fontStyle: 'normal', 
                    vPadding: 4,
                    fillColor: PDF_COLORS.very_light_gray_rgb,
                    textColor: PDF_COLORS.dark_gray_rgb,
                    borderColor: PDF_COLORS.black_rgb // Alterado para preto
                }
            );
            yPos += 7;

            const evidenceFields = [
                { label: "TESTE DE COMUTAÇÃO", value: data.evidencia_teste_comutacao },
                { label: "TESTE DE LATENCIA PRINCIPAL", value: data.evidencia_latencia_principal },
                { label: "TESTE DE LATENCIA BACKUP", value: data.evidencia_latencia_backup },
                { label: "DISP ARP PRINCIPAL", value: data.evidencia_disparp_principal },
                { label: "DISP ARP BACKUP", value: data.evidencia_disparp_backup },
                { label: "DISP CLOCK PRINCIPAL", value: data.evidencia_disp_clock_principal },
                { label: "DISP CLOCK BACKUP", value: data.evidencia_disp_clock_backup },
            ];

            evidenceFields.forEach(field => {
                if (!field.value || field.value.trim() === "") return;

                const labelHeight = 6; 
                const textLines = doc.splitTextToSize(field.value || "-", pageWidth - (margin * 2));
                const textBlockHeight = textLines.length * 3.5; 
                const totalBlockHeight = labelHeight + textBlockHeight + 4; 

                if (yPos + totalBlockHeight > pageHeight - margin) { 
                    doc.addPage();
                    yPos = margin;
                }
                yPos = addEvidenceText(field.label, field.value, margin, yPos, doc, pageWidth - margin);
            });
            
            const imageFiles = [
                document.getElementById('imagem-evidencia-1').files[0],
                document.getElementById('imagem-evidencia-2').files[0],
                document.getElementById('imagem-evidencia-3').files[0],
                document.getElementById('imagem-evidencia-4').files[0],
            ].filter(file => file); 

            if (imageFiles.length > 0) {
                if (yPos + 20 > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                
                yPos = drawHeaderRectangle(
                    ["FOTOS"],
                    margin, yPos, pageWidth - (margin * 2), doc, 
                    { 
                        fontSize: 14, 
                        vPadding: 5,
                        fillColor: PDF_COLORS.orange_rgb,
                        textColor: PDF_COLORS.white_rgb,
                        borderColor: PDF_COLORS.black_rgb // Alterado para preto
                    }
                );
                yPos += 8; 

                for (const file of imageFiles) {
                    try {
                        const imageDataUrl = await readFileAsDataURL(file);
                        const imgProps = doc.getImageProperties(imageDataUrl);
                        
                        const imgMaxHeight = 80;
                        const imgMaxWidth = pageWidth - (margin * 2); 
                        
                        let imgHeight = imgProps.height;
                        let imgWidth = imgProps.width;

                        const widthRatio = imgMaxWidth / imgWidth;
                        const heightRatio = imgMaxHeight / imgHeight;
                        const dominantRatio = Math.min(widthRatio, heightRatio);

                        imgWidth = imgWidth * dominantRatio;
                        imgHeight = imgHeight * dominantRatio;
                        
                        if (yPos + imgHeight + 7 > pageHeight - margin) {
                            doc.addPage();
                            yPos = margin;
                        }
                        
                        const imgX = (pageWidth - imgWidth) / 2;
                        doc.addImage(imageDataUrl, imgProps.fileType, imgX, yPos, imgWidth, imgHeight);
                        yPos += imgHeight + 7; 

                    } catch (error) {
                        console.error("Erro ao processar imagem:", error);
                        if (yPos > pageHeight - margin - 10) {
                            doc.addPage();
                            yPos = margin;
                        }
                        doc.setFontSize(8);
                        doc.setTextColor.apply(doc, PDF_COLORS.red_rgb); 
                        doc.text(`Erro ao carregar imagem: ${file.name}`, margin, yPos);
                        doc.setTextColor.apply(doc, PDF_COLORS.dark_gray_rgb); 
                        yPos += 5;
                    }
                }
            }

            // Adiciona números de página, rodapé E A BORDA DA PÁGINA
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                // Desenha a borda preta ao redor da página
                doc.setDrawColor.apply(doc, PDF_COLORS.black_rgb); // Cor preta
                doc.setLineWidth(0.3); // Espessura da linha (0.3mm)
                doc.rect(margin, margin, pageWidth - (2 * margin), pageHeight - (2 * margin)); // Desenha o retângulo

                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor.apply(doc, PDF_COLORS.medium_gray_rgb); 
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    pageWidth - margin,
                    pageHeight - 10,
                    { align: 'right' }
                );
                 doc.text(
                    `Quality GTSNet - ${data.codigo_ul || 'UL'} - ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
                    margin,
                    pageHeight - 10
                );
            }

            try {
                const fileName = `Relatorio_Transformacao_${data.codigo_ul || 'CODUL'}_${(data.data || new Date().toISOString().slice(0,10))}.pdf`;
                doc.save(fileName);
                displayGlobalMessage(`PDF "${fileName}" gerado com sucesso!`, 'success');
            } catch (saveError) {
                console.error("Erro ao salvar o PDF:", saveError);
                displayGlobalMessage('Erro ao salvar o PDF. Verifique o console para mais detalhes.', 'error');
            }
        });
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
});
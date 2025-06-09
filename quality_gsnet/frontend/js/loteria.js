document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loteria-form');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    // Paleta de cores inspirada no documento anexado, mas com toques de laranja
    const PDF_COLORS = {
        // Cores principais
        dark_gray: '#333333',
        dark_gray_rgb: [51, 51, 51],
        medium_gray: '#666666',
        medium_gray_rgb: [135, 135, 135],
        light_gray: '#CCCCCC',
        light_gray_rgb: [204, 204, 204],
        very_light_gray: '#F5F5F5',
        very_light_gray_rgb: [245, 245, 245],
        white_rgb: [255, 255, 255],
        top_gray_rgb: [220, 220, 220],

        // Cores de destaque
        orange: '#F39C12',
        orange_rgb: [243, 156, 18],
        light_orange: '#FDEBD0',
        light_orange_rgb: [253, 235, 208],
        dark_blue_rgb: [0, 0, 139],

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
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error('jsPDF (core) not loaded!');
        if (generatePdfBtn) generatePdfBtn.disabled = true;
        displayGlobalMessage('Erro: A biblioteca principal de PDF (jsPDF) não pôde ser carregada.', 'error');
        return;
    }

    const {
        jsPDF
    } = window.jspdf;
    const tempDoc = new jsPDF();
    if (typeof tempDoc.autoTable !== 'function') {
        console.error('jsPDF-AutoTable not loaded!');
        if (generatePdfBtn) generatePdfBtn.disabled = true;
        displayGlobalMessage('Erro: O plugin de tabelas para PDF (jsPDF-AutoTable) não pôde ser carregado.', 'error');
        return;
    }

    // --- Helper para mensagens globais ---
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
        alertDiv.style.zIndex = '1001';
        alertDiv.style.textAlign = 'center';
        alertDiv.style.maxWidth = '90%';

        if (type === 'error') {
            alertDiv.style.backgroundColor = 'var(--danger-color)';
            alertDiv.style.color = 'white';
        } else { // ... (código existente)
            alertDiv.style.backgroundColor = 'var(--primary-color)';
            alertDiv.style.color = 'white';
        }

        document.body.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // --- Lógica de Preview de Imagem ---
    const imageInput = document.getElementById('imagens-evidencia');
    const previewDiv = document.getElementById('preview-imagens');
    let allImageFiles = [];
    if (imageInput && previewDiv) {
        imageInput.addEventListener('change', (event) => {
            const newFiles = Array.from(event.target.files);
            allImageFiles = allImageFiles.concat(newFiles);
            allImageFiles = allImageFiles.filter((file, idx, arr) =>
                arr.findIndex(f => f.name === file.name && f.size === file.size) === idx
            );
            previewDiv.innerHTML = '';
            allImageFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = e => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.maxWidth = '120px';
                    img.style.margin = '4px';
                    img.style.borderRadius = '8px';
                    previewDiv.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
            imageInput.value = '';
        });
    }


    // --- Validação do Formulário ---
    // ... (código de validação existente, sem alterações)
    const numericFieldsToValidate = [
        { id: 'largura-banda-principal', min: 512, message: 'Largura de Banda Principal deve ser >= 512 Kbps.' },
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

        if (inputElement.value.trim() === '') {
             if (errorElement) errorElement.textContent = '';
             inputElement.classList.remove('invalid');
            return true;
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
    
    // --- Função para converter SVG para Data URL (PNG) com cantos arredondados ---
    function svgToDataURL(svgString, cornerRadiusPercent = 0) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 3; // Renderiza em alta resolução para qualidade no PDF
                const w = img.width * scale;
                const h = img.height * scale;
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');

                // Se um raio de canto for especificado, cria um clipe de máscara
                if (cornerRadiusPercent > 0) {
                    const r = Math.min(w, h) * cornerRadiusPercent;
                    ctx.beginPath();
                    ctx.moveTo(r, 0);
                    ctx.arcTo(w, 0, w, h, r);
                    ctx.arcTo(w, h, 0, h, r);
                    ctx.arcTo(0, h, 0, 0, r);
                    ctx.arcTo(0, 0, w, 0, r);
                    ctx.closePath();
                    ctx.clip();
                }
                
                // Desenha a imagem (agora com a máscara, se aplicável)
                ctx.drawImage(img, 0, 0, w, h);

                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(new Error('Falha ao carregar a imagem SVG.'));
            };

            img.src = url;
        });
    }

    // --- Geração do PDF ---
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', async () => {
            if (!validateAllFields()) {
                displayGlobalMessage('Por favor, corrija os erros no formulário antes de gerar o PDF.', 'error');
                return;
            }

            // Carrega o SVG do arquivo
            const logoPath = 'src/maminfo.svg';
            const logoImageDataUrl = await fetch(logoPath)
                .then(response => {
                    if (!response.ok) throw new Error(`Erro de rede! Status: ${response.status}`);
                    return response.text();
                })
                .then(svgText => {
                    // Converte o SVG para PNG com 30% de arredondamento nos cantos
                    return svgToDataURL(svgText, 0.3); 
                })
                .catch(err => {
                    console.error(`Erro ao carregar o logo de "${logoPath}":`, err);
                    displayGlobalMessage(`Não foi possível carregar o logo. Verifique se o caminho "${logoPath}" está correto.`, 'error');
                    return null;
                });

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

            const margin = 15;
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = margin;

            // =======================================================================
            // CABEÇALHO COM LOGO E TÍTULO (LÓGICA ATUALIZADA)
            // =======================================================================
            const headerHeight = 22;
            const logoPadding = 2;
            // Define uma caixa (bounding box) para a logo, com mais espaço horizontal
            const logoBoxWidth = 30; 
            const logoBoxHeight = 18;

            doc.setFillColor.apply(doc, PDF_COLORS.dark_blue_rgb);
            doc.setDrawColor.apply(doc, PDF_COLORS.black_rgb);
            doc.setLineWidth(0.2);
            doc.rect(margin, yPos, pageWidth - (margin * 2), headerHeight, 'FD');

            let textStartX = margin;

            if (logoImageDataUrl) {
                const imgProps = doc.getImageProperties(logoImageDataUrl);
                const aspectRatio = imgProps.width / imgProps.height;

                // Calcula as dimensões da logo para caber na 'logoBox' mantendo a proporção
                let logoDisplayWidth = logoBoxWidth;
                let logoDisplayHeight = logoDisplayWidth / aspectRatio;

                if (logoDisplayHeight > logoBoxHeight) {
                    logoDisplayHeight = logoBoxHeight;
                    logoDisplayWidth = logoDisplayHeight * aspectRatio;
                }

                const logoX = margin + logoPadding;
                // Centraliza a logo verticalmente no cabeçalho
                const logoY = yPos + (headerHeight - logoDisplayHeight) / 2;

                doc.addImage(logoImageDataUrl, 'PNG', logoX, logoY, logoDisplayWidth, logoDisplayHeight);
                
                // Define o início do texto após a logo
                textStartX = logoX + logoDisplayWidth + 5; // Aumentei o espaçamento
            }

            const headerText = ["DOCUMENTO DE TRANSFORMAÇÃO", "DE UNIDADE LOTÉRICAS"];
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor.apply(doc, PDF_COLORS.white_rgb);
            
            const textCenterX = textStartX + (pageWidth - margin - textStartX) / 2;
            const textY1 = yPos + (headerHeight / 2) - 3;
            const textY2 = yPos + (headerHeight / 2) + 4;

            doc.text(headerText[0], textCenterX, textY1, { align: 'center' });
            doc.text(headerText[1], textCenterX, textY2, { align: 'center' });

            yPos += headerHeight;
            yPos += 3;
            // =======================================================================
            
            const ulInfo = `${data.codigo_ul || "CODIGO_UL"} - ${data.nome_ul || "NOME_UL"}`;
             const drawHeaderRectangle = (textLines, x, y, width, docInstance, options = {}) => {
                const fontSize = options.fontSize || 12;
                const fontStyle = options.fontStyle || 'bold';
                const align = options.align || 'center';
                const padding = options.padding || 3; 
                const vPadding = options.vPadding || padding; 
                const lineHeightFactor = 1.2;
                const fillColor = options.fillColor || null;
                const textColor = options.textColor || PDF_COLORS.dark_gray_rgb;
                const borderColor = options.borderColor || PDF_COLORS.black_rgb;
                const borderWidth = options.borderWidth || 0.2;

                docInstance.setFontSize(fontSize);
                docInstance.setFont(undefined, fontStyle);

                if (!Array.isArray(textLines)) textLines = [textLines];
                
                const textBlockHeight = (textLines.length * fontSize * 0.352778 * lineHeightFactor);
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
                    docInstance.text(line, x + (width/2), currentY, { align: 'center' });
                    currentY += (fontSize * 0.352778 * lineHeightFactor);
                });
                
                docInstance.setTextColor.apply(docInstance, PDF_COLORS.dark_gray_rgb);
                
                return y + rectHeight; 
            };


            yPos = drawHeaderRectangle(
                [ulInfo.toUpperCase()],
                margin, yPos, pageWidth - (margin * 2), doc, {
                    fontSize: 11,
                    vPadding: 4,
                    fillColor: PDF_COLORS.very_light_gray_rgb,
                    textColor: PDF_COLORS.dark_gray_rgb,
                    borderColor: PDF_COLORS.black_rgb
                }
            );
            yPos += 7;

            // Restante do código de geração de tabelas e conteúdo...
            // (Nenhuma alteração necessária abaixo desta linha)
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
                    fontSize: 11,
                    cellPadding: 2,
                    lineColor: PDF_COLORS.black_rgb,
                    lineWidth: 0.1,
                    font: 'helvetica',
                    textColor: PDF_COLORS.dark_gray_rgb
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        cellWidth: 65,
                        fillColor: PDF_COLORS.top_gray_rgb
                    },
                    1: {
                        cellWidth: 'auto',
                        fontStyle: 'normal',
                        fillColor: PDF_COLORS.white_rgb
                    }
                },
                margin: {
                    left: margin,
                    right: margin
                },
                tableWidth: 'auto',
            });
            yPos = doc.lastAutoTable.finalY + 10;
            
            // ... (restante do código original para dados secundários, evidências, fotos, rodapé, etc.)
            
             const hasSecondaryData = data.data_secundario || data.oficio_secundario || data.designador_secundario || data.tecnologia_secundario || data.latencia_secundario || data.perda_pacotes_secundario || data.comutacao_principal || data.largura_banda_secundario || data.ip_loopback_secundario || data.acesso_ultima_milha_secundario;

            if (hasSecondaryData) {
                if (doc.internal.getNumberOfPages() < 2) {
                    doc.addPage();
                } else {
                    doc.setPage(2);
                }
                yPos = margin;
                yPos = drawHeaderRectangle(
                    ["DADOS ACESSO SECUNDÁRIO"],
                    margin, yPos, pageWidth - (margin * 2), doc, 
                    { 
                        fontSize: 12, 
                        vPadding: 4,
                        fillColor: PDF_COLORS.dark_blue_rgb,
                        textColor: PDF_COLORS.white_rgb,
                        borderColor: PDF_COLORS.black_rgb
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
                        fontSize: 11, 
                        cellPadding: 2, 
                        lineColor: PDF_COLORS.black_rgb,
                        lineWidth: 0.1, 
                        font: 'helvetica',
                        textColor: PDF_COLORS.dark_gray_rgb
                    },
                    columnStyles: {
                        0: { 
                            fontStyle: 'bold', 
                            cellWidth: 65,
                            fillColor: PDF_COLORS.top_gray_rgb,
                            
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

            while (doc.internal.getNumberOfPages() < 3) doc.addPage();
            doc.setPage(3);
            yPos = margin;

            yPos = drawHeaderRectangle(
                ["EVIDÊNCIAS"],
                margin, yPos, pageWidth - (margin * 2), doc,
                {
                    fontSize: 14,
                    vPadding: 5,
                    fillColor: PDF_COLORS.dark_blue_rgb,
                    textColor: PDF_COLORS.white_rgb,
                    borderColor: PDF_COLORS.black_rgb
                }
            );
            yPos += 10;

            const evidenceFields = [
                { label: "TESTE DE COMUTAÇÃO", value: data.evidencia_teste_comutacao },
                { label: "TESTE DE LATENCIA PRINCIPAL", value: data.evidencia_latencia_principal },
                { label: "TESTE DE LATENCIA BACKUP", value: data.evidencia_latencia_backup },
                { label: "DISP ARP PRINCIPAL", value: data.evidencia_disparp_principal },
                { label: "DISP ARP BACKUP", value: data.evidencia_disparp_backup },
                { label: "DISP CLOCK PRINCIPAL", value: data.evidencia_disp_clock_principal },
                { label: "DISP CLOCK BACKUP", value: data.evidencia_disp_clock_backup },
            ];

            const evidenceBlockMargin = 6;

            evidenceFields.forEach(field => {
                if (!field.value || field.value.trim() === "") return;
                const label = field.label;
                const value = field.value;
                const fontSize = 11;
                const contentFontSize = 10;
                const blockWidth = pageWidth - (margin * 2);
                const blockPadding = 4;
                const labelHeight = fontSize * 0.352778 + 2;
                const lines = doc.splitTextToSize(value || "-", blockWidth - (blockPadding * 2));
                const lineHeight = 3.5;

                if (yPos + labelHeight + blockPadding * 2 > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.setFontSize(fontSize);
                doc.setFont(undefined, 'bold');
                doc.setTextColor.apply(doc, PDF_COLORS.dark_blue_rgb);
                doc.text(label, margin + blockPadding, yPos + blockPadding + fontSize * 0.352778, { align: 'left' });

                let contentY = yPos + blockPadding + labelHeight + 6;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(contentFontSize);
                doc.setTextColor.apply(doc, PDF_COLORS.dark_gray_rgb);

                lines.forEach(line => {
                    if (contentY + lineHeight > pageHeight - margin) {
                        doc.addPage();
                        contentY = margin + blockPadding + labelHeight + 6;
                        doc.setFontSize(fontSize);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor.apply(doc, PDF_COLORS.dark_blue_rgb);
                        doc.text(label + " (continuação)", margin + blockPadding, margin + blockPadding + fontSize * 0.352778, { align: 'left' });
                        doc.setFont(undefined, 'normal');
                        doc.setFontSize(contentFontSize);
                        doc.setTextColor.apply(doc, PDF_COLORS.dark_gray_rgb);
                    }
                    doc.text(line, margin + blockPadding, contentY, { align: 'left' });
                    contentY += lineHeight;
                });

                yPos = contentY + evidenceBlockMargin;
            });
            
            if (allImageFiles.length > 0) {
                doc.addPage();
                yPos = margin;
                
                yPos = drawHeaderRectangle(
                    ["FOTOS"],
                    margin, yPos, pageWidth - (margin * 2), doc, 
                    { 
                        fontSize: 14, 
                        vPadding: 5,
                        fillColor: PDF_COLORS.dark_blue_rgb,
                        textColor: PDF_COLORS.white_rgb,
                        borderColor: PDF_COLORS.black_rgb
                    }
                );
                yPos += 8; 

                for (const file of allImageFiles) {
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

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setDrawColor.apply(doc, PDF_COLORS.black_rgb);
                doc.setLineWidth(0.3);
                doc.rect(margin, margin, pageWidth - (2 * margin), pageHeight - (2 * margin));

                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor.apply(doc, PDF_COLORS.medium_gray_rgb);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    pageWidth - margin,
                    pageHeight - 10, {
                        align: 'right'
                    }
                );
                doc.text(
                    `${data.codigo_ul || 'UL'} - ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
                    margin,
                    pageHeight - 10
                );
            }

            try {
                const fileName = `Relatorio_Transformacao_${data.codigo_ul || 'CODUL'}_${(data.data || new Date().toISOString().slice(0,10))}.pdf`;
                doc.save(fileName);
                displayGlobalMessage(`PDF "${fileName}" gerado com sucesso!`, 'success');

                const pdfBase64 = doc.output('datauristring');
                fetch('/api/upload-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ulCode: data.codigo_ul,
                        pdfBase64: pdfBase64
                    })
                })
                .then(res => res.json())
                .then(resp => {
                    if (resp.message) {
                        displayGlobalMessage(resp.message, 'success');
                    }
                })
                .catch(err => {
                    displayGlobalMessage('Erro ao enviar PDF para o servidor.', 'error');
                });
            } catch (saveError) {
                console.error("Erro ao salvar o PDF:", saveError);
                displayGlobalMessage('Erro ao salvar o PDF. Verifique o console.', 'error');
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

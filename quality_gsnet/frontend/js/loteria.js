document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loteria-form');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    // Paleta de cores
    const PDF_COLORS = {
        dark_gray_rgb: [51, 51, 51],
        medium_gray_rgb: [135, 135, 135],
        very_light_gray_rgb: [245, 245, 245],
        white_rgb: [255, 255, 255],
        top_gray_rgb: [220, 220, 220],
        dark_blue_rgb: [0, 0, 139],
        black_rgb: [0, 0, 0],
        red_rgb: [231, 76, 60]
    };

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error('jsPDF (core) not loaded!');
        if (generatePdfBtn) generatePdfBtn.disabled = true;
        displayGlobalMessage('Erro: A biblioteca principal de PDF (jsPDF) não pôde ser carregada.', 'error');
        return;
    }
    const { jsPDF } = window.jspdf;
    if (typeof new jsPDF().autoTable !== 'function') {
        console.error('jsPDF-AutoTable not loaded!');
        if (generatePdfBtn) generatePdfBtn.disabled = true;
        displayGlobalMessage('Erro: O plugin de tabelas para PDF (jsPDF-AutoTable) não pôde ser carregado.', 'error');
        return;
    }

    function displayGlobalMessage(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.textContent = message;
        Object.assign(alertDiv.style, {
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '15px', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)',
            zIndex: '1001', textAlign: 'center', maxWidth: '90%', color: 'white'
        });
        alertDiv.style.backgroundColor = type === 'error' ? 'var(--danger-color, #E74C3C)' :
                                      type === 'success' ? 'var(--success-color, #2ECC71)' :
                                      'var(--primary-color, #3498DB)';
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), type.includes('Processando') ? 1500 : 7000);
    }

    const imageInput = document.getElementById('imagens-evidencia');
    const previewDiv = document.getElementById('preview-imagens');
    let allImageFiles = [];

    if (imageInput && previewDiv) {
        imageInput.addEventListener('change', (event) => {
            const newFiles = Array.from(event.target.files);
            allImageFiles = allImageFiles.concat(newFiles)
                .filter((file, idx, arr) => arr.findIndex(f => f.name === file.name && f.size === file.size) === idx);
            
            previewDiv.innerHTML = '';
            allImageFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = e => {
                    const imgContainer = document.createElement('div');
                    Object.assign(imgContainer.style, { position: 'relative', display: 'inline-block', margin: '4px' });
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    Object.assign(img.style, { maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' });

                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = 'x';
                    removeBtn.title = `Remover ${file.name}`;
                    Object.assign(removeBtn.style, {
                        position: 'absolute', top: '2px', right: '2px', background: 'rgba(255,0,0,0.7)',
                        color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                        lineHeight: '20px', textAlign: 'center', cursor: 'pointer', fontSize: '12px'
                    });
                    removeBtn.onclick = () => {
                        allImageFiles = allImageFiles.filter(f => !(f.name === file.name && f.size === file.size));
                        imgContainer.remove();
                    };
                    imgContainer.append(img, removeBtn);
                    previewDiv.appendChild(imgContainer);
                };
                reader.readAsDataURL(file);
            });
            imageInput.value = '';
        });
    }

    const numericFieldsToValidate = [
        { id: 'largura-banda-principal' }, { id: 'comutacao-secundario' },
        { id: 'largura-banda-secundario' }, { id: 'comutacao-principal' }
    ];

    numericFieldsToValidate.forEach(fieldInfo => {
        const inputElement = document.getElementById(fieldInfo.id);
        if (inputElement) {
            inputElement.addEventListener('input', () => validateNumericField(inputElement, fieldInfo));
        }
    });

    function validateNumericField(inputElement, rules) {
        const valueStr = inputElement.value.trim();
        const errorElementId = `${rules.id}-error`;
        let errorElement = document.getElementById(errorElementId);

        if (!errorElement && inputElement.parentNode) {
            errorElement = document.createElement('small');
            errorElement.id = errorElementId;
            errorElement.className = 'validation-message error';
            inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling || null);
        }
        
        if (valueStr === '') {
            if (errorElement) { errorElement.textContent = ''; errorElement.style.display = 'none'; }
            inputElement.classList.remove('invalid'); return true;
        }

        const value = parseFloat(valueStr);
        let isValid = true; let errorMessage = '';
        if (isNaN(value)) { isValid = false; errorMessage = 'Deve ser um número.'; }
        else {
            if (rules.max !== undefined && value > rules.max) { isValid = false; errorMessage = rules.message || `Valor deve ser <= ${rules.max}.`; }
            if (rules.min !== undefined && value < rules.min) { isValid = false; errorMessage = rules.message || `Valor deve ser >= ${rules.min}.`; }
        }

        if (errorElement) { errorElement.textContent = isValid ? '' : errorMessage; errorElement.style.display = isValid ? 'none' : 'block'; }
        inputElement.classList.toggle('invalid', !isValid); return isValid;
    }

    function validateAllFieldsBeforePdfGeneration() {
        let allValid = true;
        numericFieldsToValidate.forEach(fieldInfo => {
            const inputElement = document.getElementById(fieldInfo.id);
            if (inputElement && inputElement.value.trim() !== '') {
                if (!validateNumericField(inputElement, fieldInfo)) allValid = false;
            } else if (inputElement) { validateNumericField(inputElement, fieldInfo); }
        });
        return allValid;
    }

    async function processImageForPdf(file, maxWidth = 800, maxHeight = 800, quality = 0.60) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } }
                    else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = (err) => reject(new Error("Falha ao carregar imagem: " + (err.type || 'desconhecido')));
                img.src = event.target.result;
            };
            reader.onerror = (err) => reject(new Error("Falha no FileReader: " + (err.type || 'desconhecido')));
            reader.readAsDataURL(file);
        });
    }

    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', async () => {
            if (!validateAllFieldsBeforePdfGeneration()) {
                displayGlobalMessage('Campos numéricos com formatos inválidos. Corrija-os.', 'error');
                return;
            }
            generatePdfBtn.disabled = true; generatePdfBtn.textContent = 'Gerando PDF...';

            const logoPath = 'src/maminfo.png';
            const logoImageDataUrl = await fetch(logoPath)
                .then(response => { if (!response.ok) throw new Error(`Logo: ${response.status}`); return response.blob(); })
                .then(blob => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result); reader.onerror = reject;
                    reader.readAsDataURL(blob);
                }))
                .catch(err => {
                    console.error(`Erro logo:`, err);
                    displayGlobalMessage(`Logo não carregado (${err.message}). PDF sem logo.`, 'error');
                    return null;
                });

            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => { data[key.replace(/-/g, '_')] = value; });

            const margin = 15;
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            let yPos = margin;

            // --- AJUSTE PARA O LOGO E CABEÇALHO (Compromisso) ---
            const headerHeight = 30;    // Altura do cabeçalho um pouco maior (era 22)
            const logoPadding = 2;
            const logoBoxWidth = 55;    // Largura da caixa do logo (era 30, você tentou 100, depois 75)
            const logoBoxHeight = 30 - (logoPadding * 2); // Agora será 30 - 4 = 26mm
            // Com logoBoxWidth = 55 e logoBoxHeight = 26, o logo pode crescer bem.
            // Ex: um logo 2:1 (L:A) ficaria 52x26. Um logo 1:1 (quadrado) ficaria 26x26.
            // --- FIM DO AJUSTE ---

            doc.setFillColor.apply(doc, PDF_COLORS.dark_blue_rgb);
            doc.setDrawColor.apply(doc, PDF_COLORS.black_rgb).setLineWidth(0.2);
            doc.rect(margin, yPos, pageWidth - (margin * 2), headerHeight, 'FD');
            let textStartX = margin; // Padrão se não houver logo

            if (logoImageDataUrl) {
                try {
                    const imgProps = doc.getImageProperties(logoImageDataUrl);
                    let w = imgProps.width;
                    let h = imgProps.height;
                    const originalRatio = w / h;

                    let drawWidth, drawHeight;
                    if ((w / logoBoxWidth) > (h / logoBoxHeight)) {
                        drawWidth = logoBoxWidth;
                        drawHeight = drawWidth / originalRatio;
                    } else {
                        drawHeight = logoBoxHeight;
                        drawWidth = drawHeight * originalRatio;
                    }
                    
                    doc.addImage(logoImageDataUrl, 'PNG', margin + logoPadding, yPos + (headerHeight - drawHeight) / 2, drawWidth, drawHeight);
                    textStartX = margin + logoPadding + drawWidth + 5; 
                } catch (e) { 
                    console.error("Erro no logo addImage:", e); 
                    textStartX = margin + logoPadding + logoBoxWidth + 5; // Fallback se imgProps falhar
                }
            } else { // Se não houver logo, textStartX considera apenas a margem
                 textStartX = margin + logoPadding; // Ou apenas margin, dependendo do design desejado
            }

            const headerText = ["DOCUMENTO DE TRANSFORMAÇÃO", "DE UNIDADE LOTÉRICAS"];
            doc.setFontSize(14).setFont(undefined, 'bold').setTextColor.apply(doc, PDF_COLORS.white_rgb);
            
            const availableTextWidth = pageWidth - textStartX - margin; // Espaço restante para o texto
            const textCenterX = textStartX + (availableTextWidth / 2); 
            
            // Adicionar o texto do cabeçalho
            // Linha 1
            let textY1 = yPos + (headerHeight / 2) - 3; // Ajuste vertical para centralizar
            // Linha 2
            let textY2 = yPos + (headerHeight / 2) + 4; // Ajuste vertical para centralizar

            // Se o headerHeight aumentou muito, pode ser necessário ajustar textY1 e textY2
            // Exemplo para centralizar melhor com headerHeight maior:
            const baseTextY = yPos + headerHeight / 2;
            const lineSpacing = 7; // mm entre as linhas de texto
            textY1 = baseTextY - lineSpacing / 2 + 1; // +1 para pequeno ajuste para baixo
            textY2 = baseTextY + lineSpacing / 2 + 1; // +1 para pequeno ajuste para baixo


            // Checar se o texto cabe e, se não, reduzir a fonte (exemplo simples)
            const firstLineTextWidth = doc.getStringUnitWidth(headerText[0]) * 14 / doc.internal.scaleFactor;
            if (firstLineTextWidth > availableTextWidth -5) { // -5 para uma pequena margem
                doc.setFontSize(12); // Reduz a fonte se não couber
                 // Recalcular textY com a nova fonte
                textY1 = baseTextY - (doc.getLineHeight() / doc.internal.scaleFactor / 2) + 1;
                textY2 = baseTextY + (doc.getLineHeight() / doc.internal.scaleFactor / 2) + 1;
            }


            doc.text(headerText[0], textCenterX, textY1, { align: 'center' });
            // Restaurar fonte se foi alterada para a segunda linha, ou manter a mesma
            // doc.setFontSize(14); // Se quiser garantir que a segunda linha volte para 14
            doc.text(headerText[1], textCenterX, textY2, { align: 'center' });
            yPos += headerHeight + 3;

            const drawHeaderRectangle = (textLines, x, y, width, docInst, opts = {}) => {
                const { fontSize = 12, fontStyle = 'bold', vPadding = 3, fillColor = null, 
                        textColor = PDF_COLORS.dark_gray_rgb, borderColor = PDF_COLORS.black_rgb, borderWidth = 0.2 } = opts;
                const lineHeightFactor = 1.2;
                docInst.setFontSize(fontSize).setFont(undefined, fontStyle);
                if (!Array.isArray(textLines)) textLines = [textLines];
                const txtH = (textLines.length*fontSize*0.352778*lineHeightFactor) - ((lineHeightFactor-1)*fontSize*0.352778);
                const rectH = txtH + (vPadding * 2);
                docInst.setDrawColor.apply(docInst, borderColor).setLineWidth(borderWidth);
                if (fillColor) docInst.setFillColor.apply(docInst, fillColor).rect(x, y, width, rectH, 'FD');
                else docInst.rect(x, y, width, rectH);
                docInst.setTextColor.apply(docInst, textColor);
                let currentTextY = y + vPadding + (fontSize * 0.352778);
                textLines.forEach(line => {
                    docInst.text(line, x + width / 2, currentTextY, { align: 'center' });
                    currentTextY += fontSize * 0.352778 * lineHeightFactor;
                });
                return y + rectH;
            };

            const ulInfo = `${data.codigo_ul || "N/A"} - ${data.nome_ul || "N/A"}`;
            yPos = drawHeaderRectangle([ulInfo.toUpperCase()], margin, yPos, pageWidth - (margin*2), doc, {
                fontSize: 11, vPadding: 4, fillColor: PDF_COLORS.very_light_gray_rgb,
                textColor: PDF_COLORS.dark_gray_rgb, borderColor: PDF_COLORS.black_rgb
            });
            yPos += 7;

            const formatDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR') : "-";
            const val = (v, suffix = '') => (v || v === 0) && String(v).trim() !== '' ? `${String(v).trim()}${suffix}` : '-';

            const primaryDataBody = [
                ["Data:", formatDate(data.data)], ["Número do Ofício:", val(data.oficio)],
                ["Código Unidade Lotérica:", val(data.codigo_ul)], ["Nome UL:", val(data.nome_ul)],
                ["Designador:", val(data.designador)], ["Acesso WAN:", val(data.acesso_wan_principal)],
                ["Tecnologia:", val(data.tecnologia_principal)],
                ["Latência Principal Medida:", val(data.latencia_principal, ' ms')],
                ["Perda de Pacotes Medida:", val(data.perda_pacotes_principal, ' %')],
                ["Comutação para Secundário:", val(data.comutacao_secundario, ' s')],
                ["Largura de Banda:", val(data.largura_banda_principal, ' Kbps')],
                ["IP Loopback Principal:", val(data.ip_loopback_principal)],
                ["IP Loopback Switch:", val(data.ip_loopback_switch)],
                ["SDWAN:", val(data.sdwan_principal)],
                ["Acesso Última Milha - Principal:", val(data.acesso_ultima_milha_principal)],
                ["Instalação novo Nobreak:", data.nobreak === "true" ? "Sim" : (data.nobreak === "false" ? "Não" : "-")],
            ];
            doc.autoTable({ startY: yPos, head: [], body: primaryDataBody, theme: 'grid',
                styles: { fontSize: 10, cellPadding: 1.5, lineColor: PDF_COLORS.black_rgb, lineWidth: 0.1, textColor: PDF_COLORS.dark_gray_rgb },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: PDF_COLORS.top_gray_rgb }, 1: { fillColor: PDF_COLORS.white_rgb } },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 7;

            const hasSecondaryData = Object.keys(data).some(k => k.includes('_secundario') && String(data[k]).trim() !== '');
            if (hasSecondaryData) {
                if (yPos + 60 > pageHeight - margin && doc.internal.getNumberOfPages() === 1) { doc.addPage(); yPos = margin; }
                else if (doc.internal.getNumberOfPages() >= 2) { doc.setPage(2); yPos = margin; }
                else if (doc.internal.getNumberOfPages() < 2) { doc.addPage(); yPos = margin; }

                yPos = drawHeaderRectangle(["DADOS ACESSO SECUNDÁRIO"], margin, yPos, pageWidth - (margin*2), doc, {
                    fontSize: 11, vPadding: 4, fillColor: PDF_COLORS.dark_blue_rgb, textColor: PDF_COLORS.white_rgb
                }); yPos += 7;
                const secondaryDataBody = [
                    ["Data:", formatDate(data.data_secundario)], ["Número do Ofício:", val(data.oficio_secundario)],
                    ["Código UL:", val(data.codigo_ul_secundario || data.codigo_ul)], ["Nome UL:", val(data.nome_ul_secundario || data.nome_ul)],
                    ["Designador:", val(data.designador_secundario)], ["Acesso WAN:", val(data.acesso_wan_secundario)],
                    ["Tecnologia:", val(data.tecnologia_secundario)],
                    ["Latência Contingência Medida:", val(data.latencia_secundario, ' ms')],
                    ["Perda de Pacotes Medida:", val(data.perda_pacotes_secundario, ' %')],
                    ["Comutação para Principal:", val(data.comutacao_principal, ' s')],
                    ["Largura de Banda:", val(data.largura_banda_secundario, ' Kbps')],
                    ["IP Loopback Contingência:", val(data.ip_loopback_secundario)],
                    ["IP Loopback Switch:", val(data.ip_loopback_switch_secundario || data.ip_loopback_switch)],
                    ["SDWAN:", val(data.sdwan_secundario)],
                    ["Acesso Última Milha:", val(data.acesso_ultima_milha_secundario)],
                ];
                doc.autoTable({ startY: yPos, head: [], body: secondaryDataBody, theme: 'grid',
                    styles: { fontSize: 10, cellPadding: 1.5, lineColor: PDF_COLORS.black_rgb, lineWidth: 0.1, textColor: PDF_COLORS.dark_gray_rgb },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: PDF_COLORS.top_gray_rgb }, 1: { fillColor: PDF_COLORS.white_rgb } },
                    margin: { left: margin, right: margin }
                });
                yPos = doc.lastAutoTable.finalY + 7;
            }

            while (doc.internal.getNumberOfPages() < 3) doc.addPage();
            doc.setPage(3);
            yPos = margin;

            const evidenceHeaderTitle = "EVIDÊNCIAS";
            yPos = drawHeaderRectangle([evidenceHeaderTitle], margin, yPos, pageWidth - (margin*2), doc, {
                fontSize: 12, vPadding: 4, fillColor: PDF_COLORS.dark_blue_rgb, textColor: PDF_COLORS.white_rgb
            }); yPos += 7;

            const evidenceFields = [
                { label: "TESTE DE COMUTAÇÃO", value: data.evidencia_teste_comutacao },
                { label: "TESTE DE LATENCIA PRINCIPAL", value: data.evidencia_latencia_principal },
                { label: "TESTE DE LATENCIA BACKUP", value: data.evidencia_latencia_backup },
                { label: "DISP ARP PRINCIPAL", value: data.evidencia_disparp_principal },
                { label: "DISP ARP BACKUP", value: data.evidencia_disparp_backup },
                { label: "DISP CLOCK PRINCIPAL", value: data.evidencia_disp_clock_principal },
                { label: "DISP CLOCK BACKUP", value: data.evidencia_disp_clock_backup },
            ];
            const evidenceBlockInternalPadding = 5;
            const spaceBetweenTitleAndContent = 4;

            evidenceFields.forEach(field => {
                if (!field.value || String(field.value).trim() === "") return;
                const labelFontSize = 10, contentFontSize = 9, lineHeight = contentFontSize * 0.352778 * 1.2;
                doc.setFontSize(labelFontSize).setFont(undefined,'bold').setTextColor.apply(doc,PDF_COLORS.dark_blue_rgb);
                let currentLabelY = yPos + evidenceBlockInternalPadding + (labelFontSize * 0.352778);
                if (currentLabelY + lineHeight > pageHeight - margin) {
                    doc.addPage(); yPos = margin;
                    yPos = drawHeaderRectangle([`${evidenceHeaderTitle} (continuação)`], margin, yPos, pageWidth-(margin*2), doc, {fontSize:12, vPadding:4,fillColor:PDF_COLORS.dark_blue_rgb,textColor:PDF_COLORS.white_rgb}); yPos +=7;
                    currentLabelY = yPos + evidenceBlockInternalPadding + (labelFontSize * 0.352778);
                }
                doc.text(field.label, margin + evidenceBlockInternalPadding, currentLabelY);
                let contentY = currentLabelY + spaceBetweenTitleAndContent;
                doc.setFontSize(contentFontSize).setFont(undefined,'normal').setTextColor.apply(doc,PDF_COLORS.dark_gray_rgb);
                const lines = doc.splitTextToSize(String(field.value).trim(), pageWidth - (margin*2) - (evidenceBlockInternalPadding*2));
                let firstLineOfBlock = true;
                lines.forEach(line => {
                    if (contentY + lineHeight > pageHeight - margin) {
                        doc.addPage(); yPos = margin;
                        yPos = drawHeaderRectangle([`${evidenceHeaderTitle} (continuação)`], margin, yPos, pageWidth-(margin*2), doc, {fontSize:12, vPadding:4,fillColor:PDF_COLORS.dark_blue_rgb,textColor:PDF_COLORS.white_rgb}); yPos +=7;
                        doc.setFontSize(labelFontSize).setFont(undefined,'bold').setTextColor.apply(doc,PDF_COLORS.dark_blue_rgb);
                        currentLabelY = yPos + evidenceBlockInternalPadding + (labelFontSize * 0.352778);
                        doc.text(`${field.label} (continuação)`, margin + evidenceBlockInternalPadding, currentLabelY);
                        contentY = currentLabelY + spaceBetweenTitleAndContent;
                        doc.setFontSize(contentFontSize).setFont(undefined,'normal').setTextColor.apply(doc,PDF_COLORS.dark_gray_rgb);
                        firstLineOfBlock = true;
                    }
                    doc.text(line, margin + evidenceBlockInternalPadding, contentY);
                    contentY += lineHeight; firstLineOfBlock = false;
                });
                yPos = contentY + 3;
            });

            if (allImageFiles.length > 0) {
                let photoPageNum = doc.internal.getNumberOfPages();
                if (yPos + 85 > pageHeight - margin || (doc.internal.getCurrentPageInfo().pageNumber >= 3 && yPos > margin + 50) ) { 
                    doc.addPage(); photoPageNum = doc.internal.getNumberOfPages(); yPos = margin; 
                } else if (yPos > margin + 20 && doc.internal.getCurrentPageInfo().pageNumber < 3 && (hasSecondaryData || evidenceFields.some(f=>f.value && String(f.value).trim() !==''))) {
                     doc.addPage(); photoPageNum = doc.internal.getNumberOfPages(); yPos = margin;
                } else if (yPos > margin + 20 && doc.internal.getCurrentPageInfo().pageNumber >=3){
                     doc.addPage(); photoPageNum = doc.internal.getNumberOfPages(); yPos = margin;
                }
                doc.setPage(photoPageNum);
                yPos = drawHeaderRectangle(["FOTOS"], margin, yPos, pageWidth-(margin*2), doc, {
                    fontSize: 12, vPadding: 4, fillColor: PDF_COLORS.dark_blue_rgb, textColor: PDF_COLORS.white_rgb
                }); yPos += 7;
                for (const file of allImageFiles) {
                    try {
                        displayGlobalMessage(`Processando: ${file.name}...`, 'info-Processando');
                        const processedImageDataUrl = await processImageForPdf(file);
                        const imgProps = doc.getImageProperties(processedImageDataUrl);
                        const pdfImgMaxH = 75, pdfImgMaxW = pageWidth-(margin*2)-10;
                        let dW = imgProps.width, dH = imgProps.height;
                        const rPdf = Math.min(pdfImgMaxW/dW, pdfImgMaxH/dH);
                        dW *= rPdf; dH *= rPdf;
                        if (yPos + dH + 5 > pageHeight - margin) {
                            doc.addPage(); yPos = margin;
                            yPos = drawHeaderRectangle(["FOTOS (continuação)"], margin, yPos, pageWidth-(margin*2), doc, {fontSize:12, vPadding:4,fillColor:PDF_COLORS.dark_blue_rgb,textColor:PDF_COLORS.white_rgb}); yPos +=7;
                        }
                        doc.addImage(processedImageDataUrl, 'JPEG', (pageWidth-dW)/2, yPos, dW, dH);
                        yPos += dH + 5;
                    } catch (error) {
                        console.error(`Erro imagem ${file.name}:`, error);
                        displayGlobalMessage(`Erro ${file.name}: ${error.message}`, 'error');
                        if (yPos + 10 > pageHeight - margin) { doc.addPage(); yPos = margin; }
                        doc.setFontSize(8).setTextColor.apply(doc, PDF_COLORS.red_rgb)
                           .text(`Erro img: ${file.name.substring(0,50)}...`, margin, yPos);
                        yPos += 5;
                    }
                }
                 setTimeout(() => { Array.from(document.querySelectorAll('div[style*="fixed"]')).filter(el => el.textContent.includes('Processando:')).forEach(el => el.remove()); }, 1000);
            }

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor.apply(doc, PDF_COLORS.black_rgb).setLineWidth(0.3)
                   .rect(margin, margin, pageWidth-(margin*2), pageHeight-(margin*2));
                doc.setFontSize(8).setFont(undefined,'normal').setTextColor.apply(doc,PDF_COLORS.medium_gray_rgb);
                doc.text(`Página ${i} de ${pageCount}`, pageWidth-margin-2, pageHeight-10, {align:'right'});
                const footerDate = data.data ? formatDate(data.data) : new Date().toLocaleDateString('pt-BR');
                doc.text(`${data.codigo_ul || 'UL'} - ${footerDate}`, margin+2, pageHeight-10);
            }

            try {
                const fileNameDate = data.data ? data.data.replace(/-/g,'') : new Date().toISOString().slice(0,10).replace(/-/g,'');
                const fileName = `Relatorio_Transformacao_${(data.codigo_ul || 'CODUL').replace(/[^a-zA-Z0-9_.-]/g, '')}_${fileNameDate}.pdf`;
                doc.save(fileName);
                displayGlobalMessage(`PDF "${fileName}" gerado! Enviando...`, 'success');
                const pdfBase64 = doc.output('datauristring');
                fetch('/api/upload-report', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ulCode:data.codigo_ul, pdfBase64:pdfBase64})
                })
                .then(res => { if(!res.ok) return res.text().then(text => {throw new Error(text||`Servidor: ${res.status}`)}); return res.json(); })
                .then(resp => displayGlobalMessage(resp.message || 'Enviado!', resp.success?'success':'error'))
                .catch(err => {
                    console.error("Erro envio PDF:", err);
                    const msg = err.message && (err.message.toLowerCase().includes("payloadtoolarge") || err.message.toLowerCase().includes("request entity too large"))
                                ? 'PDF muito grande para o servidor.' : `Erro envio: ${err.message.substring(0,100)}`;
                    displayGlobalMessage(msg, 'error');
                });
            } catch (saveError) {
                console.error("Erro salvar PDF:", saveError);
                displayGlobalMessage('Erro ao salvar PDF.', 'error');
            } finally {
                generatePdfBtn.disabled = false; generatePdfBtn.textContent = 'Gerar PDF';
            }
        });
    }
});
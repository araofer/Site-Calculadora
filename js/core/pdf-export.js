/**
 * Módulo: Exportação de Resultados para PDF - Calculadora Master
 * Geração 100% client-side via jsPDF (UMD).
 * Sem backend, sem envio de dados, seguro e defensivo.
 */

/**
 * Obtém a classe jsPDF disponível no escopo global de forma defensiva.
 * @returns {Function|null}
 */
function getJsPdfConstructor() {
  if (typeof window === 'undefined') return null;
  if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
    return window.jspdf.jsPDF;
  }
  if (typeof window.jsPDF === 'function') {
    return window.jsPDF;
  }
  return null;
}

/**
 * Exporta dados de cálculo e gráfico opcional para um arquivo PDF A4.
 *
 * @param {Object} options
 * @param {string} options.filename Nome do arquivo PDF gerado (ex: "calculadora-master-juros.pdf")
 * @param {string} options.title Título da ferramenta / simulação
 * @param {Array<{ label: string, value: string }>} options.inputs Dados informados pelo usuário
 * @param {Array<{ label: string, value: string, highlight?: boolean }>} options.results Resultados apurados
 * @param {HTMLCanvasElement} [options.canvas] Elemento canvas com o gráfico gerado
 * @param {Array<string>} [options.notes] Observações ou notas de rodapé opcionais
 * @returns {boolean} Retorna true se o PDF foi gerado com sucesso, false caso contrário
 */
export function exportResultPdf(options = {}) {
  const JsPDF = getJsPdfConstructor();

  if (!JsPDF) {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Não foi possível gerar o PDF agora. Tente novamente.');
    }
    return false;
  }

  try {
    const doc = new JsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2); // 170mm
    let currentY = 20;

    // Helper de rodapé
    function desenharRodape(numeroPagina, totalPaginas) {
      const footerY = pageHeight - 12;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);

      doc.text('www.calculadoramaster.com', margin, footerY);

      const dataHora = new Date().toLocaleString('pt-BR');
      const infoData = `Gerado em: ${dataHora}`;
      doc.text(infoData, pageWidth / 2, footerY, { align: 'center' });

      const infoPagina = `Página ${numeroPagina} de ${totalPaginas}`;
      doc.text(infoPagina, pageWidth - margin, footerY, { align: 'right' });
    }

    // CABEÇALHO BRAND
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 42, 56); // #1e2a38
    doc.text('CALCULADORA MASTER', margin, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 128); // #008080
    doc.text(options.title || 'Resultado do Cálculo', margin, currentY);

    currentY += 4;
    doc.setDrawColor(0, 128, 128);
    doc.setLineWidth(0.6);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // SEÇÃO: DADOS INFORMADOS
    if (Array.isArray(options.inputs) && options.inputs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 42, 56);
      doc.text('DADOS INFORMADOS', margin, currentY);
      currentY += 6;

      doc.setFontSize(9.5);
      options.inputs.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`${item.label}:`, margin + 2, currentY);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 42, 56);
        doc.text(String(item.value), margin + 65, currentY);
        currentY += 5.5;
      });

      currentY += 4;
    }

    // SEÇÃO: RESULTADO
    if (Array.isArray(options.results) && options.results.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 128, 128);
      doc.text('RESULTADO', margin, currentY);
      currentY += 6;

      options.results.forEach(item => {
        if (item.highlight) {
          // Bloco de destaque
          doc.setFillColor(245, 248, 248);
          doc.rect(margin, currentY - 4, contentWidth, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(0, 128, 128);
          doc.text(`${item.label}:`, margin + 3, currentY + 1.5);
          doc.text(String(item.value), margin + 75, currentY + 1.5);
          currentY += 9;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(60, 60, 60);
          doc.text(`${item.label}:`, margin + 2, currentY);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 42, 56);
          doc.text(String(item.value), margin + 75, currentY);
          currentY += 5.5;
        }
      });

      currentY += 6;
    }

    // SEÇÃO: GRÁFICO (OPCIONAL)
    if (options.canvas && typeof options.canvas.toDataURL === 'function') {
      try {
        const cWidth = options.canvas.width || 600;
        const cHeight = options.canvas.height || 300;
        const imgWidth = contentWidth;
        const imgHeight = Math.min(80, (cHeight / cWidth) * imgWidth);

        // Se o gráfico ultrapassar a margem inferior, adiciona nova página
        if (currentY + imgHeight + 20 > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 42, 56);
        doc.text('EVOLUÇÃO GRÁFICA', margin, currentY);
        currentY += 5;

        const imgData = options.canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 6;
      } catch (_) {
        // Fallback resiliente: falha no gráfico não impede a geração do PDF com os dados
      }
    }

    // SEÇÃO: NOTAS ADICIONAIS
    if (Array.isArray(options.notes) && options.notes.length > 0) {
      if (currentY + 20 > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      options.notes.forEach(note => {
        doc.text(`* ${note}`, margin, currentY);
        currentY += 4.5;
      });
    }

    // Aplica rodapé em todas as páginas geradas
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      desenharRodape(i, totalPages);
    }

    const nomeFinal = options.filename ? options.filename.replace(/\.pdf$/i, '') + '.pdf' : 'calculo-calculadora-master.pdf';
    doc.save(nomeFinal);
    return true;
  } catch (err) {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('Não foi possível gerar o PDF agora. Tente novamente.');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.exportResultPdf = exportResultPdf;
}

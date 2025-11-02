import { type AnalysisResult } from '../types';

// This uses the docx and saveAs objects from the global scope, loaded via CDN in index.html
declare const docx: any;
declare const saveAs: any;

export function exportToDocx(result: AnalysisResult) {
  // Move destructuring into the function to ensure the global 'docx' object is available when called.
  const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType } = docx;

  const { nextPleading, processNumber } = result;

  const disclaimerText = "Este documento foi gerado por IA – o conteúdo é preliminar e deve ser revisado pelo advogado antes do protocolo. O SaaS não constitui consultoria jurídica.";

  const doc = new Document({
    sections: [{
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "PETIÇÃO INICIAL DE EXECUÇÃO – art. 789 CLT",
                  bold: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: disclaimerText,
                  italics: true,
                  size: 16, // Corresponds to 8pt font size
                  color: "808080",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children: [
        ...nextPleading.split('\n').map(text => new Paragraph({
            children: [new TextRun(text)],
            spacing: {
                after: 200, // Adds space after each paragraph
            },
        })),
      ],
    }],
    styles: {
        paragraphStyles: [
            {
                id: "default",
                name: "Default",
                basedOn: "Normal",
                next: "Normal",
                run: {
                    font: "Calibri",
                    size: 24, // 12pt
                },
            },
        ],
    }
  });

  Packer.toBlob(doc).then(blob => {
    const safeProcessNumber = (processNumber && processNumber !== 'N/A') ? processNumber.replace(/[^0-9]/g, '') : 's-n';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `PeticaoExecucao_${safeProcessNumber}_${timestamp}.docx`;
    saveAs(blob, fileName);
  });
}

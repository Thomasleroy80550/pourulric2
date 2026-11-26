import jsPDF from 'jspdf';

type TextBlock = {
  text: string;
  bold?: boolean;
  centered?: boolean;
  size: number;
  before: number;
  after: number;
};

export async function createAttestationPdf(element: HTMLElement): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const availableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  const blocks: TextBlock[] = [];
  const cleanText = (node: Element) => (node.textContent || '').replace(/\s+/g, ' ').trim();
  const header = element.querySelector('header');
  const title = header?.querySelector('h1');
  if (title) {
    // The title uses separate spans for the HTML preview.
    const text = Array.from(title.children).map(cleanText).join(' ') || cleanText(title);
    blocks.push({ text: text.toLocaleUpperCase('fr-FR'), bold: true, centered: true, size: 1.45, before: 0, after: 2 });
  }
  header?.querySelectorAll('p').forEach((node) => {
    blocks.push({ text: cleanText(node), centered: true, size: 1, before: 0, after: 2 });
  });
  element.querySelectorAll(':scope > section').forEach((section) => {
    section.querySelectorAll('h2, p, li').forEach((node) => {
      const heading = node.tagName === 'H2';
      const text = cleanText(node);
      blocks.push({
        text: node.tagName === 'LI' ? `- ${text}` : text,
        bold: heading,
        size: 1,
        before: heading ? 5 : 0,
        after: 2,
      });
    });
    if (section.querySelector('div')) {
      blocks.push({ text: '', size: 1, before: 0, after: 18 });
    }
  });
  const footer = element.querySelector('footer');
  if (footer) blocks.push({ text: cleanText(footer), size: 0.85, before: 3, after: 0 });

  const logo = header?.querySelector('img');
  const logoWidth = 24;
  let logoHeight = 0;
  if (logo) {
    await logo.decode();
    logoHeight = logoWidth * logo.naturalHeight / logo.naturalWidth;
  }

  const layout = (fontSize: number) => blocks.map((block) => {
    pdf.setFont('helvetica', block.bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize * block.size);
    const lines: string[] = block.text ? pdf.splitTextToSize(block.text, width) : [];
    const lineHeight = fontSize * block.size * 0.352778 * 1.35;
    return { ...block, lines, lineHeight, height: block.before + lines.length * lineHeight + block.after };
  });

  let fontSize = 13;
  let rows = layout(fontSize);
  while (logoHeight + 4 + rows.reduce((sum, row) => sum + row.height, 0) > availableHeight && fontSize > 4) {
    fontSize -= 0.25;
    rows = layout(fontSize);
  }
  if (logoHeight + 4 + rows.reduce((sum, row) => sum + row.height, 0) > availableHeight) {
    throw new Error('Le contenu dépasse la page A4.');
  }

  let y = margin;
  if (logo) {
    pdf.addImage(logo, 'PNG', (pdf.internal.pageSize.getWidth() - logoWidth) / 2, y, logoWidth, logoHeight);
    y += logoHeight + 4;
  }
  rows.forEach((row) => {
    y += row.before;
    pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize * row.size);
    row.lines.forEach((line) => {
      pdf.text(line, row.centered ? pdf.internal.pageSize.getWidth() / 2 : margin, y, {
        align: row.centered ? 'center' : 'left',
        baseline: 'top',
      });
      y += row.lineHeight;
    });
    y += row.after;
  });
  return pdf;
}

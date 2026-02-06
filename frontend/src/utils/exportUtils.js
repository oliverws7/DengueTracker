import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// Exportar para PDF
export const exportToPDF = async (elementId, filename = 'relatorio-dengue.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 190;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw error;
  }
};

// Exportar para Excel
export const exportToExcel = (data, filename = 'dados-dengue.xlsx') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Casos de Dengue');
    
    // Adicionar formatação
    worksheet['!cols'] = [
      { wch: 20 }, // Nome
      { wch: 10 }, // Idade
      { wch: 15 }, // Cidade
      { wch: 15 }, // Status
      { wch: 12 }, // Data
    ];

    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    throw error;
  }
};

// Gerar relatório completo
export const generateFullReport = async (data, stats, filename = 'relatorio-completo.pdf') => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(20);
  doc.text('Relatório de Monitoramento de Dengue', 105, 20, null, null, 'center');
  
  // Data
  doc.setFontSize(12);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 30, null, null, 'center');
  
  // Estatísticas
  doc.setFontSize(14);
  doc.text('Estatísticas Gerais', 20, 50);
  
  const statsData = [
    ['Métrica', 'Valor'],
    ['Total de Casos', stats.total],
    ['Confirmados', stats.confirmed],
    ['Suspeitos', stats.suspected],
    ['Taxa de Incidência', `${stats.incidenceRate}/100k`],
  ];
  
  doc.autoTable({
    startY: 55,
    head: [statsData[0]],
    body: statsData.slice(1),
    theme: 'striped',
  });
  
  // Dados detalhados
  if (data.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Casos Detalhados', 20, 20);
    
    const tableData = data.map(item => [
      item.name,
      item.age,
      item.city,
      item.status,
      new Date(item.date).toLocaleDateString('pt-BR'),
    ]);
    
    doc.autoTable({
      startY: 25,
      head: [['Nome', 'Idade', 'Cidade', 'Status', 'Data']],
      body: tableData,
      theme: 'grid',
    });
  }
  
  // Gráfico (se disponível)
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Análise Temporal', 20, 20);
  doc.text('Gráficos disponíveis na versão digital completa.', 20, 30);
  
  doc.save(filename);
};
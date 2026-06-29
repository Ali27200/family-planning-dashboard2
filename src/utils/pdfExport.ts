import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportFormToPdf(element: HTMLElement, filename: string = "احصائية-تنظيم-الاسرة.pdf") {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("l", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("جمهورية العراق - وزارة الصحة - دائرة صحة بابل - قطاع الحلة الثاني", pdfWidth / 2, 12, { align: "center" });
  pdf.setFontSize(10);
  pdf.text("استمارة تنظيم الأسرة الإلكترونية", pdfWidth / 2, 18, { align: "center" });
  pdf.setFontSize(7);
  pdf.text(`تاريخ التصدير: ${new Date().toLocaleDateString("ar-IQ")}`, pdfWidth / 2, 23, { align: "center" });

  const imgY = 27;
  const maxImgHeight = pdf.internal.pageSize.getHeight() - imgY - 10;
  let remainingHeight = pdfHeight;
  let srcY = 0;

  while (remainingHeight > 0) {
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(canvas.height * maxImgHeight / pdfHeight, canvas.height - srcY);
    const ctx = pageCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
    const pageImgData = pageCanvas.toDataURL("image/png");
    const pageImgHeight = (pageCanvas.height * pdfWidth) / canvas.width;

    if (srcY > 0) pdf.addPage();
    pdf.addImage(pageImgData, "PNG", 0, imgY, pdfWidth, pageImgHeight);

    srcY += pageCanvas.height;
    remainingHeight -= pageCanvas.height;
  }

  pdf.save(filename);
}

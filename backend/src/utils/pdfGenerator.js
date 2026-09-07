const PDFDocument = require('pdfkit');

const CLINIC = {
  name: 'Reconnect Physiotherapy Center',
  tagline: 'Professional Physiotherapy & Rehabilitation Services',
  address: 'House no, 226 Street 13, Block B Multi Gardens B-17, Islamabad, 48000, Pakistan',
  phone: '0516167252',
  email: 'reconnectphysio@gmail.com',
};

// Clean Professional Color Palette
const PRIMARY = '#1e40af';      // Deep blue
const PRIMARY_LIGHT = '#eff6ff';// Soft ice blue
const PRIMARY_DARK = '#172554'; // Navy blue
const TEXT_MAIN = '#0f172a';    // Slate 900
const TEXT_MUTED = '#475569';   // Slate 600
const TEXT_LIGHT = '#94a3b8';   // Slate 400
const BORDER_COLOR = '#cbd5e1'; // Slate 300
const SUCCESS = '#15803d';      // Emerald green
const DANGER = '#b91c1c';       // Crimson red
const WHITE = '#ffffff';

const generateInvoicePDF = (patient, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Invoice - ${patient.name || 'Patient'}`,
      Author: CLINIC.name,
    },
  });

  doc.pipe(res);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const invoiceNo = `RPC-INV-${String(patient.id || 1).padStart(4, '0')}-${now.getFullYear()}`;

  const left = 40;
  const right = 555;
  const contentWidth = right - left; // 515

  // ════════════════════════════════════════════════════════════
  // 1. TOP HEADER BANNER
  // ════════════════════════════════════════════════════════════
  const headerHeight = 115;
  doc.rect(0, 0, doc.page.width, headerHeight).fill(PRIMARY);

  // Clinic Title
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18);
  doc.text(CLINIC.name.toUpperCase(), left, 22, {
    width: contentWidth,
    align: 'center',
    lineBreak: false,
  });

  // Tagline
  doc.fillColor('#bfdbfe').font('Helvetica').fontSize(9.5);
  doc.text(CLINIC.tagline, left, 46, {
    width: contentWidth,
    align: 'center',
    lineBreak: false,
  });

  // Address
  doc.fillColor('#e0e7ff').font('Helvetica').fontSize(8.5);
  doc.text(CLINIC.address, left, 63, {
    width: contentWidth,
    align: 'center',
    lineBreak: false,
  });

  // Contact Info
  doc.fillColor('#f8fafc').font('Helvetica-Bold').fontSize(9);
  doc.text(`Phone: ${CLINIC.phone}   |   Admin & Billing`, left, 78, {
    width: contentWidth,
    align: 'center',
    lineBreak: false,
  });

  // INVOICE pill badge
  const badgeWidth = 110;
  const badgeHeight = 20;
  const badgeX = (doc.page.width - badgeWidth) / 2;
  const badgeY = 96;

  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4).fill(WHITE);
  doc.fillColor(PRIMARY_DARK).font('Helvetica-Bold').fontSize(10.5);
  doc.text('OFFICIAL INVOICE', badgeX, badgeY + 4, {
    width: badgeWidth,
    align: 'center',
    lineBreak: false,
  });

  // ════════════════════════════════════════════════════════════
  // 2. INVOICE META BAR (Date, Time, Invoice No)
  // ════════════════════════════════════════════════════════════
  let currentY = 130;

  doc.roundedRect(left, currentY, contentWidth, 34, 4)
    .fillAndStroke(PRIMARY_LIGHT, BORDER_COLOR);

  // Left Meta: Invoice Number
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5);
  doc.text('Invoice Number:', left + 12, currentY + 7);
  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(10);
  doc.text(invoiceNo, left + 12, currentY + 18);

  // Middle Meta: Date
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5);
  doc.text('Issue Date:', left + 220, currentY + 7);
  doc.fillColor(TEXT_MAIN).font('Helvetica-Bold').fontSize(9.5);
  doc.text(dateStr, left + 220, currentY + 18);

  // Right Meta: Time
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5);
  doc.text('Issue Time:', left + 380, currentY + 7);
  doc.fillColor(TEXT_MAIN).font('Helvetica-Bold').fontSize(9.5);
  doc.text(timeStr, left + 380, currentY + 18);

  currentY += 46;

  // ════════════════════════════════════════════════════════════
  // 3. PATIENT & TREATMENT DETAILS
  // ════════════════════════════════════════════════════════════
  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11);
  doc.text('PATIENT & TREATMENT DETAILS', left, currentY);

  currentY += 16;

  const cardHeight = 118;
  doc.roundedRect(left, currentY, contentWidth, cardHeight, 4)
    .fillAndStroke('#ffffff', BORDER_COLOR);

  const col1X = left + 12;
  const col2X = left + 265;
  const colWidth = 238;

  // Row helper
  const drawField = (title, val, x, y, isBoldVal = false, valColor = TEXT_MAIN) => {
    doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
    doc.text(title.toUpperCase(), x, y, { width: colWidth, lineBreak: false });
    
    doc.fillColor(valColor).font(isBoldVal ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.text(String(val || 'N/A'), x, y + 10, {
      width: colWidth,
      height: 18,
      ellipsis: true,
      lineBreak: false,
    });
  };

  const statusText = (patient.paymentStatus || 'pending').toUpperCase();
  const statusColor = statusText === 'PAID' ? SUCCESS : statusText === 'CREDIT' ? DANGER : '#d97706';

  // Left Column
  drawField('Patient Name', patient.name, col1X, currentY + 10, true, PRIMARY_DARK);
  drawField('Age / Gender', `${patient.age || '—'} Yrs  /  ${patient.gender || '—'}`, col1X, currentY + 36);
  drawField('Contact Phone', patient.phone, col1X, currentY + 62);
  drawField('Address', patient.address, col1X, currentY + 88);

  // Right Column
  drawField('Assigned Doctor', patient.doctor ? `Dr. ${patient.doctor.name}` : 'Not Assigned', col2X, currentY + 10, true);
  drawField('Diagnosis / Condition', patient.diagnosis, col2X, currentY + 36);
  drawField(
    'Treatment Period',
    `${patient.startDate ? new Date(patient.startDate).toLocaleDateString('en-PK') : '—'}  to  ${patient.endDate ? new Date(patient.endDate).toLocaleDateString('en-PK') : '—'}`,
    col2X,
    currentY + 62
  );
  drawField('Payment Status', statusText, col2X, currentY + 88, true, statusColor);

  currentY += cardHeight + 18;

  // ════════════════════════════════════════════════════════════
  // 4. PAYMENT & BILLING BREAKDOWN
  // ════════════════════════════════════════════════════════════
  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11);
  doc.text('PAYMENT & BILLING RECORDS', left, currentY);

  currentY += 16;

  // Table Columns Setup
  const tableCols = [
    { label: 'SR', x: left, w: 30, align: 'center' },
    { label: 'DATE', x: left + 30, w: 85, align: 'left' },
    { label: 'DESCRIPTION / SERVICE', x: left + 115, w: 185, align: 'left' },
    { label: 'CATEGORY', x: left + 300, w: 65, align: 'left' },
    { label: 'METHOD', x: left + 365, w: 65, align: 'left' },
    { label: 'AMOUNT (PKR)', x: left + 430, w: 85, align: 'right' },
  ];

  // Header row
  const tableHeaderHeight = 22;
  doc.rect(left, currentY, contentWidth, tableHeaderHeight).fill(PRIMARY);

  tableCols.forEach((c) => {
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
    const pad = c.align === 'right' ? -6 : c.align === 'center' ? 0 : 6;
    doc.text(c.label, c.x + pad, currentY + 6, {
      width: c.w,
      align: c.align,
      lineBreak: false,
    });
  });

  currentY += tableHeaderHeight;

  const records = patient.finances || [];
  let totalPaid = 0;

  if (records.length === 0) {
    doc.rect(left, currentY, contentWidth, 32).fillAndStroke(WHITE, BORDER_COLOR);
    doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(9);
    doc.text('No payment transactions recorded for this patient.', left, currentY + 10, {
      width: contentWidth,
      align: 'center',
    });
    currentY += 32;
  } else {
    const rowHeight = 22;

    records.forEach((rec, idx) => {
      // Check page overflow
      if (currentY > 680) {
        doc.addPage();
        currentY = 40;
      }

      const isEven = idx % 2 === 0;
      doc.rect(left, currentY, contentWidth, rowHeight)
        .fillAndStroke(isEven ? '#f8fafc' : WHITE, '#e2e8f0');

      const recDate = new Date(rec.date).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const desc = rec.description || 'Therapy Treatment';
      const cat = (rec.category || 'Service').toUpperCase();
      const method = (rec.paymentMethod || 'Cash').toUpperCase();
      const amt = Number(rec.amount || 0);
      totalPaid += amt;

      const rowValues = [
        { val: `${idx + 1}`, ...tableCols[0] },
        { val: recDate, ...tableCols[1] },
        { val: desc, ...tableCols[2] },
        { val: cat, ...tableCols[3] },
        { val: method, ...tableCols[4] },
        { val: amt.toLocaleString('en-PK', { minimumFractionDigits: 2 }), ...tableCols[5] },
      ];

      rowValues.forEach((c) => {
        const isAmt = c.label.includes('AMOUNT');
        doc.fillColor(isAmt ? SUCCESS : TEXT_MAIN)
          .font(isAmt ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5);

        const pad = c.align === 'right' ? -6 : c.align === 'center' ? 0 : 6;
        doc.text(c.val, c.x + pad, currentY + 6, {
          width: c.w,
          align: c.align,
          lineBreak: false,
          ellipsis: true,
        });
      });

      currentY += rowHeight;
    });
  }

  // Total Summary Box
  const totalBoxHeight = 26;
  doc.rect(left, currentY, contentWidth, totalBoxHeight).fill(PRIMARY_DARK);

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9.5);
  doc.text('TOTAL AMOUNT PAID', left + 14, currentY + 7);

  doc.fillColor('#4ade80').font('Helvetica-Bold').fontSize(10.5);
  doc.text(
    `PKR ${totalPaid.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`,
    left + 350,
    currentY + 7,
    { width: 155, align: 'right', lineBreak: false }
  );

  currentY += totalBoxHeight + 24;

  // ════════════════════════════════════════════════════════════
  // 5. SIGNATURE & STAMP SECTION
  // ════════════════════════════════════════════════════════════
  const sigBoxY = Math.max(currentY, 660);

  // Left Stamp Box
  doc.roundedRect(left, sigBoxY, 210, 48, 4)
    .fillAndStroke(PRIMARY_LIGHT, BORDER_COLOR);
  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(8.5);
  doc.text('OFFICIAL CLINIC SEAL', left + 10, sigBoxY + 8);
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5);
  doc.text('Verified computer-generated receipt.', left + 10, sigBoxY + 22);
  doc.text(`Issued: ${dateStr}  ${timeStr}`, left + 10, sigBoxY + 34);

  // Right Signature Line
  const sigRightX = right - 180;
  doc.moveTo(sigRightX, sigBoxY + 36).lineTo(right, sigBoxY + 36)
    .strokeColor(TEXT_MUTED).lineWidth(1).stroke();
  doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
  doc.text('AUTHORIZED SIGNATURE / RECEPTION', sigRightX, sigBoxY + 40, {
    width: 180,
    align: 'center',
  });

  // ════════════════════════════════════════════════════════════
  // 6. FOOTER BAR
  // ════════════════════════════════════════════════════════════
  const footerY = doc.page.height - 35;
  doc.rect(0, footerY, doc.page.width, 35).fill(PRIMARY);

  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
  doc.text(CLINIC.name, left, footerY + 8, {
    width: contentWidth,
    align: 'center',
    lineBreak: false,
  });

  doc.fillColor('#bfdbfe').font('Helvetica').fontSize(7.5);
  doc.text(
    `${CLINIC.address}  |  Tel: ${CLINIC.phone}`,
    left,
    footerY + 20,
    { width: contentWidth, align: 'center', lineBreak: false }
  );

  doc.end();
};

module.exports = generateInvoicePDF;

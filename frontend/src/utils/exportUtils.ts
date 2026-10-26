/**
 * ImageRevive - Multi-Format Export Utilities
 * Supports PNG, JPEG (configurable quality), WebP, BMP, raw NumPy (.npy) binary arrays,
 * and framed Academic DIP Inspection Cards.
 */

export interface ExportMetadata {
  title?: string;
  operationName?: string;
  resolution?: string;
  mean?: number | string;
  std?: number | string;
  entropy?: number | string;
}

/**
 * Loads an image from a Data URL / Object URL onto an offscreen canvas.
 * Optionally applies a scaling factor (e.g. 0.5x, 1x, 2x).
 */
export async function imageToCanvas(
  imageUrl: string,
  scale: number = 1.0
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
      const targetH = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D canvas context'));
        return;
      }

      // High quality smoothing for scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve(canvas);
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}

/**
 * Generates an IEEE 754 / NumPy 1.0 standard binary .npy array file buffer
 * from canvas pixels so data scientists and DIP professors can load it
 * directly using `numpy.load('filename.npy')`.
 */
export function createNpyBuffer(
  canvas: HTMLCanvasElement,
  mode: 'rgb' | 'gray' = 'rgb'
): Uint8Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data; // RGBA uint8 clamped array

  let rawBytes: Uint8Array;
  let shapeStr: string;

  if (mode === 'gray') {
    // 2D matrix (height, width)
    rawBytes = new Uint8Array(h * w);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      // Standard DIP Rec.601 luminance
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      rawBytes[j] = lum;
    }
    shapeStr = `(${h}, ${w})`;
  } else {
    // 3D tensor (height, width, 3) in RGB
    rawBytes = new Uint8Array(h * w * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      rawBytes[j] = data[i];     // R
      rawBytes[j + 1] = data[i + 1]; // G
      rawBytes[j + 2] = data[i + 2]; // B
    }
    shapeStr = `(${h}, ${w}, 3)`;
  }

  // Build NumPy 1.0 Header dictionary string
  const descr = '|u1';
  let dictStr = `{'descr': '${descr}', 'fortran_order': False, 'shape': ${shapeStr}, }`;

  // Magic + Version (10 bytes total)
  // Total header length (10 + header_len) must be a multiple of 64 bytes
  const magic = new Uint8Array([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 0x01, 0x00]); // \x93NUMPY + \x01\x00
  const baseLen = 10 + dictStr.length + 1; // +1 for trailing newline
  const padLen = (64 - (baseLen % 64)) % 64;
  dictStr += ' '.repeat(padLen) + '\n';

  const headerBytes = new TextEncoder().encode(dictStr);
  const headerLen = headerBytes.length;

  const totalLen = 10 + headerLen + rawBytes.length;
  const output = new Uint8Array(totalLen);

  // 1. Magic
  output.set(magic, 0);

  // 2. Header length (uint16 little endian)
  output[8] = headerLen & 0xff;
  output[9] = (headerLen >> 8) & 0xff;

  // 3. Header dictionary ASCII
  output.set(headerBytes, 10);

  // 4. Raw array payload
  output.set(rawBytes, 10 + headerLen);

  return output;
}

/**
 * Creates an uncompressed 24-bit Windows BMP image file blob
 */
export function createBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // BMP rows must be padded to multiples of 4 bytes
  const rowSize = Math.floor((24 * w + 31) / 32) * 4;
  const pixelArraySize = rowSize * h;
  const fileSize = 54 + pixelArraySize; // 14-byte file header + 40-byte DIB header

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // --- BMP File Header (14 bytes) ---
  view.setUint16(0, 0x424d, false); // 'BM' in ASCII
  view.setUint32(2, fileSize, true);  // File size
  view.setUint16(6, 0, true);         // Reserved
  view.setUint16(8, 0, true);         // Reserved
  view.setUint32(10, 54, true);       // Offset to pixel array

  // --- DIB Header (BITMAPINFOHEADER - 40 bytes) ---
  view.setUint32(14, 40, true);       // Header size
  view.setInt32(18, w, true);         // Width
  view.setInt32(22, h, true);         // Height (positive = bottom-to-top)
  view.setUint16(26, 1, true);        // Color planes
  view.setUint16(28, 24, true);       // Bits per pixel (24-bit BGR)
  view.setUint32(30, 0, true);        // Compression (0 = BI_RGB uncompressed)
  view.setUint32(34, pixelArraySize, true); // Image size
  view.setInt32(38, 2835, true);      // Horizontal res (72 DPI)
  view.setInt32(42, 2835, true);      // Vertical res (72 DPI)
  view.setUint32(46, 0, true);        // Colors in palette
  view.setUint32(50, 0, true);        // Important colors

  // --- Pixel Array (Bottom-to-Top BGR order) ---
  const bytes = new Uint8Array(buffer);
  let offset = 54;

  for (let y = h - 1; y >= 0; y--) {
    let rowStart = offset;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      bytes[rowStart++] = data[idx + 2]; // Blue
      bytes[rowStart++] = data[idx + 1]; // Green
      bytes[rowStart++] = data[idx];     // Red
    }
    // Pad row with zeros
    while (rowStart < offset + rowSize) {
      bytes[rowStart++] = 0;
    }
    offset += rowSize;
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Creates an elegant framed Academic DIP Verification Card with darkroom aesthetics,
 * university project watermarks, resolution, channel distribution, and Shannon Entropy metrics.
 */
export function createAcademicCardCanvas(
  sourceCanvas: HTMLCanvasElement,
  metadata: ExportMetadata = {}
): HTMLCanvasElement {
  const card = document.createElement('canvas');
  const padding = 32;
  const headerHeight = 70;
  const footerHeight = 65;

  const cardW = sourceCanvas.width + padding * 2;
  const cardH = sourceCanvas.height + headerHeight + footerHeight + padding;

  card.width = cardW;
  card.height = cardH;
  const ctx = card.getContext('2d');
  if (!ctx) return sourceCanvas;

  // Dark slate background
  ctx.fillStyle = '#0F1318';
  ctx.fillRect(0, 0, cardW, cardH);

  // Subtle outer border
  ctx.strokeStyle = '#273142';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, cardW - 2, cardH - 2);

  // Top Accent Bar (Amber Gold)
  ctx.fillStyle = '#E5A34D';
  ctx.fillRect(0, 0, cardW, 4);

  // --- Header ---
  ctx.fillStyle = '#F3F4F6';
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillText('ImageRevive', padding, 36);

  ctx.fillStyle = '#E5A34D';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('• ACADEMIC DIP STUDIO EXPORT', padding + 120, 34);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '12px "JetBrains Mono", monospace';
  const opInfo = metadata.operationName ? `OP: ${metadata.operationName}` : 'INSPECTION SNAPSHOT';
  ctx.fillText(opInfo, padding, 56);

  const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, cardW - padding, 36);
  ctx.fillText(`RES: ${sourceCanvas.width} × ${sourceCanvas.height} px`, cardW - padding, 56);
  ctx.textAlign = 'left';

  // Divider line
  ctx.strokeStyle = '#1F2937';
  ctx.beginPath();
  ctx.moveTo(padding, 68);
  ctx.lineTo(cardW - padding, 68);
  ctx.stroke();

  // --- Source Image ---
  const imgY = headerHeight + 10;
  ctx.drawImage(sourceCanvas, padding, imgY);

  // Image border
  ctx.strokeStyle = '#374151';
  ctx.strokeRect(padding - 1, imgY - 1, sourceCanvas.width + 2, sourceCanvas.height + 2);

  // --- Footer Metadata ---
  const footerY = imgY + sourceCanvas.height + 28;
  ctx.fillStyle = '#18202F';
  ctx.fillRect(padding, footerY - 18, cardW - padding * 2, 45);
  ctx.strokeStyle = '#283548';
  ctx.strokeRect(padding, footerY - 18, cardW - padding * 2, 45);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '11px "JetBrains Mono", monospace';

  const meanStr = metadata.mean !== undefined ? `Mean μ: ${metadata.mean}` : 'Mean μ: N/A';
  const stdStr = metadata.std !== undefined ? `Std σ: ${metadata.std}` : 'Std σ: N/A';
  const entropyStr = metadata.entropy !== undefined ? `Entropy H: ${metadata.entropy} b/px` : 'Entropy H: N/A';

  ctx.fillText(meanStr, padding + 16, footerY + 8);
  ctx.fillText(stdStr, padding + 180, footerY + 8);
  ctx.fillText(entropyStr, padding + 340, footerY + 8);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#6B7280';
  ctx.fillText('Verified with ImageRevive DIP Engine', cardW - padding - 16, footerY + 8);
  ctx.textAlign = 'left';

  return card;
}

/**
 * Triggers a browser download of a given Blob with standard anchor element.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Main export dispatcher for all supported formats.
 */
export async function exportImage({
  imageUrl,
  format,
  scale = 1.0,
  quality = 0.92,
  filename = 'imagerevive_export',
  metadata,
  isGray = false,
}: {
  imageUrl: string;
  format: 'png' | 'jpeg' | 'webp' | 'bmp' | 'npy' | 'academic-card';
  scale?: number;
  quality?: number;
  filename?: string;
  metadata?: ExportMetadata;
  isGray?: boolean;
}): Promise<void> {
  const canvas = await imageToCanvas(imageUrl, scale);
  const cleanBaseName = filename.replace(/\.[^/.]+$/, '');

  switch (format) {
    case 'png': {
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${cleanBaseName}.png`);
      }, 'image/png');
      break;
    }

    case 'jpeg': {
      canvas.toBlob(
        (blob) => {
          if (blob) downloadBlob(blob, `${cleanBaseName}.jpg`);
        },
        'image/jpeg',
        Math.max(0.05, Math.min(1.0, quality))
      );
      break;
    }

    case 'webp': {
      canvas.toBlob(
        (blob) => {
          if (blob) downloadBlob(blob, `${cleanBaseName}.webp`);
        },
        'image/webp',
        Math.max(0.05, Math.min(1.0, quality))
      );
      break;
    }

    case 'bmp': {
      const bmpBlob = createBmpBlob(canvas);
      downloadBlob(bmpBlob, `${cleanBaseName}.bmp`);
      break;
    }

    case 'npy': {
      const npyBuffer = createNpyBuffer(canvas, isGray ? 'gray' : 'rgb');
      const blob = new Blob([npyBuffer.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      downloadBlob(blob, `${cleanBaseName}.npy`);
      break;
    }

    case 'academic-card': {
      const cardCanvas = createAcademicCardCanvas(canvas, metadata);
      cardCanvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${cleanBaseName}_academic_card.png`);
      }, 'image/png');
      break;
    }
  }
}

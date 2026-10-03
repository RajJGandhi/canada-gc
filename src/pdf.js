/** PDF files are parsed on this device. Only the returned text can be submitted. */
export const PDF_LIMITS = Object.freeze({ bytes: 10 * 1024 * 1024, pages: 25, characters: 24000 });

export class PdfError extends Error {
  constructor(code, message) { super(message); this.name = 'PdfError'; this.code = code; }
}

export function validatePdfFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || !Number.isFinite(file.size)) {
    throw new PdfError('invalid-file', 'Choose a PDF file.');
  }
  if (file.size > PDF_LIMITS.bytes) throw new PdfError('too-large', 'Choose a PDF smaller than 10 MB.');
  if (!file.size) throw new PdfError('empty-file', 'This PDF is empty.');
  if (!/\.pdf$/i.test(file.name || '') || (file.type && !['application/pdf', 'application/octet-stream'].includes(file.type))) {
    throw new PdfError('invalid-file', 'Choose a PDF file.');
  }
}

function checkCancelled(signal) {
  if (signal?.aborted) throw new DOMException('PDF reading cancelled.', 'AbortError');
}

/** Preserve text-item line breaks while bounding the context sent to the model. */
export function pageText(items) {
  let result = '';
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    result += item.str + (item.hasEOL ? '\n' : ' ');
  }
  return result.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

export async function extractPdf(file, { signal, onProgress } = {}) {
  validatePdfFile(file);
  checkCancelled(signal);
  let task;
  const cancel = () => { task?.destroy().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    // Lazy import keeps the initial app small; PDF.js and its worker are served locally.
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    checkCancelled(signal);
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const data = new Uint8Array(await file.arrayBuffer());
    checkCancelled(signal);
    const header = new TextDecoder('latin1').decode(data.subarray(0, 1024));
    if (!header.includes('%PDF-')) throw new PdfError('invalid-pdf', 'This file does not contain a valid PDF.');
    task = pdfjs.getDocument({
      data,
      cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/pdf-assets/standard_fonts/',
      isEvalSupported: false, disableFontFace: true, useWasm: false,
      // PDF actions, embedded scripts, annotations, and attachments are never rendered.
    });
    const pdf = await task.promise;
    checkCancelled(signal);
    if (pdf.numPages > PDF_LIMITS.pages) {
      throw new PdfError('too-many-pages', 'Choose a PDF with 25 pages or fewer.');
    }
    let text = '';
    let truncated = false;
    for (let number = 1; number <= pdf.numPages; number++) {
      checkCancelled(signal);
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const extracted = pageText(content.items);
      if (extracted) {
        const segment = `${text ? '\n\n' : ''}[Page ${number}]\n${extracted}`;
        const remaining = PDF_LIMITS.characters - text.length;
        text += segment.slice(0, remaining);
        if (segment.length > remaining || (text.length === PDF_LIMITS.characters && number < pdf.numPages)) {
          truncated = true;
          page.cleanup();
          onProgress?.({ page: number, total: pdf.numPages });
          break;
        }
      }
      page.cleanup();
      onProgress?.({ page: number, total: pdf.numPages });
    }
    checkCancelled(signal);
    if (!text.trim()) {
      throw new PdfError('no-text', 'This PDF has no readable text. Scanned PDFs need text recognition (OCR) before uploading.');
    }
    return { name: file.name, pages: pdf.numPages, text, truncated };
  } catch (error) {
    checkCancelled(signal);
    if (error instanceof PdfError) throw error;
    if (error?.name === 'PasswordException') throw new PdfError('password', 'This PDF is password protected. Upload an unlocked copy.');
    if (error?.name === 'AbortError') throw error;
    throw new PdfError('unreadable', 'This PDF could not be read. Try another PDF or paste its text.');
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (task) await task.destroy().catch(() => {});
  }
}

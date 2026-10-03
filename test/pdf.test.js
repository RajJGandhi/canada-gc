import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePdfFile, pageText, PDF_LIMITS, extractPdf } from '../src/pdf.js';
const file = (overrides = {}) => ({ name: 'notice.pdf', type: 'application/pdf', size: 10, arrayBuffer: async () => new ArrayBuffer(0), ...overrides });
test('PDF input rejects oversized, empty, and wrong file types before loading parser', () => {
  assert.throws(() => validatePdfFile(file({ size: PDF_LIMITS.bytes + 1 })), { code: 'too-large' });
  assert.throws(() => validatePdfFile(file({ size: 0 })), { code: 'empty-file' });
  assert.throws(() => validatePdfFile(file({ name: 'photo.jpg', type: 'image/jpeg' })), { code: 'invalid-file' });
  assert.doesNotThrow(() => validatePdfFile(file({ type: '' })));
});
test('PDF extraction honors cancellation without reading file', async () => {
  const controller = new AbortController(); controller.abort();
  let read = false;
  await assert.rejects(() => extractPdf(file({ arrayBuffer: async () => { read = true; } }), { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(read, false);
});
test('PDF text extraction preserves line breaks without markup interpretation', () => {
  assert.equal(pageText([{str:'Name:',hasEOL:false},{str:'Jane',hasEOL:true},{str:'<script>text</script>',hasEOL:true},{markedContent:true}]), 'Name: Jane\n<script>text</script>');
});

declare module 'jszip' {
  interface ZipFolder {
    file(path: string, data: string): ZipFolder;
  }

  class JSZip {
    file(path: string, data: string): JSZip;
    folder(path: string): ZipFolder | null;
    generateAsync(options: { type: 'uint8array' }): Promise<Uint8Array>;
  }

  export default JSZip;
}

declare module 'pdfjs-dist/build/pdf.worker.entry.js';

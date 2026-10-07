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

declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export {
    getDocument,
    InvalidPDFException,
    PasswordResponses,
  } from 'pdfjs-dist';
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: {
    setup(handler: object, port: object): void;
  };
}

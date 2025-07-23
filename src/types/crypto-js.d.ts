declare module 'crypto-js' {
  interface WordArray {
    create(typedArray: Uint8Array | Buffer): WordArray;
    toString(encoder?: any): string;
  }

  interface CryptoJS {
    SHA256(message: WordArray): WordArray;
    lib: {
      WordArray: {
        create(typedArray: Uint8Array | Buffer): WordArray;
      }
    };
    enc: {
      Hex: any;
    };
  }

  const CryptoJS: CryptoJS;
  export = CryptoJS;
} 
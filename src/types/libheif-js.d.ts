/**
 * The slice of libheif-js the app actually touches.
 *
 * The package ships Emscripten's generated typings for the raw wasm exports,
 * but nothing for the small hand-written JS decoder sitting on top of them —
 * which is the only part we call. See src/lib/pdf/heif.ts.
 */
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  /** One top-level image inside a HEIF file. */
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    /** Fills `target.data` with RGBA, then calls back with it — or with null. */
    display<T extends { data: Uint8ClampedArray }>(
      target: T,
      done: (result: T | null) => void,
    ): void;
    free(): void;
  }

  export interface HeifDecoder {
    decode(bytes: Uint8Array): HeifImage[];
  }

  export interface LibHeif {
    HeifDecoder: new () => HeifDecoder;
  }

  /** Synchronous today; typed loosely so an async build would still fit. */
  const createLibHeif: () => LibHeif | Promise<LibHeif>;
  export default createLibHeif;
}

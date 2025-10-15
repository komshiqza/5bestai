// Polyfill Buffer for browser environments when dependencies expect Node's Buffer
import { Buffer } from 'buffer';

// Attach to globalThis so libraries that access global.Buffer work
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof (globalThis as any).Buffer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (globalThis as any).Buffer = Buffer;
}

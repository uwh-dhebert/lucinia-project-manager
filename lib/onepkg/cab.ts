import { inflateRaw } from 'pako';

// Minimal Microsoft Cabinet (.cab) reader — .onepkg files are CAB archives.
// Supports the compression OneNote actually uses (none and MSZIP) and runs in
// the browser, so notebooks never have to be uploaded raw.
//
// Format reference: [MS-CAB]. All integers are little-endian.

export interface CabFile {
  /** Forward-slash path inside the archive, e.g. "Group/Section.one" */
  path: string;
  data: Uint8Array;
}

const COMPRESS_NONE = 0;
const COMPRESS_MSZIP = 1;

const FLAG_PREV_CABINET = 0x0001;
const FLAG_NEXT_CABINET = 0x0002;
const FLAG_RESERVE_PRESENT = 0x0004;

class Reader {
  private view: DataView;
  constructor(private buf: Uint8Array, public pos = 0) {
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  u8() { return this.view.getUint8(this.pos++); }
  u16() { const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  u32() { const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  bytes(n: number) { const v = this.buf.subarray(this.pos, this.pos + n); this.pos += n; return v; }
  cstring(): Uint8Array {
    const start = this.pos;
    while (this.pos < this.buf.length && this.buf[this.pos] !== 0) this.pos++;
    const v = this.buf.subarray(start, this.pos);
    this.pos++; // skip NUL
    return v;
  }
}

interface Folder {
  dataOffset: number;
  dataBlockCount: number;
  compression: number;
}

export function extractCab(buffer: Uint8Array): CabFile[] {
  const r = new Reader(buffer);

  if (buffer.length < 36 || buffer[0] !== 0x4d || buffer[1] !== 0x53 || buffer[2] !== 0x43 || buffer[3] !== 0x46) {
    throw new Error('Not a valid .onepkg file (missing MSCF cabinet signature).');
  }
  r.pos = 4;
  r.u32(); // reserved1
  r.u32(); // cbCabinet
  r.u32(); // reserved2
  const coffFiles = r.u32();
  r.u32(); // reserved3
  r.u8(); // versionMinor
  r.u8(); // versionMajor
  const cFolders = r.u16();
  const cFiles = r.u16();
  const flags = r.u16();
  r.u16(); // setID
  r.u16(); // iCabinet

  let cbCFFolder = 0;
  let cbCFData = 0;
  if (flags & FLAG_RESERVE_PRESENT) {
    const cbCFHeader = r.u16();
    cbCFFolder = r.u8();
    cbCFData = r.u8();
    r.bytes(cbCFHeader);
  }
  if (flags & FLAG_PREV_CABINET) { r.cstring(); r.cstring(); }
  if (flags & FLAG_NEXT_CABINET) { r.cstring(); r.cstring(); }

  const folders: Folder[] = [];
  for (let i = 0; i < cFolders; i++) {
    const dataOffset = r.u32();
    const dataBlockCount = r.u16();
    const compression = r.u16() & 0x000f;
    r.bytes(cbCFFolder);
    folders.push({ dataOffset, dataBlockCount, compression });
  }

  interface FileEntry { path: string; uncompressedOffset: number; size: number; folderIndex: number; }
  const files: FileEntry[] = [];
  r.pos = coffFiles;
  const utf8 = new TextDecoder('utf-8');
  const latin1 = new TextDecoder('latin1');
  for (let i = 0; i < cFiles; i++) {
    const size = r.u32();
    const uncompressedOffset = r.u32();
    const folderIndex = r.u16();
    r.u16(); // date
    r.u16(); // time
    const attribs = r.u16();
    const nameBytes = r.cstring();
    // _A_NAME_IS_UTF (0x80): name is UTF-8; otherwise "current locale" — latin1
    // is the closest safe decode.
    const name = (attribs & 0x80 ? utf8 : latin1).decode(nameBytes);
    if (folderIndex >= 0xfffd) {
      throw new Error('This .onepkg spans multiple cabinet files, which is not supported.');
    }
    files.push({ path: name.replace(/\\/g, '/'), uncompressedOffset, size, folderIndex });
  }

  // Decompress each folder's data stream once, then slice files out of it.
  const folderStreams = folders.map((folder) => decompressFolder(buffer, folder, cbCFData));

  return files.map((f) => {
    const stream = folderStreams[f.folderIndex];
    return { path: f.path, data: stream.subarray(f.uncompressedOffset, f.uncompressedOffset + f.size) };
  });
}

function decompressFolder(buffer: Uint8Array, folder: Folder, cbCFData: number): Uint8Array {
  const r = new Reader(buffer, folder.dataOffset);
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (let i = 0; i < folder.dataBlockCount; i++) {
    r.u32(); // csum (not verified)
    const cbData = r.u16();
    const cbUncomp = r.u16();
    r.bytes(cbCFData);
    const raw = r.bytes(cbData);

    let block: Uint8Array;
    if (folder.compression === COMPRESS_NONE) {
      block = raw;
    } else if (folder.compression === COMPRESS_MSZIP) {
      if (raw.length < 2 || raw[0] !== 0x43 || raw[1] !== 0x4b) {
        throw new Error('Corrupt MSZIP block in .onepkg.');
      }
      // MSZIP: the deflate history window carries across blocks — pass the
      // tail of everything decompressed so far as the preset dictionary.
      const dictionary = tail(chunks, total, 32768);
      block = inflateRaw(raw.subarray(2), dictionary.length ? { dictionary } : undefined) as Uint8Array;
      if (block.length !== cbUncomp) {
        throw new Error('MSZIP block decompressed to an unexpected size.');
      }
    } else {
      throw new Error(
        'This .onepkg uses LZX/Quantum cabinet compression, which is not supported. Re-export the notebook from the OneNote desktop app.'
      );
    }

    chunks.push(block);
    total += block.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function tail(chunks: Uint8Array[], total: number, max: number): Uint8Array {
  const want = Math.min(total, max);
  if (want === 0) return new Uint8Array(0);
  const out = new Uint8Array(want);
  let remaining = want;
  for (let i = chunks.length - 1; i >= 0 && remaining > 0; i--) {
    const chunk = chunks[i];
    const take = Math.min(chunk.length, remaining);
    out.set(chunk.subarray(chunk.length - take), remaining - take);
    remaining -= take;
  }
  return out;
}

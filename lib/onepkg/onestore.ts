// Minimal [MS-ONESTORE] parser for .one section files — just enough structure
// to split a section into pages with titles and text.
//
// Model: a .one file is a revision store. Each page lives in its own "object
// space"; objects inside carry a JCID (type id) and a property set. We walk
// the root file node list, recurse through object space → revision → object
// group lists, and collect object declarations per object space. A page's
// title comes from jcidPageMetaData's CachedTitleString property; its text
// from jcidRichTextOENode's RichEditTextUnicode properties.
//
// Deliberately not implemented: full revision resolution (we take the newest
// declaration per object id), page ordering via jcidPageSeriesNode (manifest
// order is used), encrypted sections, embedded files, ink.

// FileNode ids
const FN_ObjectSpaceManifestRootFND = 0x004;
const FN_ObjectSpaceManifestListReferenceFND = 0x008;
const FN_ObjectDeclaration2RefCountFND = 0x0a4;
const FN_ObjectDeclaration2LargeRefCountFND = 0x0a5;
const FN_ReadOnlyObjectDeclaration2RefCountFND = 0x0c4;
const FN_ReadOnlyObjectDeclaration2LargeRefCountFND = 0x0c5;
const FN_ChunkTerminatorFND = 0x0ff;

// JCIDs ([MS-ONE])
const JCID_PageMetaData = 0x00020030;
const JCID_RichTextOENode = 0x0006000e;
const JCID_PageNode = 0x0006000b;
const JCID_TitleNode = 0x0006002c;

// PropertyIDs ([MS-ONE])
const PID_RichEditTextUnicode = 0x1c001c22;
const PID_TextExtendedAscii = 0x1c003498; // used when the paragraph is pure ASCII
const PID_CachedTitleString = 0x1c001cf3;
const PID_CachedTitleStringFromPage = 0x1c001d3c;

const ASCII_PIDS = new Set([PID_TextExtendedAscii]);

export interface OneStorePage {
  title: string | null;
  /** Text paragraphs in declaration order. */
  paragraphs: string[];
}

interface Declaration {
  oid: number; // CompactID as u32 — stable per object within the space
  jcid: number;
  propSetOffset: number;
  propSetLength: number;
  fileOrder: number;
}

interface ObjectSpace {
  gosid: string;
  isRoot: boolean;
  declarations: Declaration[];
  manifestOrder: number;
}

class Cursor {
  view: DataView;
  constructor(public data: Uint8Array, public pos = 0) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  u8() { return this.view.getUint8(this.pos++); }
  u16() { const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  u32() { const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  u64(): number {
    const lo = this.u32();
    const hi = this.u32();
    return hi * 0x100000000 + lo;
  }
  skip(n: number) { this.pos += n; }
  guid(): string {
    const bytes = this.data.subarray(this.pos, this.pos + 16);
    this.pos += 16;
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}

/** Read a FileNode's chunk reference given its Stp/Cb formats. */
function readRef(c: Cursor, stpFormat: number, cbFormat: number): { stp: number; cb: number } {
  let stp: number;
  switch (stpFormat) {
    case 0: stp = c.u64(); break;
    case 1: stp = c.u32(); break;
    case 2: stp = c.u16() * 8; break;
    default: stp = c.u32() * 8; break;
  }
  let cb: number;
  switch (cbFormat) {
    case 0: cb = c.u32(); break;
    case 1: cb = c.u64(); break;
    case 2: cb = c.u8() * 8; break;
    default: cb = c.u16() * 8; break;
  }
  return { stp, cb };
}

const FRAGMENT_HEADER_MAGIC_LO = 0xf5f7f4c4;
const FRAGMENT_HEADER_MAGIC_HI = 0xa4567ab1;

interface WalkContext {
  data: Uint8Array;
  spaces: Map<string, ObjectSpace>;
  rootGosid: string | null;
  orderCounter: { n: number };
}

/**
 * Walk one FileNodeList (all its fragments), dispatching nodes. `gosid` is
 * the object space this list belongs to (null for the root list).
 */
function walkList(ctx: WalkContext, stp: number, cb: number, gosid: string | null, depth: number) {
  if (depth > 8) return; // structural safety
  let fragStp = stp;
  let fragCb = cb;

  for (let fragment = 0; fragment < 10000; fragment++) {
    if (fragStp === 0 || fragCb < 36 || fragStp + fragCb > ctx.data.length) return;
    const c = new Cursor(ctx.data, fragStp);
    const magicLo = c.u32();
    const magicHi = c.u32();
    if (magicLo !== FRAGMENT_HEADER_MAGIC_LO || magicHi !== FRAGMENT_HEADER_MAGIC_HI) return;
    c.u32(); // FileNodeListID
    c.u32(); // nFragmentSequence

    // Trailer: nextFragment (FileChunkReference64x32 = 12 bytes) + 8-byte magic
    const trailerPos = fragStp + fragCb - 20;
    const nodesEnd = trailerPos;

    while (c.pos + 4 <= nodesEnd) {
      const header = c.view.getUint32(c.pos, true);
      if (header === 0) break;
      const fileNodeId = header & 0x3ff;
      const size = (header >> 10) & 0x1fff;
      const stpFormat = (header >> 23) & 0x3;
      const cbFormat = (header >> 25) & 0x3;
      const baseType = (header >> 27) & 0xf;
      if (fileNodeId === FN_ChunkTerminatorFND || size < 4 || c.pos + size > nodesEnd) break;

      const nodeStart = c.pos;
      c.pos += 4;

      let ref: { stp: number; cb: number } | null = null;
      if (baseType === 1 || baseType === 2) {
        ref = readRef(c, stpFormat, cbFormat);
      }

      switch (fileNodeId) {
        case FN_ObjectSpaceManifestRootFND: {
          // gosidRoot: ExtendedGUID (guid + u32)
          const rootGuid = c.guid();
          const n = c.u32();
          ctx.rootGosid = `${rootGuid}:${n}`;
          break;
        }
        case FN_ObjectSpaceManifestListReferenceFND: {
          const guid = c.guid();
          const n = c.u32();
          const id = `${guid}:${n}`;
          if (!ctx.spaces.has(id)) {
            ctx.spaces.set(id, {
              gosid: id,
              isRoot: false,
              declarations: [],
              manifestOrder: ctx.spaces.size,
            });
          }
          if (ref) walkList(ctx, ref.stp, ref.cb, id, depth + 1);
          break;
        }
        case FN_ObjectDeclaration2RefCountFND:
        case FN_ObjectDeclaration2LargeRefCountFND:
        case FN_ReadOnlyObjectDeclaration2RefCountFND:
        case FN_ReadOnlyObjectDeclaration2LargeRefCountFND: {
          if (ref && gosid) {
            // ObjectDeclaration2Body: CompactID (4) + JCID (4) + flags (1)
            const oid = c.u32();
            const jcid = c.u32();
            const space = ctx.spaces.get(gosid);
            if (space && ref.cb > 0 && ref.stp + ref.cb <= ctx.data.length) {
              space.declarations.push({
                oid,
                jcid,
                propSetOffset: ref.stp,
                propSetLength: ref.cb,
                fileOrder: ctx.orderCounter.n++,
              });
            }
          }
          break;
        }
        default:
          // BaseType 2 = "contains a reference to a file node list" — recurse
          // generically (revision manifest lists, object group lists, etc.)
          // so we stay correct across file-format revisions with different
          // node ids.
          if (baseType === 2 && ref) {
            walkList(ctx, ref.stp, ref.cb, gosid, depth + 1);
          }
          break;
      }

      c.pos = nodeStart + size;
    }

    // follow chained fragment
    const t = new Cursor(ctx.data, trailerPos);
    const nextStp = t.u64();
    const nextCb = t.u32();
    if (nextStp === 0 || nextCb === 0 || nextStp >= ctx.data.length || nextStp + nextCb > ctx.data.length) {
      return;
    }
    // 0xFFFFFFFF... sentinel means "nil"
    if (nextStp >= 0xfffffffffffff000 || nextCb === 0xffffffff) return;
    fragStp = nextStp;
    fragCb = nextCb;
  }
}

function decodeAscii(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end >= 1 && bytes[end - 1] === 0) end--;
  let s = '';
  for (let i = 0; i < end; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function decodeUtf16(bytes: Uint8Array): string {
  let end = bytes.length;
  // strip trailing NULs
  while (end >= 2 && bytes[end - 1] === 0 && bytes[end - 2] === 0) end -= 2;
  let s = '';
  for (let i = 0; i + 1 < end; i += 2) {
    s += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
  }
  return s;
}

/**
 * Extract the wanted string properties from an ObjectSpaceObjectPropSet blob.
 * Walks the OID/OSID/ContextID streams then the (possibly nested) property
 * set, returning values for the requested type-7 (length-prefixed) props.
 */
function extractStringProps(data: Uint8Array, wanted: Set<number>): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const c = new Cursor(data);

  const readStreamHeader = () => {
    const header = c.u32();
    const count = header & 0xffffff;
    return {
      count,
      osidNotPresent: (header & 0x80000000) !== 0,
      extendedPresent: (header & 0x40000000) !== 0,
    };
  };

  try {
    const oids = readStreamHeader();
    c.skip(oids.count * 4);
    let extendedPresent = false;
    if (!oids.osidNotPresent) {
      const osids = readStreamHeader();
      c.skip(osids.count * 4);
      extendedPresent = osids.extendedPresent;
      if (extendedPresent) {
        const ctxids = readStreamHeader();
        c.skip(ctxids.count * 4);
      }
    }
    parsePropertySet(c, wanted, out, 0);
  } catch {
    // truncated / unexpected layout — return what we have
  }
  return out;
}

function parsePropertySet(
  c: Cursor,
  wanted: Set<number>,
  out: Map<number, string[]>,
  depth: number
) {
  if (depth > 6) throw new Error('property set too deep');
  const cProperties = c.u16();
  if (cProperties > 4096) throw new Error('implausible property count');
  const prids: number[] = [];
  for (let i = 0; i < cProperties; i++) prids.push(c.u32());

  for (const prid of prids) {
    const type = (prid >>> 26) & 0x1f;
    switch (type) {
      case 0x1: // no data
      case 0x2: // bool — value lives in the id bit
        break;
      case 0x3: c.skip(1); break;
      case 0x4: c.skip(2); break;
      case 0x5: c.skip(4); break;
      case 0x6: c.skip(8); break;
      case 0x7: { // four bytes of length followed by data
        const len = c.u32();
        if (len > c.data.length - c.pos) throw new Error('bad length');
        const id = prid >>> 0;
        // compare on id-with-type, ignoring the bool bit
        const key = id & 0x7fffffff;
        if (wanted.has(key)) {
          const bytes = c.data.subarray(c.pos, c.pos + len);
          const value = ASCII_PIDS.has(key) ? decodeAscii(bytes) : decodeUtf16(bytes);
          if (value) {
            const list = out.get(key) ?? [];
            list.push(value);
            out.set(key, list);
          }
        }
        c.skip(len);
        break;
      }
      case 0x8: break; // 1 CompactID from OIDs stream — no inline data
      case 0x9: c.skip(4); break; // count of OIDs
      case 0xa: break;
      case 0xb: c.skip(4); break;
      case 0xc: break;
      case 0xd: c.skip(4); break;
      case 0x10: { // array of property values
        const count = c.u32();
        if (count > 0) {
          c.u32(); // prid of elements (must be type 0x11)
          for (let i = 0; i < count; i++) parsePropertySet(c, wanted, out, depth + 1);
        }
        break;
      }
      case 0x11: parsePropertySet(c, wanted, out, depth + 1); break;
      default:
        throw new Error(`unknown property type 0x${type.toString(16)}`);
    }
  }
}

// .one section files start with this GUID ({7B5C52E4-D88C-4DA7-AEB1-5378D02996D3}).
const ONE_HEADER = [0xe4, 0x52, 0x5c, 0x7b, 0x8c, 0xd8, 0xa7, 0x4d, 0xae, 0xb1, 0x53, 0x78, 0xd0, 0x29, 0x96, 0xd3];

/**
 * Parse a .one section into pages. Returns null when the file cannot be
 * parsed structurally (caller should fall back to flat text extraction).
 */
export function parseSectionPages(data: Uint8Array): OneStorePage[] | null {
  try {
    if (data.length < 1024) return null;
    if (!ONE_HEADER.every((b, i) => data[i] === b)) return null;

    // Header: fcrFileNodeListRoot is a FileChunkReference64x32 at offset 0xAC.
    const header = new Cursor(data, 0xac);
    const rootStp = header.u64();
    const rootCb = header.u32();
    if (rootStp === 0 || rootStp + rootCb > data.length) return null;

    const ctx: WalkContext = {
      data,
      spaces: new Map(),
      rootGosid: null,
      orderCounter: { n: 0 },
    };
    walkList(ctx, rootStp, rootCb, null, 0);

    if (ctx.spaces.size === 0) return null;

    const wanted = new Set([
      PID_RichEditTextUnicode,
      PID_TextExtendedAscii,
      PID_CachedTitleString,
      PID_CachedTitleStringFromPage,
    ]);
    const pages: OneStorePage[] = [];

    const spaces = [...ctx.spaces.values()].sort((a, b) => a.manifestOrder - b.manifestOrder);
    for (const space of spaces) {
      if (space.gosid === ctx.rootGosid) continue; // section container, not a page

      // Newest declaration per object wins (later file order = newer revision).
      const byOid = new Map<number, Declaration>();
      const firstSeen = new Map<number, number>();
      for (const decl of space.declarations) {
        const key = (decl.jcid << 1) ^ decl.oid; // jcid+oid — oids are per-type unique enough
        if (!firstSeen.has(key)) firstSeen.set(key, decl.fileOrder);
        const existing = byOid.get(key);
        if (!existing || decl.fileOrder > existing.fileOrder) byOid.set(key, decl);
      }

      const decls = [...byOid.entries()]
        .sort((a, b) => (firstSeen.get(a[0])! - firstSeen.get(b[0])!))
        .map(([, d]) => d);

      let isPage = false;
      let title: string | null = null;
      const paragraphs: string[] = [];

      for (const decl of decls) {
        if (decl.jcid === JCID_PageNode || decl.jcid === JCID_TitleNode) isPage = true;
        if (decl.jcid !== JCID_PageMetaData && decl.jcid !== JCID_RichTextOENode) continue;

        const blob = data.subarray(decl.propSetOffset, decl.propSetOffset + decl.propSetLength);
        const props = extractStringProps(blob, wanted);

        if (decl.jcid === JCID_PageMetaData) {
          isPage = true;
          const cached = props.get(PID_CachedTitleString) ?? props.get(PID_CachedTitleStringFromPage);
          if (cached?.length && !title) title = cached[0];
        } else {
          for (const text of [
            ...(props.get(PID_RichEditTextUnicode) ?? []),
            ...(props.get(PID_TextExtendedAscii) ?? []),
          ]) {
            paragraphs.push(text);
          }
        }
      }

      if (!isPage && paragraphs.length === 0) continue;

      // The title text usually also exists as the first rich-text paragraph —
      // drop the duplicate.
      if (title && paragraphs.length > 0 && paragraphs[0].trim() === title.trim()) {
        paragraphs.shift();
      }

      pages.push({ title, paragraphs });
    }

    return pages.length > 0 ? pages : null;
  } catch {
    return null;
  }
}

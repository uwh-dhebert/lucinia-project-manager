// Best-effort text extraction from OneNote .one section files.
//
// The full [MS-ONESTORE] format is enormous; instead of implementing it, this
// pulls printable UTF-16LE runs (how OneNote stores note text) out of the
// binary and filters the structural noise (font names, GUIDs, culture tags).
// Formatting, images, and ink are not recoverable this way. Password-protected
// sections are encrypted on disk and yield no text at all.

// .one section files start with this GUID ({7B5C52E4-D88C-4DA7-AEB1-5378D02996D3}).
const ONE_HEADER = [0xe4, 0x52, 0x5c, 0x7b, 0x8c, 0xd8, 0xa7, 0x4d, 0xae, 0xb1, 0x53, 0x78, 0xd0, 0x29, 0x96, 0xd3];

export function isOneFile(data: Uint8Array): boolean {
  if (data.length < 16) return false;
  return ONE_HEADER.every((b, i) => data[i] === b);
}

const NOISE_EXACT = new Set(
  [
    'Calibri', 'Calibri Light', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Consolas',
    'Cambria', 'Cambria Math', 'Georgia', 'Comic Sans MS', 'Helvetica',
    'Microsoft OneNote', 'OneNote', 'Microsoft', 'Normal', 'automatic',
  ].map((s) => s.toLowerCase())
);

const GUID_RE = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;
const CULTURE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4}){0,2}$/;
const HEXBLOB_RE = /^[0-9a-f]{12,}$/i;
const NUMERICISH_RE = /^[\d\s.,:/%-]+$/;
const FILE_EXT_RE = /\.(one|onetoc2|xps|emf|png|jpg|jpeg|gif|bmp|tmp|dll)$/i;

function isNoise(s: string): boolean {
  const t = s.trim();
  if (t.length < 3) return true;
  if (!/\p{L}/u.test(t)) return true; // must contain a letter
  if (NOISE_EXACT.has(t.toLowerCase())) return true;
  if (GUID_RE.test(t)) return true;
  if (HEXBLOB_RE.test(t)) return true;
  if (NUMERICISH_RE.test(t)) return true;
  if (CULTURE_RE.test(t) && t.length <= 12) return true;
  if (FILE_EXT_RE.test(t) && !t.includes(' ')) return true;
  return false;
}

// Latin-range printable char stored as UTF-16LE with a zero high byte:
// tab, ASCII 0x20–0x7E, and Latin-1 letters/punctuation 0xA0–0xFF.
function isPrintableLatin(low: number): boolean {
  if (low === 0x09) return true;
  if (low >= 0x20 && low <= 0x7e) return true;
  if (low >= 0xa0) return true;
  return false;
}

/**
 * Extract readable text from a .one section file. Returns paragraphs in file
 * order (which for a freshly exported .onepkg approximates document order),
 * deduplicated because OneNote's revision store keeps superseded copies.
 *
 * Only Latin-script UTF-16LE runs (high byte 0x00) are extracted: requiring
 * the zero high byte makes the scan self-aligning and keeps binary noise from
 * decoding as fake CJK text. Non-Latin notes and emoji are not recovered.
 */
export function extractText(data: Uint8Array): string[] {
  const paragraphs: string[] = [];
  const seen = new Set<string>();
  let i = 0;
  const len = data.length;

  while (i + 1 < len) {
    if (!isPrintableLatin(data[i]) || data[i + 1] !== 0x00) {
      i++;
      continue;
    }

    let j = i;
    const chars: number[] = [];
    while (j + 1 < len && isPrintableLatin(data[j]) && data[j + 1] === 0x00) {
      chars.push(data[j]);
      j += 2;
    }

    if (chars.length >= 3) {
      // Chunked decode — spreading a very long run would overflow the
      // argument limit of String.fromCharCode.
      let decoded = '';
      for (let k = 0; k < chars.length; k += 8192) {
        decoded += String.fromCharCode(...chars.slice(k, k + 8192));
      }
      const text = decoded.trim();
      if (!isNoise(text)) {
        const key = text.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          paragraphs.push(text);
        }
      }
    }
    i = j + 1;
  }

  return paragraphs;
}

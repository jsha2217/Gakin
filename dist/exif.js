function readAscii(view, offset, length) {
  let text = '';
  for (let i = 0; i < length && offset + i < view.byteLength; i++) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

export function parseExifDate(buffer) {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xffd8) return null;
    let offset = 2;
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2, false);
      if (marker === 0xe1 && length > 8 && readAscii(view, offset + 4, 4) === 'Exif') {
        const tiff = offset + 10;
        const little = view.getUint16(tiff, false) === 0x4949;
        if (view.getUint16(tiff + 2, little) !== 42) return null;
        const readIfd = (ifdOffset) => {
          const entries = {};
          const start = tiff + ifdOffset;
          const count = view.getUint16(start, little);
          for (let i = 0; i < count; i++) {
            const item = start + 2 + i * 12;
            const tag = view.getUint16(item, little);
            const type = view.getUint16(item + 2, little);
            const n = view.getUint32(item + 4, little);
            const valueOffset = n <= 4 ? item + 8 : tiff + view.getUint32(item + 8, little);
            if (type === 2) entries[tag] = readAscii(view, valueOffset, Math.max(0, n - 1));
            if (type === 4 && n === 1) entries[tag] = view.getUint32(item + 8, little);
          }
          return entries;
        };
        const ifd0 = readIfd(view.getUint32(tiff + 4, little));
        const exif = ifd0[0x8769] ? readIfd(ifd0[0x8769]) : {};
        return exif[0x9003] || ifd0[0x0132] || null;
      }
      offset += 2 + length;
    }
  } catch (_) { return null; }
  return null;
}

export function buildExifSegment(dateTime, timezone) {
  const encoder = new TextEncoder();
  const dt = encoder.encode(`${dateTime}\0`);
  const software = encoder.encode('Gakin Web\0');
  const tz = encoder.encode(`${timezone}\0`);
  const ifd0Offset = 8;
  const ifd0Size = 2 + 3 * 12 + 4;
  const dtOffset = ifd0Offset + ifd0Size;
  const softwareOffset = dtOffset + dt.length;
  let exifIfdOffset = softwareOffset + software.length;
  if (exifIfdOffset % 2) exifIfdOffset++;
  const exifIfdSize = 2 + 4 * 12 + 4;
  const originalOffset = exifIfdOffset + exifIfdSize;
  const digitizedOffset = originalOffset + dt.length;
  const tzOriginalOffset = digitizedOffset + dt.length;
  const tzDigitizedOffset = tzOriginalOffset + tz.length;
  const tiffSize = tzDigitizedOffset + tz.length;
  const payload = new Uint8Array(6 + tiffSize);
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0);
  const view = new DataView(payload.buffer);
  const base = 6;
  const little = true;
  view.setUint8(base, 0x49); view.setUint8(base + 1, 0x49);
  view.setUint16(base + 2, 42, little); view.setUint32(base + 4, ifd0Offset, little);
  const entry = (pos, tag, type, count, value) => {
    view.setUint16(base + pos, tag, little); view.setUint16(base + pos + 2, type, little);
    view.setUint32(base + pos + 4, count, little); view.setUint32(base + pos + 8, value, little);
  };
  view.setUint16(base + ifd0Offset, 3, little);
  entry(ifd0Offset + 2, 0x0132, 2, dt.length, dtOffset);
  entry(ifd0Offset + 14, 0x0131, 2, software.length, softwareOffset);
  entry(ifd0Offset + 26, 0x8769, 4, 1, exifIfdOffset);
  view.setUint32(base + ifd0Offset + 38, 0, little);
  payload.set(dt, base + dtOffset); payload.set(software, base + softwareOffset);
  view.setUint16(base + exifIfdOffset, 4, little);
  entry(exifIfdOffset + 2, 0x9003, 2, dt.length, originalOffset);
  entry(exifIfdOffset + 14, 0x9004, 2, dt.length, digitizedOffset);
  entry(exifIfdOffset + 26, 0x9011, 2, tz.length, tzOriginalOffset);
  entry(exifIfdOffset + 38, 0x9012, 2, tz.length, tzDigitizedOffset);
  view.setUint32(base + exifIfdOffset + 50, 0, little);
  payload.set(dt, base + originalOffset); payload.set(dt, base + digitizedOffset);
  payload.set(tz, base + tzOriginalOffset); payload.set(tz, base + tzDigitizedOffset);
  const segment = new Uint8Array(payload.length + 4);
  segment[0] = 0xff; segment[1] = 0xe1;
  const segmentLength = payload.length + 2;
  segment[2] = segmentLength >> 8; segment[3] = segmentLength & 0xff;
  segment.set(payload, 4);
  return segment;
}

export async function injectExif(jpegBlob, dateTime, timezone) {
  const original = new Uint8Array(await jpegBlob.arrayBuffer());
  if (original[0] !== 0xff || original[1] !== 0xd8) return jpegBlob;
  const segment = buildExifSegment(dateTime, timezone);
  const output = new Uint8Array(original.length + segment.length);
  output.set(original.slice(0, 2), 0);
  output.set(segment, 2);
  output.set(original.slice(2), 2 + segment.length);
  return new Blob([output], { type: 'image/jpeg' });
}

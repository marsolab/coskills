import { createDeflateRaw } from "node:zlib";
import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join, relative, dirname, sep, posix } from "node:path";
import { Buffer } from "node:buffer";

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function deflateRaw(buf: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const z = createDeflateRaw({ level: 9 });
    z.on("data", (c: Buffer) => chunks.push(c));
    z.on("end", () => resolve(Buffer.concat(chunks)));
    z.on("error", reject);
    z.end(buf);
  });
}

interface WalkEntry {
  type: "dir" | "file";
  path: string;
  full: string;
}

async function* walk(dir: string, base: string = dir): AsyncGenerator<WalkEntry> {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = relative(base, full).split(sep).join(posix.sep);
    if (e.isDirectory()) {
      yield { type: "dir", path: rel + "/", full };
      yield* walk(full, base);
    } else if (e.isFile()) {
      yield { type: "file", path: rel, full };
    }
  }
}

function dosTime(d: Date = new Date()): { time: number; date: number } {
  const time =
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date =
    (((d.getFullYear() - 1980) & 0x7f) << 9) |
    (((d.getMonth() + 1) & 0xf) << 5) |
    (d.getDate() & 0x1f);
  return { time, date };
}

export interface ZipOptions {
  prefix?: string;
}

export async function zipDirectory(
  srcDir: string,
  outFile: string,
  { prefix = "" }: ZipOptions = {},
): Promise<void> {
  const root = await stat(srcDir);
  if (!root.isDirectory()) {
    throw new Error(`Not a directory: ${srcDir}`);
  }

  const { time, date } = dosTime();
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  const cleanPrefix = prefix ? prefix.replace(/\/+$/, "") + "/" : "";

  for await (const entry of walk(srcDir)) {
    const name = cleanPrefix + entry.path;
    const nameBuf = Buffer.from(name, "utf8");
    const isDir = entry.type === "dir";
    const data = isDir ? Buffer.alloc(0) : await readFile(entry.full);
    const crc = isDir ? 0 : crc32(data);
    const compressed = isDir ? Buffer.alloc(0) : await deflateRaw(data);
    const useDeflate = !isDir && compressed.length < data.length;
    const stored = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(0x0800, 6);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(time, 10);
    lfh.writeUInt16LE(date, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(stored.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);
    local.push(Buffer.concat([lfh, nameBuf, stored]));

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0x0800, 8);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(time, 12);
    cdh.writeUInt16LE(date, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(stored.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(isDir ? 0x10 : 0, 38);
    cdh.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cdh, nameBuf]));

    offset += lfh.length + nameBuf.length + stored.length;
  }

  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(central.length, 8);
  eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, Buffer.concat([...local, cdBuf, eocd]));
}

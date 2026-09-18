import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { env } from "./env.ts";

// Where photos, voice notes and videos will live. Postgres only keeps the
// Media row (kind, mime type, size, storageKey); the bytes go through this
// interface. Not wired to any route yet.
//
// To move to object storage (S3, R2, Railway buckets), add a class that
// implements MediaStore with the provider's SDK and return it from
// mediaStore() based on an env variable. Nothing else needs to change.

export interface MediaStore {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

// Files on disk. Fine for development, or on Railway with a volume mounted
// at MEDIA_DIR.
class DiskStore implements MediaStore {
  constructor(private root: string) {}

  private path(key: string) {
    const path = normalize(join(this.root, key));
    if (!path.startsWith(normalize(this.root))) throw new Error("Invalid media key");
    return path;
  }

  async put(key: string, data: Buffer) {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  get(key: string) {
    return readFile(this.path(key));
  }

  async remove(key: string) {
    await rm(this.path(key), { force: true });
  }
}

let store: MediaStore | undefined;

export function mediaStore(): MediaStore {
  store ??= new DiskStore(env.mediaDir);
  return store;
}

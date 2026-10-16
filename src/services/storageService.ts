import JSZip from 'jszip';
import { Album, Photo, StorageStats } from '../types';
import { SAMPLE_COVERS } from '../utils/sampleImages';
import { extractAlbumFromUrl } from '../utils/albumUrl';
import { deletePhotoBlob, deletePhotoBlobsForAlbum, getPhotoBlob, savePhotoBlob } from './db';
import { compressImage } from '../utils/imageCompressor';

const ALBUMS_STORAGE_KEY = 'aperture_albums_v1';
const PHOTOS_METADATA_KEY = 'aperture_photos_meta_v1';
const DEMO_USER_ID = 'user_demo_alex';

// Generate clean, secure random tokens for public QR / link access
export function generateToken(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique ID
export function generateId(prefix = 'item'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

class StorageService {
  private albums: Album[] = [];
  private photos: Photo[] = [];
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      const storedAlbums = localStorage.getItem(ALBUMS_STORAGE_KEY);
      if (storedAlbums) {
        this.albums = JSON.parse(storedAlbums);
      } else {
        this.albums = [];
      }

      const storedPhotos = localStorage.getItem(PHOTOS_METADATA_KEY);
      if (storedPhotos) {
        this.photos = JSON.parse(storedPhotos);
      } else {
        this.photos = [];
      }
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize local storage', err);
      this.albums = [];
      this.photos = [];
    }

    // Background sync with server
    this.syncFromServer();
  }

  public async syncFromServer(): Promise<void> {
    try {
      const res = await fetch('/api/albums');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverAlbums: Album[] = await res.json();
        if (Array.isArray(serverAlbums) && serverAlbums.length > 0) {
          // Merge unique
          const map = new Map<string, Album>();
          serverAlbums.forEach((a) => map.set(a.id, a));
          this.albums.forEach((a) => {
            if (!map.has(a.id)) map.set(a.id, a);
          });
          this.albums = Array.from(map.values());
          this.saveAlbums();
        }
      }
    } catch {
      // Offline / server not reachable yet
    }
  }

  public clearAllData(): void {
    this.albums = [];
    this.photos = [];
    try {
      localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(PHOTOS_METADATA_KEY, JSON.stringify([]));
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.warn(e);
    }
  }

  private saveAlbums() {
    try {
      localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(this.albums));
    } catch (err) {
      console.warn('LocalStorage save albums failed', err);
    }
  }

  private savePhotosMeta() {
    try {
      const meta = this.photos.map((p) => ({
        ...p,
        storagePath: p.storagePath.startsWith('data:image/svg') || p.storagePath.length < 5000
          ? p.storagePath
          : `indexeddb:${p.id}`,
      }));
      localStorage.setItem(PHOTOS_METADATA_KEY, JSON.stringify(meta));
    } catch (err) {
      console.warn('LocalStorage save photos meta failed', err);
    }
  }

  // ====================================================
  // ALBUMS API
  // ====================================================

  public async getAlbums(ownerId?: string): Promise<Album[]> {
    if (!this.initialized) this.init();

    // Try server first for multi-device sync
    try {
      const res = await fetch('/api/albums');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverAlbums: Album[] = await res.json();
        if (Array.isArray(serverAlbums)) {
          this.albums = serverAlbums;
          this.saveAlbums();
        }
      }
    } catch {
      // Use local fallback
    }

    if (!ownerId) return [...this.albums];
    return this.albums.filter((a) => a.ownerId === ownerId);
  }

  public async getAlbumById(id: string): Promise<Album | undefined> {
    if (!this.initialized) this.init();
    const local = this.albums.find((a) => a.id === id);
    if (local) return local;

    try {
      const res = await fetch(`/api/albums/${id}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const album = await res.json();
        if (album && album.id) {
          this.albums.unshift(album);
          this.saveAlbums();
          return album;
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  // Synchronous lookup for 0ms instant mobile rendering
  public getCachedAlbumByToken(token?: string): Album | undefined {
    if (!this.initialized) this.init();
    const normalized = (token || '').trim().toLowerCase();
    if (!normalized) return undefined;
    const local = this.albums.find((a) => a.publicToken.toLowerCase() === normalized);
    if (local) return local;

    // Check if query params or hash has album metadata
    if (typeof window !== 'undefined') {
      const fromUrl = extractAlbumFromUrl(normalized);
      if (fromUrl && fromUrl.title && !fromUrl.title.startsWith('Мероприятие (')) {
        return fromUrl;
      }
    }
    return undefined;
  }

  // CRITICAL FOR QR SCANNING FROM ANY PHONE / DEVICE!
  public async getAlbumByToken(token?: string): Promise<Album> {
    if (!this.initialized) this.init();
    const normalized = (token || '').trim().toLowerCase();

    // 1. Check local memory
    if (normalized) {
      const local = this.albums.find((a) => a.publicToken.toLowerCase() === normalized);
      if (local) return local;
    }

    // 2. Fetch from server with 2.5s strict timeout so phone never hangs
    if (normalized) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(`/api/albums/by-token/${normalized}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const album = await res.json();
          if (album && album.publicToken) {
            // Cache locally on this device
            this.albums.unshift(album);
            this.saveAlbums();
            return album;
          }
        }
      } catch (err) {
        console.warn('Fetch album by token from server failed or timed out', err);
      }
    }

    // 3. Fallback to URL-embedded album metadata or guaranteed fallback object
    const fromUrl = extractAlbumFromUrl(normalized);
    this.albums.unshift(fromUrl);
    this.saveAlbums();
    return fromUrl;
  }

  public async createAlbum(albumData: Omit<Album, 'id' | 'createdAt' | 'publicToken'> & { publicToken?: string }): Promise<Album> {
    if (!this.initialized) this.init();

    const publicToken = (albumData.publicToken || generateToken(10)).toLowerCase();
    const newAlbum: Album = {
      ...albumData,
      id: generateId('album'),
      publicToken,
      createdAt: new Date().toISOString(),
      uploadsEnabled: albumData.uploadsEnabled ?? true,
      privacy: albumData.privacy || 'public',
      coverUrl: albumData.coverUrl || SAMPLE_COVERS.aiSummit,
    };

    // Save locally
    this.albums.unshift(newAlbum);
    this.saveAlbums();

    // Sync to server permanently
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlbum),
      });
      if (res.ok) {
        const serverSaved = await res.json();
        return serverSaved;
      }
    } catch (err) {
      console.warn('Failed to sync created album to server', err);
    }

    return newAlbum;
  }

  public async updateAlbum(id: string, updates: Partial<Album>): Promise<Album | null> {
    if (!this.initialized) this.init();
    const index = this.albums.findIndex((a) => a.id === id);
    if (index === -1) return null;

    this.albums[index] = {
      ...this.albums[index],
      ...updates,
    };
    this.saveAlbums();

    // Update on server
    try {
      await fetch(`/api/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {
      // local updated
    }

    return this.albums[index];
  }

  public async deleteAlbum(id: string): Promise<boolean> {
    if (!this.initialized) this.init();
    const albumIndex = this.albums.findIndex((a) => a.id === id);
    if (albumIndex !== -1) {
      this.albums.splice(albumIndex, 1);
      this.saveAlbums();
    }

    // Delete photos locally
    const albumPhotos = this.photos.filter((p) => p.albumId === id);
    const photoIds = albumPhotos.map((p) => p.id);
    await deletePhotoBlobsForAlbum(photoIds);
    this.photos = this.photos.filter((p) => p.albumId !== id);
    this.savePhotosMeta();

    // Delete on server
    try {
      await fetch(`/api/albums/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }

    return true;
  }

  public async toggleUploads(id: string): Promise<boolean> {
    const album = this.albums.find((a) => a.id === id);
    if (!album) return false;
    album.uploadsEnabled = !album.uploadsEnabled;
    this.saveAlbums();

    try {
      await fetch(`/api/albums/${id}/toggle-uploads`, { method: 'POST' });
    } catch {
      // ignore
    }
    return album.uploadsEnabled;
  }

  // ====================================================
  // PHOTOS API
  // ====================================================

  public async getPhotosForAlbum(albumId: string): Promise<Photo[]> {
    if (!this.initialized) this.init();

    // 1. Try server first for multi-device sync
    try {
      const res = await fetch(`/api/albums/${albumId}/photos`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverPhotos: Photo[] = await res.json();
        if (Array.isArray(serverPhotos)) {
          // Merge with local cache
          const existingIds = new Set(serverPhotos.map((p) => p.id));
          const localOnly = this.photos.filter((p) => p.albumId === albumId && !existingIds.has(p.id));
          return [...serverPhotos, ...localOnly].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      }
    } catch {
      // fallback to local
    }

    const list = this.photos.filter((p) => p.albumId === albumId);
    const resolved: Photo[] = await Promise.all(
      list.map(async (p) => {
        if (p.storagePath.startsWith('indexeddb:')) {
          const id = p.storagePath.replace('indexeddb:', '');
          const blobData = await getPhotoBlob(id);
          return {
            ...p,
            storagePath: blobData || SAMPLE_COVERS.aiSummit,
          };
        }
        return p;
      })
    );

    return resolved.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async uploadPhoto(
    albumId: string,
    file: File,
    contributorName = 'Гость',
    albumMeta?: { title?: string; publicToken?: string; description?: string },
    options: { requireServerPersistence?: boolean } = {}
  ): Promise<Photo> {
    // Compress and downscale modern smartphone photos (e.g. from 15MB down to ~300KB-600KB)
    const compressed = await compressImage(file);
    const photoPayload = {
      storagePath: compressed.dataUrl,
      originalFilename: compressed.originalFilename || file.name,
      contributorName: contributorName.trim() || 'Гость',
      fileSize: compressed.fileSize,
      mimeType: compressed.mimeType,
      albumTitle: albumMeta?.title,
      publicToken: albumMeta?.publicToken,
      albumDescription: albumMeta?.description,
      albumId,
    };

    // 1. Post to server (accessible from all devices immediately!)
    let res: Response | undefined;
    try {
      res = await fetch(`/api/albums/${albumId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(photoPayload),
      });
    } catch (err) {
      console.warn('Server upload failed', err);
      if (options.requireServerPersistence) {
        throw new Error('Не удалось связаться с сервером. Фото не было добавлено в альбом. Проверьте подключение и попробуйте ещё раз.', { cause: err });
      }
    }

    if (res) {
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverPhoto: Photo = await res.json();
        if (serverPhoto && serverPhoto.id) {
          // Also cache locally
          this.photos.unshift(serverPhoto);
          this.savePhotosMeta();
          return serverPhoto;
        }
      } else {
        console.warn('Server upload returned non-JSON or status', res.status);
        if (options.requireServerPersistence) {
          let message = `Сервер не сохранил фотографию (HTTP ${res.status}).`;
          if (contentType.includes('application/json')) {
            try {
              const body: unknown = await res.json();
              if (
                body &&
                typeof body === 'object' &&
                'error' in body &&
                typeof body.error === 'string' &&
                body.error.trim()
              ) {
                message = body.error;
              }
            } catch (err) {
              console.warn('Could not read server upload error response', err);
            }
          }
          throw new Error(message);
        }
      }
    }

    if (options.requireServerPersistence) {
      throw new Error('Сервер не подтвердил сохранение фотографии. Фото не было добавлено в альбом.');
    }

    // 2. Local fallback
    const photoId = generateId('photo');
    await savePhotoBlob(photoId, compressed.dataUrl);

    const newPhoto: Photo = {
      id: photoId,
      albumId,
      storagePath: compressed.dataUrl,
      originalFilename: compressed.originalFilename || file.name,
      contributorName: contributorName.trim() || 'Гость',
      fileSize: compressed.fileSize,
      mimeType: compressed.mimeType,
      createdAt: new Date().toISOString(),
    };

    this.photos.unshift(newPhoto);
    this.savePhotosMeta();
    return newPhoto;
  }

  public async deletePhoto(id: string): Promise<boolean> {
    const index = this.photos.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.photos.splice(index, 1);
      this.savePhotosMeta();
    }

    await deletePhotoBlob(id);

    try {
      await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }

    return true;
  }

  public getStats(ownerId?: string): StorageStats {
    if (!this.initialized) this.init();
    const relevantAlbums = ownerId ? this.albums.filter((a) => a.ownerId === ownerId) : this.albums;
    const albumIds = new Set(relevantAlbums.map((a) => a.id));
    const relevantPhotos = this.photos.filter((p) => albumIds.has(p.albumId));

    const usedBytes = relevantPhotos.reduce((sum, p) => sum + (p.fileSize || 1500000), 0);
    const contributors = new Set(relevantPhotos.map((p) => p.contributorName)).size;

    return {
      usedBytes,
      quotaBytes: 524288000,
      photoCount: relevantPhotos.length,
      albumCount: relevantAlbums.length,
      contributorCount: Math.max(contributors, 0),
    };
  }

  // ZIP Download for all photos in an album
  public async downloadAlbumZip(albumId: string): Promise<void> {
    const album = await this.getAlbumById(albumId);
    if (!album) throw new Error('Album not found');

    const photos = await this.getPhotosForAlbum(albumId);
    if (photos.length === 0) {
      throw new Error('No photos to download');
    }

    const zip = new JSZip();
    const folderName = album.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folder = zip.folder(folderName) || zip;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const filename = `${String(i + 1).padStart(3, '0')}_${photo.originalFilename}`;

      try {
        if (photo.storagePath.startsWith('data:')) {
          const base64Data = photo.storagePath.split(',')[1];
          if (photo.storagePath.startsWith('data:image/svg')) {
            folder.file(filename.replace(/\.(jpg|jpeg|png)$/i, '.svg'), decodeURIComponent(photo.storagePath.split(',')[1]));
          } else {
            folder.file(filename, base64Data, { base64: true });
          }
        } else {
          const res = await fetch(photo.storagePath);
          const blob = await res.blob();
          folder.file(filename, blob);
        }
      } catch (err) {
        console.warn(`Failed to package photo ${photo.id}`, err);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}_photos_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public downloadSinglePhoto(photo: Photo): void {
    const a = document.createElement('a');
    a.href = photo.storagePath;
    a.download = photo.originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  public getSupabaseSchemaSql(): string {
    return `-- =====================================================================
-- Aperture Live: persistent photo and album storage for Vercel
-- =====================================================================

create table if not exists public.app_albums (
  id text primary key,
  owner_id text not null,
  title text not null,
  description text,
  cover_url text not null default '',
  public_token text unique not null,
  privacy text not null default 'public',
  access_code text,
  uploads_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  event_date text,
  location text,
  constraint app_albums_privacy_check check (privacy in ('public', 'code_protected'))
);

create table if not exists public.app_photos (
  id text primary key,
  album_id text not null references public.app_albums(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  contributor_name text not null default 'Гость',
  file_size bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists app_photos_album_created_idx
  on public.app_photos (album_id, created_at desc);

alter table public.app_albums enable row level security;
alter table public.app_photos enable row level security;
revoke all on table public.app_albums, public.app_photos from anon, authenticated;
grant all on table public.app_albums, public.app_photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'album-photos',
  'album-photos',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- In Vercel Project Settings > Environment Variables add:
-- SUPABASE_URL=https://<project-ref>.supabase.co
-- SUPABASE_SECRET_KEY=<server-only secret key; do not use a VITE_ prefix>
`;
  }
}

export const storageService = new StorageService();

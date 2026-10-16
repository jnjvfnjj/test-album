import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High limit for photo uploads (up to 50MB per batch)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpData = path.join('/tmp', 'aperture_data');
    try {
      if (!fs.existsSync(tmpData)) fs.mkdirSync(tmpData, { recursive: true });
      return tmpData;
    } catch {
      // fallback
    }
  }
  const localData = path.join(__dirname, 'data');
  try {
    if (!fs.existsSync(localData)) fs.mkdirSync(localData, { recursive: true });
    return localData;
  } catch {
    const tmpData = path.join('/tmp', 'aperture_data');
    if (!fs.existsSync(tmpData)) fs.mkdirSync(tmpData, { recursive: true });
    return tmpData;
  }
}

const DATA_DIR = getDataDir();
const ALBUMS_FILE = path.join(DATA_DIR, 'albums.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const SEED_ALBUMS_FILE = path.join(__dirname, 'data', 'albums.json');
const SEED_PHOTOS_FILE = path.join(__dirname, 'data', 'photos.json');

interface Album {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  coverUrl: string;
  publicToken: string;
  privacy: 'public' | 'code_protected';
  accessCode?: string;
  uploadsEnabled: boolean;
  createdAt: string;
  eventDate?: string;
  location?: string;
}

interface Photo {
  id: string;
  albumId: string;
  storagePath: string;
  originalFilename: string;
  contributorName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface SupabaseAlbumRow {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  cover_url: string;
  public_token: string;
  privacy: 'public' | 'code_protected';
  access_code?: string;
  uploads_enabled: boolean;
  created_at: string;
  event_date?: string;
  location?: string;
}

interface SupabasePhotoRow {
  id: string;
  album_id: string;
  storage_path: string;
  original_filename: string;
  contributor_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

function getSupabaseConfig(): { url: string; apiKey: string; authorization?: string } | undefined {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = secretKey || serviceRoleKey;
  if (!url || !apiKey) return undefined;
  return {
    url: url.replace(/\/+$/, ''),
    apiKey,
    authorization: secretKey ? undefined : `Bearer ${serviceRoleKey}`,
  };
}

function toAlbum(row: SupabaseAlbumRow): Album {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    coverUrl: row.cover_url || '',
    publicToken: row.public_token,
    privacy: row.privacy,
    accessCode: row.access_code,
    uploadsEnabled: row.uploads_enabled,
    createdAt: row.created_at,
    eventDate: row.event_date,
    location: row.location,
  };
}

function toAlbumRow(album: Album): SupabaseAlbumRow {
  return {
    id: album.id,
    owner_id: album.ownerId,
    title: album.title,
    description: album.description,
    cover_url: album.coverUrl,
    public_token: album.publicToken,
    privacy: album.privacy,
    access_code: album.accessCode,
    uploads_enabled: album.uploadsEnabled,
    created_at: album.createdAt,
    event_date: album.eventDate,
    location: album.location,
  };
}

function toPhoto(row: SupabasePhotoRow): Photo {
  return {
    id: row.id,
    albumId: row.album_id,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    contributorName: row.contributor_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}

function toPhotoRow(photo: Photo): SupabasePhotoRow {
  return {
    id: photo.id,
    album_id: photo.albumId,
    storage_path: photo.storagePath,
    original_filename: photo.originalFilename,
    contributor_name: photo.contributorName,
    file_size: photo.fileSize,
    mime_type: photo.mimeType,
    created_at: photo.createdAt,
  };
}

async function supabaseRequest(endpoint: string, init: RequestInit = {}): Promise<Response> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }

  const response = await fetch(`${config.url}${endpoint}`, {
    ...init,
    headers: {
      apikey: config.apiKey,
      ...(config.authorization ? { Authorization: config.authorization } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  return response;
}

async function getSupabaseAlbums(): Promise<Album[]> {
  const albums: Album[] = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await supabaseRequest(
      `/rest/v1/app_albums?select=*&order=created_at.desc&limit=1000`,
      { headers: { 'Range-Unit': 'items', Range: `${offset}-${offset + 999}` } }
    );
    const rows = (await response.json()) as SupabaseAlbumRow[];
    albums.push(...rows.map(toAlbum));
    if (rows.length < 1000) return albums;
  }
}

async function getSupabasePhotos(albumId?: string): Promise<Photo[]> {
  const filter = albumId ? `&album_id=eq.${encodeURIComponent(albumId)}` : '';
  const photos: Photo[] = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await supabaseRequest(
      `/rest/v1/app_photos?select=*&order=created_at.desc${filter}&limit=1000`,
      { headers: { 'Range-Unit': 'items', Range: `${offset}-${offset + 999}` } }
    );
    const rows = (await response.json()) as SupabasePhotoRow[];
    photos.push(...rows.map(toPhoto));
    if (rows.length < 1000) return photos;
  }
}

async function saveSupabaseAlbum(album: Album): Promise<Album> {
  const response = await supabaseRequest('/rest/v1/app_albums?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(toAlbumRow(album)),
  });
  const rows = (await response.json()) as SupabaseAlbumRow[];
  if (!rows[0]) throw new Error('Supabase did not return the saved album.');
  return toAlbum(rows[0]);
}

async function saveSupabasePhoto(photo: Photo): Promise<Photo> {
  const response = await supabaseRequest('/rest/v1/app_photos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(toPhotoRow(photo)),
  });
  const rows = (await response.json()) as SupabasePhotoRow[];
  if (!rows[0]) throw new Error('Supabase did not return the saved photo.');
  return toPhoto(rows[0]);
}

function encodeStoragePath(pathname: string): string {
  return pathname.split('/').map(encodeURIComponent).join('/');
}

async function savePhotoToSupabase(dataUrl: string, objectPath: string): Promise<string> {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase is not configured.');

  const separatorIndex = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || separatorIndex < 0) {
    throw new Error('Uploaded photo has an invalid data URL.');
  }
  const metadata = dataUrl.slice(5, separatorIndex).split(';');
  const mimeType = metadata[0] || 'application/octet-stream';
  const encodedData = dataUrl.slice(separatorIndex + 1);
  const bytes = metadata.includes('base64')
    ? Buffer.from(encodedData, 'base64')
    : Buffer.from(decodeURIComponent(encodedData));
  const response = await fetch(
    `${config.url}/storage/v1/object/album-photos/${encodeStoragePath(objectPath)}`,
    {
      method: 'POST',
      headers: {
          apikey: config.apiKey,
          ...(config.authorization ? { Authorization: config.authorization } : {}),
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
      body: bytes,
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase photo storage failed (${response.status}): ${detail}`);
  }
  return `${config.url}/storage/v1/object/public/album-photos/${encodeStoragePath(objectPath)}`;
}

async function deletePhotoFromSupabase(storagePath: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase is not configured.');
  const marker = '/storage/v1/object/public/album-photos/';
  const markerIndex = storagePath.indexOf(marker);
  if (markerIndex < 0) return;
  const objectPath = storagePath.slice(markerIndex + marker.length)
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/');
  const response = await fetch(
    `${config.url}/storage/v1/object/album-photos/${encodeStoragePath(objectPath)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: config.apiKey,
        ...(config.authorization ? { Authorization: config.authorization } : {}),
      },
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase photo deletion failed (${response.status}): ${detail}`);
  }
}

if (process.env.VERCEL) {
  app.use('/api', (req, res, next) => {
    if (!getSupabaseConfig()) {
      return res.status(503).json({
        error: 'Облачное хранилище не настроено. Добавьте SUPABASE_URL и SUPABASE_SECRET_KEY в настройках Vercel.',
      });
    }
    if (req.method === 'DELETE' || (req.method === 'POST' && req.path === '/reset')) {
      return res.status(403).json({
        error: 'Удаление данных через публичный API отключено. Для управления данными требуется авторизация организатора.',
      });
    }
    next();
  });
}

function loadAlbums(): Album[] {
  try {
    if (fs.existsSync(ALBUMS_FILE)) {
      return JSON.parse(fs.readFileSync(ALBUMS_FILE, 'utf-8'));
    }
    if (fs.existsSync(SEED_ALBUMS_FILE)) {
      const data = fs.readFileSync(SEED_ALBUMS_FILE, 'utf-8');
      try {
        fs.writeFileSync(ALBUMS_FILE, data, 'utf-8');
      } catch {
        // ignore
      }
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading albums file', err);
  }
  return [];
}

function saveAlbums(albums: Album[]): boolean {
  try {
    fs.writeFileSync(ALBUMS_FILE, JSON.stringify(albums, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving albums file', err);
    return false;
  }
}

function loadPhotos(): Photo[] {
  try {
    if (fs.existsSync(PHOTOS_FILE)) {
      return JSON.parse(fs.readFileSync(PHOTOS_FILE, 'utf-8'));
    }
    if (fs.existsSync(SEED_PHOTOS_FILE)) {
      const data = fs.readFileSync(SEED_PHOTOS_FILE, 'utf-8');
      try {
        fs.writeFileSync(PHOTOS_FILE, data, 'utf-8');
      } catch {
        // ignore
      }
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading photos file', err);
  }
  return [];
}

function savePhotos(photos: Photo[]): boolean {
  try {
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving photos file', err);
    return false;
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Get all albums
app.get('/api/albums', async (req, res) => {
  try {
    res.json(getSupabaseConfig() ? await getSupabaseAlbums() : loadAlbums());
  } catch (err) {
    console.error('Error loading albums', err);
    res.status(500).json({ error: 'Не удалось загрузить альбомы.' });
  }
});

// Get single album by public token (CRITICAL for QR codes from any device!)
app.get('/api/albums/by-token/:token', async (req, res) => {
  try {
    const token = req.params.token.trim().toLowerCase();
    const albums = getSupabaseConfig() ? await getSupabaseAlbums() : loadAlbums();
    const album = albums.find((a) => a.publicToken.toLowerCase() === token);
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    res.json(album);
  } catch (err) {
    console.error('Error loading album by token', err);
    res.status(500).json({ error: 'Не удалось загрузить альбом.' });
  }
});

// Get album by ID or Token
app.get('/api/albums/:id', async (req, res) => {
  try {
    const param = req.params.id.trim().toLowerCase();
    const albums = getSupabaseConfig() ? await getSupabaseAlbums() : loadAlbums();
    const album = albums.find(
      (a) =>
        a.id.toLowerCase() === param ||
        a.publicToken.toLowerCase() === param ||
        a.id.toLowerCase() === `album_${param}`
    );
    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }
    res.json(album);
  } catch (err) {
    console.error('Error loading album', err);
    res.status(500).json({ error: 'Не удалось загрузить альбом.' });
  }
});

// Create new album
app.post('/api/albums', async (req, res) => {
  const { title, description, coverUrl, publicToken, privacy, accessCode, uploadsEnabled, location, eventDate, ownerId } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newAlbum: Album = {
    id: `album_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    ownerId: ownerId || 'user_demo_alex',
    title: title.trim(),
    description: description ? description.trim() : undefined,
    coverUrl: coverUrl || '',
    publicToken: (publicToken || Math.random().toString(36).substring(2, 12)).toLowerCase(),
    privacy: privacy || 'public',
    accessCode: accessCode ? accessCode.trim() : undefined,
    uploadsEnabled: uploadsEnabled !== false,
    createdAt: new Date().toISOString(),
    eventDate: eventDate || undefined,
    location: location ? location.trim() : undefined,
  };

  try {
    if (getSupabaseConfig()) {
      const savedAlbum = await saveSupabaseAlbum(newAlbum);
      return res.status(201).json(savedAlbum);
    }

    const albums = loadAlbums();
    albums.unshift(newAlbum);
    if (!saveAlbums(albums)) {
      return res.status(500).json({ error: 'Не удалось сохранить альбом.' });
    }
    res.status(201).json(newAlbum);
  } catch (err) {
    console.error('Error saving album', err);
    res.status(500).json({ error: 'Не удалось сохранить альбом.' });
  }
});

// Update album
app.put('/api/albums/:id', async (req, res) => {
  try {
  const param = req.params.id.trim().toLowerCase();
  const albums = getSupabaseConfig() ? await getSupabaseAlbums() : loadAlbums();
  const index = albums.findIndex(
    (a) =>
      a.id.toLowerCase() === param ||
      a.publicToken.toLowerCase() === param ||
      a.id.toLowerCase() === `album_${param}`
  );
  if (index === -1) {
    return res.status(404).json({ error: 'Album not found' });
  }

  albums[index] = {
    ...albums[index],
    ...req.body,
    id: albums[index].id, // protect ID
  };

  if (getSupabaseConfig()) {
    return res.json(await saveSupabaseAlbum(albums[index]));
  }

  saveAlbums(albums);
  res.json(albums[index]);
  } catch (err) {
    console.error('Error updating album', err);
    res.status(500).json({ error: 'Не удалось обновить альбом.' });
  }
});

// Toggle uploads for album
app.post('/api/albums/:id/toggle-uploads', async (req, res) => {
  try {
  const param = req.params.id.trim().toLowerCase();
  const albums = getSupabaseConfig() ? await getSupabaseAlbums() : loadAlbums();
  const album = albums.find(
    (a) =>
      a.id.toLowerCase() === param ||
      a.publicToken.toLowerCase() === param ||
      a.id.toLowerCase() === `album_${param}`
  );
  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }
  album.uploadsEnabled = !album.uploadsEnabled;
  if (getSupabaseConfig()) {
    await saveSupabaseAlbum(album);
    return res.json({ uploadsEnabled: album.uploadsEnabled });
  }
  saveAlbums(albums);
  res.json({ uploadsEnabled: album.uploadsEnabled });
  } catch (err) {
    console.error('Error toggling album uploads', err);
    res.status(500).json({ error: 'Не удалось изменить настройки загрузки.' });
  }
});

// Delete album and its photos
app.delete('/api/albums/:id', async (req, res) => {
  try {
  const param = req.params.id.trim().toLowerCase();
  const cloudEnabled = Boolean(getSupabaseConfig());
  const albums = cloudEnabled ? await getSupabaseAlbums() : loadAlbums();
  const album = albums.find(
    (a) =>
      a.id.toLowerCase() === param ||
      a.publicToken.toLowerCase() === param ||
      a.id.toLowerCase() === `album_${param}`
  );
  if (!album) {
    return res.status(404).json({ error: 'Album not found' });
  }
  const realId = album.id;
  if (cloudEnabled) {
    const photos = await getSupabasePhotos(realId);
    for (const photo of photos) {
      await deletePhotoFromSupabase(photo.storagePath);
    }
    await supabaseRequest(`/rest/v1/app_albums?id=eq.${encodeURIComponent(realId)}`, {
      method: 'DELETE',
    });
    return res.json({ success: true });
  }

  const filteredAlbums = albums.filter((a) => a.id !== realId);
  saveAlbums(filteredAlbums);

  // Delete photos for this album
  const photos = loadPhotos();
  const filteredPhotos = photos.filter((p) => p.albumId !== realId && p.albumId !== album.publicToken);
  savePhotos(filteredPhotos);

  res.json({ success: true });
  } catch (err) {
    console.error('Error deleting album', err);
    res.status(500).json({ error: 'Не удалось удалить альбом.' });
  }
});

// Get photos for album (searches by real album ID, publicToken, and variations)
app.get('/api/albums/:id/photos', async (req, res) => {
  try {
  const param = req.params.id.trim().toLowerCase();
  const cloudEnabled = Boolean(getSupabaseConfig());
  const albums = cloudEnabled ? await getSupabaseAlbums() : loadAlbums();
  const album = albums.find(
    (a) =>
      a.id.toLowerCase() === param ||
      a.publicToken.toLowerCase() === param ||
      a.id.toLowerCase() === `album_${param}`
  );

  const realId = album ? album.id : req.params.id;
  const token = album ? album.publicToken : param;

  const photos = cloudEnabled ? await getSupabasePhotos(realId) : loadPhotos();
  const albumPhotos = photos.filter(
    (p) =>
      p.albumId === realId ||
      p.albumId === token ||
      p.albumId.toLowerCase() === param ||
      p.albumId.toLowerCase() === `album_${token}`
  );
  // Newest first
  albumPhotos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(albumPhotos);
  } catch (err) {
    console.error('Error loading album photos', err);
    res.status(500).json({ error: 'Не удалось загрузить фотографии альбома.' });
  }
});

// Upload photo to album (CRITICAL: never fails due to token vs ID mismatch)
app.post('/api/albums/:id/photos', async (req, res) => {
 try {
  const param = req.params.id.trim().toLowerCase();
  const cloudEnabled = Boolean(getSupabaseConfig());
  const albums = cloudEnabled ? await getSupabaseAlbums() : loadAlbums();
  let album = albums.find(
    (a) =>
      a.id.toLowerCase() === param ||
      a.publicToken.toLowerCase() === param ||
      a.id.toLowerCase() === `album_${param}`
  );

  // Auto-register album if missing from server's albums.json but metadata sent from QR URL
  if (!album) {
    if (req.body.albumTitle) {
      album = {
        id: req.body.albumId || (param.startsWith('album_') ? param : `album_${param}`),
        ownerId: 'user_demo_alex',
        title: req.body.albumTitle.trim(),
        description: req.body.albumDescription || undefined,
        coverUrl: req.body.albumCoverUrl || '',
        publicToken: req.body.publicToken || param,
        privacy: 'public',
        uploadsEnabled: true,
        createdAt: new Date().toISOString(),
        eventDate: req.body.eventDate || undefined,
        location: req.body.location || undefined,
      };
      albums.unshift(album);
      if (cloudEnabled) {
        await saveSupabaseAlbum(album);
      } else {
        saveAlbums(albums);
      }
    } else if (albums.length === 1) {
      // If only one album exists in the database, attach to it
      album = albums[0];
    } else {
      album = {
        id: param.startsWith('album_') ? param : `album_${param}`,
        ownerId: 'user_demo_alex',
        title: 'Event Album',
        coverUrl: '',
        publicToken: param,
        privacy: 'public',
        uploadsEnabled: true,
        createdAt: new Date().toISOString(),
      };
      albums.unshift(album);
      if (cloudEnabled) {
        await saveSupabaseAlbum(album);
      } else {
        saveAlbums(albums);
      }
    }
  }

  if (album && !album.uploadsEnabled) {
    return res.status(403).json({ error: 'Загрузка фотографий временно приостановлена организатором' });
  }

  const { storagePath, originalFilename, contributorName, fileSize, mimeType } = req.body;
  if (!storagePath) {
    return res.status(400).json({ error: 'Image data is required' });
  }

  const newPhoto: Photo = {
    id: `photo_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    albumId: album ? album.id : req.params.id,
    storagePath,
    originalFilename: originalFilename || 'photo.jpg',
    contributorName: contributorName || 'Гость',
    fileSize: fileSize || Math.round((storagePath.length * 3) / 4),
    mimeType: mimeType || 'image/jpeg',
    createdAt: new Date().toISOString(),
  };

  if (cloudEnabled) {
    const extensionByMimeType: Record<string, string> = {
      'image/gif': 'gif',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
    };
    const extension = extensionByMimeType[newPhoto.mimeType] || 'jpg';
    const objectPath = `${newPhoto.id}.${extension}`;
    newPhoto.storagePath = await savePhotoToSupabase(storagePath, objectPath);
    try {
      const savedPhoto = await saveSupabasePhoto(newPhoto);
      return res.status(201).json(savedPhoto);
    } catch (err) {
      try {
        await deletePhotoFromSupabase(newPhoto.storagePath);
      } catch (cleanupError) {
        console.error('Could not remove photo blob after database insert failed', cleanupError);
      }
      throw err;
    }
  }

  const photos = loadPhotos();
  photos.unshift(newPhoto);
  if (!savePhotos(photos)) {
    return res.status(500).json({ error: 'Не удалось сохранить фотографию. Попробуйте ещё раз позже.' });
  }
  res.status(201).json(newPhoto);
 } catch (err) {
   console.error('Error uploading photo', err);
   res.status(502).json({
     error: err instanceof Error
       ? `Не удалось сохранить фотографию: ${err.message}`
       : 'Не удалось сохранить фотографию в облачное хранилище.',
   });
 }
});

// Delete photo
app.delete('/api/photos/:id', async (req, res) => {
  try {
  if (getSupabaseConfig()) {
    const photos = await getSupabasePhotos();
    const photo = photos.find((item) => item.id === req.params.id);
    if (photo) {
      await deletePhotoFromSupabase(photo.storagePath);
      await supabaseRequest(`/rest/v1/app_photos?id=eq.${encodeURIComponent(photo.id)}`, {
        method: 'DELETE',
      });
    }
    return res.json({ success: true });
  }

  const photos = loadPhotos();
  const filtered = photos.filter((p) => p.id !== req.params.id);
  savePhotos(filtered);
  res.json({ success: true });
  } catch (err) {
    console.error('Error deleting photo', err);
    res.status(500).json({ error: 'Не удалось удалить фотографию.' });
  }
});

// Reset / wipe all data (clean slate)
app.post('/api/reset', async (req, res) => {
  try {
  if (getSupabaseConfig()) {
    const photos = await getSupabasePhotos();
    for (const photo of photos) {
      await deletePhotoFromSupabase(photo.storagePath);
    }
    await supabaseRequest('/rest/v1/app_photos?id=not.is.null', { method: 'DELETE' });
    await supabaseRequest('/rest/v1/app_albums?id=not.is.null', { method: 'DELETE' });
    return res.json({ success: true });
  }

  saveAlbums([]);
  savePhotos([]);
  res.json({ success: true });
  } catch (err) {
    console.error('Error resetting application data', err);
    res.status(500).json({ error: 'Не удалось очистить хранилище.' });
  }
});

// ==========================================
// VITE SPA & STATIC SERVING
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode with Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Server failed to start', err);
  });
}

export default app;

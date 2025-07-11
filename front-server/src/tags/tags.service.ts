import { Injectable } from '@nestjs/common';
import { Track } from './track.model';
import { TagInput } from './tag.input';
import * as path from 'path';
import * as fs from 'fs/promises';
import { parseFile } from 'music-metadata';
import * as NodeID3 from 'node-id3';
import { createHash } from 'crypto';

@Injectable()
export class TagsService {
  private readonly musicPaths: string[] = (() => {
    const raw = process.env.MUSIC_PATHS ?? process.env.MUSIC_PATH ?? ''; // ← лишаємо й скорочену назву

    if (!raw) return ['/music'];               // дефолт

    // 1) спроба розпарсити як JSON
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) { /* не JSON */ }

    // 2) якщо є кома → сплітимо
    if (raw.includes(',')) {
      return raw.split(',').map(p => p.trim()).filter(Boolean);
    }

    // 3) інакше – один шлях
    return [raw.trim()];
  })();
  private readonly supportedExtensions = ['.mp3', '.flac', '.ogg', '.m4a', '.mp4', '.aac', '.wma'];

  private generateTrackId(filePath: string): string {
    return createHash('md5').update(filePath).digest('hex');
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const audioFiles: string[] = [];

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath);
          audioFiles.push(...subFiles);
        } else if (item.isFile()) {
          // Check if file has supported audio extension
          const ext = path.extname(item.name).toLowerCase();
          if (this.supportedExtensions.includes(ext)) {
            audioFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }

    return audioFiles;
  }

  private async readMetadata(filePath: string): Promise<Track | null> {
    try {
      // 🔍 Визначаємо, відносно якого каталогу будувати шлях
      const baseDir = Array.isArray(this.musicPaths)
        ? this.musicPaths.find(p => filePath.startsWith(p))      // збігається з поточним файлом
        ?? this.musicPaths[0]                                  // fallback — перший елемент
        : this.musicPaths;                                       // одиночний рядок

      const relativePath = path.relative(baseDir, filePath);

      const metadata = await parseFile(filePath);

      // 🖼️ Витягуємо обкладинку, якщо є
      let cover: string | undefined;
      if (metadata.common.picture?.length) {
        const pic = metadata.common.picture[0];
        cover = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
      }

      const track: Track = {
        id: this.generateTrackId(relativePath),
        path: relativePath,
        title: metadata.common.title || undefined,
        artist: metadata.common.artist || undefined,
        albumArtist: metadata.common.albumartist || metadata.common.artist || undefined,
        album: metadata.common.album || undefined,
        year: metadata.common.year || undefined,
        trackNumber: metadata.common.track?.no || undefined,
        genre: metadata.common.genre?.[0] || undefined,
        cover,
      };

      return track;
    } catch (err) {
      console.error(`Error reading metadata for ${filePath}:`, err);
      return null;
    }
  }

  // Mock data for development - will be replaced with real metadata reading
  private mockTracks: Track[] = [
    {
      id: '1',
      path: 'Library/Audiobook_Rus_200_017.mp3',
      title: 'Chapter 17',
      artist: 'John Smith',
      albumArtist: 'John Smith',
      album: 'Russian Stories',
      genre: 'Audiobook',
      trackNumber: 17,
      year: 2020,
    },
    {
      id: '2',
      path: 'Library/Audiobook_Rus_200_018.mp3',
      title: 'Chapter 18',
      artist: 'John Smith',
      albumArtist: 'John Smith',
      album: 'Russian Stories',
      genre: 'Audiobook',
      trackNumber: 18,
      year: 2020,
    },
    // Add more mock data as needed
  ];

  async findAll(searchPath?: string): Promise<Track[]> {
    try {
      console.log('🔍 Scanning for audio files...');

      // 1️⃣ Масив базових директорій
      const baseDirs = Array.isArray(this.musicPaths)
        ? this.musicPaths
        : [this.musicPaths];

      // 2️⃣ Директорії, які реально скануватимемо
      const dirsToScan = baseDirs.map(dir =>
        searchPath ? path.join(dir, searchPath) : dir,
      );

      // 3️⃣ Відфільтровуємо ті, що існують
      const validDirs: string[] = [];
      for (const dir of dirsToScan) {
        try {
          await fs.access(dir);
          validDirs.push(dir);
        } catch {
          console.warn(`Music directory not found: ${dir}`);
        }
      }
      if (validDirs.length === 0) return [];

      // 4️⃣ Рекурсивно збираємо всі аудіофайли з кожної директорії
      let audioFiles: string[] = [];
      for (const dir of validDirs) {
        const files = await this.scanDirectory(dir);
        audioFiles = audioFiles.concat(files);
      }
      console.log(`📁 Found ${audioFiles.length} audio files`);

      if (!audioFiles.length) return [];

      // 5️⃣ Читаємо метадані (обмежимося першими 50 для швидкості)
      const tracks: Track[] = [];
      for (const file of audioFiles.slice(0, 50)) {
        const track = await this.readMetadata(file);
        if (track) tracks.push(track);
      }

      console.log(`🎵 Successfully loaded ${tracks.length} tracks`);
      return tracks;
    } catch (err) {
      console.error('Error in findAll:', err);
      return [];
    }
  }

  async findOne(filePath: string): Promise<Track | null> {
    try {
      // Визначаємо, з якої базової директорії складати абсолютний шлях
      const baseDir = Array.isArray(this.musicPaths)
        ? this.musicPaths.find(p => filePath.startsWith(p))      // якщо прийшов повний шлях
        ?? this.musicPaths[0]                                  // fallback
        : this.musicPaths;                                       // одиночний шлях

      const fullPath = path.isAbsolute(filePath)
        ? filePath                       // якщо вже абсолютний
        : path.join(baseDir, filePath);  // робимо абсолютним

      return await this.readMetadata(fullPath);
    } catch (err) {
      console.error(`Error reading single track ${filePath}:`, err);
      return null;
    }
  }

  async updateTags(filePath: string, tagInput: TagInput): Promise<boolean> {
    try {
      // 1️⃣ Обираємо корінь
      const baseDir = Array.isArray(this.musicPaths)
        ? this.musicPaths.find(p => filePath.startsWith(p)) ?? this.musicPaths[0]
        : this.musicPaths;

      // 2️⃣ Формуємо повний шлях
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(baseDir, filePath);

      const ext = path.extname(fullPath).toLowerCase();
      console.log(`🏷️ Updating tags for ${fullPath}:`, tagInput);

      if (ext === '.mp3') {
        // Підготовка тегів, відфільтровуємо undefined
        const tags = Object.fromEntries(
          Object.entries({
            title: tagInput.title,
            artist: tagInput.artist,
            albumArtist: tagInput.albumArtist,
            album: tagInput.album,
            year: tagInput.year?.toString(),
            trackNumber: tagInput.trackNumber?.toString(),
            genre: tagInput.genre,
          }).filter(([, v]) => v !== undefined),
        );

        const res = NodeID3.update(tags, fullPath);

        if (res instanceof Error) {
          console.error(`❌ Failed to update MP3 tags: ${res.message}`);
          return false;                          // <- чистий boolean
        }

        console.log('✅ Successfully updated MP3 tags');
        return res;
      }

      console.log(`⚠️ Tag writing for ${ext} files not yet implemented`);
      return false;
    } catch (err) {
      console.error('Error updating tags:', err);
      return false;
    }
  }

  async uploadCover(filePath: string, coverData: Buffer): Promise<boolean> {
    try {
      // TODO: Implement cover upload using node-id3 or flac-metadata
      console.log(`Uploading cover for ${filePath}`);
      return true;
    } catch (error) {
      console.error('Error uploading cover:', error);
      return false;
    }
  }
}

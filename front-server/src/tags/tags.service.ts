import { Injectable } from '@nestjs/common';
import { Track } from './track.model';
import { TagInput } from './tag.input';
import { DatabaseService } from './database.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { parseFile } from 'music-metadata';
import * as NodeID3 from 'node-id3';
import { createHash } from 'crypto';

@Injectable()
export class TagsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private readonly musicPaths: string[] = (() => {
    const raw = process.env.MUSIC_PATHS ?? process.env.MUSIC_PATH ?? '';

    if (!raw) return ['/music'];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) { /* не JSON */ }

    if (raw.includes(',')) {
      return raw.split(',').map(p => p.trim()).filter(Boolean);
    }

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
          const subFiles = await this.scanDirectory(fullPath);
          audioFiles.push(...subFiles);
        } else if (item.isFile()) {
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
      const baseDir = Array.isArray(this.musicPaths)
        ? this.musicPaths.find(p => filePath.startsWith(p)) ?? this.musicPaths[0]
        : this.musicPaths;

      const relativePath = path.relative(baseDir, filePath);
      const metadata = await parseFile(filePath);

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

  async indexAllTracks(): Promise<boolean> {
    try {
      console.log('🔄 Starting track indexing...');

      // Очищаем БД
      await this.databaseService.clearAllAudioFiles();

      const baseDirs = Array.isArray(this.musicPaths) ? this.musicPaths : [this.musicPaths];

      const validDirs: string[] = [];
      for (const dir of baseDirs) {
        try {
          await fs.access(dir);
          validDirs.push(dir);
        } catch {
          console.warn(`Music directory not found: ${dir}`);
        }
      }

      if (validDirs.length === 0) {
        console.error('No valid music directories found');
        return false;
      }

      let totalFiles = 0;
      for (const dir of validDirs) {
        const audioFiles = await this.scanDirectory(dir);
        
        for (const filePath of audioFiles) {
          const baseDir = this.musicPaths.find(p => filePath.startsWith(p)) ?? this.musicPaths[0];
          const relativePath = path.relative(baseDir, filePath);
          
          await this.databaseService.insertAudioFile(relativePath);
          totalFiles++;
        }
      }

      console.log(`✅ Indexed ${totalFiles} audio files`);
      return true;
    } catch (err) {
      console.error('Error indexing tracks:', err);
      return false;
    }
  }

  async findAll(limit: number = 25, offset: number = 0, search?: string, sortBy?: string, sortOrder?: string): Promise<Track[]> {
    try {
      const audioFiles = await this.databaseService.getAllAudioFiles(limit, offset, search);
      const tracks: Track[] = [];

      for (const audioFile of audioFiles) {
        const baseDir = Array.isArray(this.musicPaths) ? this.musicPaths[0] : this.musicPaths;
        const fullPath = path.join(baseDir, audioFile.path);
        
        const track = await this.readMetadata(fullPath);
        if (track) {
          tracks.push(track);
        }
      }

      // Применяем сортировку
      if (sortBy && sortOrder) {
        const validSortFields = ['path', 'title', 'artist', 'albumArtist', 'album', 'genre', 'trackNumber', 'year'];
        if (validSortFields.includes(sortBy)) {
          tracks.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            // Обработка null/undefined значений
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';
            
            // Для числовых полей
            if (sortBy === 'trackNumber' || sortBy === 'year') {
              aValue = Number(aValue) || 0;
              bValue = Number(bValue) || 0;
              const numResult = aValue - bValue;
              return sortOrder === 'desc' ? -numResult : numResult;
            }
            
            // Для строковых полей
            const strResult = String(aValue).localeCompare(String(bValue));
            return sortOrder === 'desc' ? -strResult : strResult;
          });
        }
      }

      return tracks;
    } catch (err) {
      console.error('Error in findAll:', err);
      return [];
    }
  }

  async getTracksCount(search?: string): Promise<number> {
    try {
      return await this.databaseService.getAudioFilesCount(search);
    } catch (err) {
      console.error('Error getting tracks count:', err);
      return 0;
    }
  }

  async findOne(filePath: string): Promise<Track | null> {
    try {
      const baseDir = Array.isArray(this.musicPaths)
        ? this.musicPaths.find(p => filePath.startsWith(p)) ?? this.musicPaths[0]
        : this.musicPaths;

      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(baseDir, filePath);

      return await this.readMetadata(fullPath);
    } catch (err) {
      console.error(`Error reading single track ${filePath}:`, err);
      return null;
    }
  }

  async updateTags(filePath: string, tagInput: TagInput): Promise<boolean> {
    try {
      const baseDir = Array.isArray(this.musicPaths)
        ? this.musicPaths.find(p => filePath.startsWith(p)) ?? this.musicPaths[0]
        : this.musicPaths;

      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(baseDir, filePath);

      const ext = path.extname(fullPath).toLowerCase();

      if (ext === '.mp3') {
        const tags = {
          title: tagInput.title === null ? "" : tagInput.title,
          artist: tagInput.artist === null ? "" : tagInput.artist,
          performerInfo: tagInput.albumArtist === null ? "" : tagInput.albumArtist, // node-id3 использует performerInfo для albumArtist
          TPE2: tagInput.albumArtist === null ? "" : tagInput.albumArtist, // дублируем для надежности
          album: tagInput.album === null ? "" : tagInput.album,
          year: tagInput.year === null ? "" : tagInput.year?.toString(),
          TYER: tagInput.year === null ? "" : tagInput.year?.toString(), // ID3v2.3
          TDRC: tagInput.year === null ? "" : tagInput.year?.toString(), // ID3v2.4
          TRCK: tagInput.trackNumber === null ? "" : tagInput.trackNumber?.toString(),
          genre: tagInput.genre === null ? "" : tagInput.genre,
        };

        // Удаляем только undefined значения, оставляем пустые строки
        const filteredTags = Object.fromEntries(
          Object.entries(tags).filter(([, v]) => v !== undefined)
        );

        const res = NodeID3.update(filteredTags, fullPath);

        if (res instanceof Error) {
          console.error(`❌ Failed to update MP3 tags: ${res.message}`);
          return false;
        }

        return res;
      }

      return false;
    } catch (err) {
      console.error('Error updating tags:', err);
      return false;
    }
  }

  async uploadCover(filePath: string, coverData: Buffer): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      console.error('Error uploading cover:', error);
      return false;
    }
  }
}

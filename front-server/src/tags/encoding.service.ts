import { Injectable } from '@nestjs/common';
import { DatabaseService, EncodingTask, CorruptedFile } from './database.service';
import { TagsService } from './tags.service';
import { EncodingTaskStatus } from './encoding-task-status.model';
import * as path from 'path';
import { parseFile } from 'music-metadata';
import * as NodeID3 from 'node-id3';
import * as iconv from 'iconv-lite';

@Injectable()
export class EncodingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tagsService: TagsService,
  ) {}

  private readonly supportedExtensions = ['.mp3', '.flac'];
  private workers: Set<Promise<void>> = new Set();

  /**
   * Очищает БД от несуществующих файлов
   */
  private async cleanupMissingFiles(): Promise<number> {
    console.log('🧹 Cleaning up missing files from database...');
    
    const allFiles = await this.databaseService.getAllAudioFiles(10000, 0);
    const musicPaths = this.getMusicPaths();
    const baseDir = Array.isArray(musicPaths) ? musicPaths[0] : musicPaths;
    
    let removedCount = 0;
    
    for (const file of allFiles) {
      const fullPath = path.join(baseDir, file.path);
      
      try {
        const fs = require('fs').promises;
        await fs.access(fullPath);
      } catch {
        // Файл не существует, удаляем из БД
        await this.databaseService.deleteAudioFile(file.path);
        console.log(`🗑️ Removed missing file: ${file.path}`);
        removedCount++;
      }
    }
    
    console.log(`🧹 Cleanup complete: removed ${removedCount} missing files`);
    return removedCount;
  }

  /**
   * Получает пути к музыкальным папкам (копия из TagsService)
   */
  private getMusicPaths(): string[] {
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
  }

  /**
   * Детектирует кракозябры в тексте
   */
  private detectCorruption(text: string | null | undefined): boolean {
    if (!text || typeof text !== 'string') return false;
    
    // Ищем паттерны CP1251 кракозябр в UTF-8
    // Диапазон À-ÿ (0xC0-0xFF) характерен для неправильно декодированной кириллицы
    const corruptionPattern = /[À-ÿ]/;
    return corruptionPattern.test(text);
  }

  /**
   * Исправляет кодировку текста CP1251 -> UTF-8
   */
  private fixEncoding(text: string): string {
    try {
      // Преобразуем UTF-8 кракозябры обратно в байты latin1
      const buffer = Buffer.from(text, 'latin1');
      // Декодируем как CP1251 через iconv-lite
      const fixedText = iconv.decode(buffer, 'cp1251');
      console.log('Fixed encoding:', text, '->', fixedText);
      return fixedText;
    } catch (error) {
      console.error('Encoding fix error:', error);
      return text; // Возвращаем оригинал при ошибке
    }
  }

  /**
   * Сканирует файл на наличие кракозябр в тегах
   */
  private async scanFileForCorruption(filePath: string): Promise<string[]> {
    try {
      // Используем тот же подход к путям как в TagsService
      const musicPaths = this.getMusicPaths();
      const baseDir = Array.isArray(musicPaths) ? musicPaths[0] : musicPaths;
      const fullPath = path.join(baseDir, filePath);
      
      const metadata = await parseFile(fullPath);
      
      const corruptedFields: string[] = [];
      const fieldsToCheck = ['title', 'artist', 'album', 'albumartist', 'genre'];
      
      // Проверяем теги внутри файла
      for (const field of fieldsToCheck) {
        const value = metadata.common[field];
        const textValue = Array.isArray(value) ? value[0] : value;
        
        if (this.detectCorruption(textValue)) {
          corruptedFields.push(field);
        }
      }
      
      // Проверяем имя файла
      const fileName = path.basename(filePath);
      if (this.detectCorruption(fileName)) {
        corruptedFields.push('filename');
      }
      
      return corruptedFields;
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Исправляет кодировку в файле
   */
  private async fixFileEncoding(filePath: string, corruptedFields: string[]): Promise<boolean> {
    try {
      const musicPaths = this.getMusicPaths();
      const baseDir = Array.isArray(musicPaths) ? musicPaths[0] : musicPaths;
      const fullPath = path.join(baseDir, filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let tagsFixed = false;
      let fileRenamed = false;
      
      // Исправляем теги внутри файла
      const tagFields = corruptedFields.filter(field => field !== 'filename');
      if (tagFields.length > 0) {
        if (ext === '.mp3') {
          tagsFixed = await this.fixMP3Encoding(fullPath, tagFields);
        } else if (ext === '.flac') {
          tagsFixed = await this.fixFLACEncoding(fullPath, tagFields);
        }
      }
      
      // Исправляем имя файла если нужно
      if (corruptedFields.includes('filename')) {
        fileRenamed = await this.fixFileName(fullPath, filePath, baseDir);
      }
      
      return tagsFixed || fileRenamed;
    } catch (error) {
      console.error(`Error fixing file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Исправляет кодировку в MP3 файле
   */
  private async fixMP3Encoding(fullPath: string, corruptedFields: string[]): Promise<boolean> {
    try {
      const metadata = await parseFile(fullPath);
      const tags: any = {};
      
      for (const field of corruptedFields) {
        const value = metadata.common[field];
        const textValue = Array.isArray(value) ? value[0] : value;
        
        if (textValue && this.detectCorruption(textValue)) {
          const fixedValue = this.fixEncoding(textValue);
          
          // Маппинг полей для node-id3
          switch (field) {
            case 'title':
              tags.title = fixedValue;
              break;
            case 'artist':
              tags.artist = fixedValue;
              break;
            case 'album':
              tags.album = fixedValue;
              break;
            case 'albumartist':
              tags.performerInfo = fixedValue;
              tags.TPE2 = fixedValue;
              break;
            case 'genre':
              tags.genre = fixedValue;
              break;
          }
        }
      }
      
      if (Object.keys(tags).length > 0) {
        const result = NodeID3.update(tags, fullPath);
        return !(result instanceof Error);
      }
      
      return true;
    } catch (error) {
      console.error('Error fixing MP3 encoding:', error);
      return false;
    }
  }

  /**
   * Исправляет кодировку в FLAC файле (пока заглушка)
   */
  private async fixFLACEncoding(fullPath: string, corruptedFields: string[]): Promise<boolean> {
    // TODO: Реализовать через flac-metadata2
    console.log('FLAC encoding fix not implemented yet');
    return false;
  }

  /**
   * Исправляет имя файла если в нём есть кракозябры
   */
  private async fixFileName(fullPath: string, relativePath: string, baseDir: string): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      
      // Проверяем что файл существует
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`⚠️ File ${fullPath} not found, skipping rename`);
        return false;
      }
      
      const fileName = path.basename(fullPath);
      const dirPath = path.dirname(fullPath);
      
      // Проверяем есть ли кракозябры в имени файла
      if (!this.detectCorruption(fileName)) {
        return false; // Нет кракозябр
      }
      
      // Исправляем кодировку в имени
      const fixedFileName = this.fixEncoding(fileName);
      
      if (fixedFileName === fileName) {
        return false; // Ничего не изменилось
      }
      
      // Генерируем уникальное имя если файл уже существует
      let finalFileName = fixedFileName;
      let counter = 1;
      let newFullPath = path.join(dirPath, finalFileName);
      
      while (true) {
        try {
          await fs.access(newFullPath);
          // Файл существует, генерируем новое имя
          const ext = path.extname(fixedFileName);
          const nameWithoutExt = path.basename(fixedFileName, ext);
          finalFileName = `${nameWithoutExt} (${counter})${ext}`;
          newFullPath = path.join(dirPath, finalFileName);
          counter++;
        } catch {
          // Файл не существует, можно использовать это имя
          break;
        }
      }
      
      // Переименовываем файл
      await fs.rename(fullPath, newFullPath);
      
      console.log(`📝 Renamed file: ${fileName} -> ${finalFileName}`);
      
      // Обновляем запись в базе данных
      const newRelativePath = path.join(path.dirname(relativePath), finalFileName);
      await this.updateFilePathInDatabase(relativePath, newRelativePath);
      
      return true;
    } catch (error) {
      console.error(`Error fixing filename for ${fullPath}:`, error);
      return false;
    }
  }

  /**
   * Обновляет путь к файлу в базе данных
   */
  private async updateFilePathInDatabase(oldPath: string, newPath: string): Promise<void> {
    try {
      // Получаем все файлы и обновляем путь
      const allFiles = await this.databaseService.getAllAudioFiles(10000, 0);
      const fileToUpdate = allFiles.find(f => f.path === oldPath);
      
      if (fileToUpdate) {
        // Удаляем старую запись и добавляем новую
        await this.databaseService.deleteAudioFile(oldPath);
        await this.databaseService.insertAudioFile(newPath);
        console.log(`📋 Updated database: ${oldPath} -> ${newPath}`);
      }
    } catch (error) {
      console.error('Error updating file path in database:', error);
    }
  }

  /**
   * Worker для обработки файлов
   */
  private async processFiles(taskId: number): Promise<void> {
    while (true) {
      // Атомарно берем следующий файл
      const file = await this.databaseService.getNextUnprocessedFile(taskId);
      
      if (!file) {
        break; // Нет файлов для обработки
      }
      
      try {
        const corruptedFields = JSON.parse(file.corrupted_fields);
        const success = await this.fixFileEncoding(file.file_path, corruptedFields);
        
        if (success) {
          // Обновляем счетчик обработанных файлов
          const task = await this.databaseService.getActiveEncodingTask();
          if (task) {
            await this.databaseService.updateEncodingTask(task.id!, {
              processed_files: task.processed_files + 1
            });
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file.file_path}:`, error);
      }
      
      // Пауза между файлами
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Запускает процесс исправления кодировки
   */
  async startEncodingFix(): Promise<boolean> {
    try {
      // Проверяем, есть ли уже активная задача
      const existingTask = await this.databaseService.getActiveEncodingTask();
      if (existingTask) {
        if (existingTask.status === 'pending') {
          // Продолжаем существующую задачу
          await this.databaseService.updateEncodingTask(existingTask.id!, { status: 'running' });
          this.startWorkers(existingTask.id!);
          return true;
        } else if (existingTask.status === 'running') {
          // Задача уже выполняется
          return true;
        }
      }
      
      // Сначала очищаем мертвые записи из БД
      await this.cleanupMissingFiles();
      
      // Создаем новую задачу
      const taskId = await this.databaseService.createEncodingTask();
      await this.databaseService.updateEncodingTask(taskId, { status: 'running' });
      
      // Сканируем файлы на наличие кракозябр
      const foundCount = await this.scanForCorruptedFiles(taskId);
      
      // Проверяем результат сканирования
      if (foundCount === 0) {
        // Минимальная задержка чтобы UI успел показать процесс
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Нет файлов для обработки
        await this.databaseService.updateEncodingTask(taskId, { status: 'no_files' });
        console.log('🚨 No files with encoding issues found');
        
        // Очищаем данные через 10 секунд (даём время UI показать уведомление)
        setTimeout(async () => {
          await this.databaseService.clearCorruptedFiles(taskId);
          await this.databaseService.deleteCompletedEncodingTasks();
        }, 10000);
        
        return true;
      }
      
      // Запускаем worker'ы для обработки
      this.startWorkers(taskId);
      
      return true;
    } catch (error) {
      console.error('Error starting encoding fix:', error);
      return false;
    }
  }

  /**
   * Сканирует все файлы и находит те, что содержат кракозябры
   */
  private async scanForCorruptedFiles(taskId: number): Promise<number> {
    const allFiles = await this.databaseService.getAllAudioFiles(10000, 0); // Получаем все файлы
    let foundCount = 0;
    let scannedCount = 0;
    
    console.log(`🔍 Starting scan of ${allFiles.length} total files`);
    
    for (const audioFile of allFiles) {
      const ext = path.extname(audioFile.path).toLowerCase();
      
      // Обрабатываем только поддерживаемые форматы
      if (!this.supportedExtensions.includes(ext)) {
        continue;
      }
      
      scannedCount++;
      
      const corruptedFields = await this.scanFileForCorruption(audioFile.path);
      
      if (corruptedFields.length > 0) {
        await this.databaseService.insertCorruptedFile(taskId, audioFile.path, corruptedFields);
        foundCount++;
        console.log(`🐛 Found corrupted file: ${audioFile.path}, fields: ${corruptedFields.join(', ')}`);
      }
      
      // Логируем прогресс каждые 100 файлов
      if (scannedCount % 100 === 0) {
        console.log(`🔍 Scanned ${scannedCount} supported files, found ${foundCount} with issues`);
      }
    }
    
    console.log(`🔍 Scan complete: ${scannedCount} files scanned, ${foundCount} files with encoding issues`);
    
    // Обновляем количество найденных файлов
    await this.databaseService.updateEncodingTask(taskId, { found_files: foundCount });
    
    return foundCount;
  }

  /**
   * Запускает 2 worker'а для обработки
   */
  private startWorkers(taskId: number): void {
    // Запускаем 2 worker'а параллельно
    for (let i = 0; i < 2; i++) {
      const workerPromise = this.processFiles(taskId)
        .then(() => this.checkTaskCompletion(taskId))
        .catch(error => console.error(`Worker ${i + 1} error:`, error))
        .finally(() => this.workers.delete(workerPromise));
      
      this.workers.add(workerPromise);
    }
  }

  /**
   * Проверяет завершение задачи и очищает данные
   */
  private async checkTaskCompletion(taskId: number): Promise<void> {
    const task = await this.databaseService.getActiveEncodingTask();
    
    if (task && task.found_files === task.processed_files) {
      // Задача завершена
      await this.databaseService.updateEncodingTask(taskId, { status: 'completed' });
      
      // Очищаем данные после небольшой задержки (для UI)
      setTimeout(async () => {
        await this.databaseService.clearCorruptedFiles(taskId);
        await this.databaseService.deleteCompletedEncodingTasks();
      }, 5000);
      
      console.log('✅ Encoding fix completed');
    }
  }

  /**
   * Получает статус текущей задачи
   */
  async getEncodingTaskStatus(): Promise<EncodingTaskStatus | null> {
    const task = await this.databaseService.getActiveEncodingTask();
    
    if (!task) {
      return null;
    }
    
    return {
      found: task.found_files,
      processed: task.processed_files,
      status: task.status,
    };
  }
}

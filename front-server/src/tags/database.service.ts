import { Injectable, OnModuleInit } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

export interface AudioFile {
  id?: number;
  path: string;
  created_at?: string;
  updated_at?: string;
}

export interface EncodingTask {
  id?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'no_files';
  found_files: number;
  processed_files: number;
  created_at?: string;
  updated_at?: string;
}

export interface CorruptedFile {
  id?: number;
  task_id: number;
  file_path: string;
  corrupted_fields: string; // JSON array of field names
  processed: boolean;
  created_at?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: sqlite3.Database;
  private readonly dbPath = path.join(process.cwd(), 'data', 'tracks.db');

  async onModuleInit() {
    await this.initDatabase();
    await this.cleanupStaleEncodingTasks();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Создаем папку data если её нет
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('📁 Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * Очищает зависшие задачи при старте сервера
   */
  private async cleanupStaleEncodingTasks(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Очищаем все зависшие задачи (от прошлого запуска)
      const cleanupSql = `
        DELETE FROM corrupted_files WHERE task_id IN (
          SELECT id FROM encoding_tasks WHERE status IN ('pending', 'running')
        );
        DELETE FROM encoding_tasks WHERE status IN ('pending', 'running');
      `;
      
      this.db.exec(cleanupSql, (err) => {
        if (err) {
          console.error('⚠️ Error cleaning up stale encoding tasks:', err);
          reject(err);
        } else {
          console.log('🧹 Cleaned up stale encoding tasks');
          resolve();
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS audio_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS encoding_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          status TEXT NOT NULL DEFAULT 'pending',
          found_files INTEGER DEFAULT 0,
          processed_files INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS corrupted_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL,
          file_path TEXT NOT NULL,
          corrupted_fields TEXT NOT NULL,
          processed BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES encoding_tasks (id)
        );
      `;

      this.db.exec(sql, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('✅ Database tables ready');
          resolve();
        }
      });
    });
  }

  async insertAudioFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO audio_files (path) 
        VALUES (?)
      `;

      this.db.run(sql, [filePath], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getAllAudioFiles(limit: number = 25, offset: number = 0, search?: string): Promise<AudioFile[]> {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT * FROM audio_files 
      `;
      const params: any[] = [];

      if (search) {
        sql += ` WHERE path LIKE ? `;
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY path LIMIT ? OFFSET ? `;
      params.push(limit, offset);

      this.db.all(sql, params, (err, rows: AudioFile[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getAudioFilesCount(search?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let sql = `SELECT COUNT(*) as count FROM audio_files`;
      const params: any[] = [];

      if (search) {
        sql += ` WHERE path LIKE ?`;
        params.push(`%${search}%`);
      }

      this.db.get(sql, params, (err, row: { count: number }) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  async clearAllAudioFiles(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM audio_files`;

      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Encoding tasks methods
  async createEncodingTask(): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO encoding_tasks (status) VALUES ('pending')`;
      
      this.db.run(sql, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getActiveEncodingTask(): Promise<EncodingTask | null> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM encoding_tasks WHERE status IN ('pending', 'running', 'no_files') ORDER BY created_at DESC LIMIT 1`;
      
      this.db.get(sql, (err, row: EncodingTask) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async updateEncodingTask(id: number, updates: Partial<EncodingTask>): Promise<void> {
    return new Promise((resolve, reject) => {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      const sql = `UPDATE encoding_tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(sql, [...values, id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async deleteCompletedEncodingTasks(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM encoding_tasks WHERE status = 'completed'`;
      
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Corrupted files methods
  async insertCorruptedFile(taskId: number, filePath: string, corruptedFields: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO corrupted_files (task_id, file_path, corrupted_fields) VALUES (?, ?, ?)`;
      
      this.db.run(sql, [taskId, filePath, JSON.stringify(corruptedFields)], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Атомарно берет следующий необработанный файл (блокирует для одного worker'а)
   */
  async getNextUnprocessedFile(taskId: number): Promise<CorruptedFile | null> {
    return new Promise((resolve, reject) => {
      // Простое атомарное обновление
      const sql = `SELECT * FROM corrupted_files WHERE task_id = ? AND processed = FALSE ORDER BY id LIMIT 1`;
      
      this.db.get(sql, [taskId], (err, row: CorruptedFile) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        // Обновляем статус файла
        const updateSql = `UPDATE corrupted_files SET processed = TRUE WHERE id = ?`;
        
        this.db.run(updateSql, [row.id], (updateErr) => {
          if (updateErr) {
            reject(updateErr);
          } else {
            resolve(row);
          }
        });
      });
    });
  }

  async getUnprocessedCorruptedFiles(taskId: number, limit: number = 50): Promise<CorruptedFile[]> {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM corrupted_files WHERE task_id = ? AND processed = FALSE ORDER BY id LIMIT ?`;
      
      this.db.all(sql, [taskId, limit], (err, rows: CorruptedFile[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async markCorruptedFileAsProcessed(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE corrupted_files SET processed = TRUE WHERE id = ?`;
      
      this.db.run(sql, [id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async clearCorruptedFiles(taskId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM corrupted_files WHERE task_id = ?`;
      
      this.db.run(sql, [taskId], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async deleteAudioFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM audio_files WHERE path = ?`;
      
      this.db.run(sql, [filePath], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

export interface AudioFile {
  id?: number;
  path: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: sqlite3.Database;
  private readonly dbPath = path.join(process.cwd(), 'data', 'tracks.db');

  async onModuleInit() {
    await this.initDatabase();
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

  private async createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS audio_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(sql, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('✅ Database table ready');
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
}

# 🎧 Navidrome с модулем тегирования

Расширенная версия Navidrome с интегрированным модулем редактирования метаданных аудиофайлов.

## 🚀 Быстрый запуск с Docker Compose

```bash
# Клонировать репозиторий
git clone <repo-url>
cd navidrome

# Запустить все сервисы
docker-compose up -d

# Посмотреть логи
docker-compose logs -f
```

## 📡 Доступные сервисы

- **Navidrome UI**: http://localhost:4533
- **GraphQL API**: http://localhost:3010/graphql
- **Tags Module**: Интегрирован в Navidrome UI (вкладка "Tags")

## 📁 Структура проекта

```
navidrome/
├── docker-compose.yml     # Основная конфигурация Docker
├── music/                 # Папка с аудиофайлами
├── front-server/          # NestJS GraphQL микросервис
│   ├── Dockerfile
│   ├── src/
│   │   └── tags/         # Модуль тегирования
│   └── package.json
└── ui/                   # React фронтенд
    └── src/
        └── tags/         # UI компоненты тегирования
```

## 🔧 Разработка

### Локальный запуск для разработки

1. **Front-server (бэкенд)**:
```bash
cd front-server
npm install
npm run start:dev
```

2. **UI (фронтенд)**:
```bash
cd ui
npm install
npm start
```

3. **Navidrome** (основной сервис):
```bash
docker run -d \
  --name navidrome \
  -p 4533:4533 \
  -v ./music:/music \
  deluan/navidrome
```

### Docker Compose команды

```bash
# Запуск всех сервисов
docker-compose up -d

# Пересборка с обновлениями
docker-compose up -d --build

# Остановка
docker-compose down

# Логи конкретного сервиса
docker-compose logs -f front-server

# Перезапуск сервиса
docker-compose restart front-server
```

## 🎵 Использование модуля тегирования

1. Откройте Navidrome: http://localhost:4533
2. Перейдите на вкладку **"Tags"**
3. **Редактирование**: клик по любому полю → изменение → автосохранение
4. **Фильтры**: кнопка "Choose columns" для выбора отображаемых полей
5. **Поиск**: поле поиска фильтрует по всем метаданным

### Поддерживаемые форматы

- **Чтение метаданных**: MP3, FLAC, OGG, M4A, MP4, AAC, WMA
- **Запись метаданных**: MP3 (ID3 теги)
- **Обложки**: Автоматическое извлечение и отображение

## 🛠️ Конфигурация

### Переменные окружения

**Front-server**:
- `MUSIC_PATH` - путь к папке с музыкой (по умолчанию `/music`)
- `PORT` - порт сервера (по умолчанию `3010`)

**UI**:
- `VITE_GRAPHQL_URI` - URL GraphQL API (по умолчанию `http://localhost:3010/graphql`)

### Docker тома

- `./music:/music` - папка с аудиофайлами (общая для Navidrome и front-server)

## 🔍 Отладка

### Проверить состояние сервисов
```bash
docker-compose ps
```

### Проверить логи
```bash
# Все сервисы
docker-compose logs

# Конкретный сервис
docker-compose logs front-server
docker-compose logs navidrome
```

### Проверить GraphQL API
```bash
curl http://localhost:3010/graphql
```

### Проверить health check
```bash
docker-compose exec front-server node --version
```

## 📋 Troubleshooting

**Проблема**: Front-server не может найти музыку
- **Решение**: Проверьте, что папка `./music` существует и содержит аудиофайлы

**Проблема**: UI не подключается к GraphQL API
- **Решение**: Убедитесь что front-server запущен на порту 3010

**Проблема**: CORS ошибки
- **Решение**: Front-server настроен на прием запросов от любых источников

**Проблема**: Не удается записать теги
- **Решение**: Проверьте права доступа к файлам в папке music

## 🎯 Особенности

✅ **Inline редактирование** - изменения применяются сразу  
✅ **Автоматическое сканирование** - новые файлы подхватываются автоматически  
✅ **Batch операции** - можно редактировать много треков сразу  
✅ **Поддержка обложек** - извлечение и отображение cover art  
✅ **GraphQL API** - современный и гибкий API  
✅ **Material-UI** - красивый интерфейс в стиле Navidrome  

## 🚀 Производственное развертывание

Для продакшн использования рекомендуется:
1. Настроить reverse proxy (nginx/traefik)
2. Добавить SSL сертификаты
3. Настроить backup музыкальной коллекции
4. Мониторинг сервисов

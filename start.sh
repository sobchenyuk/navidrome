#!/bin/bash

echo "🎵 Starting Navidrome with Tags Module..."
echo "=================================="

# Проверяем что Docker запущен
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Проверяем что папка music существует
if [ ! -d "./music" ]; then
    echo "📁 Creating music directory..."
    mkdir -p ./music
    echo "✅ Please add your audio files to ./music directory"
fi

# Останавливаем предыдущие контейнеры
echo "🛑 Stopping existing containers..."
docker-compose down

# Собираем и запускаем все сервисы
echo "🔨 Building services..."
docker-compose build --no-cache

echo "🚀 Starting services..."
docker-compose up -d

# Ждем запуска сервисов
echo "⏳ Waiting for services to start..."
sleep 10

# Проверяем статус
echo "📊 Service status:"
docker-compose ps

echo ""
echo "🎉 Navidrome with Tags Module is ready!"
echo "=================================="
echo "🌐 Navidrome UI: http://localhost:4533"
echo "🏷️  Tags Module: Available in Navidrome UI (Tags tab)"
echo "🔧 GraphQL API: http://localhost:3010/graphql"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for internal Docker network
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(3010);
  console.log(`🚀 Front-server running on port 3010`);
}

bootstrap();

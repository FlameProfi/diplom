import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const config = new DocumentBuilder()
    .setTitle('Metal ERP API')
    .setDescription('API для партий и инвентаризации')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Backend запущен на http://localhost:3000');
}
bootstrap();

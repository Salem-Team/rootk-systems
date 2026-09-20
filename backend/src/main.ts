import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { parseCorsOrigins } from "./common/cors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  // Voice notes + task media (images/videos) are sent as base64 JSON.
  app.use(json({ limit: "40mb" }));
  app.use(urlencoded({ extended: true, limit: "40mb" }));

  app.setGlobalPrefix("api");
  const corsOrigins = parseCorsOrigins(config.get<string>("CORS_ORIGIN"));
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>("PORT", 3001);
  await app.listen(port);
  console.log(`ROOTK HR API listening on http://localhost:${port}/api`);
}

void bootstrap();

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

/**
 * Nest → frontend error envelope.
 * Keeps Nest `statusCode` / `error` for HttpClient mapping,
 * and adds `success: false` + stable `code` (+ optional details) for ApiResponse parity.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal server error" };

    const message =
      typeof body === "string"
        ? body
        : Array.isArray((body as { message?: unknown }).message)
          ? (body as { message: string[] }).message.join(", ")
          : ((body as { message?: string }).message ?? "Request failed");

    const errorName =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: string }).error)
        : HttpStatus[status] ?? "Error";

    const customCode =
      typeof body === "object" &&
      body &&
      typeof (body as { code?: unknown }).code === "string"
        ? String((body as { code: string }).code)
        : undefined;

    const details =
      typeof body === "object" &&
      body &&
      "details" in body &&
      (body as { details?: unknown }).details !== undefined
        ? (body as { details: unknown }).details
        : undefined;

    const code = customCode ?? statusToCode(status);

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: errorName,
      code,
      ...(details !== undefined ? { details } : {}),
    });
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return "VALIDATION";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return "INTERNAL";
  }
}

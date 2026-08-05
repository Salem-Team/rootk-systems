import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * Wraps successful responses as `{ success, data, message? }`
 * unless the handler already returned that envelope.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          "data" in data
        ) {
          return data;
        }
        return { success: true, data };
      })
    );
  }
}

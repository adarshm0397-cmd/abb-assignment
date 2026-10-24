import express, { type Request, type Response } from "express";
import { GameService, type ServiceError } from "./game-service.js";
import { toGameResponse } from "./api-mappers.js";
import { openApiDocument } from "./openapi.js";

type FieldError = { field: string; code: string; message: string };
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => key in value);
const body = (code: string, message: string, field?: FieldError) => ({
  error: { code, message, ...(field ? { details: { fields: [field] } } : {}) },
});
const fail = (
  response: Response,
  status: number,
  code: string,
  message: string,
  field?: FieldError,
) => response.status(status).json(body(code, message, field));
const statusFor = (error: ServiceError) =>
  error.code === "GAME_NOT_FOUND"
    ? 404
    : [
          "WRONG_TURN",
          "CELL_OCCUPIED",
          "GAME_COMPLETED",
          "UNDO_NOT_ALLOWED",
          "DUPLICATE_REQUEST",
        ].includes(error.code)
      ? 409
      : error.code === "INTERNAL_ERROR"
        ? 500
      : 400;
const jsonContent = (request: Request) =>
  Boolean(request.is("application/json"));

export const createApp = (service: GameService): express.Express => {
  const app = express();
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use((request, response, next) => {
    const origin = request.header("Origin");
    if (origin && origins.includes(origin))
      response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (request.method === "OPTIONS") return response.sendStatus(204);
    next();
  });
  app.use((request, _response, next) => {
    console.info(`[http] ${request.method} ${request.originalUrl}`);
    next();
  });
  app.use(express.json());
  app.get("/api/openapi.json", (_request, response) =>
    response.json(openApiDocument),
  );
  app.get("/api/docs", (_request, response) =>
    response
      .type("html")
      .send(
        '<!doctype html><title>ABB Tic Tac Toe API</title><a href="/api/openapi.json">OpenAPI document</a>',
      ),
  );
  app.get("/api/health", (_request, response) =>
    response.json({ status: "ok" }),
  );

  app.post("/api/games", (request, response) => {
    if (!jsonContent(request))
      return fail(
        response,
        415,
        "INVALID_CONTENT_TYPE",
        "Content-Type must be application/json.",
      );
    if (!isObject(request.body) || !exactKeys(request.body, ["mode"]))
      return fail(
        response,
        400,
        "INVALID_REQUEST",
        "The request body contains invalid fields.",
      );
    if (request.body.mode !== "two-player" && request.body.mode !== "computer")
      return fail(
        response,
        400,
        "INVALID_MODE",
        "mode must be two-player or computer.",
        {
          field: "mode",
          code: "INVALID_MODE",
          message: "mode must be two-player or computer.",
        },
      );
    return response
      .status(201)
      .json(toGameResponse(service.createGame(request.body.mode)));
  });
  app.get("/api/games/:gameId", (request, response) => {
    const session = service.getGame(request.params.gameId);
    return session
      ? response.json(toGameResponse(session))
      : fail(
          response,
          404,
          "GAME_NOT_FOUND",
          `Game '${request.params.gameId}' was not found.`,
        );
  });
  app.post("/api/games/:gameId/moves", (request, response) => {
    if (!jsonContent(request))
      return fail(
        response,
        415,
        "INVALID_CONTENT_TYPE",
        "Content-Type must be application/json.",
      );
    const value = request.body;
    if (
      !isObject(value) ||
      !exactKeys(value, ["player", "row", "column", "requestId"])
    )
      return fail(
        response,
        400,
        "INVALID_REQUEST",
        "The request body contains invalid fields.",
      );
    if (value.player !== "X" && value.player !== "O")
      return fail(response, 400, "INVALID_PLAYER", "player must be X or O.", {
        field: "player",
        code: "INVALID_PLAYER",
        message: "player must be X or O.",
      });
    if (
      !Number.isInteger(value.row) ||
      !Number.isInteger(value.column) ||
      (value.row as number) < 1 ||
      (value.row as number) > 3 ||
      (value.column as number) < 1 ||
      (value.column as number) > 3
    )
      return fail(
        response,
        400,
        "INVALID_COORDINATES",
        "row and column must be integers from 1 to 3.",
        {
          field: "row/column",
          code: "INVALID_COORDINATES",
          message: "row and column must be integers from 1 to 3.",
        },
      );
    if (typeof value.requestId !== "string" || value.requestId.length === 0)
      return fail(
        response,
        400,
        "INVALID_REQUEST",
        "requestId must be a non-empty string.",
      );
    const result = service.makeMove(
      request.params.gameId,
      {
        player: value.player as "X" | "O",
        row: value.row as number,
        column: value.column as number,
      },
      value.requestId,
    );
    return result.ok
      ? response.json(toGameResponse(result.session))
      : fail(
          response,
          statusFor(result.error),
          result.error.code,
          result.error.message,
        );
  });
  app.post("/api/games/:gameId/undo", (request, response) => {
    const result = service.undo(request.params.gameId);
    return "code" in result
      ? fail(response, statusFor(result), result.code, result.message)
      : response.json(toGameResponse(result));
  });
  app.post("/api/games/:gameId/reset", (request, response) => {
    if (isObject(request.body) && Object.keys(request.body).length > 0)
      return fail(
        response,
        400,
        "INVALID_REQUEST",
        "Reset requests must not contain fields.",
      );
    const result = service.resetGame(request.params.gameId);
    return "code" in result
      ? fail(response, statusFor(result), result.code, result.message)
      : response.status(201).json({ game: toGameResponse(result) });
  });
  app.get("/api/scoreboard", (_request, response) =>
    response.json(service.getScoreboard()),
  );
  app.post("/api/scoreboard/reset", (_request, response) =>
    response.json(service.resetScoreboard()),
  );
  app.use(
    (error: unknown, _request: Request, response: Response, next: unknown) => {
      void next;
      if (error instanceof SyntaxError)
        return fail(
          response,
          400,
          "INVALID_REQUEST",
          "The request body contains invalid JSON.",
        );
      console.error(error);
      return fail(
        response,
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
      );
    },
  );
  return app;
};

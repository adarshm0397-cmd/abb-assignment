const json = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } },
});
const response = (description: string, schema?: object) => ({
  description,
  ...(schema ? { content: { "application/json": { schema } } } : {}),
});
const game = { $ref: "#/components/schemas/GameResponse" };
const error = { $ref: "#/components/schemas/ErrorResponse" };

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "ABB Tic Tac Toe API",
    version: "1.0.0",
    description: "REST API for persistent Tic Tac Toe game sessions.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/games": {
      post: {
        summary: "Create a game",
        requestBody: json({ $ref: "#/components/schemas/CreateGameRequest" }),
        responses: {
          "201": response("Game created", game),
          "400": response("Invalid request", error),
          "415": response("Invalid content type", error),
        },
      },
    },
    "/games/{gameId}": {
      get: {
        summary: "Get a game",
        parameters: [{ $ref: "#/components/parameters/GameId" }],
        responses: {
          "200": response("Current game state", game),
          "404": response("Game not found", error),
        },
      },
    },
    "/games/{gameId}/moves": {
      post: {
        summary: "Submit a move",
        parameters: [{ $ref: "#/components/parameters/GameId" }],
        requestBody: json({ $ref: "#/components/schemas/MoveRequest" }),
        responses: {
          "200": response("Updated game state", game),
          "400": response("Invalid request", error),
          "404": response("Game not found", error),
          "409": response("Move conflict", error),
          "415": response("Invalid content type", error),
        },
      },
    },
    "/games/{gameId}/undo": {
      post: {
        summary: "Undo the latest move or move pair",
        parameters: [{ $ref: "#/components/parameters/GameId" }],
        responses: {
          "200": response("Updated game state", game),
          "404": response("Game not found", error),
          "409": response("Undo conflict", error),
        },
      },
    },
    "/games/{gameId}/reset": {
      post: {
        summary: "Reset a game",
        parameters: [{ $ref: "#/components/parameters/GameId" }],
        responses: {
          "201": response("New game", {
            $ref: "#/components/schemas/ResetGameResponse",
          }),
          "400": response("Invalid request", error),
          "404": response("Game not found", error),
        },
      },
    },
    "/scoreboard": {
      get: {
        summary: "Get the scoreboard",
        responses: {
          "200": response("Current scoreboard", {
            $ref: "#/components/schemas/Scoreboard",
          }),
        },
      },
    },
    "/scoreboard/reset": {
      post: {
        summary: "Reset the scoreboard",
        responses: {
          "200": response("Empty scoreboard", {
            $ref: "#/components/schemas/Scoreboard",
          }),
          "500": response("Internal error", error),
        },
      },
    },
  },
  components: {
    parameters: {
      GameId: {
        name: "gameId",
        in: "path",
        required: true,
        schema: { type: "string", minLength: 1 },
      },
    },
    schemas: {
      Player: { type: "string", enum: ["X", "O"] },
      Mode: { type: "string", enum: ["two-player", "computer"] },
      Coordinate: {
        type: "object",
        required: ["row", "column"],
        additionalProperties: false,
        properties: {
          row: { type: "integer", minimum: 1, maximum: 3 },
          column: { type: "integer", minimum: 1, maximum: 3 },
        },
      },
      CreateGameRequest: {
        type: "object",
        required: ["mode"],
        additionalProperties: false,
        properties: { mode: { $ref: "#/components/schemas/Mode" } },
      },
      MoveRequest: {
        type: "object",
        required: ["player", "row", "column", "requestId"],
        additionalProperties: false,
        properties: {
          player: { $ref: "#/components/schemas/Player" },
          row: { type: "integer", minimum: 1, maximum: 3 },
          column: { type: "integer", minimum: 1, maximum: 3 },
          requestId: { type: "string", minLength: 1 },
        },
      },
      Move: {
        allOf: [
          {
            type: "object",
            required: ["moveNumber", "player"],
            properties: {
              moveNumber: { type: "integer", minimum: 1 },
              player: { $ref: "#/components/schemas/Player" },
            },
          },
          { $ref: "#/components/schemas/Coordinate" },
        ],
      },
      GameResponse: {
        type: "object",
        required: [
          "id",
          "mode",
          "board",
          "currentPlayer",
          "status",
          "winner",
          "winningCells",
          "moveHistory",
          "canUndo",
        ],
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          mode: { $ref: "#/components/schemas/Mode" },
          board: {
            type: "array",
            minItems: 9,
            maxItems: 9,
            items: { type: ["string", "null"], enum: ["X", "O", null] },
          },
          currentPlayer: {
            anyOf: [{ $ref: "#/components/schemas/Player" }, { type: "null" }],
          },
          status: { type: "string", enum: ["active", "won", "draw", "reset"] },
          winner: {
            anyOf: [{ $ref: "#/components/schemas/Player" }, { type: "null" }],
          },
          winningCells: {
            type: "array",
            maxItems: 3,
            items: { $ref: "#/components/schemas/Coordinate" },
          },
          moveHistory: {
            type: "array",
            items: { $ref: "#/components/schemas/Move" },
          },
          canUndo: { type: "boolean" },
        },
      },
      ResetGameResponse: {
        type: "object",
        required: ["game"],
        properties: { game },
      },
      Scoreboard: {
        type: "object",
        required: ["xWins", "oWins", "draws"],
        properties: {
          xWins: { type: "integer", minimum: 0 },
          oWins: { type: "integer", minimum: 0 },
          draws: { type: "integer", minimum: 0 },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
    },
  },
} as const;

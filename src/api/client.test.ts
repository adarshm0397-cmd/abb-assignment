import { request } from "./client";

describe("API client", () => {
  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  const mockFetch = (response: Response) => {
    const fetchMock = jest.fn().mockResolvedValue(response);
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    return fetchMock;
  };

  const response = (
    body: unknown,
    status: number,
    contentType = "application/json",
  ) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => (name === "content-type" ? contentType : null),
      },
      json: async () => body,
    }) as Response;

  it("returns JSON from successful responses and adds JSON content type for bodies", async () => {
    const fetchMock = mockFetch(response({ ok: true }, 200));

    await expect(
      request<{ ok: boolean }>("/health", { method: "POST", body: "{}" }),
    ).resolves.toEqual({ ok: true });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("exposes structured API errors", async () => {
    mockFetch(
      response(
        { error: { code: "GAME_NOT_FOUND", message: "Missing game." } },
        404,
      ),
    );

    await expect(request("/games/missing")).rejects.toMatchObject({
      status: 404,
      code: "GAME_NOT_FOUND",
      message: "Missing game.",
    });
  });

  it("uses a useful fallback when an unsuccessful response is not valid JSON", async () => {
    mockFetch(response(undefined, 503));

    await expect(request("/health")).rejects.toMatchObject({
      status: 503,
      code: "INTERNAL_ERROR",
      message: "Request failed with status 503.",
    });
  });
});

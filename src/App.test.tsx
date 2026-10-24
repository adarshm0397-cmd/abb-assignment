import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import App from "./App";
import { createAppStore } from "./store/store";
import { getScoreboard } from "./api/scoreboard";

jest.mock("./api/scoreboard");

const mockedGetScoreboard = getScoreboard as jest.MockedFunction<
  typeof getScoreboard
>;

test("renders the application foundation", async () => {
  mockedGetScoreboard.mockResolvedValue({ xWins: 0, oWins: 0, draws: 0 });
  render(
    <Provider store={createAppStore()}>
      <App />
    </Provider>,
  );
  expect(
    screen.getByRole("heading", { name: "ABB Tic Tac Toe" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Game" })).toBeInTheDocument();
  expect(screen.getByText("No game selected yet.")).toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: "Reset scoreboard" }),
  ).toBeInTheDocument();
});

import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the application foundation", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "ABB Tic Tac Toe" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Game" })).toBeInTheDocument();
  expect(screen.getByText("No game selected yet.")).toBeInTheDocument();
});

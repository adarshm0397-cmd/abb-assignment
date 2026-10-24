import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import App from "./App";
import { createAppStore } from "./store/store";

test("renders the application foundation", () => {
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
});

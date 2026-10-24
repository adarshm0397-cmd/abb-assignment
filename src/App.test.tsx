import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the application foundation', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'ABB Tic Tac Toe' })).toBeInTheDocument();
});

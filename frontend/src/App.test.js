import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen with title and sign-in prompt', () => {
  render(<App />);

  expect(screen.getByText(/wildlife monitoring system/i)).toBeInTheDocument();
  expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
});

test('renders a login form', () => {
  const { container } = render(<App />);

  const form = container.querySelector('form');
  expect(form).toBeInTheDocument();
});
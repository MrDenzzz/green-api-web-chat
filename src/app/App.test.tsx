import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('asks to sign in when there is no session', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Web Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });
});

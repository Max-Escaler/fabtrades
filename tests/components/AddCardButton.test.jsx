import { render, screen, fireEvent } from '@testing-library/react';
import AddCardButton from '../../src/components/ui/AddCardButton.jsx';

describe('AddCardButton', () => {
  test('renders default label', () => {
    render(<AddCardButton onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Add Card' })).toBeInTheDocument();
  });

  test('renders custom children as the label', () => {
    render(<AddCardButton onClick={() => {}}>Add to Want</AddCardButton>);
    expect(screen.getByRole('button', { name: 'Add to Want' })).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<AddCardButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when the disabled prop is set', () => {
    const onClick = jest.fn();
    render(<AddCardButton onClick={onClick} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('uses the provided color when enabled', () => {
    render(<AddCardButton onClick={() => {}} color="rgb(255, 0, 0)" />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
  });
});

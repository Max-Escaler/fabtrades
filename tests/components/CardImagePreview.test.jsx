import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CardThumbnail, CardImageModal } from '../../src/components/ui/CardImagePreview.jsx';
import { ThemeModeProvider } from '../../src/contexts/ThemeContext.jsx';

// CardImagePreview only depends on ThemeContext (no supabase / import.meta),
// so we can exercise it with the real providers.
const renderWithTheme = (ui) =>
  render(
    <ThemeProvider theme={createTheme()}>
      <ThemeModeProvider>{ui}</ThemeModeProvider>
    </ThemeProvider>
  );

describe('CardThumbnail', () => {
  test('renders the image with the primary url when provided', () => {
    renderWithTheme(<CardThumbnail imageUrl="primary.png" alt="Lightning" />);
    const img = screen.getByRole('img', { name: 'Lightning' });
    expect(img).toHaveAttribute('src', 'primary.png');
  });

  test('renders the "No Image" fallback when no url is supplied', () => {
    renderWithTheme(<CardThumbnail imageUrl="" alt="Empty" />);
    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('falls back to fallbackUrl when the primary image errors', () => {
    renderWithTheme(
      <CardThumbnail imageUrl="primary.png" fallbackUrl="fallback.png" alt="Card" />
    );
    const img = screen.getByRole('img', { name: 'Card' });
    fireEvent.error(img);
    // Still showing an image, but now pointing at the fallback source.
    expect(screen.getByRole('img', { name: 'Card' })).toHaveAttribute('src', 'fallback.png');
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });

  test('shows "No Image" after the fallback image also errors', () => {
    renderWithTheme(
      <CardThumbnail imageUrl="primary.png" fallbackUrl="fallback.png" alt="Card" />
    );
    const img = screen.getByRole('img', { name: 'Card' });
    fireEvent.error(img); // primary -> fallback
    fireEvent.error(screen.getByRole('img', { name: 'Card' })); // fallback -> give up
    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('shows "No Image" immediately when the image errors and there is no fallback', () => {
    renderWithTheme(<CardThumbnail imageUrl="primary.png" alt="Card" />);
    fireEvent.error(screen.getByRole('img', { name: 'Card' }));
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  test('does not re-fallback when primary equals the fallback url', () => {
    renderWithTheme(
      <CardThumbnail imageUrl="same.png" fallbackUrl="same.png" alt="Card" />
    );
    // currentSrc === fallbackUrl, so the first error should give up right away.
    fireEvent.error(screen.getByRole('img', { name: 'Card' }));
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  test('reveals the image once it loads (opacity transitions to 1)', () => {
    renderWithTheme(<CardThumbnail imageUrl="primary.png" alt="Card" />);
    const img = screen.getByRole('img', { name: 'Card' });
    expect(img).toHaveStyle({ opacity: '0' });
    fireEvent.load(img);
    expect(img).toHaveStyle({ opacity: '1' });
  });

  test('resets error state when the imageUrl prop changes', () => {
    const { rerender } = renderWithTheme(
      <CardThumbnail imageUrl="primary.png" alt="Card" />
    );
    fireEvent.error(screen.getByRole('img', { name: 'Card' }));
    expect(screen.getByText('No Image')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <ThemeModeProvider>
          <CardThumbnail imageUrl="new.png" alt="Card" />
        </ThemeModeProvider>
      </ThemeProvider>
    );
    const img = screen.getByRole('img', { name: 'Card' });
    expect(img).toHaveAttribute('src', 'new.png');
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });

  test('invokes onClick when the thumbnail is clicked', () => {
    const onClick = jest.fn();
    renderWithTheme(<CardThumbnail imageUrl="primary.png" alt="Card" onClick={onClick} />);
    fireEvent.click(screen.getByRole('img', { name: 'Card' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('invokes onClick from the "No Image" placeholder', () => {
    const onClick = jest.fn();
    renderWithTheme(<CardThumbnail imageUrl="" alt="Card" onClick={onClick} />);
    fireEvent.click(screen.getByText('No Image'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CardImageModal', () => {
  // The modal <img> is rendered with `display: none` until it loads, which
  // removes it from the accessibility tree, so query it directly from the DOM.
  const getImg = () => document.body.querySelector('img');

  test('renders nothing when there is no imageUrl', () => {
    renderWithTheme(
      <CardImageModal open onClose={jest.fn()} imageUrl="" cardName="Card" />
    );
    expect(getImg()).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('does not render modal content while closed', () => {
    renderWithTheme(
      <CardImageModal open={false} onClose={jest.fn()} imageUrl="primary.png" cardName="Card" />
    );
    expect(getImg()).toBeNull();
  });

  test('renders the card image when open', () => {
    renderWithTheme(
      <CardImageModal open onClose={jest.fn()} imageUrl="primary.png" cardName="Lightning" />
    );
    const img = getImg();
    expect(img).toHaveAttribute('src', 'primary.png');
    expect(img).toHaveAttribute('alt', 'Lightning');
  });

  test('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    renderWithTheme(
      <CardImageModal open onClose={onClose} imageUrl="primary.png" cardName="Card" />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('falls back to fallbackUrl when the primary image errors', () => {
    renderWithTheme(
      <CardImageModal
        open
        onClose={jest.fn()}
        imageUrl="primary.png"
        fallbackUrl="fallback.png"
        cardName="Card"
      />
    );
    fireEvent.error(getImg());
    expect(getImg()).toHaveAttribute('src', 'fallback.png');
  });

  test('shows the unavailable message after the fallback also errors', () => {
    renderWithTheme(
      <CardImageModal
        open
        onClose={jest.fn()}
        imageUrl="primary.png"
        fallbackUrl="fallback.png"
        cardName="Card"
      />
    );
    fireEvent.error(getImg()); // primary -> fallback
    fireEvent.error(getImg()); // fallback -> give up
    expect(screen.getByText('No Card Image Available')).toBeInTheDocument();
  });
});

import { renderHook } from '@testing-library/react';
import { useDocumentHead } from '../../src/utils/seo.js';

const getMeta = (attr, key) =>
  document.head.querySelector(`meta[${attr}="${key}"]`);
const getCanonical = () => document.head.querySelector('link[rel="canonical"]');

describe('useDocumentHead', () => {
  beforeEach(() => {
    // The hook mutates the shared document <head>, so reset it between tests
    // to keep each case independent.
    document.head
      .querySelectorAll('meta, link[rel="canonical"]')
      .forEach((el) => el.remove());
    document.title = '';
  });

  test('sets the document title and appends the site name', () => {
    renderHook(() => useDocumentHead({ title: 'Arcane Rising' }));

    expect(document.title).toBe('Arcane Rising | FAB Trades');
    expect(getMeta('property', 'og:title').getAttribute('content')).toBe(
      'Arcane Rising | FAB Trades'
    );
    expect(getMeta('name', 'twitter:title').getAttribute('content')).toBe(
      'Arcane Rising | FAB Trades'
    );
  });

  test('does not double-append the site name when it is already present', () => {
    renderHook(() => useDocumentHead({ title: 'Home | FAB Trades' }));

    expect(document.title).toBe('Home | FAB Trades');
    expect(getMeta('property', 'og:title').getAttribute('content')).toBe(
      'Home | FAB Trades'
    );
  });

  test('mirrors the description onto name, og, and twitter meta tags', () => {
    renderHook(() =>
      useDocumentHead({ description: 'Balance your Flesh and Blood trades.' })
    );

    expect(getMeta('name', 'description').getAttribute('content')).toBe(
      'Balance your Flesh and Blood trades.'
    );
    expect(getMeta('property', 'og:description').getAttribute('content')).toBe(
      'Balance your Flesh and Blood trades.'
    );
    expect(getMeta('name', 'twitter:description').getAttribute('content')).toBe(
      'Balance your Flesh and Blood trades.'
    );
  });

  test('builds the canonical link and og:url from origin + path', () => {
    renderHook(() =>
      useDocumentHead({ canonicalPath: '/sets/arcane-rising' })
    );

    const expected = `${window.location.origin}/sets/arcane-rising`;
    expect(getCanonical().getAttribute('href')).toBe(expected);
    expect(getMeta('property', 'og:url').getAttribute('content')).toBe(expected);
  });

  test('reuses existing tags instead of creating duplicates when props change', () => {
    const { rerender } = renderHook((props) => useDocumentHead(props), {
      initialProps: { title: 'First', canonicalPath: '/a' },
    });

    rerender({ title: 'Second', canonicalPath: '/b' });

    expect(
      document.head.querySelectorAll('meta[property="og:title"]').length
    ).toBe(1);
    expect(
      document.head.querySelectorAll('link[rel="canonical"]').length
    ).toBe(1);
    expect(getMeta('property', 'og:title').getAttribute('content')).toBe(
      'Second | FAB Trades'
    );
    expect(getCanonical().getAttribute('href')).toBe(
      `${window.location.origin}/b`
    );
  });

  test('leaves the head untouched when called with no options', () => {
    renderHook(() => useDocumentHead());

    expect(document.title).toBe('');
    expect(getMeta('name', 'description')).toBeNull();
    expect(getMeta('property', 'og:title')).toBeNull();
    expect(getCanonical()).toBeNull();
  });

  test('only updates the fields that are provided', () => {
    renderHook(() => useDocumentHead({ description: 'Only a description' }));

    expect(document.title).toBe('');
    expect(getCanonical()).toBeNull();
    expect(getMeta('property', 'og:title')).toBeNull();
    expect(getMeta('name', 'description').getAttribute('content')).toBe(
      'Only a description'
    );
  });
});

import { renderHook } from '@testing-library/react';
import { useDocumentHead } from '../../src/utils/seo.js';

// Helpers for reading tags back out of the jsdom <head>.
const getMeta = (attr, key) =>
  document.head.querySelector(`meta[${attr}="${key}"]`);
const getMetaContent = (attr, key) => getMeta(attr, key)?.getAttribute('content');
const getCanonicalHref = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');

describe('useDocumentHead', () => {
  beforeEach(() => {
    // Start every test with a clean <head> and a predictable title so the
    // hook's create-vs-update logic can be asserted in isolation.
    document.head.innerHTML = '';
    document.title = '';
  });

  test('appends the site name to a title that does not already include it', () => {
    renderHook(() => useDocumentHead({ title: 'Arcane Rising' }));

    expect(document.title).toBe('Arcane Rising | FAB Trades');
    expect(getMetaContent('property', 'og:title')).toBe('Arcane Rising | FAB Trades');
    expect(getMetaContent('name', 'twitter:title')).toBe('Arcane Rising | FAB Trades');
  });

  test('does not double-append the site name when the title already contains it', () => {
    renderHook(() => useDocumentHead({ title: 'Home | FAB Trades' }));

    expect(document.title).toBe('Home | FAB Trades');
    expect(getMetaContent('property', 'og:title')).toBe('Home | FAB Trades');
  });

  test('sets the description across the standard, og, and twitter meta tags', () => {
    renderHook(() =>
      useDocumentHead({ description: 'Trade Flesh and Blood singles.' })
    );

    expect(getMetaContent('name', 'description')).toBe('Trade Flesh and Blood singles.');
    expect(getMetaContent('property', 'og:description')).toBe('Trade Flesh and Blood singles.');
    expect(getMetaContent('name', 'twitter:description')).toBe('Trade Flesh and Blood singles.');
  });

  test('builds canonical and og:url from window.location.origin + canonicalPath', () => {
    renderHook(() => useDocumentHead({ canonicalPath: '/sets/arcane-rising' }));

    const expected = `${window.location.origin}/sets/arcane-rising`;
    expect(getCanonicalHref()).toBe(expected);
    expect(getMetaContent('property', 'og:url')).toBe(expected);
  });

  test('reuses an existing description meta tag instead of creating a duplicate', () => {
    const existing = document.createElement('meta');
    existing.setAttribute('name', 'description');
    existing.setAttribute('content', 'stale');
    document.head.appendChild(existing);

    renderHook(() => useDocumentHead({ description: 'fresh' }));

    const tags = document.head.querySelectorAll('meta[name="description"]');
    expect(tags).toHaveLength(1);
    expect(tags[0]).toBe(existing);
    expect(tags[0].getAttribute('content')).toBe('fresh');
  });

  test('reuses an existing canonical link instead of creating a duplicate', () => {
    const existing = document.createElement('link');
    existing.setAttribute('rel', 'canonical');
    existing.setAttribute('href', 'https://old.example/stale');
    document.head.appendChild(existing);

    renderHook(() => useDocumentHead({ canonicalPath: '/new' }));

    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0]).toBe(existing);
    expect(links[0].getAttribute('href')).toBe(`${window.location.origin}/new`);
  });

  test('leaves the head untouched when called with no options', () => {
    document.title = 'Preexisting';
    renderHook(() => useDocumentHead());

    expect(document.title).toBe('Preexisting');
    expect(document.head.querySelectorAll('meta')).toHaveLength(0);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  test('only writes the fields that are provided', () => {
    renderHook(() => useDocumentHead({ title: 'Just A Title' }));

    // Title-related tags exist...
    expect(getMeta('property', 'og:title')).not.toBeNull();
    // ...but description/canonical tags were never created.
    expect(getMeta('name', 'description')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(getMeta('property', 'og:url')).toBeNull();
  });

  test('updates existing tags in place when the inputs change on rerender', () => {
    const { rerender } = renderHook((props) => useDocumentHead(props), {
      initialProps: { title: 'First', canonicalPath: '/first' },
    });

    expect(document.title).toBe('First | FAB Trades');
    expect(getCanonicalHref()).toBe(`${window.location.origin}/first`);

    rerender({ title: 'Second', canonicalPath: '/second' });

    expect(document.title).toBe('Second | FAB Trades');
    expect(getMetaContent('property', 'og:title')).toBe('Second | FAB Trades');
    expect(getCanonicalHref()).toBe(`${window.location.origin}/second`);
    // Still exactly one of each tag after the update.
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  test('the default export is the same hook as the named export', () => {
    // eslint-disable-next-line no-undef
    const mod = require('../../src/utils/seo.js');
    expect(mod.default).toBe(mod.useDocumentHead);
  });
});

import { useEffect } from 'react';

const SITE_NAME = 'FAB Trades';

const setMetaTag = (attr, key, content) => {
    if (content == null) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
};

const setCanonical = (href) => {
    if (!href) return;
    let el = document.head.querySelector('link[rel="canonical"]');
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
};

/**
 * Keep the document <head> in sync with the current page during client-side
 * navigation. Static prerendered HTML already ships correct tags for crawlers;
 * this keeps them correct as the user (and social scrapers) move around the SPA.
 *
 * @param {{title?: string, description?: string, canonicalPath?: string}} opts
 */
export const useDocumentHead = ({ title, description, canonicalPath } = {}) => {
    useEffect(() => {
        if (title) {
            const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
            document.title = fullTitle;
            setMetaTag('property', 'og:title', fullTitle);
            setMetaTag('name', 'twitter:title', fullTitle);
        }
        if (description) {
            setMetaTag('name', 'description', description);
            setMetaTag('property', 'og:description', description);
            setMetaTag('name', 'twitter:description', description);
        }
        if (canonicalPath) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const href = `${origin}${canonicalPath}`;
            setCanonical(href);
            setMetaTag('property', 'og:url', href);
        }
    }, [title, description, canonicalPath]);
};

export default useDocumentHead;

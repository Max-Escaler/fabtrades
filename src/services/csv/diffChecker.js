import fs from 'fs';
import https from 'https';
import http from 'http';
import { getFileHash } from './downloader.js';

export function checkRemoteFileChanged(url, localFilePath, diffCache) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https:') ? https : http;
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (url.startsWith('https:') ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'HEAD',
            timeout: 10000
        };

        const request = protocol.request(options, (response) => {
            const remoteInfo = {
                etag: response.headers['etag'],
                lastModified: response.headers['last-modified'],
                contentLength: response.headers['content-length']
            };

            if (!fs.existsSync(localFilePath)) {
                resolve({ changed: true, reason: 'File empty local' });
                return;
            }

            const localHash = getFileHash(localFilePath);
            const cache = diffCache[url];

            if (remoteInfo.etag && cache?.etag && remoteInfo.etag !== cache.etag) {
                resolve({ changed: true, reason: 'ETag edited' });
                return;
            }

            if (remoteInfo.lastModified && cache?.lastModified) {
                if (new Date(remoteInfo.lastModified) > new Date(cache.lastModified)) {
                    resolve({ changed: true, reason: 'Last-Modified edited' });
                    return;
                }
            }

            if (remoteInfo.contentLength) {
                const localSize = fs.statSync(localFilePath).size;
                if (parseInt(remoteInfo.contentLength) !== localSize) {
                    resolve({ changed: true, reason: 'Content-Length edited' });
                    return;
                }
            }

            if (cache?.hash && cache.hash !== localHash) {
                resolve({ changed: true, reason: 'Hash local' });
                return;
            }

            resolve({ changed: false, reason: 'none modified' });
        });

        request.on('error', () => resolve({ changed: true, reason: 'Error HEAD' }));
        request.on('timeout', () => resolve({ changed: true, reason: 'Timeout HEAD' }));
        request.end();
    });
}

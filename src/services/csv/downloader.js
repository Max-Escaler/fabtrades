import fs from 'fs';
import https from 'https';
import http from 'http';
import csv from 'csv-parser';
import crypto from 'crypto';

export function downloadCSV(url, outputPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;

        const request = protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(outputPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(outputPath, () => {});
                reject(err);
            });
        });

        request.on('error', reject);
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error(`Timeout downloading ${url}`));
        });
    });
}

export function cleanCSV(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const results = [];
        const headers = [];

        fs.createReadStream(inputPath)
            .pipe(csv())
            .on('headers', (headerList) => {
                headers.push(...headerList.filter(h => h !== 'extDescription'));
            })
            .on('data', (row) => {
                const cleaned = {};
                for (const key in row) {
                    if (key !== 'extDescription') cleaned[key] = row[key];
                }
                results.push(cleaned);
            })
            .on('end', () => {
                try {
                    const csvString = [headers, ...results.map(r => headers.map(h => r[h] || ''))]
                        .map(row => row.map(field => {
                            const escaped = field.replace(/"/g, '""');
                            return (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n'))
                                ? `"${escaped}"` : escaped;
                        }).join(',')).join('\n');
                    fs.writeFileSync(outputPath, csvString);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', reject);
    });
}

// Hash MD5
export function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    } catch {
        return null;
    }
}

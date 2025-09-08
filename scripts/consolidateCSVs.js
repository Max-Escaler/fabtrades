#!/usr/bin/env node

/**
 * CSV Consolidation Script
 * 
 * This script parses all CSV files in the public/price-guide directory and 
 * consolidates them into a single JSON file (consolidated-data.json).
 * 
 * Features:
 * - Processes all set_*.csv files numerically in order
 * - Preserves original CSV schema with all columns
 * - Adds metadata (_sourceFile, _setNumber) to each record
 * - Includes comprehensive metadata about the consolidation process
 * - Validates output and provides detailed progress reporting
 * 
 * Usage:
 *   npm run consolidate-csvs
 *   or
 *   node scripts/consolidateCSVs.js
 * 
 * Output: public/price-guide/consolidated-data.json (~13MB)
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PRICE_GUIDE_DIR = path.join(__dirname, '..', 'public', 'price-guide');
const MANIFEST_PATH = path.join(PRICE_GUIDE_DIR, 'manifest.json');
const OUTPUT_PATH = path.join(PRICE_GUIDE_DIR, 'consolidated-data.json');

/**
 * Parse a single CSV file and return the data
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Parsed CSV data
 */
async function parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
        const csvText = fs.readFileSync(filePath, 'utf8');
        
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
                // Ensure consistent header naming
                return header.trim();
            },
            transform: (value, header) => {
                // Clean up data values
                return value.trim();
            },
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn(`CSV parsing warnings for ${path.basename(filePath)}:`, results.errors);
                }
                resolve(results.data);
            },
            error: (error) => {
                console.error(`Error parsing ${path.basename(filePath)}:`, error);
                reject(error);
            }
        });
    });
}

/**
 * Get all CSV files in the price-guide directory
 * @returns {Array<string>} Array of CSV file paths
 */
function getCSVFiles() {
    if (!fs.existsSync(PRICE_GUIDE_DIR)) {
        throw new Error(`Price guide directory not found: ${PRICE_GUIDE_DIR}`);
    }

    const files = fs.readdirSync(PRICE_GUIDE_DIR)
        .filter(file => file.startsWith('set_') && file.endsWith('.csv'))
        .sort((a, b) => {
            // Sort numerically by set number
            const numA = parseInt(a.match(/set_(\d+)\.csv/)?.[1] || '0');
            const numB = parseInt(b.match(/set_(\d+)\.csv/)?.[1] || '0');
            return numA - numB;
        })
        .map(file => path.join(PRICE_GUIDE_DIR, file));

    return files;
}

/**
 * Load manifest information
 * @returns {Object|null} Manifest data or null if not found
 */
function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        console.warn('Manifest file not found, proceeding without metadata');
        return null;
    }

    try {
        const manifestText = fs.readFileSync(MANIFEST_PATH, 'utf8');
        return JSON.parse(manifestText);
    } catch (error) {
        console.warn('Error reading manifest file:', error.message);
        return null;
    }
}

/**
 * Main function to consolidate all CSV files into a single JSON
 */
async function consolidateCSVs() {
    console.log('🚀 Starting CSV consolidation...');
    
    try {
        // Load manifest
        const manifest = loadManifest();
        
        // Get all CSV files
        const csvFiles = getCSVFiles();
        console.log(`📁 Found ${csvFiles.length} CSV files to process`);

        if (csvFiles.length === 0) {
            throw new Error('No CSV files found to consolidate');
        }

        // Process all CSV files
        const allData = [];
        let totalRecords = 0;
        let processedFiles = 0;

        for (const csvFile of csvFiles) {
            const fileName = path.basename(csvFile);
            console.log(`📄 Processing ${fileName}...`);

            try {
                const csvData = await parseCSVFile(csvFile);
                
                // Add metadata to each record
                const enrichedData = csvData.map(record => ({
                    ...record,
                    _sourceFile: fileName,
                    _setNumber: parseInt(fileName.match(/set_(\d+)\.csv/)?.[1] || '0')
                }));

                allData.push(...enrichedData);
                totalRecords += csvData.length;
                processedFiles++;
                
                console.log(`   ✓ ${csvData.length} records processed from ${fileName}`);
            } catch (error) {
                console.error(`   ✗ Error processing ${fileName}:`, error.message);
                // Continue with other files even if one fails
            }
        }

        // Create consolidated data structure
        const consolidatedData = {
            metadata: {
                generatedAt: new Date().toISOString(),
                totalFiles: processedFiles,
                totalRecords: totalRecords,
                sourceManifest: manifest ? {
                    lastUpdated: manifest.lastUpdated,
                    originalTotalFiles: manifest.totalFiles
                } : null,
                schema: {
                    description: "Consolidated data from all CSV files in the price-guide directory",
                    recordFields: [
                        "productId", "name", "cleanName", "imageUrl", "categoryId", "groupId", 
                        "url", "modifiedOn", "imageCount", "lowPrice", "midPrice", "highPrice", 
                        "marketPrice", "directLowPrice", "subTypeName", "extRarity", "extNumber", 
                        "extCardType", "extCardSubType", "extClass", "extPitchValue", "extIntellect", 
                        "extLife", "extPower", "extDefenseValue", "extCost", "extFlavorText"
                    ],
                    additionalFields: [
                        "_sourceFile", "_setNumber"
                    ]
                }
            },
            data: allData
        };

        // Write consolidated data to JSON file
        console.log(`💾 Writing consolidated data to ${path.basename(OUTPUT_PATH)}...`);
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(consolidatedData, null, 2));

        // Generate summary
        console.log('\n✅ Consolidation completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`   • Files processed: ${processedFiles}`);
        console.log(`   • Total records: ${totalRecords}`);
        console.log(`   • Output file: ${OUTPUT_PATH}`);
        console.log(`   • File size: ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);

        // Validate the output
        console.log('\n🔍 Validating output...');
        const outputData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
        console.log(`   • Metadata check: ${outputData.metadata ? '✓' : '✗'}`);
        console.log(`   • Data array check: ${Array.isArray(outputData.data) ? '✓' : '✗'}`);
        console.log(`   • Record count match: ${outputData.data.length === totalRecords ? '✓' : '✗'}`);

    } catch (error) {
        console.error('❌ Error during consolidation:', error.message);
        process.exit(1);
    }
}

// Run the script if called directly
const isMainModule = process.argv[1] && process.argv[1].includes('consolidateCSVs.js');
if (isMainModule) {
    consolidateCSVs();
}

export { consolidateCSVs };

#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function printColor(color, text) {
  console.log(`${color}${text}${colors.reset}`);
}

function printHeader() {
  console.log('\n' + '='.repeat(60));
  printColor(colors.bright + colors.blue, '📄 Test Log Viewer');
  console.log('='.repeat(60));
}

function getLatestLogs() {
  const logDir = path.join(process.cwd(), 'test-logs');
  
  if (!fs.existsSync(logDir)) {
    printColor(colors.yellow, 'No test logs directory found.');
    return { testResults: null, failedTests: null };
  }
  
  const files = fs.readdirSync(logDir);
  const testResultFiles = files.filter(f => f.startsWith('test-results-')).sort().reverse();
  const failedTestFiles = files.filter(f => f.startsWith('failed-tests-')).sort().reverse();
  
  return {
    testResults: testResultFiles.length > 0 ? path.join(logDir, testResultFiles[0]) : null,
    failedTests: failedTestFiles.length > 0 ? path.join(logDir, failedTestFiles[0]) : null
  };
}

function showLogSummary(logFile) {
  if (!logFile || !fs.existsSync(logFile)) {
    return;
  }
  
  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.split('\n');
  
  // Extract basic info
  const generatedLine = lines.find(line => line.startsWith('Generated:'));
  const commandLine = lines.find(line => line.startsWith('Command:'));
  
  if (generatedLine) {
    printColor(colors.cyan, `📅 ${generatedLine}`);
  }
  if (commandLine) {
    printColor(colors.cyan, `🔧 ${commandLine}`);
  }
  
  // Count failed tests
  const failedTestCount = (content.match(/●/g) || []).length;
  if (failedTestCount > 0) {
    printColor(colors.red, `❌ Failed Tests: ${failedTestCount}`);
  }
  
  // Show file size
  const stats = fs.statSync(logFile);
  const sizeKB = Math.round(stats.size / 1024);
  printColor(colors.yellow, `📁 File Size: ${sizeKB} KB`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'summary';
  
  printHeader();
  
  const logs = getLatestLogs();
  
  switch (command) {
    case 'summary':
      printColor(colors.cyan, '📊 Latest Test Results Summary:');
      console.log('');
      
      if (logs.testResults) {
        printColor(colors.blue, '📄 Full Test Results:');
        showLogSummary(logs.testResults);
        console.log('');
      }
      
      if (logs.failedTests) {
        printColor(colors.red, '❌ Failed Tests Summary:');
        showLogSummary(logs.failedTests);
        console.log('');
      }
      
      if (!logs.testResults && !logs.failedTests) {
        printColor(colors.yellow, 'No test logs found. Run tests first with:');
        printColor(colors.cyan, '  node scripts/runTests.js test');
      }
      break;
      
    case 'full':
      if (logs.testResults) {
        printColor(colors.cyan, '📄 Full Test Results:');
        console.log('');
        const content = fs.readFileSync(logs.testResults, 'utf8');
        console.log(content);
      } else {
        printColor(colors.yellow, 'No full test results log found.');
      }
      break;
      
    case 'failed':
      if (logs.failedTests) {
        printColor(colors.red, '❌ Failed Tests Summary:');
        console.log('');
        const content = fs.readFileSync(logs.failedTests, 'utf8');
        console.log(content);
      } else {
        printColor(colors.yellow, 'No failed tests summary found.');
      }
      break;
      
    case 'list':
      const logDir = path.join(process.cwd(), 'test-logs');
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        if (files.length === 0) {
          printColor(colors.yellow, 'No log files found.');
        } else {
          printColor(colors.cyan, '📁 Available Log Files:');
          files.sort().reverse().forEach(file => {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            const sizeKB = Math.round(stats.size / 1024);
            const date = stats.mtime.toLocaleString();
            printColor(colors.white, `  ${file} (${sizeKB} KB, ${date})`);
          });
        }
      } else {
        printColor(colors.yellow, 'No test logs directory found.');
      }
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log('\n📚 Available Commands:');
      console.log('  summary     Show summary of latest test results (default)');
      console.log('  full        Show full test results log');
      console.log('  failed      Show failed tests summary');
      console.log('  list        List all available log files');
      console.log('  help        Show this help message');
      
      console.log('\n📖 Usage Examples:');
      console.log('  node scripts/viewLogs.js');
      console.log('  node scripts/viewLogs.js full');
      console.log('  node scripts/viewLogs.js failed');
      console.log('  node scripts/viewLogs.js list');
      break;
      
    default:
      printColor(colors.red, `❌ Unknown command: ${command}`);
      console.log('Use "node scripts/viewLogs.js help" for available commands.');
      process.exit(1);
  }
}

main();

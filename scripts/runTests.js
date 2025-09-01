#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function to print colored output
function printColor(color, text) {
  console.log(`${color}${text}${colors.reset}`);
}

// Helper function to print header
function printHeader() {
  console.log('\n' + '='.repeat(60));
  printColor(colors.bright + colors.blue, '🧪 FAB Trades Test Suite');
  console.log('='.repeat(60));
}

// Helper function to run command
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Main test runner function
async function runTests() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  printHeader();

  try {
    switch (command) {
      case 'test':
        printColor(colors.cyan, 'Running all tests...');
        await runCommand('npm', ['run', 'test']);
        break;

      case 'watch':
        printColor(colors.cyan, 'Running tests in watch mode...');
        printColor(colors.yellow, 'Press Ctrl+C to stop watching');
        await runCommand('npm', ['run', 'test:watch']);
        break;

      case 'coverage':
        printColor(colors.cyan, 'Running tests with coverage report...');
        await runCommand('npm', ['run', 'test:coverage']);
        printColor(colors.green, '\n✅ Coverage report generated!');
        printColor(colors.blue, '📊 View detailed coverage at: coverage/lcov-report/index.html');
        break;

      case 'ci':
        printColor(colors.cyan, 'Running tests for CI/CD pipeline...');
        await runCommand('npm', ['run', 'test:ci']);
        printColor(colors.green, '\n✅ CI tests completed successfully!');
        break;

      case 'debug':
        printColor(colors.cyan, 'Running tests in debug mode...');
        printColor(colors.yellow, 'Debugger will pause on first test failure');
        await runCommand('npm', ['run', 'test:debug']);
        break;

      case 'lint':
        printColor(colors.cyan, 'Running ESLint...');
        await runCommand('npm', ['run', 'lint']);
        printColor(colors.green, '\n✅ Linting passed!');
        break;

      case 'build':
        printColor(colors.cyan, 'Building project...');
        await runCommand('npm', ['run', 'build']);
        printColor(colors.green, '\n✅ Build completed successfully!');
        break;

      case 'full':
        printColor(colors.cyan, 'Running full test suite...');
        
        // Run linting first
        printColor(colors.blue, '\n🔍 Step 1: Linting...');
        await runCommand('npm', ['run', 'lint']);
        
        // Run tests with coverage
        printColor(colors.blue, '\n🧪 Step 2: Running tests with coverage...');
        await runCommand('npm', ['run', 'test:coverage']);
        
        // Build project
        printColor(colors.blue, '\n🏗️  Step 3: Building project...');
        await runCommand('npm', ['run', 'build']);
        
        printColor(colors.green, '\n🎉 Full test suite completed successfully!');
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        printColor(colors.red, `❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    printColor(colors.red, `\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Help function
function printHelp() {
  console.log('\n📚 Available Commands:');
  console.log('  test          Run all tests once');
  console.log('  watch         Run tests in watch mode');
  console.log('  coverage      Run tests with coverage report');
  console.log('  ci            Run tests for CI/CD pipeline');
  console.log('  debug         Run tests in debug mode');
  console.log('  lint          Run ESLint only');
  console.log('  build         Build project only');
  console.log('  full          Run complete test suite (lint + test + build)');
  console.log('  help          Show this help message');
  
  console.log('\n📖 Usage Examples:');
  console.log('  node scripts/runTests.js test');
  console.log('  node scripts/runTests.js coverage');
  console.log('  node scripts/runTests.js full');
  
  console.log('\n🔧 Test Configuration:');
  console.log('  - Jest config: jest.config.js');
  console.log('  - Test setup: src/setupTests.js');
  console.log('  - Coverage threshold: 80%');
  console.log('  - Test timeout: 10 seconds');
}

// Run the test runner
if (require.main === module) {
  runTests().catch((error) => {
    printColor(colors.red, `\n💥 Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests, runCommand };

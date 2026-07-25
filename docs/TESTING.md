# 🧪 FAB Trades Testing Suite

This document provides comprehensive information about the testing setup for the FAB Trades application.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The FAB Trades application includes a comprehensive testing suite built with:

- **Jest** - JavaScript testing framework
- **React Testing Library** - React component testing utilities
- **jsdom** - DOM environment for Node.js testing
- **Custom test utilities** - Enhanced testing capabilities

## 🏗️ Test Structure

```
src/
├── __tests__/           # Test directories (optional)
├── components/
│   ├── AddCardButton.test.jsx
│   ├── CardList.test.jsx
│   └── CardPanel.test.jsx
├── inputs/
│   └── cardDataProvider.test.jsx
├── App.test.jsx
└── setupTests.js        # Global test configuration

__mocks__/
└── fileMock.js          # Mock for file imports

scripts/
└── runTests.js          # Custom test runner

jest.config.js           # Jest configuration
```

## 🚀 Running Tests

### Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Custom Test Runner

```bash
# Run specific test modes
node scripts/runTests.js test          # Run all tests
node scripts/runTests.js coverage      # Run with coverage
node scripts/runTests.js watch         # Watch mode
node scripts/runTests.js ci            # CI mode
node scripts/runTests.js full          # Complete test suite
node scripts/runTests.js help          # Show help
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ci` | Run tests for CI/CD pipeline |
| `npm run test:debug` | Run tests in debug mode |

## 📊 Test Coverage

The testing suite aims for **80% coverage** across:

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Report

After running `npm run test:coverage`, view detailed coverage at:
```
coverage/lcov-report/index.html
```

## ✍️ Writing Tests

### Test File Naming

- Test files should end with `.test.jsx` or `.spec.jsx`
- Place tests in the same directory as the component being tested
- Use descriptive test names that explain the expected behavior

### Test Structure

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  describe('Initial Rendering', () => {
    test('renders correctly', () => {
      render(<ComponentName />);
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('responds to user input', () => {
      render(<ComponentName />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(input.value).toBe('test');
    });
  });
});
```

### Testing Patterns

#### Component Testing
```jsx
// Test component rendering
test('renders component with props', () => {
  render(<Component prop="value" />);
  expect(screen.getByText('Expected')).toBeInTheDocument();
});

// Test user interactions
test('handles button click', () => {
  const mockHandler = jest.fn();
  render(<Component onClick={mockHandler} />);
  fireEvent.click(screen.getByRole('button'));
  expect(mockHandler).toHaveBeenCalled();
});
```

#### Hook Testing
```jsx
// Test custom hooks
const TestComponent = () => {
  const result = useCustomHook();
  return <div data-testid="result">{result}</div>;
};

test('hook returns expected value', () => {
  render(<TestComponent />);
  expect(screen.getByTestId('result')).toHaveTextContent('expected');
});
```

#### Async Testing
```jsx
// Test async operations
test('loads data asynchronously', async () => {
  render(<AsyncComponent />);
  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

## 🛠️ Test Utilities

### Global Test Utilities

The testing suite provides enhanced utilities in `global.testUtils`:

```jsx
// Wait for a condition
await global.testUtils.waitFor(() => {
  return screen.queryByText('Data') !== null;
});

// Mock fetch with delay
global.fetch = global.testUtils.mockFetchWithDelay(mockResponse, 100);

// Create mock events
const event = global.testUtils.createMockEvent('click', button);

// Mock window dimensions
global.testUtils.mockWindowDimensions(1920, 1080);

// Reset all mocks
global.testUtils.resetAllMocks();
```

### Custom Matchers

```jsx
// Check if function was called with matching arguments
expect(mockFunction).toHaveBeenCalledWithMatch(
  (arg) => arg.name === 'expected'
);

// Check element styles
expect(element).toHaveStyle({
  backgroundColor: '#1976d2',
  fontSize: '14px'
});
```

### Mock Setup

```jsx
// Mock external dependencies
jest.mock('./externalModule', () => ({
  ...jest.requireActual('./externalModule'),
  specificFunction: jest.fn()
}));

// Mock fetch responses
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => mockData
});
```

## 🧪 Available Tests

### App Component (`App.test.jsx`)
- **Initial Rendering**: Header, panels, inputs, buttons
- **Card Addition**: Adding cards to both panels
- **Card Removal**: Deleting cards from panels
- **Quantity Management**: Changing card quantities
- **Edition Management**: Changing card editions
- **Total Calculations**: Price calculations with quantities
- **Trade Summary**: Trade differential display
- **Input Validation**: Form validation and error handling
- **Responsive Behavior**: Mobile and desktop layouts
- **Error Handling**: Graceful error handling

### CardPanel Component (`CardPanel.test.jsx`)
- **Initial Rendering**: Panel title, search input, add button
- **Search Functionality**: Input handling, autocomplete, filtering
- **Add Card Button**: Click handling, disabled states, styling
- **Card List Rendering**: Empty states, card display
- **Card Interactions**: Edition selection, quantity changes
- **Responsive Behavior**: Mobile and desktop adaptations
- **Disabled States**: Input and button disabled behavior
- **Edge Cases**: Missing data, long text, performance

### CardList Component (`CardList.test.jsx`)
- **Initial Rendering**: Empty states, card display
- **Card Structure**: Layout elements, hover effects
- **Quantity Management**: Dropdown functionality, value changes
- **Edition Management**: Edition picker, selection handling
- **Delete Functionality**: Remove buttons, event handling
- **Responsive Behavior**: Layout adaptations
- **Edge Cases**: Missing properties, malformed data
- **Performance**: Large datasets, rapid interactions
- **Accessibility**: ARIA labels, keyboard navigation

### AddCardButton Component (`AddCardButton.test.jsx`)
- **Initial Rendering**: Button text, element type
- **Click Functionality**: Event handling, multiple clicks
- **Disabled States**: Enabled/disabled behavior
- **Styling**: Colors, cursors, opacity
- **Hover Effects**: Visual feedback
- **Accessibility**: Roles, focus, tabIndex
- **Edge Cases**: Missing handlers, long text
- **Performance**: Rendering efficiency, rapid clicks
- **Integration**: State changes, parent updates

### CardDataProvider (`cardDataProvider.test.jsx`)
- **Initial State**: Loading, data ready, error states
- **Data Loading**: API calls, successful responses
- **Error Handling**: Network errors, malformed data
- **Local File Fallback**: Offline functionality
- **Data Processing**: Card data transformation
- **Loading States**: State transitions
- **Performance**: Large datasets, concurrent requests
- **Memory Management**: Resource cleanup
- **Edge Cases**: Malformed data, concurrent loading

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
  // ... more configuration
};
```

### Test Setup (`src/setupTests.js`)

- Global mocks for browser APIs
- Custom test utilities
- Enhanced matchers
- Global test hooks

## 🚨 Troubleshooting

### Common Issues

#### Tests Failing with Material-UI
```jsx
// Wrap components with ThemeProvider in tests
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();
render(
  <ThemeProvider theme={theme}>
    <Component />
  </ThemeProvider>
);
```

#### Async Test Failures
```jsx
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Data')).toBeInTheDocument();
});
```

#### Mock Issues
```jsx
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Debug Mode

Run tests in debug mode to pause on failures:
```bash
npm run test:debug
# or
node scripts/runTests.js debug
```

### Verbose Output

Enable verbose output for detailed test information:
```bash
npm test -- --verbose
```

## 📈 Best Practices

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names
- Test one behavior per test
- Arrange, Act, Assert pattern

### Test Data
- Use realistic test data
- Create reusable test fixtures
- Mock external dependencies
- Test edge cases and error conditions

### Performance
- Test with realistic data sizes
- Mock expensive operations
- Use appropriate timeouts
- Clean up resources

### Maintenance
- Keep tests up to date with code changes
- Refactor tests when refactoring code
- Use meaningful assertions
- Document complex test scenarios

## 🤝 Contributing

When adding new features or components:

1. **Write tests first** (TDD approach)
2. **Maintain coverage** above 80%
3. **Follow existing patterns** for consistency
4. **Test edge cases** and error conditions
5. **Update documentation** for new test utilities

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Material-UI Testing](https://mui.com/material-ui/guides/testing/)

---

**Happy Testing! 🎉**

For questions or issues, check the troubleshooting section or create an issue in the project repository.

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: componentWillReceiveProps') ||
       args[0].includes('Warning: componentWillUpdate'))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Wait for a condition to be true
  waitFor: (condition, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkCondition = () => {
        try {
          if (condition()) {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Condition not met within timeout'));
          } else {
            setTimeout(checkCondition, 10);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      checkCondition();
    });
  },
  
  // Mock fetch with a delay
  mockFetchWithDelay: (response, delay = 100) => {
    return jest.fn().mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve(response), delay)
      )
    );
  },
  
  // Create mock event
  createMockEvent: (type, target = null) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    if (target) {
      Object.defineProperty(event, 'target', { value: target });
    }
    return event;
  },
  
  // Mock window dimensions
  mockWindowDimensions: (width, height) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  },
  
  // Reset all mocks
  resetAllMocks: () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
    sessionStorageMock.clear.mockClear();
  },
};

// Custom matchers
expect.extend({
  toHaveBeenCalledWithMatch(received, ...expected) {
    const pass = received.mock.calls.some(call =>
      expected.every((arg, index) => {
        if (typeof arg === 'function') {
          return arg(call[index]);
        }
        return expect(call[index]).toEqual(arg);
      })
    );
    
    if (pass) {
      return {
        message: () => `expected ${received.getDisplayName()} not to have been called with matching arguments`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received.getDisplayName()} to have been called with matching arguments`,
        pass: false,
      };
    }
  },
  
  toHaveStyle(received, expected) {
    const pass = Object.entries(expected).every(([property, value]) => {
      const actualValue = received.style[property];
      return actualValue === value || actualValue === `${value}px`;
    });
    
    if (pass) {
      return {
        message: () => `expected element not to have style ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have style ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

// Global beforeEach and afterEach hooks
beforeEach(() => {
  // Reset all mocks before each test
  global.testUtils.resetAllMocks();
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Reset fetch mock
  if (global.fetch) {
    global.fetch.mockClear();
  }
});

afterEach(() => {
  // Clean up any remaining timers
  jest.clearAllTimers();
  
  // Clean up any remaining mocks
  jest.clearAllMocks();
});

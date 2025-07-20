/// <reference types="jest" />

// This file ensures Jest types are available in all test files
import '@jest/globals';

// Add any global test setup here
beforeEach(() => {
  jest.clearAllMocks();
});

// Export to make this a module
export {};
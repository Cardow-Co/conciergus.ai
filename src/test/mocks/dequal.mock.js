// Mock for dequal to resolve ES module issues in Jest
module.exports = {
  dequal: jest.fn((a, b) => JSON.stringify(a) === JSON.stringify(b)),
};

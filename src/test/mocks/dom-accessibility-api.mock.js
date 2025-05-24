// Mock for dom-accessibility-api to resolve ES module issues in Jest
module.exports = {
  computeAccessibleDescription: jest.fn(() => ''),
  computeAccessibleName: jest.fn(() => ''),
  getRole: jest.fn(() => null),
  isInaccessible: jest.fn(() => false),
  prettyDOM: jest.fn(() => ''),
}; 
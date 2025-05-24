// Mock for rehype-sanitize
const rehypeSanitize = () => {
  return function transformer() {
    // Mock transformer function
    return function(tree) {
      return tree;
    };
  };
};

module.exports = rehypeSanitize;
module.exports.default = rehypeSanitize; 
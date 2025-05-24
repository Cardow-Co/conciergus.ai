// Mock for remark-gfm
const remarkGfm = () => {
  return function transformer() {
    // Mock transformer function
    return function(tree) {
      return tree;
    };
  };
};

module.exports = remarkGfm;
module.exports.default = remarkGfm; 
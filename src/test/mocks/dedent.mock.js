/**
 * Mock for dedent package
 * Simple implementation that removes common leading whitespace from template literals
 */

function dedent(strings, ...values) {
  // Join the template literal parts with the interpolated values
  let result = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '');
  }, '');

  // Split into lines
  const lines = result.split('\n');
  
  // Remove first and last empty lines
  if (lines[0] === '') lines.shift();
  if (lines[lines.length - 1] === '') lines.pop();
  
  if (lines.length === 0) return '';
  
  // Find the minimum indentation
  const minIndent = Math.min(
    ...lines
      .filter(line => line.trim()) // Ignore empty lines
      .map(line => (line.match(/^\s*/) || [''])[0].length)
  );
  
  // Remove the common indentation from all lines
  return lines
    .map(line => line.slice(minIndent))
    .join('\n');
}

module.exports = dedent; 
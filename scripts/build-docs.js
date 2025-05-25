#!/usr/bin/env node

/**
 * Documentation Build System
 * 
 * This script processes MDX files, combines them with TypeDoc output,
 * and generates a complete documentation website with search, navigation,
 * and interactive examples.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
// Skip importing remark-gfm for now due to module issues
// const remarkGfm = require('remark-gfm');
const rehypeSlug = require('rehype-slug');
const rehypeAutolinkHeadings = require('rehype-autolink-headings');

// Dynamic import for ESM-only modules
let compile;
async function loadMdxCompiler() {
  if (!compile) {
    const mdxModule = await import('@mdx-js/mdx');
    compile = mdxModule.compile;
  }
  return compile;
}

// Configuration
const config = {
  mdx: {
    sourceDir: 'docs/guides',
    outputDir: 'docs/built',
    extensions: ['.mdx', '.md']
  },
  typedoc: {
    configFile: 'typedoc.json',
    outputDir: 'docs/api'
  },
  website: {
    templateDir: 'docs/templates',
    outputDir: 'docs/site',
    assetsDir: 'docs/assets'
  },
  search: {
    indexFile: 'docs/search-index.json',
    lunrIndex: 'docs/lunr-index.json'
  }
};

// Utility functions
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    progress: '🔄'
  }[level] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content };
  }
  
  try {
    const frontmatter = yaml.load(match[1]);
    const markdownContent = match[2];
    return { frontmatter, content: markdownContent };
  } catch (error) {
    log(`Failed to parse frontmatter: ${error.message}`, 'warn');
    return { frontmatter: {}, content };
  }
}

async function processMDXFile(filePath, outputDir) {
  log(`Processing MDX file: ${filePath}`, 'progress');
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, content: markdownContent } = extractFrontmatter(content);
    
    // Ensure MDX compiler is loaded
    const compilerFunction = await loadMdxCompiler();
    
    // Compile MDX to JavaScript (simplified for compatibility)
    const compiled = await compilerFunction(markdownContent, {
      development: false
    });
    
    const fileName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(outputDir, `${fileName}.js`);
    const metaPath = path.join(outputDir, `${fileName}.meta.json`);
    
    // Write compiled JavaScript
    fs.writeFileSync(outputPath, String(compiled));
    
    // Write metadata
    const metadata = {
      ...frontmatter,
      fileName,
      filePath,
      compiledAt: new Date().toISOString(),
      wordCount: markdownContent.split(/\s+/).length,
      readingTime: Math.ceil(markdownContent.split(/\s+/).length / 200) // 200 WPM
    };
    
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    
    log(`Compiled MDX: ${outputPath}`);
    return metadata;
  } catch (error) {
    log(`Failed to process MDX file ${filePath}: ${error.message}`, 'error');
    throw error;
  }
}

async function buildMDXDocumentation() {
  log('Building MDX documentation...', 'progress');
  
  const sourceDir = path.resolve(config.mdx.sourceDir);
  const outputDir = path.resolve(config.mdx.outputDir);
  
  ensureDir(outputDir);
  
  if (!fs.existsSync(sourceDir)) {
    log(`MDX source directory not found: ${sourceDir}`, 'warn');
    return [];
  }
  
  const files = fs.readdirSync(sourceDir, { recursive: true })
    .filter(file => config.mdx.extensions.some(ext => file.endsWith(ext)))
    .map(file => path.join(sourceDir, file));
  
  const metadata = [];
  
  for (const file of files) {
    try {
      const meta = await processMDXFile(file, outputDir);
      metadata.push(meta);
    } catch (error) {
      log(`Failed to process ${file}: ${error.message}`, 'error');
    }
  }
  
  // Generate index file
  const indexPath = path.join(outputDir, 'index.json');
  const sortedMetadata = metadata.sort((a, b) => (a.order || 999) - (b.order || 999));
  fs.writeFileSync(indexPath, JSON.stringify(sortedMetadata, null, 2));
  
  log(`MDX documentation built successfully. Processed ${metadata.length} files`);
  return metadata;
}

function generateTypeDocumentation() {
  log('Generating TypeDoc documentation...', 'progress');
  
  try {
    const cmd = 'pnpm run docs:api';
    execSync(cmd, { stdio: 'inherit' });
    log('TypeDoc documentation generated successfully');
  } catch (error) {
    log(`Failed to generate TypeDoc: ${error.message}`, 'error');
    throw error;
  }
}

function generateNavigationStructure(mdxMetadata) {
  log('Generating navigation structure...', 'progress');
  
  const navigation = {
    guides: [],
    api: {
      title: 'API Reference',
      path: '/api',
      children: []
    },
    examples: {
      title: 'Examples',
      path: '/examples',
      children: []
    }
  };
  
  // Process MDX guides
  const guidesByCategory = {};
  mdxMetadata.forEach(meta => {
    const category = meta.category || 'General';
    if (!guidesByCategory[category]) {
      guidesByCategory[category] = [];
    }
    guidesByCategory[category].push({
      title: meta.title,
      path: `/guides/${meta.fileName}`,
      description: meta.description,
      tags: meta.tags || [],
      order: meta.order || 999
    });
  });
  
  // Sort and structure guides
  Object.keys(guidesByCategory).forEach(category => {
    const guides = guidesByCategory[category].sort((a, b) => a.order - b.order);
    navigation.guides.push({
      title: category,
      children: guides
    });
  });
  
  // Add API sections (would be extracted from TypeDoc)
  navigation.api.children = [
    { title: 'Components', path: '/api/components' },
    { title: 'Hooks', path: '/api/hooks' },
    { title: 'Types', path: '/api/types' },
    { title: 'Utilities', path: '/api/utilities' }
  ];
  
  return navigation;
}

function generateSearchIndex(mdxMetadata) {
  log('Generating search index...', 'progress');
  
  const searchIndex = [];
  
  // Index MDX content
  mdxMetadata.forEach(meta => {
    if (meta.title && meta.description) {
      searchIndex.push({
        id: `guide-${meta.fileName}`,
        type: 'guide',
        title: meta.title,
        description: meta.description,
        content: meta.description, // Would include full content in real implementation
        path: `/guides/${meta.fileName}`,
        tags: meta.tags || [],
        category: meta.category
      });
    }
  });
  
  // Save search index
  const indexPath = path.resolve(config.search.indexFile);
  ensureDir(path.dirname(indexPath));
  fs.writeFileSync(indexPath, JSON.stringify(searchIndex, null, 2));
  
  log(`Search index generated with ${searchIndex.length} entries`);
  return searchIndex;
}

function generateDocumentationWebsite(mdxMetadata, navigation, searchIndex) {
  log('Generating documentation website...', 'progress');
  
  const outputDir = path.resolve(config.website.outputDir);
  ensureDir(outputDir);
  
  // Generate main index.html
  const indexTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conciergus Chat Documentation</title>
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" type="image/png" href="/assets/favicon.png">
</head>
<body>
  <div id="app">
    <nav class="sidebar">
      <div class="logo">
        <h1>Conciergus Chat</h1>
        <span class="version">v0.2.0</span>
      </div>
      <div class="search">
        <input type="text" id="search-input" placeholder="Search documentation..." />
        <div id="search-results"></div>
      </div>
      <div class="navigation">
        ${generateNavigationHTML(navigation)}
      </div>
    </nav>
    <main class="content">
      <div id="main-content">
        <h1>Welcome to Conciergus Chat Documentation</h1>
        <p>Comprehensive documentation for building AI-powered chat interfaces.</p>
        <div class="quick-links">
          <a href="/guides/getting-started" class="quick-link">
            <h3>🚀 Getting Started</h3>
            <p>Learn the basics and set up your first chat interface</p>
          </a>
          <a href="/guides/multi-agent-conversations" class="quick-link">
            <h3>🤖 Multi-Agent</h3>
            <p>Coordinate multiple AI agents in conversations</p>
          </a>
          <a href="/api" class="quick-link">
            <h3>📚 API Reference</h3>
            <p>Detailed API documentation and type definitions</p>
          </a>
          <a href="/examples" class="quick-link">
            <h3>💡 Examples</h3>
            <p>Working examples and implementation patterns</p>
          </a>
        </div>
      </div>
    </main>
  </div>
  
  <script>
    // Inject search index and navigation data
    window.DOCS_DATA = {
      navigation: ${JSON.stringify(navigation)},
      searchIndex: ${JSON.stringify(searchIndex)},
      metadata: ${JSON.stringify(mdxMetadata)}
    };
  </script>
  <script src="/assets/app.js"></script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(outputDir, 'index.html'), indexTemplate);
  
  // Generate CSS
  const stylesPath = path.join(outputDir, 'assets', 'styles.css');
  ensureDir(path.dirname(stylesPath));
  fs.writeFileSync(stylesPath, generateCSS());
  
  // Generate JavaScript
  const jsPath = path.join(outputDir, 'assets', 'app.js');
  fs.writeFileSync(jsPath, generateJavaScript());
  
  log(`Documentation website generated at: ${outputDir}`);
}

function generateNavigationHTML(navigation) {
  let html = '';
  
  // Guides
  if (navigation.guides.length > 0) {
    html += '<div class="nav-section"><h3>Guides</h3><ul>';
    navigation.guides.forEach(category => {
      html += `<li><strong>${category.title}</strong><ul>`;
      category.children.forEach(guide => {
        html += `<li><a href="${guide.path}">${guide.title}</a></li>`;
      });
      html += '</ul></li>';
    });
    html += '</ul></div>';
  }
  
  // API Reference
  html += `<div class="nav-section"><h3><a href="${navigation.api.path}">API Reference</a></h3><ul>`;
  navigation.api.children.forEach(section => {
    html += `<li><a href="${section.path}">${section.title}</a></li>`;
  });
  html += '</ul></div>';
  
  return html;
}

function generateCSS() {
  return `
/* Documentation Website Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f8f9fa;
}

#app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e1e8ed;
  padding: 2rem 0;
  overflow-y: auto;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
}

.logo {
  padding: 0 2rem 2rem;
  border-bottom: 1px solid #e1e8ed;
  margin-bottom: 2rem;
}

.logo h1 {
  color: #1976d2;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.version {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.search {
  padding: 0 2rem 2rem;
  border-bottom: 1px solid #e1e8ed;
  margin-bottom: 2rem;
  position: relative;
}

#search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
}

#search-results {
  position: absolute;
  top: 100%;
  left: 2rem;
  right: 2rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  display: none;
  z-index: 1000;
}

.search-result {
  padding: 1rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.search-result:hover {
  background: #f5f5f5;
}

.search-result:last-child {
  border-bottom: none;
}

.navigation {
  padding: 0 2rem;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section h3 {
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 1rem;
}

.nav-section ul {
  list-style: none;
}

.nav-section li {
  margin-bottom: 0.5rem;
}

.nav-section a {
  color: #333;
  text-decoration: none;
  padding: 0.25rem 0;
  display: block;
  border-radius: 4px;
  padding-left: 0.5rem;
}

.nav-section a:hover {
  background: #f5f5f5;
  color: #1976d2;
}

.content {
  flex: 1;
  margin-left: 280px;
  padding: 2rem;
}

#main-content {
  max-width: 800px;
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 3rem;
}

.quick-link {
  padding: 2rem;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.quick-link:hover {
  border-color: #1976d2;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(25, 118, 210, 0.1);
}

.quick-link h3 {
  color: #1976d2;
  margin-bottom: 0.5rem;
}

.quick-link p {
  color: #666;
  margin: 0;
}

h1, h2, h3, h4, h5, h6 {
  margin-bottom: 1rem;
  color: #1976d2;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}

p {
  margin-bottom: 1rem;
}

code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
}

pre {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

pre code {
  background: none;
  padding: 0;
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .content {
    margin-left: 0;
    padding: 1rem;
  }
  
  #main-content {
    padding: 2rem;
  }
  
  .quick-links {
    grid-template-columns: 1fr;
  }
}
`;
}

function generateJavaScript() {
  return `
// Documentation Website JavaScript
(function() {
  'use strict';
  
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const mainContent = document.getElementById('main-content');
  
  let searchIndex = [];
  let navigation = {};
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    if (window.DOCS_DATA) {
      searchIndex = window.DOCS_DATA.searchIndex || [];
      navigation = window.DOCS_DATA.navigation || {};
    }
    
    setupSearch();
    setupNavigation();
  });
  
  function setupSearch() {
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('focus', showSearchResults);
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        hideSearchResults();
      }
    });
  }
  
  function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length < 2) {
      hideSearchResults();
      return;
    }
    
    const results = searchIndex.filter(item => {
      return item.title.toLowerCase().includes(query) ||
             item.description.toLowerCase().includes(query) ||
             (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)));
    }).slice(0, 5);
    
    displaySearchResults(results);
  }
  
  function displaySearchResults(results) {
    if (!searchResults) return;
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result">No results found</div>';
    } else {
      searchResults.innerHTML = results.map(result => 
        \`<div class="search-result" onclick="navigateTo('\${result.path}')">
          <strong>\${result.title}</strong>
          <p>\${result.description}</p>
          \${result.category ? \`<span class="category">\${result.category}</span>\` : ''}
        </div>\`
      ).join('');
    }
    
    showSearchResults();
  }
  
  function showSearchResults() {
    if (searchResults) {
      searchResults.style.display = 'block';
    }
  }
  
  function hideSearchResults() {
    if (searchResults) {
      searchResults.style.display = 'none';
    }
  }
  
  function navigateTo(path) {
    hideSearchResults();
    if (searchInput) {
      searchInput.value = '';
    }
    
    // In a real SPA, this would handle routing
    // For now, we'll just update the URL
    if (path.startsWith('/')) {
      window.location.hash = path;
    }
  }
  
  function setupNavigation() {
    // Handle hash-based navigation
    window.addEventListener('hashchange', handleNavigation);
    handleNavigation(); // Handle initial load
  }
  
  function handleNavigation() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      loadPage(hash);
    }
  }
  
  function loadPage(path) {
    // In a real implementation, this would load and render MDX content
    console.log('Loading page:', path);
  }
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Export for global access
  window.DocsApp = {
    navigateTo,
    searchIndex,
    navigation
  };
})();
`;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  log(`Starting documentation build (command: ${command})...`);
  
  try {
    let mdxMetadata = [];
    
    switch (command) {
      case 'mdx':
        mdxMetadata = await buildMDXDocumentation();
        break;
        
      case 'typedoc':
        generateTypeDocumentation();
        break;
        
      case 'website':
        // Load existing metadata if available
        const indexPath = path.resolve(config.mdx.outputDir, 'index.json');
        if (fs.existsSync(indexPath)) {
          mdxMetadata = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        }
        const navigation = generateNavigationStructure(mdxMetadata);
        const searchIndex = generateSearchIndex(mdxMetadata);
        generateDocumentationWebsite(mdxMetadata, navigation, searchIndex);
        break;
        
      case 'all':
      default:
        mdxMetadata = await buildMDXDocumentation();
        generateTypeDocumentation();
        const nav = generateNavigationStructure(mdxMetadata);
        const search = generateSearchIndex(mdxMetadata);
        generateDocumentationWebsite(mdxMetadata, nav, search);
        break;
    }
    
    log('Documentation build completed successfully! 🎉');
    
    if (command === 'all') {
      log('');
      log('📚 Generated Documentation:');
      log('  • MDX Guides: docs/built/');
      log('  • TypeDoc API: docs/api/');
      log('  • Documentation Website: docs/site/');
      log('  • Search Index: docs/search-index.json');
      log('');
      log('🚀 To serve locally: npx serve docs/site');
    }
    
  } catch (error) {
    log(`Documentation build failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at ${promise}: ${reason}`, 'error');
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  buildMDXDocumentation,
  generateTypeDocumentation,
  generateDocumentationWebsite,
  extractFrontmatter,
  processMDXFile
}; 
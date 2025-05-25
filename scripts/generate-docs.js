#!/usr/bin/env node

/**
 * Documentation Generation Script
 * 
 * This script handles generation of various documentation formats including
 * OpenAPI/Swagger docs, TypeDoc API docs, and interactive documentation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

// Configuration
const config = {
  openapi: {
    source: 'docs/api/openapi.yaml',
    output: {
      html: 'docs/api/index.html',
      json: 'docs/api/openapi.json',
      redoc: 'docs/api/redoc.html'
    }
  },
  typedoc: {
    entryPoint: 'src/index.ts',
    output: 'docs/api'
  },
  docs: {
    output: 'docs'
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

function validateOpenAPISpec() {
  log('Validating OpenAPI specification...', 'progress');
  
  try {
    const specPath = path.resolve(config.openapi.source);
    if (!fs.existsSync(specPath)) {
      throw new Error(`OpenAPI spec file not found: ${specPath}`);
    }
    
    const specContent = fs.readFileSync(specPath, 'utf8');
    const spec = yaml.load(specContent);
    
    // Basic validation checks
    if (!spec.openapi) {
      throw new Error('OpenAPI version not specified');
    }
    
    if (!spec.info || !spec.info.title || !spec.info.version) {
      throw new Error('API info (title, version) is required');
    }
    
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      throw new Error('No API paths defined');
    }
    
    log(`OpenAPI spec validated successfully (version ${spec.openapi}, API v${spec.info.version})`);
    return spec;
  } catch (error) {
    log(`OpenAPI validation failed: ${error.message}`, 'error');
    throw error;
  }
}

function convertYamlToJson() {
  log('Converting OpenAPI YAML to JSON...', 'progress');
  
  try {
    const specPath = path.resolve(config.openapi.source);
    const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
    
    const outputPath = path.resolve(config.openapi.output.json);
    ensureDir(path.dirname(outputPath));
    
    fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
    log(`OpenAPI JSON generated: ${outputPath}`);
  } catch (error) {
    log(`Failed to convert YAML to JSON: ${error.message}`, 'error');
    throw error;
  }
}

function generateSwaggerUI() {
  log('Generating Swagger UI documentation...', 'progress');
  
  try {
    const outputPath = path.resolve(config.openapi.output.html);
    ensureDir(path.dirname(outputPath));
    
    const swaggerTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>Conciergus Chat API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://conciergus.ai/favicon.png" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #1976d2;
    }
    .swagger-ui .topbar .download-url-wrapper .download-url-button {
      background-color: #1565c0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        filter: true,
        requestInterceptor: function(req) {
          // Add API key header if available
          if (localStorage.getItem('api-key')) {
            req.headers['X-API-Key'] = localStorage.getItem('api-key');
          }
          return req;
        },
        responseInterceptor: function(res) {
          // Log responses for debugging
          console.log('API Response:', res);
          return res;
        },
        onComplete: function() {
          console.log('Swagger UI loaded successfully');
        },
        onFailure: function(error) {
          console.error('Swagger UI failed to load:', error);
        }
      });
      
      // Add custom functionality
      window.ui = ui;
      
      // API Key management
      const addApiKeyButton = document.createElement('button');
      addApiKeyButton.textContent = 'Set API Key';
      addApiKeyButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;';
      addApiKeyButton.onclick = function() {
        const apiKey = prompt('Enter your API key:');
        if (apiKey) {
          localStorage.setItem('api-key', apiKey);
          alert('API key saved! It will be included in all requests.');
        }
      };
      document.body.appendChild(addApiKeyButton);
    };
  </script>
</body>
</html>`;
    
    fs.writeFileSync(outputPath, swaggerTemplate);
    log(`Swagger UI generated: ${outputPath}`);
  } catch (error) {
    log(`Failed to generate Swagger UI: ${error.message}`, 'error');
    throw error;
  }
}

function generateRedocDocs() {
  log('Generating Redoc documentation...', 'progress');
  
  try {
    const outputPath = path.resolve(config.openapi.output.redoc);
    ensureDir(path.dirname(outputPath));
    
    const sourcePath = path.resolve(config.openapi.source);
        const cmd = `npx @redocly/cli build-docs "${sourcePath}" --output "${outputPath}" --title "Conciergus Chat API"`;  
    execSync(cmd, { stdio: 'inherit' });
    
    log(`Redoc documentation generated: ${outputPath}`);
  } catch (error) {
    log(`Failed to generate Redoc docs: ${error.message}`, 'error');
    // Don't throw error, just skip redoc generation
    log('Skipping Redoc generation and continuing...', 'warn');
  }
}

function generateTypeDocs() {
  log('Generating TypeDoc API documentation...', 'progress');
  
  try {
    const cmd = 'pnpm run docs:api';
    execSync(cmd, { stdio: 'inherit' });
    log('TypeDoc documentation generated successfully');
  } catch (error) {
    log(`Failed to generate TypeDoc: ${error.message}`, 'error');
    throw error;
  }
}

function generateChangelogDocs() {
  log('Generating changelog documentation...', 'progress');
  
  try {
    const changelogPath = path.resolve('CHANGELOG.md');
    const outputPath = path.resolve('docs/changelog.html');
    
    if (!fs.existsSync(changelogPath)) {
      log('No CHANGELOG.md found, skipping...', 'warn');
      return;
    }
    
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    
    // Convert markdown to HTML (simple conversion)
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Conciergus Chat - Changelog</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1, h2, h3 { color: #1976d2; }
    code { background: #f5f5f5; padding: 2px 4px; border-radius: 4px; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Changelog</h1>
  <div id="content">
    <pre>${changelogContent}</pre>
  </div>
</body>
</html>`;
    
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, htmlContent);
    log(`Changelog documentation generated: ${outputPath}`);
  } catch (error) {
    log(`Failed to generate changelog: ${error.message}`, 'error');
    throw error;
  }
}

function generateIndexPage() {
  log('Generating documentation index page...', 'progress');
  
  try {
    const indexPath = path.resolve('docs/index.html');
    
    const indexContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Conciergus Chat - Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #fafafa;
    }
    .header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header h1 {
      color: #1976d2;
      margin: 0;
      font-size: 2.5rem;
    }
    .header p {
      color: #666;
      font-size: 1.2rem;
      margin: 0.5rem 0 0 0;
    }
    .docs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .doc-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      transition: transform 0.2s ease;
    }
    .doc-card:hover {
      transform: translateY(-2px);
    }
    .doc-card h3 {
      color: #1976d2;
      margin: 0 0 1rem 0;
    }
    .doc-card p {
      color: #666;
      margin: 0 0 1rem 0;
    }
    .doc-link {
      display: inline-block;
      background: #1976d2;
      color: white;
      padding: 0.5rem 1rem;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.2s ease;
    }
    .doc-link:hover {
      background: #1565c0;
    }
    .status-badge {
      display: inline-block;
      background: #4caf50;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      margin-left: 0.5rem;
    }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Conciergus Chat Documentation</h1>
    <p>Comprehensive documentation for AI-powered chat interfaces</p>
    <span class="status-badge">v0.2.0</span>
  </div>
  
  <div class="docs-grid">
    <div class="doc-card">
      <h3>🔗 API Reference</h3>
      <p>Interactive OpenAPI/Swagger documentation with live testing capabilities</p>
      <a href="./api/index.html" class="doc-link">View API Docs</a>
    </div>
    
    <div class="doc-card">
      <h3>📚 Alternative API Docs</h3>
      <p>Clean, readable API documentation powered by Redoc</p>
      <a href="./api/redoc.html" class="doc-link">View Redoc</a>
    </div>
    
    <div class="doc-card">
      <h3>⚡ Component Library</h3>
      <p>Interactive component documentation and examples</p>
      <a href="./storybook/index.html" class="doc-link">View Storybook</a>
    </div>
    
    <div class="doc-card">
      <h3>📖 TypeScript API</h3>
      <p>Generated TypeScript API documentation with type definitions</p>
      <a href="./api/modules.html" class="doc-link">View TypeDoc</a>
    </div>
    
    <div class="doc-card">
      <h3>🚀 Getting Started</h3>
      <p>Quick start guide and installation instructions</p>
              <a href="https://github.com/Cardow-Co/conciergus.ai#readme" class="doc-link">Read Guide</a>
    </div>
    
    <div class="doc-card">
      <h3>📝 Changelog</h3>
      <p>Version history and release notes</p>
      <a href="./changelog.html" class="doc-link">View Changelog</a>
    </div>
  </div>
  
  <div class="footer">
    <p>Built with ❤️ by the Conciergus team</p>
    <p>
      <a href="https://github.com/Cardow-Co/conciergus.ai" style="color: #1976d2; text-decoration: none;">GitHub</a> |
      <a href="https://github.com/Cardow-Co/conciergus.ai/issues" style="color: #1976d2; text-decoration: none;">Issues</a> |
      <a href="https://conciergus.ai" style="color: #1976d2; text-decoration: none;">Website</a>
    </p>
  </div>
  
  <script>
    // Add some interactive features
    document.addEventListener('DOMContentLoaded', function() {
      // Check if documentation files exist and update links accordingly
      const links = document.querySelectorAll('.doc-link');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href.startsWith('./')) {
          // Check if local file exists (would need server-side check in real implementation)
          link.addEventListener('click', function(e) {
            // Could add analytics or validation here
            console.log('Navigating to:', href);
          });
        }
      });
      
      console.log('Documentation index loaded successfully');
    });
  </script>
</body>
</html>`;
    
    ensureDir(path.dirname(indexPath));
    fs.writeFileSync(indexPath, indexContent);
    log(`Documentation index generated: ${indexPath}`);
  } catch (error) {
    log(`Failed to generate index page: ${error.message}`, 'error');
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  log(`Starting documentation generation (command: ${command})...`);
  
  try {
    switch (command) {
      case 'validate':
        validateOpenAPISpec();
        break;
        
      case 'openapi':
        validateOpenAPISpec();
        convertYamlToJson();
        generateSwaggerUI();
        generateRedocDocs();
        break;
        
      case 'typedoc':
        generateTypeDocs();
        break;
        
      case 'changelog':
        generateChangelogDocs();
        break;
        
      case 'index':
        generateIndexPage();
        break;
        
      case 'all':
      default:
        validateOpenAPISpec();
        convertYamlToJson();
        generateSwaggerUI();
        generateRedocDocs();
        generateTypeDocs();
        generateChangelogDocs();
        generateIndexPage();
        break;
    }
    
    log(`Documentation generation completed successfully! 🎉`);
    
    if (command === 'all') {
      log('');
      log('📚 Documentation URLs:');
      log('  • Main Documentation: docs/index.html');
      log('  • API Reference (Swagger): docs/api/index.html');
      log('  • API Reference (Redoc): docs/api/redoc.html');
      log('  • TypeScript API: docs/api/modules.html');
      log('  • Component Library: docs/storybook/index.html');
      log('  • Changelog: docs/changelog.html');
      log('');
      log('🚀 To serve locally: npx serve docs');
    }
    
  } catch (error) {
    log(`Documentation generation failed: ${error.message}`, 'error');
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
  validateOpenAPISpec,
  convertYamlToJson,
  generateSwaggerUI,
  generateRedocDocs,
  generateTypeDocs,
  generateChangelogDocs,
  generateIndexPage
}; 
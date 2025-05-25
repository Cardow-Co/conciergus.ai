#!/usr/bin/env node

/**
 * Template Generator for Conciergus Chat
 * Creates CodeSandbox and StackBlitz templates
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_CONFIGS = {
  'codesandbox-basic': {
    name: 'Basic Chat Widget - CodeSandbox',
    description: 'Simple React integration with Conciergus Chat',
    platform: 'codesandbox',
    framework: 'react'
  },
  'stackblitz-nextjs': {
    name: 'Next.js Integration - StackBlitz', 
    description: 'Next.js App Router with Conciergus Chat',
    platform: 'stackblitz',
    framework: 'nextjs'
  }
};

function generateTemplateLinks() {
  console.log('🔗 Generating template links...\n');
  
  const links = {
    codesandbox: {
      basic: 'https://codesandbox.io/p/github/conciergus/chat/main/templates/codesandbox/basic-chat',
      nextjs: 'https://codesandbox.io/p/github/conciergus/chat/main/templates/codesandbox/nextjs-integration'
    },
    stackblitz: {
      nextjs: 'https://stackblitz.com/github/conciergus/chat/tree/main/templates/stackblitz/nextjs-chat',
      vite: 'https://stackblitz.com/github/conciergus/chat/tree/main/templates/stackblitz/vite-react'
    }
  };
  
  console.log('📦 CodeSandbox Templates:');
  console.log(`   Basic Chat: ${links.codesandbox.basic}`);
  console.log(`   Next.js:    ${links.codesandbox.nextjs}`);
  
  console.log('\n⚡ StackBlitz Templates:');
  console.log(`   Next.js: ${links.stackblitz.nextjs}`);
  console.log(`   Vite:    ${links.stackblitz.vite}`);
  
  return links;
}

function generateTemplateReadme() {
  const content = `# Online Templates

Quick-start templates for experimenting with Conciergus Chat in online development environments.

## 🚀 CodeSandbox Templates

Perfect for quick prototyping and sharing:

### Basic React Integration
[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/github/conciergus/chat/main/templates/codesandbox/basic-chat)

Simple React application with Conciergus Chat widget integration.

### Next.js App Router
[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/github/conciergus/chat/main/templates/codesandbox/nextjs-integration)

Next.js 15+ App Router with server-side integration.

## ⚡ StackBlitz Templates

Instant development with WebContainers:

### Next.js Integration
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/conciergus/chat/tree/main/templates/stackblitz/nextjs-chat)

Full Next.js environment with TypeScript and Tailwind CSS.

### Vite + React
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/conciergus/chat/tree/main/templates/stackblitz/vite-react)

Fast Vite development with React and TypeScript.

## 🔑 Setup Instructions

1. **Click any template link above** to open in the online editor
2. **Add your API key** to the environment variables
3. **Start experimenting** with the chat widget
4. **Customize** as needed for your use case

### Environment Variables

Add these to your online environment:

\`\`\`
REACT_APP_ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key_here
\`\`\`

Get API keys from:
- [Anthropic Console](https://console.anthropic.com)
- [OpenAI Platform](https://platform.openai.com)

## 📋 What's Included

All templates include:
- ✅ TypeScript support with full type safety
- ✅ Modern React patterns and hooks
- ✅ Responsive design for mobile and desktop
- ✅ Environment variable configuration
- ✅ Error handling and loading states
- ✅ Professional UI with modern styling

## 🛠️ Local Development

Prefer local development? Check out our [examples](../examples/) directory for complete project setups.
`;

  const templateDir = path.join(__dirname, '..', 'templates');
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(templateDir, 'README.md'), content);
  console.log('✅ Generated templates/README.md');
}

function validateTemplates() {
  console.log('🔍 Validating template files...\n');
  
  const templates = [
    'templates/codesandbox/basic-chat',
    'templates/stackblitz/nextjs-chat'
  ];
  
  for (const template of templates) {
    const templatePath = path.join(__dirname, '..', template);
    console.log(`Checking ${template}:`);
    
    const requiredFiles = [
      'package.json',
      'README.md'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(templatePath, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ ${file} (missing)`);
      }
    }
    console.log('');
  }
}

// CLI Interface
if (require.main === module) {
  const command = process.argv[2] || 'help';
  
  switch (command) {
    case 'links':
      generateTemplateLinks();
      break;
      
    case 'readme':
      generateTemplateReadme();
      break;
      
    case 'validate':
      validateTemplates();
      break;
      
    case 'all':
      generateTemplateLinks();
      generateTemplateReadme();
      validateTemplates();
      break;
      
    default:
      console.log(`
Conciergus Chat Template Generator

Usage:
  node scripts/template-generator.js <command>

Commands:
  links     Show template links
  readme    Generate templates README
  validate  Check template files
  all       Run all commands
  help      Show this help

Examples:
  node scripts/template-generator.js all
  node scripts/template-generator.js links
      `);
  }
} 
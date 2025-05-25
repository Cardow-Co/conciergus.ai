#!/usr/bin/env node

/**
 * Roadmap Tracker - Conciergus Chat
 * 
 * Utility script to track roadmap progress and generate reports
 */

const fs = require('fs');
const path = require('path');

class RoadmapTracker {
  constructor() {
    this.roadmapPath = path.join(__dirname, '..', 'ROADMAP.md');
    this.phases = {
      'Phase 1': { name: 'Market Expansion', target: 'Q1 2025' },
      'Phase 2': { name: 'Enterprise Platform', target: 'Q2 2025' },
      'Phase 3': { name: 'Platform Ecosystem', target: 'Q3 2025' },
      'Phase 4': { name: 'Advanced AI Platform', target: 'Q4 2025' }
    };
  }

  /**
   * Parse the roadmap markdown file
   */
  parseRoadmap() {
    if (!fs.existsSync(this.roadmapPath)) {
      console.error('❌ ROADMAP.md not found');
      process.exit(1);
    }

    const content = fs.readFileSync(this.roadmapPath, 'utf8');
    const lines = content.split('\n');
    
    const items = [];
    let currentPhase = null;
    let currentSection = null;
    
    for (const line of lines) {
      // Phase detection
      const phaseMatch = line.match(/### \*\*(Phase \d+):/);
      if (phaseMatch) {
        currentPhase = phaseMatch[1];
        continue;
      }
      
      // Section detection
      const sectionMatch = line.match(/#### \*\*(P\d+\.\d+): (.+)\*\*/);
      if (sectionMatch) {
        currentSection = {
          id: sectionMatch[1],
          name: sectionMatch[2],
          phase: currentPhase
        };
        continue;
      }
      
      // Task detection
      const taskMatch = line.match(/- \[([ x])\] \*\*(.+?)\*\*/);
      if (taskMatch && currentPhase && currentSection) {
        const completed = taskMatch[1] === 'x';
        const name = taskMatch[2];
        
        items.push({
          phase: currentPhase,
          section: currentSection,
          name: name,
          completed: completed
        });
      }
    }
    
    return items;
  }

  /**
   * Generate progress report
   */
  generateReport() {
    console.log('🗺️  **ROADMAP PROGRESS REPORT**\n');
    
    const items = this.parseRoadmap();
    const phases = {};
    
    // Group by phase
    for (const item of items) {
      if (!phases[item.phase]) {
        phases[item.phase] = {
          name: this.phases[item.phase]?.name || 'Unknown',
          target: this.phases[item.phase]?.target || 'TBD',
          sections: {},
          total: 0,
          completed: 0
        };
      }
      
      const section = item.section.id;
      if (!phases[item.phase].sections[section]) {
        phases[item.phase].sections[section] = {
          name: item.section.name,
          total: 0,
          completed: 0,
          items: []
        };
      }
      
      phases[item.phase].sections[section].items.push(item);
      phases[item.phase].sections[section].total++;
      phases[item.phase].total++;
      
      if (item.completed) {
        phases[item.phase].sections[section].completed++;
        phases[item.phase].completed++;
      }
    }
    
    // Display report
    for (const [phaseKey, phase] of Object.entries(phases)) {
      const phaseProgress = phase.total > 0 ? (phase.completed / phase.total * 100).toFixed(1) : 0;
      const progressBar = this.generateProgressBar(parseFloat(phaseProgress));
      
      console.log(`## ${phaseKey}: ${phase.name} (${phase.target})`);
      console.log(`📊 Progress: ${phase.completed}/${phase.total} (${phaseProgress}%) ${progressBar}\n`);
      
      for (const [sectionKey, section] of Object.entries(phase.sections)) {
        const sectionProgress = section.total > 0 ? (section.completed / section.total * 100).toFixed(1) : 0;
        const sectionBar = this.generateProgressBar(parseFloat(sectionProgress), 20);
        
        console.log(`   ${sectionKey}: ${section.name}`);
        console.log(`   ${section.completed}/${section.total} (${sectionProgress}%) ${sectionBar}`);
        console.log();
      }
    }
    
    // Overall summary
    const totalItems = items.length;
    const completedItems = items.filter(item => item.completed).length;
    const overallProgress = totalItems > 0 ? (completedItems / totalItems * 100).toFixed(1) : 0;
    const overallBar = this.generateProgressBar(parseFloat(overallProgress), 40);
    
    console.log('---\n');
    console.log(`🎯 **OVERALL PROGRESS**: ${completedItems}/${totalItems} (${overallProgress}%)`);
    console.log(`${overallBar}\n`);
  }

  /**
   * Generate a visual progress bar
   */
  generateProgressBar(percentage, width = 30) {
    const filled = Math.round(percentage / 100 * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Show next actions
   */
  showNextActions() {
    console.log('📋 **RECOMMENDED NEXT ACTIONS**\n');
    
    const items = this.parseRoadmap();
    const incomplete = items.filter(item => !item.completed);
    
    // Group by effort level (would need to parse this from roadmap)
    console.log('🚀 **Quick Wins** (Consider prioritizing):');
    console.log('   • CLI Tool - Immediate developer experience improvement');
    console.log('   • Vue.js Package - Expand market reach quickly');
    console.log('   • PWA Manifest - App-like experience with minimal effort');
    console.log('   • Document Processing - High-value feature addition\n');
    
    console.log('🎯 **Strategic Items** (High impact):');
    console.log('   • SSO Integration - Enterprise requirement');
    console.log('   • Multi-Modal Vision - Competitive differentiation');
    console.log('   • Advanced Analytics - Business value creation');
    console.log('   • Vector Database Integration - AI capability enhancement\n');
    
    console.log(`📈 Total remaining items: ${incomplete.length}`);
  }

  /**
   * Validate roadmap format
   */
  validateRoadmap() {
    console.log('🔍 **ROADMAP VALIDATION**\n');
    
    try {
      const items = this.parseRoadmap();
      console.log(`✅ Roadmap parsed successfully`);
      console.log(`📊 Found ${items.length} trackable items`);
      
      // Check for missing phases
      const foundPhases = new Set(items.map(item => item.phase));
      const expectedPhases = Object.keys(this.phases);
      
      for (const phase of expectedPhases) {
        if (foundPhases.has(phase)) {
          console.log(`✅ ${phase} found`);
        } else {
          console.log(`⚠️  ${phase} not found`);
        }
      }
      
      console.log('\n✅ Roadmap validation complete!');
      
    } catch (error) {
      console.error('❌ Roadmap validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create GitHub issues for roadmap items
   */
  generateGitHubIssues() {
    console.log('📝 **GITHUB ISSUE TEMPLATES**\n');
    
    const items = this.parseRoadmap();
    const incomplete = items.filter(item => !item.completed);
    
    console.log(`Found ${incomplete.length} items that could become GitHub issues.\n`);
    console.log('To create issues, use the roadmap-feature.md template:');
    console.log('https://github.com/your-org/conciergus.ai/issues/new?template=roadmap-feature.md\n');
    
    console.log('Suggested issue titles:');
    incomplete.slice(0, 10).forEach((item, index) => {
      const phaseNum = item.phase.replace('Phase ', '');
      console.log(`${index + 1}. [ROADMAP] [P${phaseNum}] ${item.name}`);
    });
    
    if (incomplete.length > 10) {
      console.log(`... and ${incomplete.length - 10} more items`);
    }
  }
}

// CLI Interface
function main() {
  const tracker = new RoadmapTracker();
  const command = process.argv[2] || 'report';
  
  switch (command) {
    case 'report':
    case 'progress':
      tracker.generateReport();
      break;
      
    case 'next':
    case 'actions':
      tracker.showNextActions();
      break;
      
    case 'validate':
      tracker.validateRoadmap();
      break;
      
    case 'issues':
    case 'github':
      tracker.generateGitHubIssues();
      break;
      
    case 'help':
      console.log('🗺️  Roadmap Tracker - Conciergus Chat\n');
      console.log('Usage: node scripts/roadmap-tracker.js [command]\n');
      console.log('Commands:');
      console.log('  report     Show progress report (default)');
      console.log('  next       Show recommended next actions');
      console.log('  validate   Validate roadmap format');
      console.log('  issues     Generate GitHub issue suggestions');
      console.log('  help       Show this help message');
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "node scripts/roadmap-tracker.js help" for usage information');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RoadmapTracker; 
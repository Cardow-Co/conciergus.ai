
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
        `<div class="search-result" onclick="navigateTo('${result.path}')">
          <strong>${result.title}</strong>
          <p>${result.description}</p>
          ${result.category ? `<span class="category">${result.category}</span>` : ''}
        </div>`
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

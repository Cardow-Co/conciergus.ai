// Mock for aria-query to resolve ES module issues in Jest
// Provide basic role mappings that @testing-library/dom needs

const roleElementMap = new Map([
  ['alert', new Set(['div'])],
  ['region', new Set(['div', 'section'])],
  ['button', new Set(['button'])],
  ['textbox', new Set(['input', 'textarea'])],
  ['heading', new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])],
  ['link', new Set(['a'])],
  ['list', new Set(['ul', 'ol'])],
  ['listitem', new Set(['li'])],
  ['main', new Set(['main'])],
  ['navigation', new Set(['nav'])],
  ['banner', new Set(['header'])],
  ['contentinfo', new Set(['footer'])],
  ['complementary', new Set(['aside'])],
  ['form', new Set(['form'])],
  ['search', new Set(['search'])],
  ['article', new Set(['article'])],
  ['section', new Set(['section'])],
  ['img', new Set(['img'])],
  ['figure', new Set(['figure'])],
  ['table', new Set(['table'])],
  ['row', new Set(['tr'])],
  ['cell', new Set(['td', 'th'])],
  ['columnheader', new Set(['th'])],
  ['rowheader', new Set(['th'])],
]);

const elementRoleMap = new Map();
for (const [role, elements] of roleElementMap) {
  for (const element of elements) {
    if (!elementRoleMap.has(element)) {
      elementRoleMap.set(element, new Set());
    }
    elementRoleMap.get(element).add(role);
  }
}

const roles = new Map([
  ['alert', { 
    baseConcepts: [],
    relatedConcepts: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section', 'status']]
  }],
  ['region', {
    baseConcepts: [],
    relatedConcepts: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'structure', 'section']]
  }],
  ['button', {
    baseConcepts: [],
    relatedConcepts: [],
    requiredContextRole: [],
    requiredOwnedElements: [],
    requiredProps: {},
    superClass: [['roletype', 'widget', 'command']]
  }],
]);

module.exports = {
  elementRoleMap,
  roleElementMap,
  roles,
  elementRoles: elementRoleMap,
}; 
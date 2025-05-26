import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  features: {
    buildStoriesJson: true,
  },
  env: (config) => ({
    ...config,
    STORYBOOK_MODE: 'true',
  }),
  viteFinal: async (config) => {
    // Fix for Rollup import resolution issue with Storybook entry points
    if (config.build?.rollupOptions) {
      config.build.rollupOptions.external = [
        ...(Array.isArray(config.build.rollupOptions.external) 
          ? config.build.rollupOptions.external 
          : config.build.rollupOptions.external 
            ? [config.build.rollupOptions.external] 
            : []
        ),
        // Remove the problematic entry-preview.mjs from external to let Rollup handle it internally
      ];
      
      // Ensure Rollup can resolve Storybook internal modules
      config.build.rollupOptions.onwarn = (warning, warn) => {
        // Suppress the specific warning about entry-preview.mjs
        if (warning.code === 'UNRESOLVED_IMPORT' && 
            warning.source?.includes('@storybook/react/dist/entry-preview.mjs')) {
          return;
        }
        warn(warning);
      };
    }

    return config;
  },
};

export default config; 
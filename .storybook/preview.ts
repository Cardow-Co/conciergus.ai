import type { Preview } from '@storybook/react';
import { themes } from '@storybook/theming';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      theme: themes.light,
      toc: {
        contentsSelector: '.sbdocs-content',
        headingSelector: 'h1, h2, h3',
        ignoreSelector: '#storybook-docs',
        title: 'Table of Contents',
        disable: false,
        unsafeTocbotOptions: {
          orderedList: false,
        },
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#333333',
        },
        {
          name: 'gradient',
          value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile1: {
          name: 'Mobile (320px)',
          styles: {
            width: '320px',
            height: '568px',
          },
        },
        mobile2: {
          name: 'Mobile (414px)',
          styles: {
            width: '414px',
            height: '896px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1200px',
            height: '900px',
          },
        },
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'es', title: 'Español' },
          { value: 'fr', title: 'Français' },
          { value: 'de', title: 'Deutsch' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme;
      
      return (
        <div 
          className={`storybook-wrapper ${theme}`}
          style={{
            padding: '1rem',
            backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
            color: theme === 'dark' ? '#ffffff' : '#000000',
            minHeight: '100vh',
          }}
        >
          <Story />
        </div>
      );
    },
  ],
  tags: ['autodocs'],
};

export default preview; 
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  
  const createMotionComponent = (tag: string) => 
    React.forwardRef(({ children, ...props }: any, ref: any) => {
      // Remove motion-specific props to avoid React warnings
      const {
        animate,
        initial,
        exit,
        transition,
        whileHover,
        whileTap,
        whileInView,
        whileFocus,
        whileDrag,
        layoutId,
        layout,
        onAnimationComplete,
        onAnimationStart,
        drag,
        dragConstraints,
        ...domProps
      } = props;
      
      return React.createElement(tag, { ref, ...domProps }, children);
    });
  
  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      button: createMotionComponent('button'),
      a: createMotionComponent('a'),
      img: createMotionComponent('img'),
      p: createMotionComponent('p'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      ul: createMotionComponent('ul'),
      li: createMotionComponent('li'),
      form: createMotionComponent('form'),
      input: createMotionComponent('input'),
      label: createMotionComponent('label'),
      section: createMotionComponent('section'),
      article: createMotionComponent('article'),
      nav: createMotionComponent('nav'),
      header: createMotionComponent('header'),
      footer: createMotionComponent('footer'),
      main: createMotionComponent('main'),
      aside: createMotionComponent('aside')
    },
    AnimatePresence: ({ children }: any) => children
  };
});

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  action: {
    setIcon: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
    },
  },
  sidePanel: {
    open: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress specific console methods in tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

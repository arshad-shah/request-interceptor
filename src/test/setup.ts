import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const React = await import('react');

  const createMotionComponent = (tag: string) =>
    React.forwardRef<Element, Record<string, unknown> & { children?: React.ReactNode }>(({ children, ...props }, ref) => {
      // Remove motion-specific props to avoid React warnings
      const {
        animate: _animate,
        initial: _initial,
        exit: _exit,
        transition: _transition,
        whileHover: _whileHover,
        whileTap: _whileTap,
        whileInView: _whileInView,
        whileFocus: _whileFocus,
        whileDrag: _whileDrag,
        layoutId: _layoutId,
        layout: _layout,
        onAnimationComplete: _onAnimationComplete,
        onAnimationStart: _onAnimationStart,
        drag: _drag,
        dragConstraints: _dragConstraints,
        ...domProps
      } = props;
      
      return React.createElement(tag, { ref, ...domProps } as React.Attributes, children as React.ReactNode);
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
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children
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

// @ts-expect-error -- mockChrome is a partial implementation for testing
globalThis.chrome = mockChrome;

// Mock console methods for cleaner test output
globalThis.console = {
  ...console,
  // Uncomment to suppress specific console methods in tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

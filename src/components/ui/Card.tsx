import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ children, className, hover = false }) => {
  return (
    <div className={cn(
      'ds-panel',
      hover && 'hover:border-[var(--border-default)] transition-colors',
      className
    )}>
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('ds-panel-header', className)}>
    {children}
  </div>
);

const CardBody: React.FC<CardBodyProps> = ({ children, className }) => (
  <div className={cn('ds-panel-body', className)}>
    {children}
  </div>
);

const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn(
    'flex items-center justify-end gap-2 px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]',
    className
  )}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;

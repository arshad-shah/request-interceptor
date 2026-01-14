import React from 'react';
import { motion } from 'framer-motion';
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
} = ({ children, className, hover = true }) => {
  return (
    <motion.div
      className={cn(
        "bg-ds-bg-elevated border border-ds-border-subtle rounded-ds-lg shadow-ds-sm overflow-hidden",
        "relative z-10",
        className
      )}
      whileHover={hover ? {
        y: -2,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
        borderColor: "#3f3f46"
      } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-ds-accent-indigo/[0.02] via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn(
    "px-6 py-4 border-b border-ds-border-subtle bg-ds-bg-surface/50",
    "flex items-center justify-between",
    "font-semibold text-ds-text-primary",
    className
  )}>
    {children}
  </div>
);

const CardBody: React.FC<CardBodyProps> = ({ children, className }) => (
  <div className={cn("px-6 py-4", className)}>
    {children}
  </div>
);

const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn(
    "px-6 py-4 border-t border-ds-border-subtle bg-ds-bg-surface/50",
    "flex items-center justify-end gap-3",
    className
  )}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;

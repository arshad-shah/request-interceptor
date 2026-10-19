import React, { useId, useMemo } from 'react';
import { brandSvg } from '@/brand/mark';

interface BrandMarkProps {
  size?: number;
  className?: string;
  title?: string;
  /** Greyed-out variant, as shown on the toolbar while interception is off. */
  disabled?: boolean;
}

/** The extension mark, rendered from the single brand source (`src/brand/mark.ts`). */
const BrandMark: React.FC<BrandMarkProps> = ({ size = 32, className, title = 'Request Interceptor', disabled = false }) => {
  // Unique gradient ids so several marks can share a document
  const idPrefix = `bm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svg = useMemo(
    () => brandSvg({ idPrefix, disabled, title }).replace('<svg ', `<svg width="${size}" height="${size}" `),
    [idPrefix, disabled, title, size]
  );
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size, lineHeight: 0 }}
      // Static, trusted markup generated from src/brand/mark.ts
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default BrandMark;

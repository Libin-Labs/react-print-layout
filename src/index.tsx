import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

export type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal';
export type PageOrientation = 'portrait' | 'landscape';
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageDimensions {
  width: number;
  height: number;
}

export function getPageDimensions(
  size: PaperSize = 'A4',
  orientation: PageOrientation = 'portrait',
): PageDimensions {
  const sizes: Record<PaperSize, PageDimensions> = {
    A4: { width: 210, height: 297 },
    A5: { width: 148, height: 210 },
    Letter: { width: 215.9, height: 279.4 },
    Legal: { width: 215.9, height: 355.6 },
  };
  if (
    !Object.prototype.hasOwnProperty.call(sizes, size) ||
    !['portrait', 'landscape'].includes(orientation)
  ) {
    throw new RangeError('Unsupported paper size or orientation.');
  }
  const dimensions = sizes[size];
  return orientation === 'portrait'
    ? { ...dimensions }
    : { width: dimensions.height, height: dimensions.width };
}

export function normalizeMargins(margins: number | Partial<PageMargins> = 16): PageMargins {
  const value =
    typeof margins === 'number'
      ? { top: margins, right: margins, bottom: margins, left: margins }
      : {
          top: margins.top ?? 16,
          right: margins.right ?? 16,
          bottom: margins.bottom ?? 16,
          left: margins.left ?? 16,
        };
  if (!Object.values(value).every((number) => Number.isFinite(number) && number >= 0)) {
    throw new RangeError('Page margins must be finite, nonnegative millimeters.');
  }
  return value;
}

/** Opens the browser print dialog for the entire current document. */
export function printDocument(target?: Pick<Window, 'print'>): void {
  const view = target ?? (typeof window === 'undefined' ? undefined : window);
  if (!view || typeof view.print !== 'function')
    throw new Error('Printing requires a browser window.');
  view.print();
}

export interface PrintLayoutProps {
  children: ReactNode;
  size?: PaperSize;
  orientation?: PageOrientation;
  margins?: number | Partial<PageMargins>;
  preview?: boolean;
  className?: string;
  style?: CSSProperties;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

export function PrintLayout({
  children,
  size = 'A4',
  orientation = 'portrait',
  margins = 16,
  preview = true,
  className = '',
  style,
  onBeforePrint,
  onAfterPrint,
}: PrintLayoutProps) {
  const dimensions = getPageDimensions(size, orientation);
  const padding = normalizeMargins(margins);
  if (
    padding.left + padding.right >= dimensions.width ||
    padding.top + padding.bottom >= dimensions.height
  ) {
    throw new RangeError('Margins must leave a positive page content area.');
  }
  const root = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onBeforePrint, onAfterPrint });
  callbacks.current = { onBeforePrint, onAfterPrint };
  useEffect(() => {
    const view = root.current?.ownerDocument.defaultView;
    if (!view) return;
    const before = () => callbacks.current.onBeforePrint?.();
    const after = () => callbacks.current.onAfterPrint?.();
    view.addEventListener('beforeprint', before);
    view.addEventListener('afterprint', after);
    return () => {
      view.removeEventListener('beforeprint', before);
      view.removeEventListener('afterprint', after);
    };
  }, []);
  const variables = {
    '--print-width': `${dimensions.width}mm`,
    '--print-height': `${dimensions.height}mm`,
    '--print-top': `${padding.top}mm`,
    '--print-right': `${padding.right}mm`,
    '--print-bottom': `${padding.bottom}mm`,
    '--print-left': `${padding.left}mm`,
    ...style,
  } as CSSProperties;
  return (
    <div
      ref={root}
      className={`lp-print-layout ${preview ? 'lp-print-preview' : ''} ${className}`}
      style={variables}
    >
      <style>{`@media print { @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 0; } }`}</style>
      {children}
    </div>
  );
}

export interface PrintPageProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function PrintPage({
  children,
  header,
  footer,
  label = 'Print page',
  className = '',
  style,
}: PrintPageProps) {
  return (
    <section className={`lp-print-page ${className}`} aria-label={label} style={style}>
      {header !== undefined && <header className="lp-print-header">{header}</header>}
      <div className="lp-print-content">{children}</div>
      {footer !== undefined && <footer className="lp-print-footer">{footer}</footer>}
    </section>
  );
}

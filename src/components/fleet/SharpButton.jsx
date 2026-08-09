/**
 * Shared button for the public "Sharp" catalog page.
 * variant: 'dark' | 'accent' | 'whatsapp' | 'outline'
 * size:    'sm' | 'md' | 'lg'
 * Renders as <a> when `href` is passed, otherwise <button>.
 */
export default function SharpButton({
  as,
  href,
  variant = 'dark',
  size = 'md',
  block = false,
  icon,
  iconTrailing,
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'sharp-btn',
    `sharp-btn--${variant}`,
    size === 'sm' ? 'sharp-btn--sm' : size === 'lg' ? 'sharp-btn--lg' : '',
    block ? 'sharp-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {icon && <i className={icon}></i>}
      <span>{children}</span>
      {iconTrailing && <i className={iconTrailing}></i>}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}

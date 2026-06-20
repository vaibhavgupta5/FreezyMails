import { Snowflake } from 'lucide-react'
import Link from 'next/link'

interface LogoProps {
  className?: string
  iconSize?: number
  textSize?: string
  textColor?: string
  highlightColor?: string
  href?: string
  showText?: boolean
  showIcon?: boolean
  onClick?: () => void
}

export function Logo({
  className = '',
  iconSize = 32,
  textSize = 'text-2xl',
  textColor = 'text-text-primary',
  highlightColor = 'text-primary-base',
  href,
  showText = true,
  showIcon = true,
  onClick
}: LogoProps) {
  const content = (
    <div className={`flex items-center gap-2 ${className}`} onClick={onClick}>
      {showIcon && <Snowflake className="text-primary-base shrink-0" size={iconSize} />}
      {showText && (
        <span className={`${textSize} font-display font-medium ${textColor} truncate`}>
          freezy<span className={`font-bold ${highlightColor}`}>Mails</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

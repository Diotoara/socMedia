import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  className = '', 
  size = 'medium', 
  gradient = false,
  hover = true,
  onClick,
  ...props 
}) => {
  const sizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  };

  const baseClasses = `
    bg-white rounded-2xl shadow-lg border border-gray-100
    ${sizeClasses[size]}
    ${gradient ? 'bg-gradient-to-br from-white to-gray-50' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  const hoverAnimation = hover ? {
    whileHover: { y: -5, scale: 1.02, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    whileTap: { scale: 0.98 }
  } : {};

  return (
    <motion.div
      className={baseClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      {...hoverAnimation}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;

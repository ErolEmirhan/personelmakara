import { useBranch } from '../../context/BranchContext';

export function ScreenTransition({ screenKey, children, className = '' }) {
  return (
    <div key={screenKey} className={`animate-screen-enter ${className}`}>
      {children}
    </div>
  );
}

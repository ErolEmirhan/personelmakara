import { useBranch } from '../../context/BranchContext';

export function BranchSurface() {
  const { theme } = useBranch();
  const accent = theme.accentSolid;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.surfaceGradient}`} />
      <div
        className="absolute -top-28 -right-20 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-[0.32]"
        style={{ background: `radial-gradient(circle, ${accent}35 0%, transparent 70%)` }}
      />
      <div
        className="absolute top-[38%] -left-24 w-72 h-72 rounded-full blur-3xl opacity-[0.18]"
        style={{ background: `radial-gradient(circle, ${accent}28 0%, transparent 68%)` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.55),transparent_55%)]" />
    </div>
  );
}

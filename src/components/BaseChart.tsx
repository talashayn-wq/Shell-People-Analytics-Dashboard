import { useEffect, useRef } from 'react';
import Chart, { type ChartConfiguration, type ChartType } from 'chart.js/auto';

interface BaseChartProps<TType extends ChartType = ChartType> {
  config: ChartConfiguration<TType>;
  isDark: boolean;
  ariaLabel: string;
}

export function getChartThemeTokens(isDark: boolean) {
  return {
    textPrimary: isDark ? '#F4F4F2' : '#111214',
    textMuted: isDark ? '#9CA3AF' : '#52525B',
    gridLine: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(17, 18, 20, 0.07)',
    surfaceTooltip: isDark ? '#1E2126' : '#111214',
    tooltipBorder: isDark ? '#32363F' : '#27272A',
    yellow: '#FFC800',
    orange: '#F58220',
    charcoal: isDark ? '#E4E4E7' : '#18181B',
    slateBar: isDark ? '#3F4450' : '#D4D4D8',
    crimson: '#DC2626',
    emerald: '#16A34A',
  };
}

export function BaseChart<TType extends ChartType = ChartType>({
  config,
  isDark,
  ariaLabel,
}: BaseChartProps<TType>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const tokens = getChartThemeTokens(isDark);
    Chart.defaults.font.family = '"Plus Jakarta Sans", sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = tokens.textMuted;

    chartInstanceRef.current = new Chart(canvas, config as ChartConfiguration);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config, isDark]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
    </div>
  );
}

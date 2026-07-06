import type { CandleGeometry, ChartCandleTheme } from "@/utils/chartOhlc";

type ChartCandleSvgProps = {
  candles: CandleGeometry[];
  theme: ChartCandleTheme;
};

export function ChartCandleSvg({ candles, theme }: ChartCandleSvgProps) {
  return (
    <>
      {candles.map((candle) => {
        const style = candle.bullish ? theme.bull : theme.bear;
        const wickTop = Math.min(candle.wickY1, candle.wickY2);
        const wickBottom = Math.max(candle.wickY1, candle.wickY2);

        return (
          <g key={candle.key}>
            <line
              x1={candle.wickX}
              y1={wickTop}
              x2={candle.wickX}
              y2={wickBottom}
              stroke={style.wick}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              opacity={0.85}
            />
            <rect
              x={candle.bodyX}
              y={candle.bodyY}
              width={candle.bodyW}
              height={candle.bodyH}
              fill={style.fill}
              fillOpacity={style.fillOpacity}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </>
  );
}

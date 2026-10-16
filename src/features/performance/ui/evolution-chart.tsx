import { Link } from 'react-router';
import { formatAccuracy, formatDate } from '../../../shared/lib/date';
import type { EvolutionPoint } from '../domain/performance';

export function EvolutionChart({ points }: { points: EvolutionPoint[] }) {
  const shown = points.slice(-12);
  if (!shown.length)
    return (
      <div className="chart-empty">
        <div className="chart-empty-lines" />
        <p>Seu progresso começa no primeiro simulado.</p>
        <small>Finalize uma prova para acompanhar a evolução.</small>
      </div>
    );
  const width = 620,
    height = 190,
    left = 38,
    right = 15,
    top = 15,
    bottom = 20;
  const x = (index: number) =>
    shown.length === 1 ? width / 2 : left + (index * (width - left - right)) / (shown.length - 1);
  const y = (accuracy: number) => top + ((100 - accuracy) * (height - top - bottom)) / 100;
  const path = shown
    .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.accuracy)}`)
    .join(' ');
  const first = shown[0]!,
    last = shown.at(-1)!;
  return (
    <div className="evolution-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Evolução nos últimos ${shown.length} simulados. Primeiro: ${formatAccuracy(first.accuracy)}. Mais recente: ${formatAccuracy(last.accuracy)}.`}
      >
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1={left}
              y1={y(value)}
              x2={width - right}
              y2={y(value)}
              stroke="#e9ecf4"
              strokeDasharray="4 5"
            />
            <text x={0} y={y(value) + 4} fontSize="10" fill="#788199">
              {value}%
            </text>
          </g>
        ))}
        <path
          d={`${path} L${x(shown.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
          fill="#3a4df5"
          fillOpacity="0.06"
        />
        <path
          d={path}
          fill="none"
          stroke="#3a4df5"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {shown.map((point, index) => (
          <circle
            key={point.mockExamId}
            cx={x(index)}
            cy={y(point.accuracy)}
            r="4.5"
            fill="white"
            stroke="#3a4df5"
            strokeWidth="2"
          >
            <title>
              {point.mockExamName}: {formatAccuracy(point.accuracy)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="chart-dates">
        <span>{formatDate(first.finishedAt, true)}</span>
        <span>{formatDate(last.finishedAt, true)}</span>
      </div>
      <details className="chart-table">
        <summary>Ver dados em tabela</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Resultados dos últimos 12 simulados</caption>
            <thead>
              <tr>
                <th>Simulado</th>
                <th>Finalização</th>
                <th>Acertos</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((point) => (
                <tr key={point.mockExamId}>
                  <td>
                    <Link to={`/simulados/${point.mockExamId}/resultado`}>
                      {point.mockExamName}
                    </Link>
                  </td>
                  <td>{formatDate(point.finishedAt)}</td>
                  <td>{formatAccuracy(point.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

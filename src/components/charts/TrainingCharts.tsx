/** Live training charts — loss and accuracy over epochs via Recharts */

import { useStore } from '../../store';
import { STRINGS } from '../../constants';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function TrainingCharts() {
  const { metrics } = useStore();

  if (metrics.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '14px',
      }}>
        <p>Training metrics will appear here during training.</p>
      </div>
    );
  }

  const chartData = metrics.map((m) => ({
    epoch: m.epoch + 1,
    loss: parseFloat(m.loss.toFixed(4)),
    valLoss: parseFloat(m.valLoss.toFixed(4)),
    accuracy: parseFloat(m.accuracy.toFixed(1)),
    valAccuracy: parseFloat(m.valAccuracy.toFixed(1)),
  }));

  const latestMetrics = metrics[metrics.length - 1];

  return (
    <div aria-description="Training progress charts showing loss and accuracy over epochs">
      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {[
          { label: STRINGS.TRAIN_LOSS, value: latestMetrics.loss.toFixed(4), color: '#EA4335' },
          { label: `Val ${STRINGS.TRAIN_LOSS}`, value: latestMetrics.valLoss.toFixed(4), color: '#FF8A80' },
          { label: STRINGS.TRAIN_ACCURACY, value: `${latestMetrics.accuracy.toFixed(1)}%`, color: '#34A853' },
          { label: `Val ${STRINGS.TRAIN_ACCURACY}`, value: `${latestMetrics.valAccuracy.toFixed(1)}%`, color: '#81C995' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ padding: '12px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color, marginTop: '4px' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Loss Chart */}
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>{STRINGS.TRAIN_LOSS}</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="loss"
                name="Training"
                stroke="#1A73E8"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
              <Line
                type="monotone"
                dataKey="valLoss"
                name="Validation"
                stroke="#34A853"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Accuracy Chart */}
        <div className="card" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>{STRINGS.TRAIN_ACCURACY}</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="epoch" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="accuracy"
                name="Training"
                stroke="#1A73E8"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
              <Line
                type="monotone"
                dataKey="valAccuracy"
                name="Validation"
                stroke="#34A853"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function YieldTrendCard({ data }) {
  return (
    <section className="yield-card">
      <h3>Yield Trend</h3>
      <p>Actual vs AI Prediction (tonnes/acre)</p>
      <div className="yield-chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#52B788" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#52B788" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#dceedd" />
            <XAxis dataKey="month" tick={{ fill: "#4A6741", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#4A6741", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip />
            <Area type="monotone" dataKey="actual" stroke="#52B788" fill="url(#yieldFill)" strokeWidth={3} />
            <Line type="monotone" dataKey="predicted" stroke="#95D5B2" strokeDasharray="6 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default YieldTrendCard;

import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

function SoilProfileCard({ data }) {
  return (
    <section className="soil-card">
      <h3>Soil Nutrient Profile</h3>
      <p>Paddy Field A - latest reading</p>
      <div className="soil-card-content">
        <div className="soil-radial">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="26%"
              outerRadius="92%"
              barSize={14}
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={9} background={{ fill: "#edf3ee" }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <ul className="soil-legend">
          {data.map((item) => (
            <li key={item.name}>
              <span className="soil-dot" style={{ background: item.color }} />
              <span>{item.name}</span>
              <strong>{item.value}%</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default SoilProfileCard;

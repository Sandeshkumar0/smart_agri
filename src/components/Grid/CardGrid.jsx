import Card from "../Card/Card";

function CardGrid({ cards, onCardClick }) {
  return (
    <section className="card-grid">
      {cards.slice(0, 5).map((card) => (
        <Card
          key={card.id}
          icon={card.icon}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          onClick={() => onCardClick(card.id)}
        />
      ))}
    </section>
  );
}

export default CardGrid;

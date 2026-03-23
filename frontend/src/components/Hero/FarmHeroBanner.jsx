function FarmHeroBanner({ onExplore }) {
  return (
    <section className="farm-hero-banner">
      <div className="farm-hero-content">
        <h4 className="farm-hero-title">AI advanced agriculture</h4>
        <h6 className="farm-hero-subtitle">AI monitored agriculture technique for rular farmers</h6>
        <p className="farm-hero-text">
          Manage your farmland, monitor weather, detect plant diseases, suggestion from senior or experienced doctor.
        </p>
        <button className="farm-hero-btn" type="button" onClick={onExplore}>
          Explore Features
        </button>
      </div>

      <div className="farm-hero-image-wrap">
        <img
          src="https://media.gettyimages.com/id/1495390170/photo/unrecognizable-male-farmer-touching-his-wheat-crop.jpg?s=612x612&w=0&k=20&c=Jx4ysPbpe0N2Wdb_pBEDLk7GffP20ZujBr39oqbzHNI="
          alt="Farmer touching wheat crop"
        />
      </div>
    </section>
  );
}

export default FarmHeroBanner;

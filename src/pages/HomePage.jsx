import NavBar from "../components/NavBar/NavBar";

function HomePage({
  onStart,
  onNavSelect,
  onLogin,
  isLoggedIn,
}) {
  return (
    <div className="app-bg">
      <div className="app-grid-overlay" />
      <main className="container">
        <NavBar
          active="dashboard"
          onNavSelect={onNavSelect}
          onLogin={onLogin}
          isLoggedIn={isLoggedIn}
          criticalCount={0}
          notificationCount={0}
        />

        <section className="hero">
          <p className="hero-kicker">Field Intelligence MVP</p>
          <h1>Aaj kya karna hai? Seedha decision, no confusion.</h1>
          <ul className="hero-list">
            <li>Aaj ka kaam: 3 simple points with icons</li>
            <li>5 problem cards: Leaf, Mitti, Paani, Mausam, Bazaar</li>
            <li>Red alert + clear action + help support</li>
          </ul>
          <button className="btn btn-primary btn-large" type="button" onClick={onStart}>
            Start Dashboard
          </button>
        </section>
      </main>
    </div>
  );
}

export default HomePage;

import Header from "../components/Header/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <div style={{ textAlign: "center", paddingTop: "3rem" }}>
        <img
          src="/assets/WIP.png"
          alt="Work in Progress"
          style={{ maxWidth: "400px", width: "100%" }}
        />
        <h2 style={{ marginTop: "1rem" }}>¡Página en construcción!</h2>
      </div>
    </>
  );
}

import LayoutBackoffice from "../../components/layouts/LayoutBackoffice";
import HeroSection from "../../components/Home/HeroSection";
import InfoSection from "../../components/Home/InfoSection";
import { useEffect } from "react";

export default function HomePublica() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <LayoutBackoffice>
      <div className="home-container" style={{ background: '#fff' }}>
        <section className="hero-section py-4" style={{ background: '#fff' }}>
          <div className="container-fluid p-0">
            <HeroSection />
          </div>
        </section>

        <section className="py-5" style={{ background: '#fff' }}>
          <div className="container-fluid p-0">
            <InfoSection />
          </div>
        </section>
      </div>
    </LayoutBackoffice>
  );
}

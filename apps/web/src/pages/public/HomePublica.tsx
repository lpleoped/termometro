import LayoutBackoffice from "../../components/layouts/LayoutBackoffice";
import HeroSection from "../../components/Home/HeroSection";
import InfoSection from "../../components/Home/InfoSection";
import SurveyResultPreview from "../../components/Home/SurveyResultPreview";
import IconCallToAction from "../../components/Home/IconCallToAction";
import { useEffect } from "react";

export default function HomePublica() {
  useEffect(() => {
    // Scroll suave al inicio cuando se carga la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <LayoutBackoffice>
      <div className="home-container" style={{ background: '#fff' }}>
        {/* Hero Section minimalista */}
        <section className="hero-section py-4" style={{ background: '#fff' }}>
          <div className="container-fluid p-0">
            <HeroSection />
          </div>
        </section>

        {/* Sección de información y preview */}
        <section className="py-4" style={{ background: '#fff' }}>
          <div className="container-fluid p-0">
            <div className="row align-items-center g-5">
              <div className="col-lg-6" data-aos="fade-right" data-aos-delay="200">
                <InfoSection />
              </div>
              <div className="col-lg-6" data-aos="fade-left" data-aos-delay="400">
                <SurveyResultPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Sección de call to action */}
        <section className="py-4" style={{ background: '#fff' }}>
          <div className="container-fluid p-0">
            <div className="row justify-content-center">
              <div className="col-lg-10" data-aos="zoom-in" data-aos-delay="200">
                <IconCallToAction />
              </div>
            </div>
          </div>
        </section>
      </div>
    </LayoutBackoffice>
  );
}

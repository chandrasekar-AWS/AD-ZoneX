import useReveal from '../hooks/useReveal';
import './ServiceDetails.css';

/**
 * ServiceDetails — the long explanation of a digital service (what we do, why us, how we work, questions).
 * Shown on the Contact page between the service's pictures/video and the enquiry form. Content: data/serviceDetails.js.
 */
export default function ServiceDetails({ details, id }) {
  useReveal([id]);
  if (!details) return null;
  const { offers, why, steps, faq } = details;
  return (
    <div className="sd" aria-label="Service details">
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">{details.offersEyebrow}</span>
            <h2>{details.offersHeading}</h2>
          </div>
          <ul className="sd-offers">
            {offers.map(([Icon, title, tag, text], i) => (
              <li key={title} className="sd-offer reveal" style={{ transitionDelay: `${(i % 2) * 70}ms` }}>
                <span className="sd-offer__icon" aria-hidden="true"><Icon size={24} /></span>
                <div>
                  <h3>{title}</h3>
                  <span className="sd-offer__tag">{tag}</span>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--ink">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">{details.whyEyebrow}</span>
            <h2>{details.whyHeading}</h2>
          </div>
          <ul className="sd-why">
            {why.map(([Icon, title, text], i) => (
              <li key={title} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <Icon size={26} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">{details.stepsEyebrow}</span>
            <h2>{details.stepsHeading}</h2>
          </div>
          <ul className="sd-steps">
            {steps.map(([Icon, title, text], i) => (
              <li key={title} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="sd-steps__icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--white">
        <div className="container sd-faq">
          <div className="section-head reveal">
            <span className="eyebrow">Questions</span>
            <h2>Common questions</h2>
          </div>
          <div className="sd-faq__list">
            {faq.map(([q, a]) => (
              <details key={q} className="reveal">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

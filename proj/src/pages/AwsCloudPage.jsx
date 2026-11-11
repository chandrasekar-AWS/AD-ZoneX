import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cloud, DatabaseBackup, Headset, Phone, Rocket, Search, Server, ShieldCheck, Wrench, Layers, ClipboardList } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import useReveal from '../hooks/useReveal';
import { CONTACT_INFO, contactPath } from '../data/services';
import './AwsCloudPage.css';

const OFFERS = [
  [Cloud, 'Website hosting', 'S3 & CloudFront', 'Your website is stored on Amazon S3 and delivered through CloudFront, so pages open quickly for visitors and your site stays online.'],
  [Server, 'Serverless backends', 'Lambda', 'Contact forms, logins, payments and business logic run as small functions that start only when needed, so you pay for what you use.'],
  [Rocket, 'Cloud setup & migration', 'Move with confidence', 'We set up your AWS account properly and move your existing website, files or app from old hosting with as little downtime as possible.'],
  [DatabaseBackup, 'Backup & monitoring', 'Always watched', 'Regular backups, plus checks on uptime and errors, so problems are caught and fixed early.'],
];
const WHY = [
  [Layers, 'One team for everything', 'The people who design your logo and website also set up the cloud it runs on, so nothing is lost between suppliers.'],
  [ShieldCheck, 'Secure from day one', 'HTTPS, careful access settings and backups are part of every setup, not an extra.'],
  [Headset, 'One point of contact', 'You talk to us, not to a support queue. We look after the setup after launch.'],
];
const STEPS = [
  [Search, 'Understand', 'We learn what your website or app does and who uses it.'],
  [ClipboardList, 'Plan', 'We choose the right AWS setup for your traffic and budget, and send a clear written quote.'],
  [Wrench, 'Build and move', 'We set everything up and move your site, files or app across.'],
  [Headset, 'Look after', 'We monitor it, keep backups and fix issues, so you can focus on your business.'],
];
const FAQ = [
  ['Is AWS right for a small business?', 'Often, yes. A simple website on S3 and CloudFront costs very little to run and loads fast. We will tell you honestly if a simpler option suits you better.'],
  ['Can you move my existing website?', 'Yes. We copy your site and files to AWS, test everything, and switch over with as little downtime as possible.'],
  ['Who looks after it after launch?', 'We do. Monitoring, backups and fixes are handled by the same team that built it. Just call or message us if something needs attention.'],
  ['Do I need to know anything about AWS?', 'No. We explain things in plain language and handle the technical work for you.'],
];

/** /services/aws-cloud-services — a dedicated page. It does not depend on services saved in Admin. */
export default function AwsCloudPage() {
  useEffect(() => { document.title = 'AWS Cloud Services in Coimbatore | AD ZONEX'; }, []);
  useReveal([]);

  return (
    <div className="page aws">
      <SiteHeader activeHref="/service" />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Digital · AWS</span>
            <h1>AWS cloud services for your business</h1>
            <p>
              Reliable, secure cloud hosting and backends on Amazon Web Services for websites, web apps and business tools,
              set up, monitored and looked after by the same team that builds your site.
            </p>
            <div className="aws-hero__btns">
              <Button to={contactPath('aws-cloud-services')} variant="lime">Get a free quote <ArrowRight size={18} aria-hidden="true" /></Button>
              <Button to="/service/digital" variant="outline">All digital services</Button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">What we set up</span>
              <h2>Everything your website needs to run in the cloud</h2>
            </div>
            <ul className="aws-offers">
              {OFFERS.map(([Icon, title, tag, text], i) => (
                <li key={title} className="aws-offer reveal" style={{ transitionDelay: `${(i % 2) * 70}ms` }}>
                  <span className="aws-offer__icon" aria-hidden="true"><Icon size={24} /></span>
                  <div>
                    <h3>{title}</h3>
                    <span className="aws-offer__tag">{tag}</span>
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
              <span className="eyebrow">Why AD ZONEX</span>
              <h2>A technical team that is part of your brand team</h2>
            </div>
            <ul className="aws-why">
              {WHY.map(([Icon, title, text], i) => (
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
              <span className="eyebrow">How we work</span>
              <h2>From first call to a site that looks after itself</h2>
            </div>
            <ul className="aws-steps">
              {STEPS.map(([Icon, title, text], i) => (
                <li key={title} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className="aws-steps__icon" aria-hidden="true"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--white">
          <div className="container aws-faq">
            <div className="section-head reveal">
              <span className="eyebrow">Questions</span>
              <h2>Common questions</h2>
            </div>
            <div className="aws-faq__list">
              {FAQ.map(([q, a]) => (
                <details key={q} className="reveal">
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="aws-cta">
          <div className="container aws-cta__inner">
            <div>
              <h2>Ready to move your business to the cloud?</h2>
              <p>Tell us what you run today. We will advise, quote and handle the setup.</p>
            </div>
            <div className="aws-cta__btns">
              <Button to={contactPath('aws-cloud-services')} variant="primary">Get a free quote</Button>
              <a className="btn btn--outline" href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, '')}`}><Phone size={18} aria-hidden="true" /> {CONTACT_INFO.phone}</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

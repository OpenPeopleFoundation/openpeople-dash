"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import "../../app/(marketing)/landing.css";

const sections = [
  { id: "mission", label: "Mission" },
  { id: "studio", label: "Studio" },
  { id: "whitepaper", label: "White Paper" },
];

export function LandingPage(): ReactElement {
  const [activeSection, setActiveSection] = useState<string>("mission");
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const navLinks = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        href: `#${section.id}`,
      })),
    []
  );

  useEffect(() => {
    document.body.classList.add("landing-page");
    return () => {
      document.body.classList.remove("landing-page");
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
  }, [isDrawerOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? (doc.scrollTop || document.body.scrollTop) / max : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    const revealEls = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionElements = sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".interactive");

    const handleClick = (event: MouseEvent) => {
      const card = event.currentTarget as HTMLElement;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const rect = card.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      card.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    cards.forEach((card) => card.addEventListener("click", handleClick));
    return () => cards.forEach((card) => card.removeEventListener("click", handleClick));
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleNavLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) {
      return;
    }

    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      event.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", `#${id}`);
      setDrawerOpen(false);
    }
  };

  return (
    <>
      <div ref={progressRef} className="progress" aria-hidden="true" />
      <a className="skip" href="#mission">
        Skip to content
      </a>
      <header className="site-header reveal">
        <div className="wrap navwrap">
          <Link className="brand" href="/">
            <Image src="/op-logo.svg" alt="Open People" width={168} height={36} priority />
          </Link>
          <nav className="nav" aria-label="Primary">
            <button
              className="hamburger"
              aria-controls="mobile-nav"
              aria-expanded={isDrawerOpen}
              aria-label="Open menu"
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
            <div id="mobile-nav" className={`drawer ${isDrawerOpen ? "is-open" : ""}`} hidden={!isDrawerOpen}>
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  data-nav
                  className={activeSection === link.id ? "active" : ""}
                  onClick={(event) => handleNavLinkClick(event, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <Link className="btn btn-outline" href="/members" onClick={() => setDrawerOpen(false)}>
                Members
              </Link>
            </div>
            <div className="desk-links">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  data-nav
                  className={activeSection === link.id ? "active" : ""}
                  onClick={(event) => handleNavLinkClick(event, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <Link className="btn btn-outline" href="/members">
                Members
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {isDrawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <main id="main">
        <section className="hero reveal">
          <div className="hero-bg" aria-hidden="true" />
          <div className="wrap">
            <h1 className="title caps">Open People</h1>
            <p className="lead">
              Structure before power. Humanity before machine. Alignment before acceleration.
            </p>
            <div className="cta">
              <Link className="btn" href="/members">
                Members Login
              </Link>
              <a className="link" href="#whitepaper" onClick={(event) => handleNavLinkClick(event, "#whitepaper")}>
                Read the white paper →
              </a>
            </div>
          </div>
        </section>

        <section id="mission" className="panel reveal">
          <div className="wrap grid">
            <div className="card interactive">
              <h2>Mission</h2>
              <p>
                Expand the scope and scale of consciousness; make life multidimensional. We align intention and
                intelligence through ethical feedback.
              </p>
            </div>
            <div className="card interactive">
              <h3>Principles</h3>
              <ul className="bullets">
                <li>
                  <strong>Structure before power</strong> — guardrails first.
                </li>
                <li>
                  <strong>Humanity before machine</strong> — dignity, consent, proof.
                </li>
                <li>
                  <strong>Alignment before acceleration</strong> — ethics &gt; speed.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="studio" className="panel reveal">
          <div className="wrap grid">
            <div className="card interactive">
              <h2>Open People Studio</h2>
              <p>
                Pilot real businesses with aligned AI. Phase I: <em>Align Business</em>. Phase II: <em>Align Individuals</em>.
                Phase III: <em>Align Humanity</em>.
              </p>
            </div>
            <div className="card interactive">
              <h3>Live Testbed — SWL</h3>
              <p>
                Snow White Laundry: operational dashboards, intention-to-action loops, transparent metrics.
              </p>
              <Link className="chip members-chip" href="/members">
                Launch dashboards
              </Link>
            </div>
          </div>
        </section>

        <section id="whitepaper" className="panel reveal">
          <div className="wrap">
            <div className="card interactive">
              <h2>White Paper</h2>
              <p>
                Open People is a public proof of alignment — between humans and the intelligences we create.
              </p>
              <div className="row">
                <a className="btn" href="https://github.com/OpenPeopleFoundation/openpeople.world" rel="noopener noreferrer">
                  View on GitHub
                </a>
                <span className="link" aria-disabled="true">
                  PDF (coming soon)
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer reveal">
        <div className="wrap">
          <small>© Open People • Designed for alignment, not dominance.</small>
        </div>
      </footer>
    </>
  );
}

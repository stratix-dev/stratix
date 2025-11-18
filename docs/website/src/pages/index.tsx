import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div style={{textAlign: 'center'}}>
          <img
            src={useBaseUrl('/img/logo-light.png')}
            alt="Stratix Logo"
            className={styles.heroLogo}
            style={{
              width: '160px',
              height: 'auto',
              maxWidth: '100%',
              marginBottom: '3rem',
              filter: 'drop-shadow(0 20px 25px rgb(0 0 0 / 0.15))'
            }}
          />
          <Heading as="h1" className="hero__title" style={{color: 'white'}}>
            Build scalable, maintainable applications
          </Heading>
          <p className="hero__subtitle" style={{color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.25rem'}}>
            Domain-Driven Design, hexagonal architecture, and CQRS.
            <br/>
            Production-ready from day one with type safety, dependency injection, AI agents as first-class citizens, and enterprise patterns.
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/getting-started/installation"
              style={{marginRight: '1rem'}}>
              Get Started
            </Link>
            <Link
              className="button button--outline button--lg"
              to="/docs/getting-started/quick-start"
              style={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}>
              Quick Start
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresGrid}>
          <div className={styles.feature}>
            <Heading as="h3">Plugin Architecture</Heading>
            <p>
              Extensible plugin system with lifecycle management, dependency resolution, and health checks.
              Swap implementations without changing code.
            </p>
            <Link to="/docs/core-concepts/plugins" className={styles.featureLink}>
              Learn about plugins →
            </Link>
          </div>
          <div className={styles.feature}>
            <Heading as="h3">Bounded Contexts</Heading>
            <p>
              Portable domain modules that work in monoliths or microservices.
              Migrate to microservices without rewriting domain code.
            </p>
            <Link to="/docs/core-concepts/bounded-contexts" className={styles.featureLink}>
              Learn about bounded contexts →
            </Link>
          </div>
          <div className={styles.feature}>
            <Heading as="h3">Domain Modeling</Heading>
            <p>
              Entity, AggregateRoot, ValueObject, and Repository patterns built-in.
              Apply tactical DDD patterns with full type safety.
            </p>
            <Link to="/docs/core-concepts/entities" className={styles.featureLink}>
              Learn about entities →
            </Link>
          </div>
          <div className={styles.feature}>
            <Heading as="h3">Result Pattern</Heading>
            <p>
              Explicit error handling without exceptions.
              Type-safe results make errors visible at compile time.
            </p>
            <Link to="/docs/core-concepts/result-pattern" className={styles.featureLink}>
              Learn about Result →
            </Link>
          </div>
          <div className={styles.feature}>
            <Heading as="h3">CQRS</Heading>
            <p>
              Command and Query Responsibility Segregation with dedicated buses.
              Scale reads and writes independently.
            </p>
            <Link to="/docs/core-concepts/cqrs" className={styles.featureLink}>
              Learn about CQRS →
            </Link>
          </div>
          <div className={styles.feature}>
            <Heading as="h3">AI Agents</Heading>
            <p>
              AI agents as first-class domain entities with budget enforcement, cost tracking, and multi-LLM support.
              Production patterns built-in.
            </p>
            <Link to="/docs/core-concepts/ai-agents" className={styles.featureLink}>
              Learn about AI agents →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Build scalable, maintainable applications with Domain-Driven Design, hexagonal architecture, and CQRS. Production-ready from day one with type safety, dependency injection, AI agents as first-class citizens, and enterprise patterns.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

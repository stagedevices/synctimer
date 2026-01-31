import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  List,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CopyOutlined, DownloadOutlined, MailOutlined } from '@ant-design/icons';

const PRESS_CONTACT = {
  name: 'TODO: Add press contact name',
  email: 'TODO: Add press contact email',
};

const COMPANY_NAME = 'Stage Devices, LLC';

const APP_STORE_URL = '';

const PRESS_DEFINITION =
  'Network-synchronized rehearsal timer + cue sheets for ensembles.';

const pressAssets = __PRESS_ASSET_MANIFEST__;

const copyToClipboard = async (text: string) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  return success;
};

export function Press() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const title = 'SyncTimer Press Kit | SyncTimer';
    const description =
      'Press resources for SyncTimer, the network-synchronized rehearsal timer with cue sheets.';
    const url = 'https://synctimerapp.com/press';

    document.title = title;

    const metaTags = [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { property: 'og:site_name', content: 'SyncTimer' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    const createdNodes: HTMLElement[] = [];

    metaTags.forEach(({ name, property, content }) => {
      const selector = name
        ? `meta[name="${name}"]`
        : `meta[property="${property}"]`;
      let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        if (name) tag.setAttribute('name', name);
        if (property) tag.setAttribute('property', property);
        tag.setAttribute('data-press', 'true');
        document.head.appendChild(tag);
        createdNodes.push(tag);
      }
      tag.setAttribute('content', content);
    });

    let canonical = document.head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('data-press', 'true');
      document.head.appendChild(canonical);
      createdNodes.push(canonical);
    }
    canonical.setAttribute('href', url);

    const ldJson = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SyncTimer',
      description: PRESS_DEFINITION,
      url: 'https://synctimerapp.com',
      applicationCategory: 'MusicApplication',
    };

    let ldScript = document.getElementById('press-ld-json');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'press-ld-json';
      ldScript.setAttribute('type', 'application/ld+json');
      ldScript.setAttribute('data-press', 'true');
      document.head.appendChild(ldScript);
      createdNodes.push(ldScript);
    }
    ldScript.textContent = JSON.stringify(ldJson);

    return () => {
      createdNodes.forEach((node) => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    };
  }, []);

  const factsheetItems = useMemo(
    () =>
      [
        { label: 'Product', value: 'SyncTimer' },
        { label: 'Category', value: 'Music' },
        { label: 'Company', value: COMPANY_NAME },
        { label: 'Website', value: 'synctimerapp.com', copy: 'https://synctimerapp.com' },
        {
          label: 'Press contact',
          value: `${PRESS_CONTACT.name} (${PRESS_CONTACT.email})`,
          copy: `${PRESS_CONTACT.name} <${PRESS_CONTACT.email}>`,
        },
      ].filter((item) => item.value && item.value.length > 0),
    []
  );

  const factsheetCopyAll = useMemo(
    () =>
      factsheetItems
        .map((item) => `${item.label}: ${item.copy ?? item.value}`)
        .join('\n'),
    [factsheetItems]
  );

  const copyBlocks = [
    {
      key: 'tagline',
      label: 'Tagline',
      count: '6 words',
      text: 'The stopwatch that finally nails sync.',
    },
    {
      key: 'desc25',
      label: '25-word description',
      count: '25 words',
      text:
        'SyncTimer keeps ensembles together with network-synced countdowns, cue sheets, and live prompts so every player sees the same moment, without last-minute timing drift on stage.',
    },
    {
      key: 'desc50',
      label: '50-word description',
      count: '50 words',
      text:
        'Built for rehearsals and run-throughs, SyncTimer runs a shared clock across Parent and Children sessions, distributes cue sheets, and delivers live messages, images, and count-ins. Conductors can update timing instantly while the ensemble stays locked. Privacy-first by design, it works without accounts for participants, so everyone rehearses from one timeline.',
    },
    {
      key: 'desc100',
      label: '100-word description',
      count: '100 words',
      text:
        'SyncTimer is a network-synchronized rehearsal timer built for ensembles. Create Parent and Children sessions to keep every device aligned to the same countdown, then pair each time block with cue sheets. During a run-through, leaders can push live prompts, messages, or images so the room turns together. It’s designed for quick setup and clean visuals that read across a stage. SyncTimer keeps focus on music instead of logistics, giving conductors and section leaders a shared clock for starts, cuts, and transitions. Use it for rehearsals, warmups, and performances when precise, synchronized timing matters more than individual stopwatches across the ensemble.',
    },
    {
      key: 'boilerplate',
      label: 'Boilerplate (250–500 words)',
      count: '251 words',
      text:
        'SyncTimer is the rehearsal-first stopwatch built for ensembles who need to start, stop, and transition together. Instead of every player running their own clock, SyncTimer keeps a single network-synchronized countdown across Parent and Children sessions so the whole room sees the same moment. Cue sheets attach to each time block, giving performers a shared map of what happens next.\n\nLeaders can launch a session from one device and invite others to follow as Children. During a run-through, conductors can send live prompts, messages, or images to keep attention aligned on entrances, cuts, and tempo shifts. SyncTimer is designed for quick setup and clear, stage-readable visuals, which keeps rehearsals moving without tech friction.\n\nThe workflow is privacy-first and built for rehearsal speed. Participants can join a session without creating accounts, and sessions focus on timing and cues rather than collecting personal data. SyncTimer fits ensembles, pits, drumlines, choirs, and any group that needs dependable timing without a complex production stack. Because SyncTimer separates timing from audio playback, it pairs well with existing rehearsal tools, paper scores, and stage managers\' cues. It\'s a lightweight layer that keeps everyone aligned without changing how the ensemble already works.\n\nSyncTimer helps directors answer the same question every rehearsal: “Are we all on the same count?” With synced countdowns, cue sheets, and live guidance, teams can rehearse with confidence and reduce the drift that builds when timing is left to individual stopwatches. The result is a tighter run-through, fewer restarts, and more time spent on the music.',
    },
  ];

  const storyAngles = [
    {
      title: 'Keeping the whole ensemble on one count',
      body:
        'SyncTimer replaces scattered stopwatches with a shared, network-synchronized countdown. That means every section sees the same timing, even when rehearsals move fast. It\'s a simple fix for drift that builds when players run their own clocks.',
    },
    {
      title: 'Cue sheets that move in real time',
      body:
        'Cue sheets stay attached to each time block, so performers know what\'s next without flipping pages. Directors can update timing on the fly and the entire room stays aligned. The result is a rehearsal workflow that feels clear and predictable.',
    },
    {
      title: 'Privacy-first rehearsal tech',
      body:
        'SyncTimer is designed for quick setup and minimal overhead. Participants can join sessions without creating accounts, so the focus stays on rehearsal instead of sign-up flow. It\'s purpose-built for ensembles, not general productivity.',
    },
  ];

  const faqItems = [
    {
      question: 'Who is SyncTimer for?',
      answer:
        'SyncTimer is built for ensembles—bands, choirs, pit orchestras, drumlines, and rehearsal teams—who need a shared countdown, cue sheets, and live prompts to stay aligned.',
    },
    {
      question: 'Does SyncTimer require internet access?',
      answer:
        'To keep devices synchronized, participants need a shared network connection (local Wi-Fi or internet). Without it, timers can run locally but won’t stay in sync across devices.',
    },
    {
      question: 'What devices are supported?',
      answer:
        'Supported devices and OS versions are listed on the App Store listing for SyncTimer.',
    },
    {
      question: 'What data does SyncTimer collect?',
      answer:
        'SyncTimer is privacy-first. Sessions focus on timing and cues, and participants can join without creating accounts or sharing personal details.',
    },
    {
      question: 'How should reviewers describe SyncTimer?',
      answer:
        'Describe SyncTimer as a network-synchronized rehearsal timer with cue sheets and live prompts. It is not a metronome, DAW, or audio playback tool.',
    },
    {
      question: 'How do I get assets or request an interview?',
      answer:
        'Use the download links on this page if available, or email the press contact for assets, interviews, or custom materials.',
    },
  ];

  const downloads = [
    {
      key: 'presskit',
      label: 'Press kit (.zip)',
      description: 'Logos, screenshots, copy, and guidelines.',
      href: '/press/presskit-complete.zip',
      available: pressAssets.downloads.presskitComplete,
    },
    {
      key: 'logos',
      label: 'Logos pack',
      description: 'All logo variants in PNG/SVG.',
      href: '/press/logos.zip',
      available: pressAssets.downloads.logos,
    },
    {
      key: 'screenshots',
      label: 'Screenshots pack',
      description: 'Full-resolution screenshots.',
      href: '/press/screenshots.zip',
      available: pressAssets.downloads.screenshots,
    },
    {
      key: 'video',
      label: 'Video pack',
      description: 'Press-ready clips and b-roll.',
      href: '/press/video.zip',
      available: pressAssets.downloads.video,
    },
    {
      key: 'guidelines',
      label: 'Brand guidelines',
      description: 'Usage rules and visual system.',
      href: '/press/brand-guidelines.pdf',
      available: pressAssets.downloads.brandGuidelines,
    },
  ].filter((item) => item.available);

  const pressPicks = pressAssets.screenshots.slice(0, 8);

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    }
  };

  const hasPressKit = pressAssets.downloads.presskitComplete;
  const hasAppStoreLink = APP_STORE_URL.trim().length > 0;

  return (
    <div className="press-page">
      <Card className="glass-card press-hero" id="top">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={16}>
            <Typography.Title level={1} className="press-title">
              SyncTimer Press Kit
            </Typography.Title>
            <Typography.Paragraph className="press-subtitle">
              {PRESS_DEFINITION}
            </Typography.Paragraph>
            <Space wrap size="middle" className="press-hero-actions">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                href={hasPressKit ? '/press/presskit-complete.zip' : undefined}
                disabled={!hasPressKit}
              >
                Download press kit (.zip)
              </Button>
              <Button
                type="default"
                href={hasAppStoreLink ? APP_STORE_URL : undefined}
                disabled={!hasAppStoreLink}
              >
                App Store
              </Button>
            </Space>
            <Space wrap size="small" className="press-anchor-links">
              <Button type="link" href="#contact">
                Contact
              </Button>
              <Button type="link" href="#factsheet">
                Factsheet
              </Button>
              <Button type="link" href="#screenshots">
                Screenshots
              </Button>
              <Button type="link" href="#logos">
                Logos
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Card className="press-hero-card" bordered={false}>
              <Typography.Title level={3}>Quick facts</Typography.Title>
              <Typography.Paragraph>
                SyncTimer is a rehearsal-first timing tool for ensembles that need synced
                countdowns, cue sheets, and live prompts.
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                Scan-first, download-second. Everything needed for coverage is below.
              </Typography.Text>
            </Card>
          </Col>
        </Row>
      </Card>

      <section id="factsheet" className="press-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Typography.Title level={2}>Factsheet</Typography.Title>
            <Typography.Paragraph>
              Copy-ready basics for fast coverage.
            </Typography.Paragraph>
          </Col>
          <Col xs={24} lg={12}>
            <Card className="glass-card press-card">
              <div className="press-factsheet">
                {factsheetItems.map((item) => (
                  <div key={item.label} className="press-factsheet-row">
                    <div>
                      <Typography.Text className="press-factsheet-label">
                        {item.label}
                      </Typography.Text>
                      <Typography.Paragraph className="press-factsheet-value">
                        {item.value}
                      </Typography.Paragraph>
                    </div>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(item.copy ?? item.value, item.label)}
                      aria-label={`Copy ${item.label}`}
                    >
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
              <Divider />
              <Space align="center" size="middle">
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(factsheetCopyAll, 'factsheet')}
                >
                  Copy all
                </Button>
                {copiedKey === 'factsheet' && (
                  <Typography.Text type="secondary">Copied</Typography.Text>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </section>

      <section className="press-section" id="copy-blocks">
        <Typography.Title level={2}>Copy blocks</Typography.Title>
        <Typography.Paragraph>
          Use or adapt the wording below for coverage, listings, or app store copy.
        </Typography.Paragraph>
        <Row gutter={[24, 24]}>
          {copyBlocks.map((block) => (
            <Col xs={24} md={12} key={block.key}>
              <Card className="glass-card press-card" title={block.label}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Tag color="green" style={{ alignSelf: 'flex-start' }}>
                    {block.count}
                  </Tag>
                  <Typography.Paragraph>{block.text}</Typography.Paragraph>
                  <Space align="center">
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(block.text, block.key)}
                    >
                      Copy
                    </Button>
                    {copiedKey === block.key && (
                      <Typography.Text type="secondary">Copied</Typography.Text>
                    )}
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="press-section" id="story-angles">
        <Typography.Title level={2}>Story angles</Typography.Title>
        <Row gutter={[24, 24]}>
          {storyAngles.map((angle) => (
            <Col xs={24} md={8} key={angle.title}>
              <Card className="glass-card press-card" title={angle.title}>
                <Typography.Paragraph>{angle.body}</Typography.Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="press-section" id="media-assets">
        <Typography.Title level={2}>Media assets</Typography.Title>
        <Typography.Paragraph>
          Download packs only appear when files exist in the /public/press directory.
        </Typography.Paragraph>
        {downloads.length > 0 ? (
          <Row gutter={[24, 24]}>
            {downloads.map((item) => (
              <Col xs={24} md={12} lg={8} key={item.key}>
                <Card className="glass-card press-card" title={item.label}>
                  <Typography.Paragraph>{item.description}</Typography.Paragraph>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Card className="glass-card press-card">
            <Typography.Paragraph>
              Download packs are not included in this repo. Use the contact section below
              to request assets.
            </Typography.Paragraph>
          </Card>
        )}
        <Divider />
        <Typography.Title level={3}>Press kit folder conventions</Typography.Title>
        <ul className="press-list">
          <li>/01-logos/</li>
          <li>/02-icons/</li>
          <li>/03-screenshots/iphone/ /ipad/ /mac/</li>
          <li>/04-video/15s/ /30s/ /60s/ /broll/</li>
          <li>/05-copy/</li>
        </ul>
      </section>

      <section className="press-section" id="logos">
        <Typography.Title level={2}>Logos + usage rules</Typography.Title>
        <Typography.Paragraph>
          Use official logos when available. Keep clearspace and avoid altering the mark.
        </Typography.Paragraph>
        {pressAssets.logos.length > 0 ? (
          <div className="press-gallery">
            {pressAssets.logos.map((logo) => (
              <a key={logo} href={logo} target="_blank" rel="noreferrer">
                <img src={logo} alt="SyncTimer logo" loading="lazy" />
              </a>
            ))}
          </div>
        ) : (
          <Card className="glass-card press-card">
            <Typography.Paragraph>
              No logo assets are included in this repository. Contact us for approved logo
              files.
            </Typography.Paragraph>
          </Card>
        )}
        <Row gutter={[16, 16]} style={{ marginTop: '1rem' }}>
          <Col xs={24} md={12}>
            <Card className="glass-card press-card" title="Do">
              <List
                size="small"
                dataSource={[
                  'Keep clearspace around the logo.',
                  'Use on high-contrast backgrounds.',
                ]}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="glass-card press-card" title="Don’t">
              <List
                size="small"
                dataSource={[
                  'Stretch, outline, or add shadows.',
                  'Recolor the logo.',
                  'Place on low-contrast backgrounds.',
                ]}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            </Card>
          </Col>
        </Row>
      </section>

      <section className="press-section" id="screenshots">
        <Typography.Title level={2}>Screenshots</Typography.Title>
        <Typography.Paragraph>
          Include at least one cue sheet view and one in-session timer view when
          available.
        </Typography.Paragraph>
        {pressAssets.screenshots.length > 0 ? (
          <>
            <Typography.Title level={3}>Press picks</Typography.Title>
            <div className="press-gallery">
              {pressPicks.map((shot) => (
                <a key={shot} href={shot} target="_blank" rel="noreferrer">
                  <img src={shot} alt="SyncTimer screenshot" loading="lazy" />
                </a>
              ))}
            </div>
            {pressAssets.screenshots.length > pressPicks.length && (
              <>
                <Divider />
                <Typography.Title level={3}>Full set</Typography.Title>
                <div className="press-gallery">
                  {pressAssets.screenshots.map((shot) => (
                    <a key={shot} href={shot} target="_blank" rel="noreferrer">
                      <img src={shot} alt="SyncTimer screenshot" loading="lazy" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <Card className="glass-card press-card">
            <Typography.Paragraph>
              Screenshots are not included in this repository. Contact us for approved
              screenshots.
            </Typography.Paragraph>
          </Card>
        )}
      </section>

      {pressAssets.videos.length > 0 && (
        <section className="press-section" id="video">
          <Typography.Title level={2}>Video</Typography.Title>
          <div className="press-gallery">
            {pressAssets.videos.map((video) => (
              <a key={video} href={video} target="_blank" rel="noreferrer">
                <Typography.Text>Download video clip</Typography.Text>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="press-section" id="faq">
        <Typography.Title level={2}>FAQ</Typography.Title>
        <Row gutter={[24, 24]}>
          {faqItems.map((item) => (
            <Col xs={24} md={12} key={item.question}>
              <Card className="glass-card press-card">
                <Typography.Title level={4}>{item.question}</Typography.Title>
                <Typography.Paragraph>{item.answer}</Typography.Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="press-section" id="contact">
        <Typography.Title level={2}>Contact</Typography.Title>
        <Card className="glass-card press-card">
          <Space direction="vertical" size="small">
            <Typography.Text strong>{PRESS_CONTACT.name}</Typography.Text>
            <Space>
              <MailOutlined />
              {PRESS_CONTACT.email.startsWith('TODO') ? (
                <Typography.Text>{PRESS_CONTACT.email}</Typography.Text>
              ) : (
                <a href={`mailto:${PRESS_CONTACT.email}`}>{PRESS_CONTACT.email}</a>
              )}
            </Space>
          </Space>
        </Card>
      </section>
    </div>
  );
}

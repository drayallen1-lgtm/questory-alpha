import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  MessageCircle,
  QrCode,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { formatUserErrorMessage } from './claimSystem';
import { trackInviteShared, trackCreatePublished, markPersonaTested } from './stability';
import {
  EMPTY_STATE_COPY,
  JOURNEY_CHOICES,
  KID_TEMPLATES,
  ONBOARDING_SLIDES,
  WIZARD_AUDIENCES,
  WIZARD_CLUE_COUNTS,
  WIZARD_LOCATIONS,
  WIZARD_REWARD_TYPES,
  WIZARD_TEMPLATES,
  buildInviteLink,
  buildInviteMessage,
  buildQuickCreateAdventure,
  buildSponsorExpressAdventureSync,
  completeJourneyChoice,
  completeWelcome,
  DEMO_ADVENTURE_ID,
  publishQuickAdventure,
  markInviteShared,
  markFirstCompletionCelebrated,
  toggleGrandmaMode,
  toggleKidMode,
} from './invitation';
import { copyShareText } from './share';
import { upsertAdventure } from './supabase/dataService';

export function WelcomeOnboarding({ state, setState, onDone }) {
  const [index, setIndex] = useState(state.onboarding?.slideIndex || 0);
  const slide = ONBOARDING_SLIDES[index];
  const isLast = index >= ONBOARDING_SLIDES.length - 1;

  function finish(skipped = false) {
    setState((s) => completeWelcome(s, skipped));
    onDone?.();
  }

  return (
    <div className="invitation-overlay welcome-onboarding">
      <div className="invitation-panel">
        <button type="button" className="ghost invite-skip" onClick={() => finish(true)}>
          Skip
        </button>
        <div className="invite-hero">
          {index === 0 && (
            <>
              <h1>Turn any place into an adventure.</h1>
              <p className="invite-subhead">
                Backyards. Birthdays. Date nights. Ghost stories. Family memories.
              </p>
            </>
          )}
          <span className="invite-slide-icon">{slide.icon}</span>
          <h2>{slide.title}</h2>
          <p>{slide.desc}</p>
        </div>
        <div className="invite-dots">
          {ONBOARDING_SLIDES.map((s, i) => (
            <span key={s.id} className={i === index ? 'active' : ''} />
          ))}
        </div>
        <div className="invite-nav-row">
          {index > 0 && (
            <button type="button" className="ghost" onClick={() => setIndex((i) => i - 1)}>
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? finish(false) : setIndex((i) => i + 1))}
          >
            {isLast ? 'Start Exploring' : 'Next'}
            {!isLast && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChooseYourJourney({ state, setState, nav }) {
  return (
    <div className="invitation-overlay journey-picker">
      <div className="invitation-panel">
        <h2>What would you like to do today?</h2>
        <div className="journey-grid">
          {JOURNEY_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="card mini journey-card"
              onClick={() => {
                setState((s) => completeJourneyChoice(s, choice.id));
                if (choice.sponsor) {
                  nav('create', null, { quickSponsor: true });
                } else {
                  nav(choice.nav);
                }
              }}
            >
              <span className="journey-icon">{choice.icon}</span>
              <b>{choice.label}</b>
              <small>{choice.desc}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BackyardDemoCard({ state, setState, nav }) {
  const metrics = state.firstTimeMetrics || {};
  return (
    <div className="card backyard-demo-card">
      <h3>🎂 Try a 3-Minute Backyard Adventure</h3>
      <p>
        <b>The Missing Birthday Gift</b> — 3 clues, no setup. Perfect for your first hunt.
      </p>
      {metrics.demoCompleted && (
        <p className="demo-done">
          <CheckCircle2 size={14} /> Demo completed — nice work!
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setState((s) => ({
            ...s,
            firstTimeMetrics: { ...s.firstTimeMetrics, demoStarted: true },
          }));
          nav('play', DEMO_ADVENTURE_ID, { adminPreview: false });
        }}
      >
        Play Demo
      </button>
    </div>
  );
}

export function QuickCreateWizard({ state, setState, onClose, userId, isSupabaseMode, onPublished }) {
  const [step, setStep] = useState(1);
  const [wizard, setWizard] = useState({
    audience: 'family',
    template: 'family_fun',
    location: 'backyard',
    clueCount: 3,
    rewardType: 'badge',
    kidTemplate: null,
  });
  const [publishing, setPublishing] = useState(false);

  async function buildAndPublish() {
    setPublishing(true);
    try {
      const adventure = buildQuickCreateAdventure(wizard, { userId, publish: true });
      if (isSupabaseMode && userId) {
        await upsertAdventure(adventure, userId);
      }
      setState((s) => trackCreatePublished(publishQuickAdventure(s, adventure, { goToInvite: true })));
      onPublished?.(adventure);
      onClose?.();
    } catch (err) {
      window.alert(formatUserErrorMessage(err) || 'Could not publish adventure.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="invitation-overlay quick-create-overlay">
      <div className="invitation-panel quick-create-panel">
        <button type="button" className="ghost invite-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>Quick Create</h2>
        <p className="invite-subhead">Build an adventure in about 60 seconds.</p>
        <div className="wizard-steps">
          <span className={step >= 1 ? 'active' : ''}>1</span>
          <span className={step >= 2 ? 'active' : ''}>2</span>
          <span className={step >= 3 ? 'active' : ''}>3</span>
          <span className={step >= 4 ? 'active' : ''}>4</span>
          <span className={step >= 5 ? 'active' : ''}>5</span>
        </div>

        {step === 1 && (
          <>
            <h3>Who is this for?</h3>
            <div className="wizard-chip-grid">
              {WIZARD_AUDIENCES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={wizard.audience === a.id ? 'active' : ''}
                  onClick={() => setWizard((w) => ({ ...w, audience: a.id, template: a.template }))}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Choose a style</h3>
            <div className="wizard-chip-grid">
              {WIZARD_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={wizard.template === t.id ? 'active' : ''}
                  onClick={() => setWizard((w) => ({ ...w, template: t.id }))}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3>Where?</h3>
            <div className="wizard-chip-grid">
              {WIZARD_LOCATIONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={wizard.location === l.id ? 'active' : ''}
                  onClick={() => setWizard((w) => ({ ...w, location: l.id }))}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3>How many clues?</h3>
            <div className="wizard-chip-grid">
              {WIZARD_CLUE_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={wizard.clueCount === n ? 'active' : ''}
                  onClick={() => setWizard((w) => ({ ...w, clueCount: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h3>Rewards</h3>
            <div className="wizard-chip-grid">
              {WIZARD_REWARD_TYPES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={wizard.rewardType === r.id ? 'active' : ''}
                  onClick={() => setWizard((w) => ({ ...w, rewardType: r.id }))}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="invite-nav-row">
          {step > 1 && (
            <button type="button" className="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          {step < 5 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          ) : (
            <button type="button" onClick={buildAndPublish} disabled={publishing}>
              {publishing ? 'Building…' : 'Build My Adventure'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function KidModeCreator({ state, setState, onClose, userId, isSupabaseMode }) {
  const [selected, setSelected] = useState(KID_TEMPLATES[0].id);

  async function launch() {
    const kid = KID_TEMPLATES.find((k) => k.id === selected);
    const adventure = buildQuickCreateAdventure(
      {
        audience: 'kids',
        template: 'family_fun',
        location: 'backyard',
        clueCount: 3,
        rewardType: 'badge',
        kidTemplate: selected,
        title: kid.title,
        story: kid.story,
      },
      { userId }
    );
    if (isSupabaseMode && userId) {
      await upsertAdventure(adventure, userId);
    }
    setState((s) => trackCreatePublished(publishQuickAdventure(s, adventure, { goToInvite: true })));
    onClose?.();
  }

  return (
    <div className="card kid-mode-creator">
      <h3>🎨 Kid-Friendly Creator</h3>
      <p>Pick a theme — we handle the rest. Sticker-style badges included!</p>
      <div className="kid-template-grid">
        {KID_TEMPLATES.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`card mini kid-template-card ${selected === k.id ? 'active' : ''}`}
            onClick={() => setSelected(k.id)}
          >
            <span>{k.icon}</span>
            <b>{k.label}</b>
          </button>
        ))}
      </div>
      <button type="button" onClick={launch}>
        Create {KID_TEMPLATES.find((k) => k.id === selected)?.label}
      </button>
    </div>
  );
}

export function SponsorExpressPanel({ state, setState, userId, isSupabaseMode }) {
  const [form, setForm] = useState({
    businessName: '',
    couponValue: 'Free item',
    durationDays: '14',
    city: '',
  });
  const [launching, setLaunching] = useState(false);

  async function launch() {
    if (!form.businessName.trim()) {
      window.alert('Enter your business name.');
      return;
    }
    setLaunching(true);
    try {
      const adventure = buildSponsorExpressAdventureSync(form, { userId });
      if (isSupabaseMode && userId) {
        await upsertAdventure(adventure, userId);
      }
      setState((s) =>
        markPersonaTested(
          trackCreatePublished(publishQuickAdventure(s, adventure, { goToInvite: true })),
          'sponsor'
        )
      );
    } catch (err) {
      window.alert(formatUserErrorMessage(err) || 'Could not launch campaign.');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="card sponsor-express-panel">
      <h3>🏪 Sponsor Express</h3>
      <p>Launch a coupon hunt in under 2 minutes. No calls required.</p>
      <label>Business name</label>
      <input
        value={form.businessName}
        onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
        placeholder="Main Street Coffee"
      />
      <label>Coupon value</label>
      <input
        value={form.couponValue}
        onChange={(e) => setForm((f) => ({ ...f, couponValue: e.target.value }))}
        placeholder="Free drink"
      />
      <label>Duration (days)</label>
      <input
        type="number"
        value={form.durationDays}
        onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
      />
      <label>City</label>
      <input
        value={form.city}
        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
        placeholder="Parsons"
      />
      <button type="button" onClick={launch} disabled={launching}>
        {launching ? 'Launching…' : 'Launch Promotion'}
      </button>
    </div>
  );
}

export function InvitePlayersPanel({ adventure, state, setState, onClose }) {
  if (!adventure) return null;
  const message = buildInviteMessage(adventure);
  const link = buildInviteLink(adventure);

  function share(action) {
    setState((s) => trackInviteShared(markInviteShared(s)));
    if (action === 'copy') copyShareText(message);
    else if (action === 'link') copyShareText(link);
    else if (action === 'text') copyShareText(message);
    else if (action === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(`Join ${adventure.title}`)}&body=${encodeURIComponent(message + '\n' + link)}`;
    }
  }

  return (
    <div className="invitation-overlay invite-players-overlay">
      <div className="invitation-panel invite-players-panel">
        <button type="button" className="ghost invite-close" onClick={onClose}>
          <X size={18} />
        </button>
        <h2>Invite Your Players</h2>
        <p className="invite-subhead">{adventure.title}</p>
        <div className="invite-preview card mini">
          <p>{message}</p>
          <small>{link}</small>
        </div>
        <div className="invite-action-grid">
          <button type="button" onClick={() => share('link')}>
            <Copy size={16} /> Copy Link
          </button>
          <button type="button" onClick={() => share('text')}>
            <MessageCircle size={16} /> Share Text
          </button>
          <button type="button" className="ghost" onClick={() => share('copy')}>
            <Share2 size={16} /> Copy Invite
          </button>
          <button type="button" className="ghost" onClick={() => share('email')}>
            <Mail size={16} /> Email Invite
          </button>
        </div>
        <div className="invite-qr card mini">
          <QrCode size={48} />
          <p>QR Code: {adventure.claimCode}</p>
          <small>Players can scan or enter code {adventure.claimCode}</small>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export function FirstCompletionCelebration({ state, setState, nav, onClose }) {
  return (
    <div className="invitation-overlay first-completion-overlay">
      <div className="invitation-panel celebration-panel">
        <Sparkles size={40} className="celebration-sparkle" />
        <h1>You just created a memory.</h1>
        <p>Most players create another adventure within days.</p>
        <button
          type="button"
          onClick={() => {
            setState((s) => markFirstCompletionCelebrated(s));
            nav('create');
            onClose?.();
          }}
        >
          Create My Own
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setState((s) => markFirstCompletionCelebrated(s));
            nav('feed');
            onClose?.();
          }}
        >
          Explore Nearby
        </button>
      </div>
    </div>
  );
}

export function AccessibilityToggles({ state, setState }) {
  const a = state.accessibility || {};
  return (
    <div className="card accessibility-toggles">
      <h3>Accessibility</h3>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(a.grandmaMode)}
          onChange={() => setState((s) => markPersonaTested(toggleGrandmaMode(s), 'grandma'))}
        />
        Grandma Mode — larger text, simpler layout, high contrast
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(a.kidMode)}
          onChange={() => setState((s) => markPersonaTested(toggleKidMode(s), 'kid'))}
        />
        Kid Mode — friendly themes and sticker rewards
      </label>
    </div>
  );
}

export function InvitationEmptyState({ type = 'adventures' }) {
  const copy = EMPTY_STATE_COPY[type] || EMPTY_STATE_COPY.adventures;
  return (
    <div className="card empty-state-illustrated">
      <span className="empty-illustration">{copy.icon}</span>
      <h3>{copy.title}</h3>
      <p>{copy.desc}</p>
    </div>
  );
}

export function InvitationHomeBanner({ state, setState, nav }) {
  return (
    <>
      <BackyardDemoCard state={state} setState={setState} nav={nav} />
      <AccessibilityToggles state={state} setState={setState} />
    </>
  );
}

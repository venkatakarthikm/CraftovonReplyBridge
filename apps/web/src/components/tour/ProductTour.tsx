// apps/web/src/components/tour/ProductTour.tsx
// Guided product tour using React Joyride.
// 8 steps with VERBATIM tooltip copy from 06-onboarding-tour.md §2.
// Tour state stored in users.onboarding.tourDone (Mongo) + local auth store.
import Joyride, { type CallBackProps, STATUS, type Step } from 'react-joyride';
import { useAuthStore } from '../../stores/auth.store.js';

// VERBATIM tooltip copy from 06-onboarding-tour.md §2
const TOUR_STEPS: Step[] = [
  {
    target: '#tour-reels-grid',
    title: 'Your Reels',
    content: 'Every reel and post on your account lives here. New posts appear automatically.',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '#tour-toggle',
    title: 'ON / OFF Toggle',
    content: 'Flip this to turn the automation for that reel ON or OFF — old and new reels both.',
    placement: 'bottom',
  },
  {
    target: '#tour-automation-btn',
    title: 'Automation Editor',
    content: 'Set the trigger, the DM text, and which link this reel sends. Each reel can send a different link.',
    placement: 'bottom',
  },
  {
    target: '#tour-link-field',
    title: 'Dynamic Link',
    content: 'Paste any URL here. Change it anytime — new comments instantly get the new link, no downtime.',
    placement: 'top',
  },
  {
    target: '#tour-backfill-toggle',
    title: 'Answer Old Comments',
    content: 'Also reply to people who commented before you switched on. Comments older than 7 days can\'t be DM\'d — that\'s an Instagram rule we can\'t bypass.',
    placement: 'top',
  },
  {
    target: '#tour-templates',
    title: 'Templates',
    content: 'Ready-made reply texts. Tap to use, edit freely.',
    placement: 'right',
  },
  {
    target: '#tour-analytics',
    title: 'Analytics',
    content: 'See comments matched, DMs sent, and link taps for every reel.',
    placement: 'right',
  },
  {
    target: '#tour-inbox',
    title: 'Inbox',
    content: 'Anyone currently mid-conversation. Nobody gets messaged without an open conversation — we never cold-DM.',
    placement: 'right',
  },
];

// Joyride theme to match design system
const JOYRIDE_STYLES = {
  options: {
    primaryColor: '#6366f1',
    backgroundColor: '#1a1a3e',
    textColor: '#e2e8f0',
    arrowColor: '#1a1a3e',
    overlayColor: 'rgba(0,0,0,0.6)',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '16px',
    border: '1px solid rgba(99,102,241,0.3)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  tooltipTitle: {
    color: '#a5b9fd',
    fontWeight: '700',
    fontSize: '14px',
  },
  tooltipContent: {
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#cbd5e1',
  },
  buttonNext: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
  },
  buttonBack: {
    color: '#818efa',
    fontSize: '13px',
  },
  buttonSkip: {
    color: '#64748b',
    fontSize: '12px',
  },
};

export default function ProductTour() {
  const { user, updateUser } = useAuthStore();
  const isTourDone = user?.onboarding?.tourDone ?? true;

  const handleTourCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Mark tour done in local state (API call would sync to DB)
      updateUser({ onboarding: { ...(user?.onboarding || { checklist: [] }), tourDone: true } });
      // TODO: PATCH /api/v1/auth/me to persist tourDone to DB
    }
  };

  // Don't run if tour already done or user not logged in
  if (isTourDone || !user) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={!isTourDone}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      styles={JOYRIDE_STYLES}
      locale={{
        back: '← Back',
        close: 'Close',
        last: 'Finish tour 🎉',
        next: 'Next →',
        skip: 'Skip tour',
      }}
      callback={handleTourCallback}
    />
  );
}

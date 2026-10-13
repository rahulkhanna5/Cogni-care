import { PRIVACY } from '@/legal/content';
import { LegalPage } from '@/legal/LegalPage';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="What CogniCare keeps about you, who can see it, and what you can ask for."
      sections={PRIVACY}
    />
  );
}

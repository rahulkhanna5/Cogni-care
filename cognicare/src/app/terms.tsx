import { TERMS } from '@/legal/content';
import { LegalPage } from '@/legal/LegalPage';

export default function Terms() {
  return (
    <LegalPage title="Terms and conditions" intro="The rules for using CogniCare, in plain words." sections={TERMS} />
  );
}

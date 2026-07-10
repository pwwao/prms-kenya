/**
 * Helper Utilities — Unit Tests
 */
import {
  maskName,
  maskNationalId,
  maskPhone,
  isValidKenyanPhone,
  isValidNationalId,
  isStrongPassword,
  canDispatch,
  canMarkReceived,
  canAcceptOrReject,
  canMarkComplete,
  canRedispatch,
  canChat,
  truncate,
  getStatusColor,
  getUrgencyColor,
} from '../helpers';

describe('maskName', () => {
  it('masks middle and last names with initials', () => {
    expect(maskName('Jane Wanjiru Mwangi')).toBe('Jane W. M.');
  });

  it('returns single name unchanged', () => {
    expect(maskName('Jane')).toBe('Jane');
  });
});

describe('maskNationalId', () => {
  it('masks all but last 4 digits', () => {
    expect(maskNationalId('12345678')).toBe('XXXX5678');
  });

  it('fully masks short IDs', () => {
    expect(maskNationalId('123')).toBe('XXX');
  });
});

describe('maskPhone', () => {
  it('masks middle digits of a Kenyan phone number', () => {
    const masked = maskPhone('+254712345678');
    expect(masked.length).toBeGreaterThan(0);
    expect(masked).toContain('X');
  });
});

describe('isValidKenyanPhone', () => {
  it('accepts valid +254 format', () => {
    expect(isValidKenyanPhone('+254712345678')).toBe(true);
  });

  it('rejects missing country code', () => {
    expect(isValidKenyanPhone('0712345678')).toBe(false);
  });

  it('rejects too short numbers', () => {
    expect(isValidKenyanPhone('+25471234')).toBe(false);
  });
});

describe('isValidNationalId', () => {
  it('accepts 7-8 digit IDs', () => {
    expect(isValidNationalId('1234567')).toBe(true);
    expect(isValidNationalId('12345678')).toBe(true);
  });

  it('rejects non-numeric or wrong length', () => {
    expect(isValidNationalId('123')).toBe(false);
    expect(isValidNationalId('abcdefgh')).toBe(false);
  });
});

describe('isStrongPassword', () => {
  it('accepts a password meeting all requirements', () => {
    expect(isStrongPassword('StrongPass123!')).toBe(true);
  });

  it('rejects passwords missing a character class', () => {
    expect(isStrongPassword('alllowercase123!')).toBe(false); // no uppercase
    expect(isStrongPassword('ALLUPPERCASE123!')).toBe(false); // no lowercase
    expect(isStrongPassword('NoNumbersHere!')).toBe(false); // no digit
    expect(isStrongPassword('NoSpecialChar123')).toBe(false); // no symbol
  });

  it('rejects passwords under 12 characters', () => {
    expect(isStrongPassword('Short1!')).toBe(false);
  });
});

describe('Referral action permissions (Appendix C matrix)', () => {
  it('canDispatch — only Draft + Clinician/Receptionist', () => {
    expect(canDispatch('Draft', 'Clinician')).toBe(true);
    expect(canDispatch('Draft', 'Receptionist')).toBe(true);
    expect(canDispatch('Draft', 'HospitalAdmin')).toBe(false);
    expect(canDispatch('Dispatched', 'Clinician')).toBe(false);
  });

  it('canMarkReceived — only Dispatched + Receptionist', () => {
    expect(canMarkReceived('Dispatched', 'Receptionist')).toBe(true);
    expect(canMarkReceived('Dispatched', 'Clinician')).toBe(false);
    expect(canMarkReceived('Received', 'Receptionist')).toBe(false);
  });

  it('canAcceptOrReject — only Received + Clinician', () => {
    expect(canAcceptOrReject('Received', 'Clinician')).toBe(true);
    expect(canAcceptOrReject('Received', 'Receptionist')).toBe(false);
    expect(canAcceptOrReject('Dispatched', 'Clinician')).toBe(false);
  });

  it('canMarkComplete — only Accepted + Clinician', () => {
    expect(canMarkComplete('Accepted', 'Clinician')).toBe(true);
    expect(canMarkComplete('Received', 'Clinician')).toBe(false);
  });

  it('canRedispatch — only Rejected + Clinician', () => {
    expect(canRedispatch('Rejected', 'Clinician')).toBe(true);
    expect(canRedispatch('Draft', 'Clinician')).toBe(false);
  });

  it('canChat — only Clinician role', () => {
    expect(canChat('Clinician')).toBe(true);
    expect(canChat('Receptionist')).toBe(false);
    expect(canChat('HospitalAdmin')).toBe(false);
  });
});

describe('truncate', () => {
  it('returns text unchanged if under max length', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('truncates and adds ellipsis if over max length', () => {
    expect(truncate('this is a long string', 10)).toBe('this is a…');
  });
});

describe('getStatusColor / getUrgencyColor', () => {
  it('returns distinct colors per status', () => {
    const colors = new Set([
      getStatusColor('Draft'),
      getStatusColor('Dispatched'),
      getStatusColor('Accepted'),
      getStatusColor('Rejected'),
    ]);
    expect(colors.size).toBe(4);
  });

  it('returns distinct colors per urgency level', () => {
    const colors = new Set([
      getUrgencyColor('Routine'),
      getUrgencyColor('Urgent'),
      getUrgencyColor('Emergent'),
    ]);
    expect(colors.size).toBe(3);
  });
});
